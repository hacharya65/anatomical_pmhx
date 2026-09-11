/**
 * rxnorm.js
 * NIH RxNorm API Client Service
 * Provides clinical drug concept searching, standardized RxCUI codes,
 * and available clinical strengths/dosage forms.
 *
 * Base Endpoint: https://rxnav.nlm.nih.gov/REST
 * Public, open-access, no API key required.
 */

import { cachedFetch, fetchWithTimeout } from "./apiCache.js";
import { CLINICAL_CATALOG } from "../lib/clinicalCatalog.js";

const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST";

/**
 * Clean and extract strength strings (e.g. "500 MG", "10 MG/ML", "50 MCG")
 * from RxNorm clinical drug names.
 */
function extractStrengthsFromNames(names = []) {
  const strengthRegex = /(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|unit|units|meq|%)(?:\/\d*(?:\.\d+)?\s*(?:ml|actuat|hr|dose))?)/gi;
  const strengthSet = new Set();

  for (const name of names) {
    const matches = name.match(strengthRegex);
    if (matches) {
      for (const m of matches) {
        // Standardize format: lowercase units, clean spaces (e.g. "500 mg")
        const normalized = m.replace(/\s+/g, " ").trim().toLowerCase();
        strengthSet.add(normalized);
      }
    }
  }

  // Sort numerically where possible
  return Array.from(strengthSet).sort((a, b) => {
    const numA = parseFloat(a) || 0;
    const numB = parseFloat(b) || 0;
    return numA - numB;
  });
}

/**
 * Extract dosage forms (e.g. "Oral Tablet", "Oral Capsule", "Inhalation Aerosol")
 */
function extractDosageFormsFromNames(names = []) {
  const commonForms = [
    "Oral Tablet",
    "Oral Capsule",
    "Extended Release Oral Tablet",
    "Extended Release Oral Capsule",
    "Topical Cream",
    "Topical Ointment",
    "Oral Solution",
    "Oral Suspension",
    "Nasal Spray",
    "Inhalation Solution",
    "Inhalation Aerosol",
    "Transdermal Patch",
    "Subcutaneous Injection",
    "Intramuscular Injection",
    "Ophthalmic Solution"
  ];

  const foundForms = new Set();
  const lowerNames = names.map((n) => n.toLowerCase());

  for (const form of commonForms) {
    if (lowerNames.some((n) => n.includes(form.toLowerCase()))) {
      foundForms.add(form);
    }
  }

  return Array.from(foundForms);
}

/**
 * Search medications by name using NIH RxNorm drugs.json endpoint
 * @param {string} query - Medication name prefix or term
 * @returns {Promise<Array<{ name: string, rxcui: string, synonym: string, tty: string }>>}
 */
export async function searchMedications(query) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const cacheKey = `rxnorm_search_${cleanQuery.toLowerCase()}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const url = `${RXNORM_BASE_URL}/drugs.json?name=${encodeURIComponent(cleanQuery)}`;
        const res = await fetchWithTimeout(url, {}, 5000);

        if (!res.ok) {
          throw new Error(`RxNorm HTTP ${res.status}`);
        }

        const data = await res.json();
        const conceptGroups = data?.drugGroup?.conceptGroup || [];
        const results = [];
        const seenNames = new Set();

        // Priority order of term types: IN (Ingredient), SCD (Semantic Clinical Drug), SBD (Semantic Branded Drug), BN (Brand Name)
        for (const group of conceptGroups) {
          if (!group.conceptProperties) continue;

          for (const prop of group.conceptProperties) {
            const trimmedName = prop.name?.trim();
            if (trimmedName && !seenNames.has(trimmedName.toLowerCase())) {
              seenNames.add(trimmedName.toLowerCase());
              results.push({
                rxcui: prop.rxcui,
                name: trimmedName,
                synonym: prop.synonym || "",
                tty: prop.tty || group.tty || ""
              });
            }
          }
        }

        return results.slice(0, 25);
      },
      60 * 60 * 1000 // 1 hour TTL
    );
  } catch (err) {
    console.warn("rxnorm.searchMedications: Network error, using local catalog fallback:", err.message);
    return fallbackSearchLocalCatalog(cleanQuery);
  }
}

/**
 * Fallback to local catalog when offline or on network failure
 */
function fallbackSearchLocalCatalog(query) {
  const q = query.toLowerCase();
  const matches = (CLINICAL_CATALOG.medications || []).filter((m) =>
    (m.name || "").toLowerCase().includes(q) ||
    (m.brandName || "").toLowerCase().includes(q)
  );

  return matches.map((m) => ({
    rxcui: m.rxcui || `local-${m.id}`,
    name: m.name,
    synonym: m.brandName || "",
    tty: "LOCAL"
  }));
}

/**
 * Fetch available strengths and dosage forms for a specific RxCUI
 * @param {string} rxcui - RxNorm Concept Unique Identifier
 * @param {string} drugName - Medication name for fallback
 * @returns {Promise<{ rxcui: string, strengths: string[], dosageForms: string[], clinicalDrugs: string[] }>}
 */
export async function getMedicationStrengths(rxcui, drugName = "") {
  if (!rxcui && !drugName) {
    return { rxcui: "", strengths: [], dosageForms: [], clinicalDrugs: [] };
  }

  const cacheKey = `rxnorm_strengths_${rxcui || drugName}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        let activeRxcui = rxcui;

        // If no rxcui provided or local placeholder, attempt lookup by name first
        if (!activeRxcui || activeRxcui.startsWith("local-")) {
          const searchRes = await searchMedications(drugName);
          if (searchRes.length > 0) {
            activeRxcui = searchRes[0].rxcui;
          }
        }

        if (!activeRxcui || activeRxcui.startsWith("local-")) {
          return fallbackStrengths(drugName);
        }

        const url = `${RXNORM_BASE_URL}/rxcui/${activeRxcui}/allrelated.json`;
        const res = await fetchWithTimeout(url, {}, 5000);

        if (!res.ok) {
          throw new Error(`RxNorm allrelated HTTP ${res.status}`);
        }

        const data = await res.json();
        const groups = data?.allRelatedGroup?.conceptGroup || [];

        // SCD = Semantic Clinical Drug, SCDF = Semantic Clinical Drug Form
        const scdGroup = groups.find((g) => g.tty === "SCD")?.conceptProperties || [];
        const scdfGroup = groups.find((g) => g.tty === "SCDF")?.conceptProperties || [];
        const combined = [...scdGroup, ...scdfGroup];

        const allNames = combined.map((c) => c.name).filter(Boolean);
        const strengths = extractStrengthsFromNames(allNames);
        const dosageForms = extractDosageFormsFromNames(allNames);

        return {
          rxcui: activeRxcui,
          strengths: strengths.length > 0 ? strengths : fallbackStrengths(drugName).strengths,
          dosageForms: dosageForms.length > 0 ? dosageForms : ["Oral Tablet"],
          clinicalDrugs: allNames.slice(0, 15)
        };
      },
      60 * 60 * 1000 // 1 hour TTL
    );
  } catch (err) {
    console.warn("rxnorm.getMedicationStrengths: Falling back to local clinical catalog:", err.message);
    return fallbackStrengths(drugName);
  }
}

/**
 * Fallback strengths for commonly prescribed medications
 */
function fallbackStrengths(drugName = "") {
  const q = drugName.toLowerCase();

  const standardPresets = {
    metformin: ["500 mg", "850 mg", "1000 mg"],
    lisinopril: ["5 mg", "10 mg", "20 mg", "40 mg"],
    atorvastatin: ["10 mg", "20 mg", "40 mg", "80 mg"],
    amlodipine: ["2.5 mg", "5 mg", "10 mg"],
    levothyroxine: ["25 mcg", "50 mcg", "75 mcg", "100 mcg", "125 mcg"],
    omeprazole: ["10 mg", "20 mg", "40 mg"],
    losartan: ["25 mg", "50 mg", "100 mg"],
    albuterol: ["90 mcg/actuation", "0.083% solution"],
    gabapentin: ["100 mg", "300 mg", "600 mg", "800 mg"],
    hydrochlorothiazide: ["12.5 mg", "25 mg", "50 mg"],
    sertraline: ["25 mg", "50 mg", "100 mg"],
    amoxicillin: ["250 mg", "500 mg", "875 mg"],
    aspirin: ["81 mg", "325 mg"]
  };

  for (const [key, strengths] of Object.entries(standardPresets)) {
    if (q.includes(key)) {
      return {
        rxcui: "",
        strengths,
        dosageForms: ["Oral Tablet", "Oral Capsule"],
        clinicalDrugs: []
      };
    }
  }

  return {
    rxcui: "",
    strengths: ["5 mg", "10 mg", "20 mg", "50 mg", "100 mg"],
    dosageForms: ["Oral Tablet"],
    clinicalDrugs: []
  };
}
