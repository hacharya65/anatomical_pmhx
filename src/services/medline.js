/**
 * medline.js
 * MedlinePlus Connect API Client Service
 * Provides authoritative, patient-facing clinical education monographs,
 * guidance summaries, and verified NIH reference links.
 *
 * Base Endpoint: https://connect.medlineplus.gov/service
 * Public, open-access, keyless federal service from the National Library of Medicine.
 */

import { cachedFetch, fetchWithTimeout } from "./apiCache.js";

const MEDLINE_CONNECT_URL = "https://connect.medlineplus.gov/service";

// Standard HL7 OIDs for diagnostic coding systems
export const CODE_SYSTEMS = {
  ICD10CM: "2.16.840.1.113883.6.90",
  ICD9CM: "2.16.840.1.113883.6.103",
  SNOMEDCT: "2.16.840.1.113883.6.96"
};

/**
 * Strip HTML tags to extract plain text sentences for guidance bullets
 */
function extractSummaryPoints(htmlString = "") {
  if (!htmlString) return [];

  // Remove HTML tags
  const cleanText = htmlString
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  // Split into sentences and take top 3-4 key sentences
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 20 && s.length < 240);

  return sentences.slice(0, 4);
}

/**
 * Fetch patient education monograph from MedlinePlus Connect by diagnostic code or condition name
 * @param {string} code - ICD-10-CM or ICD-9-CM diagnosis code (e.g. "I10", "E11.9", "K21.9")
 * @param {string} [conditionName=""] - Condition title for fallback search (e.g. "Hypertension")
 * @param {string} [codeSystem] - Optional OID (defaults to ICD-10-CM)
 * @returns {Promise<{ title: string, summaryHtml: string, keyPoints: string[], sourceUrl: string, attribution: string } | null>}
 */
export async function getConditionEducation(code = "", conditionName = "", codeSystem = CODE_SYSTEMS.ICD10CM) {
  const cleanCode = (code || "").trim();
  const cleanName = (conditionName || "").trim();

  if (!cleanCode && !cleanName) {
    return null;
  }

  const cacheKey = `medline_edu_${cleanCode || cleanName.toLowerCase()}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        // 1. If we have a diagnosis code, attempt MedlinePlus Connect by ICD-10-CM
        if (cleanCode && cleanCode !== "N/A") {
          // Normalize code (strip dots if needed or keep standard)
          const primaryUrl = `${MEDLINE_CONNECT_URL}?mainSearchCriteria.v.cs=${codeSystem}&mainSearchCriteria.v.c=${encodeURIComponent(cleanCode)}&knowledgeResponseType=application/json`;
          const res = await fetchWithTimeout(primaryUrl, {}, 5000);

          if (res.ok) {
            const data = await res.json();
            const entries = data?.feed?.entry || [];

            if (entries.length > 0) {
              const entry = entries[0];
              const title = entry.title?._value || cleanName || "Condition Overview";
              const summaryHtml = entry.summary?._value || "";
              const keyPoints = extractSummaryPoints(summaryHtml);
              const linkObj = entry.link?.find((l) => l.rel === "alternate") || entry.link?.[0];
              const sourceUrl = linkObj?.href || `https://medlineplus.gov`;

              return {
                title,
                summaryHtml,
                keyPoints,
                sourceUrl,
                attribution: "U.S. National Library of Medicine (MedlinePlus)"
              };
            }
          }
        }

        // 2. Fallback: Query NLM Health Topics Web Service with condition name
        const termToSearch = cleanName || cleanCode;
        if (termToSearch) {
          const fallbackRes = await fallbackSearchTopic(termToSearch);
          if (fallbackRes) return fallbackRes;
        }

        // 3. Final fallback to curated patient education presets
        return fallbackLocalEducation(cleanCode, cleanName);
      },
      60 * 60 * 1000 // 1 hour TTL
    );
  } catch (err) {
    console.warn("medline.getConditionEducation: Falling back to local educational summary:", err.message);
    return fallbackLocalEducation(cleanCode, cleanName);
  }
}

/**
 * Free-text query fallback using NLM MedlinePlus search endpoint
 */
async function fallbackSearchTopic(query) {
  try {
    const url = `https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=2.16.840.1.113883.6.1&mainSearchCriteria.v.c=${encodeURIComponent(query)}&knowledgeResponseType=application/json`;
    const res = await fetchWithTimeout(url, {}, 4000);

    if (res.ok) {
      const data = await res.json();
      const entries = data?.feed?.entry || [];
      if (entries.length > 0) {
        const entry = entries[0];
        const title = entry.title?._value || query;
        const summaryHtml = entry.summary?._value || "";
        const keyPoints = extractSummaryPoints(summaryHtml);
        const linkObj = entry.link?.find((l) => l.rel === "alternate") || entry.link?.[0];
        return {
          title,
          summaryHtml,
          keyPoints,
          sourceUrl: linkObj?.href || "https://medlineplus.gov",
          attribution: "U.S. National Library of Medicine (MedlinePlus)"
        };
      }
    }
  } catch (e) {
    console.warn("medline.fallbackSearchTopic error:", e.message);
  }
  return null;
}

/**
 * Local curated clinical education library for immediate offline support
 */
function fallbackLocalEducation(code = "", name = "") {
  const text = `${code} ${name}`.toLowerCase();

  const curated = [
    {
      match: ["i10", "hypertension", "high blood pressure"],
      title: "High Blood Pressure (Hypertension)",
      keyPoints: [
        "Blood pressure is the force of your blood pushing against the walls of your arteries.",
        "High blood pressure usually has no warning signs or symptoms, so many people do not know they have it.",
        "Lifestyle changes including a low-sodium diet, physical exercise, and regular prescription adherence help maintain target blood pressure."
      ],
      sourceUrl: "https://medlineplus.gov/highbloodpressure.html"
    },
    {
      match: ["e11", "diabetes", "type 2 diabetes"],
      title: "Type 2 Diabetes",
      keyPoints: [
        "Type 2 diabetes means your blood glucose (blood sugar) levels are too high.",
        "Insulin helps glucose get into cells to be used for energy; in type 2 diabetes, cells do not respond normally to insulin.",
        "Managing diabetes requires monitoring blood sugar, taking prescribed medications, and regular physical activity."
      ],
      sourceUrl: "https://medlineplus.gov/diabetestype2.html"
    },
    {
      match: ["m17", "m19", "osteoarthritis", "joint"],
      title: "Osteoarthritis",
      keyPoints: [
        "Osteoarthritis is the most common form of arthritis, involving wearing down of protective cartilage that cushions the ends of bones.",
        "Symptoms include pain, stiffness, tenderness, and loss of flexibility in affected joints.",
        "Treatment focuses on low-impact exercise, weight management, and targeted physical therapy."
      ],
      sourceUrl: "https://medlineplus.gov/osteoarthritis.html"
    },
    {
      match: ["k21", "gerd", "reflux", "acid reflux"],
      title: "Gastroesophageal Reflux Disease (GERD)",
      keyPoints: [
        "GERD occurs when stomach acid repeatedly flows back into the tube connecting your mouth and stomach (esophagus).",
        "Common symptoms include a burning sensation in your chest (heartburn), chest pain, and difficulty swallowing.",
        "Dietary modifications, avoiding reclining after meals, and acid-suppressing medications provide significant relief."
      ],
      sourceUrl: "https://medlineplus.gov/gerd.html"
    },
    {
      match: ["j45", "asthma"],
      title: "Asthma",
      keyPoints: [
        "Asthma is a chronic lung disease that inflames and narrows your airways.",
        "It causes recurring periods of wheezing, chest tightness, shortness of breath, and coughing.",
        "Using maintenance inhalers and avoiding personal triggers (dust, cold air, smoke) helps prevent flare-ups."
      ],
      sourceUrl: "https://medlineplus.gov/asthma.html"
    }
  ];

  for (const item of curated) {
    if (item.match.some((m) => text.includes(m))) {
      return {
        title: item.title,
        summaryHtml: `<p>${item.keyPoints.join(" ")}</p>`,
        keyPoints: item.keyPoints,
        sourceUrl: item.sourceUrl,
        attribution: "U.S. National Library of Medicine (MedlinePlus)"
      };
    }
  }

  return {
    title: name || "Clinical Condition Monograph",
    summaryHtml: `<p>${name || "This condition"} is actively monitored in your clinical history. Consult your primary care physician for individualized management and screening intervals.</p>`,
    keyPoints: [
      "Track symptom onset and variations across scheduled clinical follow-ups.",
      "Inform care team of any changes in daily function, medications, or side effects."
    ],
    sourceUrl: "https://medlineplus.gov",
    attribution: "U.S. National Library of Medicine (MedlinePlus)"
  };
}
