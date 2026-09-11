/**
 * ctss.js
 * NLM Clinical Tables Search Service (CTSS) API Client
 * Provides standardized ICD-10-CM diagnostic codes and HCPCS/Procedure search autocompletions.
 *
 * Base Endpoint: https://clinicaltables.nlm.nih.gov/api
 * Public, open-access, no API key required.
 */

import { cachedFetch, fetchWithTimeout } from "./apiCache.js";
import { CLINICAL_CATALOG } from "../lib/clinicalCatalog.js";

const CTSS_BASE_URL = "https://clinicaltables.nlm.nih.gov/api";

/**
 * Common Clinical Acronyms, Synonyms, and Layperson Terms mapped to official ICD-10-CM concepts.
 * Bridges discrepancies where the official ICD-10-CM title differs from common clinical or patient parlance
 * (e.g. "Peripheral Arterial Disease" -> I73.9 / I70.2; "High Blood Pressure" -> I10; "Heart Attack" -> I21.9).
 */
const CLINICAL_CONDITION_SYNONYMS = [
  {
    triggers: ["peripheral arterial disease", "peripheral artery disease", "pad", "pvd", "claudication", "poor circulation in legs"],
    substitutes: ["peripheral vascular", "atherosclerosis extremities"],
    directMatches: [
      { code: "I73.9", name: "Peripheral Arterial Disease (PAD) / Peripheral vascular disease, unspecified" },
      { code: "I70.209", name: "Atherosclerosis of native arteries of extremities (Peripheral Arterial Disease)" },
      { code: "I70.219", name: "Atherosclerosis of native arteries with intermittent claudication (PAD)" },
      { code: "I70.201", name: "Atherosclerosis of native arteries of extremities, right leg" },
      { code: "I70.202", name: "Atherosclerosis of native arteries of extremities, left leg" },
      { code: "I70.203", name: "Atherosclerosis of native arteries of extremities, bilateral legs" }
    ]
  },
  {
    triggers: ["cad", "coronary artery disease", "coronary disease", "ischemic heart disease", "heart disease", "blocked heart artery"],
    substitutes: ["coronary", "ischemic heart"],
    directMatches: [
      { code: "I25.10", name: "Atherosclerotic heart disease of native coronary artery (CAD)" },
      { code: "I25.9", name: "Chronic ischemic heart disease, unspecified" },
      { code: "I25.110", name: "Atherosclerotic heart disease of native coronary artery with unstable angina pectoris" }
    ]
  },
  {
    triggers: ["htn", "high blood pressure", "hypertension", "elevated bp"],
    substitutes: ["hypertension", "essential hypertension"],
    directMatches: [
      { code: "I10", name: "Essential (primary) hypertension (High Blood Pressure)" },
      { code: "I11.9", name: "Hypertensive heart disease without heart failure" },
      { code: "I12.9", name: "Hypertensive chronic kidney disease with stage 1 through stage 4 chronic kidney disease" }
    ]
  },
  {
    triggers: ["t2d", "t2dm", "type 2 diabetes", "diabetes", "high blood sugar", "adult onset diabetes"],
    substitutes: ["type 2 diabetes", "diabetes mellitus"],
    directMatches: [
      { code: "E11.9", name: "Type 2 diabetes mellitus without complications" },
      { code: "E11.65", name: "Type 2 diabetes mellitus with hyperglycemia" },
      { code: "E11.40", name: "Type 2 diabetes mellitus with diabetic neuropathy, unspecified" },
      { code: "E11.21", name: "Type 2 diabetes mellitus with diabetic nephropathy" },
      { code: "E10.9", name: "Type 1 diabetes mellitus without complications" }
    ]
  },
  {
    triggers: ["hyperlipidemia", "high cholesterol", "cholesterol", "dyslipidemia", "hypercholesterolemia"],
    substitutes: ["hyperlipidemia", "hypercholesterolemia"],
    directMatches: [
      { code: "E78.5", name: "Hyperlipidemia, unspecified (High Cholesterol)" },
      { code: "E78.00", name: "Pure hypercholesterolemia, unspecified" },
      { code: "E78.2", name: "Mixed hyperlipidemia" }
    ]
  },
  {
    triggers: ["chf", "heart failure", "congestive heart failure", "hfref", "hfpef", "weak heart"],
    substitutes: ["heart failure", "congestive heart failure"],
    directMatches: [
      { code: "I50.9", name: "Heart failure, unspecified (Congestive Heart Failure)" },
      { code: "I50.22", name: "Chronic systolic (congestive) heart failure (HFrEF)" },
      { code: "I50.32", name: "Chronic diastolic (congestive) heart failure (HFpEF)" }
    ]
  },
  {
    triggers: ["copd", "emphysema", "chronic bronchitis"],
    substitutes: ["chronic obstructive pulmonary", "emphysema"],
    directMatches: [
      { code: "J44.9", name: "Chronic obstructive pulmonary disease, unspecified (COPD)" },
      { code: "J44.1", name: "Chronic obstructive pulmonary disease with (acute) exacerbation" }
    ]
  },
  {
    triggers: ["ckd", "chronic kidney disease", "kidney failure", "renal failure", "reduced kidney function"],
    substitutes: ["chronic kidney disease"],
    directMatches: [
      { code: "N18.9", name: "Chronic kidney disease, unspecified (CKD)" },
      { code: "N18.30", name: "Chronic kidney disease, stage 3 unspecified" },
      { code: "N18.31", name: "Chronic kidney disease, stage 3a" },
      { code: "N18.32", name: "Chronic kidney disease, stage 3b" },
      { code: "N18.4", name: "Chronic kidney disease, stage 4" },
      { code: "N18.5", name: "Chronic kidney disease, stage 5" }
    ]
  },
  {
    triggers: ["gerd", "acid reflux", "heartburn", "reflux"],
    substitutes: ["esophageal reflux", "reflux"],
    directMatches: [
      { code: "K21.9", name: "Gastro-esophageal reflux disease without esophagitis (GERD)" },
      { code: "K21.00", name: "Gastro-esophageal reflux disease with esophagitis, without bleeding" }
    ]
  },
  {
    triggers: ["afib", "a-fib", "atrial fibrillation", "irregular heartbeat"],
    substitutes: ["atrial fibrillation"],
    directMatches: [
      { code: "I48.0", name: "Paroxysmal atrial fibrillation (AFib)" },
      { code: "I48.20", name: "Chronic atrial fibrillation, unspecified" },
      { code: "I48.91", name: "Unspecified atrial fibrillation" }
    ]
  },
  {
    triggers: ["dvt", "deep vein thrombosis", "blood clot leg"],
    substitutes: ["thrombosis vein"],
    directMatches: [
      { code: "I82.40", name: "Acute deep vein thrombosis of lower extremity, unspecified (DVT)" },
      { code: "I82.401", name: "Acute deep vein thrombosis of right lower extremity" },
      { code: "I82.402", name: "Acute deep vein thrombosis of left lower extremity" }
    ]
  },
  {
    triggers: ["stroke", "cva", "brain attack", "tia", "mini stroke"],
    substitutes: ["cerebral infarction", "transient ischemic"],
    directMatches: [
      { code: "I63.9", name: "Cerebral infarction, unspecified (Stroke / CVA)" },
      { code: "G45.9", name: "Transient cerebral ischemic attack, unspecified (TIA)" }
    ]
  },
  {
    triggers: ["heart attack", "mi", "myocardial infarction"],
    substitutes: ["myocardial infarction"],
    directMatches: [
      { code: "I21.9", name: "Acute myocardial infarction, unspecified (Heart Attack)" },
      { code: "I25.2", name: "Old myocardial infarction (History of Heart Attack)" }
    ]
  },
  {
    triggers: ["osteoarthritis", "oa", "joint wear", "degenerative joint disease"],
    substitutes: ["osteoarthritis"],
    directMatches: [
      { code: "M19.90", name: "Unspecified osteoarthritis, unspecified site" },
      { code: "M17.11", name: "Unilateral primary osteoarthritis, right knee" },
      { code: "M17.12", name: "Unilateral primary osteoarthritis, left knee" },
      { code: "M16.11", name: "Unilateral primary osteoarthritis, right hip" },
      { code: "M16.12", name: "Unilateral primary osteoarthritis, left hip" }
    ]
  },
  {
    triggers: ["asthma", "wheezing", "reactive airway"],
    substitutes: ["asthma"],
    directMatches: [
      { code: "J45.909", name: "Unspecified asthma, uncomplicated" },
      { code: "J45.40", name: "Moderate persistent asthma, uncomplicated" }
    ]
  },
  {
    triggers: ["sleep apnea", "osa", "snoring apnea"],
    substitutes: ["sleep apnea"],
    directMatches: [
      { code: "G47.33", name: "Obstructive sleep apnea (adult) (pediatric) (OSA)" }
    ]
  }
];

/**
 * Fetch ICD-10 pairs from NLM CTSS for a specific query string
 */
async function fetchCTSSPairs(searchTerm, maxList = 20) {
  const url = `${CTSS_BASE_URL}/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(searchTerm)}&df=code,name&maxList=${maxList}`;
  const res = await fetchWithTimeout(url, {}, 5000);
  if (!res.ok) return [];
  const data = await res.json();
  return data[3] || [];
}

/**
 * Search standardized ICD-10-CM diagnostic conditions with clinical synonym expansion.
 * @param {string} query - Search term (e.g. "peripheral arterial disease", "hypertension", "diabetes", "I10")
 * @returns {Promise<Array<{ code: string, icd10: string, name: string, label: string, isCtss: boolean }>>}
 */
export async function searchConditions(query) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const lowerQuery = cleanQuery.toLowerCase();
  const cacheKey = `ctss_icd10_v2_${lowerQuery}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const results = [];
        const seenCodes = new Set();

        const addResult = (code, name) => {
          const c = (code || "").trim();
          const n = (name || "").trim();
          if (!c || seenCodes.has(c.toUpperCase())) return;
          seenCodes.add(c.toUpperCase());
          results.push({
            code: c,
            icd10: c,
            name: n,
            label: `${c} - ${n}`,
            isCtss: true
          });
        };

        // 1. Check Clinical Synonym & Acronym Thesaurus
        // E.g. "peripheral arterial disease", "PAD", "HTN", "CAD", etc.
        const matchedSynonyms = CLINICAL_CONDITION_SYNONYMS.filter((entry) =>
          entry.triggers.some((t) => lowerQuery === t || lowerQuery.includes(t) || t.includes(lowerQuery))
        );

        // Add pre-mapped authoritative ICD-10 codes first for exact synonym matches
        for (const entry of matchedSynonyms) {
          if (entry.directMatches) {
            for (const dm of entry.directMatches) {
              addResult(dm.code, dm.name);
            }
          }
        }

        // 2. Query official NLM CTSS endpoint with the clean query
        let ctssPairs = await fetchCTSSPairs(cleanQuery, 20);

        // 3. If direct search returned 0 items and we have clinical substitutes, try querying the substitutes
        if (ctssPairs.length === 0 && matchedSynonyms.length > 0) {
          for (const entry of matchedSynonyms) {
            if (entry.substitutes) {
              for (const sub of entry.substitutes) {
                const subPairs = await fetchCTSSPairs(sub, 10);
                ctssPairs = [...ctssPairs, ...subPairs];
              }
            }
          }
        }

        // 4. Query relaxation: if still 0 items on a multi-word query, remove generic noise words
        if (ctssPairs.length === 0 && cleanQuery.includes(" ")) {
          const words = cleanQuery.split(/\s+/).filter(w => !["disease", "syndrome", "acute", "chronic", "unspecified", "of", "and"].includes(w.toLowerCase()));
          if (words.length > 0) {
            const relaxedQuery = words.join(" ");
            const relaxedPairs = await fetchCTSSPairs(relaxedQuery, 15);
            ctssPairs = [...ctssPairs, ...relaxedPairs];
          }
        }

        // Add CTSS results
        for (const [code, name] of ctssPairs) {
          addResult(code, name);
        }

        // 5. If still few results, augment with local catalog
        if (results.length < 3) {
          const local = fallbackSearchConditions(cleanQuery);
          for (const l of local) {
            addResult(l.code, l.name);
          }
        }

        return results.slice(0, 30);
      },
      60 * 60 * 1000 // 1 hour TTL
    );
  } catch (err) {
    console.warn("ctss.searchConditions: Network error, using local catalog fallback:", err.message);
    return fallbackSearchConditions(cleanQuery);
  }
}

/**
 * Fallback to local conditions catalog
 */
function fallbackSearchConditions(query) {
  const q = query.toLowerCase();
  const matches = (CLINICAL_CATALOG.conditions || []).filter((c) =>
    (c.name || "").toLowerCase().includes(q) ||
    (c.plainName || "").toLowerCase().includes(q) ||
    (c.icd10 || "").toLowerCase().includes(q) ||
    (c.region || "").toLowerCase().includes(q)
  );

  return matches.map((c) => ({
    code: c.icd10 || "N/A",
    icd10: c.icd10 || "N/A",
    name: c.name,
    label: c.icd10 ? `${c.icd10} - ${c.name}` : c.name,
    isCtss: false
  }));
}

/**
 * Search standardized procedures and surgical terms (HCPCS / Clinical Procedures)
 * @param {string} query - Procedure search term (e.g. "colonoscopy", "arthroplasty", "appendectomy")
 * @returns {Promise<Array<{ code: string, name: string, description: string, label: string }>>}
 */
export async function searchProcedures(query) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const cacheKey = `ctss_proc_${cleanQuery.toLowerCase()}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const url = `${CTSS_BASE_URL}/hcpcs/v3/search?terms=${encodeURIComponent(cleanQuery)}&df=code,short_desc,long_desc&maxList=20`;
        const res = await fetchWithTimeout(url, {}, 5000);

        if (!res.ok) {
          throw new Error(`CTSS HCPCS HTTP ${res.status}`);
        }

        const data = await res.json();
        const records = data[3] || [];

        if (records.length > 0) {
          return records.map(([code, shortDesc, longDesc]) => ({
            code: (code || "").trim(),
            name: (shortDesc || "").trim(),
            description: (longDesc || shortDesc || "").trim(),
            label: `${(code || "").trim()} - ${(shortDesc || "").trim()}`
          }));
        }

        // Secondary fallback to procedures table
        const procUrl = `${CTSS_BASE_URL}/procedures/v3/search?terms=${encodeURIComponent(cleanQuery)}&maxList=15`;
        const procRes = await fetchWithTimeout(procUrl, {}, 4000);
        if (procRes.ok) {
          const procData = await procRes.json();
          const procNames = procData[1] || [];
          return procNames.map((name) => ({
            code: "",
            name: name.trim(),
            description: name.trim(),
            label: name.trim()
          }));
        }

        return fallbackSearchProcedures(cleanQuery);
      },
      60 * 60 * 1000 // 1 hour TTL
    );
  } catch (err) {
    console.warn("ctss.searchProcedures: Network error, using local catalog fallback:", err.message);
    return fallbackSearchProcedures(cleanQuery);
  }
}

/**
 * Fallback to local surgeries and procedures catalog
 */
function fallbackSearchProcedures(query) {
  const q = query.toLowerCase();
  const surgeryMatches = (CLINICAL_CATALOG.surgeries || []).filter((s) =>
    (s.name || "").toLowerCase().includes(q) ||
    (s.site || "").toLowerCase().includes(q)
  );

  return surgeryMatches.map((s) => ({
    code: s.cpt || "",
    name: s.name,
    description: s.name,
    label: s.cpt ? `${s.cpt} - ${s.name}` : s.name
  }));
}
