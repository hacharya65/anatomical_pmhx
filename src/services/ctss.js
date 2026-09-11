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
 * Search standardized ICD-10-CM diagnostic conditions
 * @param {string} query - Search term (e.g. "hypertension", "diabetes", "I10")
 * @returns {Promise<Array<{ code: string, name: string, label: string }>>}
 */
export async function searchConditions(query) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const cacheKey = `ctss_icd10_${cleanQuery.toLowerCase()}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        // Must specify sf=code,name so it searches both the alphanumeric code and the disease title
        const url = `${CTSS_BASE_URL}/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(cleanQuery)}&df=code,name&maxList=20`;
        const res = await fetchWithTimeout(url, {}, 5000);

        if (!res.ok) {
          throw new Error(`CTSS ICD-10 HTTP ${res.status}`);
        }

        const data = await res.json();
        // Response format: [totalCount, [codes], null, [[code, name], ...]]
        const pairs = data[3] || [];

        return pairs.map(([code, name]) => ({
          code: code.trim(),
          name: name.trim(),
          label: `${code.trim()} - ${name.trim()}`
        }));
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
    (c.icd10 || "").toLowerCase().includes(q) ||
    (c.region || "").toLowerCase().includes(q)
  );

  return matches.map((c) => ({
    code: c.icd10 || "N/A",
    name: c.name,
    label: c.icd10 ? `${c.icd10} - ${c.name}` : c.name
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
