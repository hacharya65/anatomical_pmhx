/**
 * rxnorm.js
 * NIH RxNorm & NLM RxTerms API Client Service
 * Provides clinical drug concept searching, standardized RxCUI codes,
 * prefix-matching autocompletion, and available clinical strengths/dosage forms.
 *
 * Endpoints:
 * - NLM Clinical Tables RxTerms: https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search (Prefix autocompletion + strengths)
 * - NIH RxNav REST: https://rxnav.nlm.nih.gov/REST (Concept graphs & relations)
 * Public, open-access federal health APIs, no API key required.
 */

import { cachedFetch, fetchWithTimeout } from "./apiCache.js";
import { CLINICAL_CATALOG } from "../lib/clinicalCatalog.js";

const RXTERMS_BASE_URL = "https://clinicaltables.nlm.nih.gov/api/rxterms/v3";
const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST";

// In-memory cache for instant strength retrieval when user clicks a suggestion
const PREFETCHED_STRENGTHS = new Map();

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
        const normalized = m.replace(/\s+/g, " ").trim().toLowerCase();
        strengthSet.add(normalized);
      }
    }
  }

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
 * Search medications by name using NLM RxTerms prefix autocompletion
 * and NIH RxNav semantic concepts.
 * Enables intuitive prefix matching (e.g. "ver" -> Verapamil, "lis" -> Lisinopril).
 *
 * @param {string} query - Medication name prefix or term
 * @returns {Promise<Array<{ name: string, displayName: string, rxcui: string, synonym: string, strengths: string[], isRxNorm: boolean }>>}
 */
export async function searchMedications(query) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const cacheKey = `rxnorm_prefix_v2_${cleanQuery.toLowerCase()}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const results = [];
        const seenNames = new Set();

        // 1. Primary Search: NLM Clinical Tables RxTerms API (Fast prefix autocompletion)
        try {
          const rxTermsUrl = `${RXTERMS_BASE_URL}/search?terms=${encodeURIComponent(cleanQuery)}&ef=DISPLAY_NAME,STRENGTHS_AND_FORMS,RXCUIS&maxList=25`;
          const rxTermsRes = await fetchWithTimeout(rxTermsUrl, {}, 4500);

          if (rxTermsRes.ok) {
            const data = await rxTermsRes.json();
            const names = data[1] || [];
            const ef = data[2] || {};
            const displayNames = ef.DISPLAY_NAME || names;
            const strengthsArr = ef.STRENGTHS_AND_FORMS || [];
            const rxcuisArr = ef.RXCUIS || [];

            for (let i = 0; i < names.length; i++) {
              const rawDisp = displayNames[i] || names[i];
              // Clean name: e.g. "Verapamil (Oral Pill)" -> "Verapamil"
              const cleanName = rawDisp.replace(/\s*\([^)]*\)\s*$/, "").trim();
              const strengths = (strengthsArr[i] || []).map((s) => s.trim()).filter(Boolean);
              const rxcui = (rxcuisArr[i] && rxcuisArr[i][0]) ? String(rxcuisArr[i][0]) : "";

              const dedupeKey = cleanName.toLowerCase();
              if (!seenNames.has(dedupeKey)) {
                seenNames.add(dedupeKey);

                // Cache strengths for fast zero-latency selection
                if (strengths.length > 0) {
                  PREFETCHED_STRENGTHS.set(dedupeKey, strengths);
                  if (rxcui) PREFETCHED_STRENGTHS.set(rxcui, strengths);
                }

                results.push({
                  name: cleanName,
                  displayName: rawDisp,
                  rxcui,
                  synonym: rawDisp !== cleanName ? rawDisp : "",
                  strengths,
                  isRxNorm: true
                });
              }
            }
          }
        } catch (termsErr) {
          console.warn("RxTerms API prefix lookup failed, falling back to RxNav:", termsErr.message);
        }

        // 2. Secondary Search: NIH RxNav drugs.json (Exact/Clinical drug concepts)
        // If RxTerms returned fewer than 5 results or query is 3+ letters
        if (cleanQuery.length >= 3 && results.length < 10) {
          try {
            const rxnavUrl = `${RXNORM_BASE_URL}/drugs.json?name=${encodeURIComponent(cleanQuery)}`;
            const rxnavRes = await fetchWithTimeout(rxnavUrl, {}, 4000);

            if (rxnavRes.ok) {
              const data = await rxnavRes.json();
              const conceptGroups = data?.drugGroup?.conceptGroup || [];

              for (const group of conceptGroups) {
                if (!group.conceptProperties) continue;

                for (const prop of group.conceptProperties) {
                  const trimmedName = prop.name?.trim();
                  if (trimmedName) {
                    const dedupeKey = trimmedName.toLowerCase();
                    if (!seenNames.has(dedupeKey)) {
                      seenNames.add(dedupeKey);
                      results.push({
                        name: trimmedName,
                        displayName: trimmedName,
                        rxcui: prop.rxcui,
                        synonym: prop.synonym || "",
                        strengths: [],
                        isRxNorm: true
                      });
                    }
                  }
                }
              }
            }
          } catch (navErr) {
            // Non-critical secondary search failure
          }
        }

        // 3. Fallback to local clinical catalog if federal APIs returned 0 results
        if (results.length === 0) {
          const localMatches = fallbackSearchLocalCatalog(cleanQuery);
          for (const m of localMatches) {
            if (!seenNames.has(m.name.toLowerCase())) {
              seenNames.add(m.name.toLowerCase());
              results.push(m);
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
  const matches = (CLINICAL_CATALOG.medications || []).filter(
    (m) =>
      (m.name || "").toLowerCase().includes(q) ||
      (m.brandName || "").toLowerCase().includes(q)
  );

  return matches.map((m) => ({
    rxcui: m.rxcui || `local-${m.id}`,
    name: m.name,
    displayName: m.name,
    synonym: m.brandName || "",
    strengths: fallbackStrengths(m.name).strengths,
    isRxNorm: false
  }));
}

/**
 * Fetch available strengths and dosage forms for a specific RxCUI or drug name
 * @param {string} rxcui - RxNorm Concept Unique Identifier
 * @param {string} drugName - Medication name for lookup/fallback
 * @returns {Promise<{ rxcui: string, strengths: string[], dosageForms: string[], clinicalDrugs: string[] }>}
 */
export async function getMedicationStrengths(rxcui, drugName = "") {
  if (!rxcui && !drugName) {
    return { rxcui: "", strengths: [], dosageForms: [], clinicalDrugs: [] };
  }

  // 1. Check in-memory prefetched strengths from searchMedications
  const cleanDrugName = (drugName || "").trim().toLowerCase();
  if (rxcui && PREFETCHED_STRENGTHS.has(rxcui)) {
    const cachedStrengths = PREFETCHED_STRENGTHS.get(rxcui);
    if (cachedStrengths && cachedStrengths.length > 0) {
      return {
        rxcui,
        strengths: cachedStrengths,
        dosageForms: ["Oral Tablet", "Oral Capsule"],
        clinicalDrugs: []
      };
    }
  }
  if (cleanDrugName && PREFETCHED_STRENGTHS.has(cleanDrugName)) {
    const cachedStrengths = PREFETCHED_STRENGTHS.get(cleanDrugName);
    if (cachedStrengths && cachedStrengths.length > 0) {
      return {
        rxcui: rxcui || "",
        strengths: cachedStrengths,
        dosageForms: ["Oral Tablet", "Oral Capsule"],
        clinicalDrugs: []
      };
    }
  }

  const cacheKey = `rxnorm_strengths_v2_${rxcui || cleanDrugName}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        let activeRxcui = rxcui;

        // 2. Query RxTerms for standard strengths if drug name is provided
        if (drugName) {
          try {
            const rxTermsUrl = `${RXTERMS_BASE_URL}/search?terms=${encodeURIComponent(drugName)}&ef=STRENGTHS_AND_FORMS,RXCUIS&maxList=5`;
            const rxTermsRes = await fetchWithTimeout(rxTermsUrl, {}, 4000);
            if (rxTermsRes.ok) {
              const data = await rxTermsRes.json();
              const strengthsArr = data[2]?.STRENGTHS_AND_FORMS?.[0] || [];
              const rxcuiArr = data[2]?.RXCUIS?.[0] || [];
              if (strengthsArr.length > 0) {
                const cleanStrengths = strengthsArr.map((s) => s.trim()).filter(Boolean);
                if (!activeRxcui && rxcuiArr.length > 0) {
                  activeRxcui = String(rxcuiArr[0]);
                }
                return {
                  rxcui: activeRxcui || "",
                  strengths: cleanStrengths,
                  dosageForms: ["Oral Tablet", "Oral Capsule"],
                  clinicalDrugs: []
                };
              }
            }
          } catch (termsErr) {
            // Continue to RxNav allrelated lookup
          }
        }

        // 3. Query NIH RxNav allrelated.json if valid RxCUI
        if (activeRxcui && !activeRxcui.startsWith("local-")) {
          const url = `${RXNORM_BASE_URL}/rxcui/${activeRxcui}/allrelated.json`;
          const res = await fetchWithTimeout(url, {}, 4500);

          if (res.ok) {
            const data = await res.json();
            const groups = data?.allRelatedGroup?.conceptGroup || [];

            const scdGroup = groups.find((g) => g.tty === "SCD")?.conceptProperties || [];
            const scdfGroup = groups.find((g) => g.tty === "SCDF")?.conceptProperties || [];
            const combined = [...scdGroup, ...scdfGroup];

            const allNames = combined.map((c) => c.name).filter(Boolean);
            const strengths = extractStrengthsFromNames(allNames);
            const dosageForms = extractDosageFormsFromNames(allNames);

            if (strengths.length > 0) {
              return {
                rxcui: activeRxcui,
                strengths,
                dosageForms: dosageForms.length > 0 ? dosageForms : ["Oral Tablet"],
                clinicalDrugs: allNames.slice(0, 15)
              };
            }
          }
        }

        // 4. Fallback to standard presets
        return fallbackStrengths(drugName);
      },
      60 * 60 * 1000 // 1 hour TTL
    );
  } catch (err) {
    console.warn("rxnorm.getMedicationStrengths: Falling back to presets:", err.message);
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
    lisinopril: ["2.5 mg", "5 mg", "10 mg", "20 mg", "40 mg"],
    atorvastatin: ["10 mg", "20 mg", "40 mg", "80 mg"],
    amlodipine: ["2.5 mg", "5 mg", "10 mg"],
    verapamil: ["40 mg", "80 mg", "120 mg", "180 mg", "240 mg"],
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
