/**
 * cdcSchedule.js
 * CDC Immunization Information System (IIS) & CVX Standardization Service
 * Provides standardized CDC CVX vaccine codes and ACIP age-informed status evaluations.
 */

// CDC CVX Standard Immunization Groupings
export const CDC_STANDARD_VACCINES = [
  {
    cvx: "140",
    code: "FLU-INACT",
    name: "Influenza (Inactivated, Seasonal Flu)",
    plainName: "Annual Flu Shot",
    category: "Seasonal Respiratory",
    interval: "annual",
    minAge: 0.5,
    description: "Annual seasonal influenza immunization recommended for all individuals ≥ 6 months old."
  },
  {
    cvx: "311",
    code: "COVID19-UPD",
    name: "COVID-19 (Updated Seasonal Formula)",
    plainName: "COVID-19 Booster",
    category: "Seasonal Respiratory",
    interval: "annual",
    minAge: 0.5,
    description: "Updated formula booster against circulating SARS-CoV-2 spike protein variants."
  },
  {
    cvx: "115",
    code: "TDAP",
    name: "Tdap (Tetanus, Diphtheria, Pertussis)",
    plainName: "Tetanus / Whooping Cough Booster",
    category: "Routine Adult",
    interval: "10-year",
    minAge: 11,
    description: "Protects against lockjaw, diphtheria, and whooping cough. Required every 10 years."
  },
  {
    cvx: "187",
    code: "SHINGRIX",
    name: "Zoster Recombinant (Shingrix)",
    plainName: "Shingles Vaccine",
    category: "Older Adult Preventive",
    interval: "series-complete",
    targetDoses: 2,
    minAge: 50,
    description: "2-dose series recommended for adults 50 and older to prevent painful shingles and postherpetic neuralgia."
  },
  {
    cvx: "216",
    code: "PCV20",
    name: "Pneumococcal Conjugate (PCV20 / Prevnar 20)",
    plainName: "Pneumonia Vaccine",
    category: "Older Adult Preventive",
    interval: "once-at-65",
    minAge: 65,
    description: "Single-dose conjugate protection against 20 strains of Streptococcus pneumoniae for adults 65+ or high-risk."
  },
  {
    cvx: "165",
    code: "HPV9",
    name: "HPV 9-valent (Gardasil 9)",
    plainName: "Human Papillomavirus Vaccine",
    category: "Adolescent / Young Adult",
    interval: "series-complete",
    targetDoses: 3,
    minAge: 9,
    maxRecommendedAge: 45,
    description: "Protects against 9 strains of HPV associated with cervical, oropharyngeal, and anogenital cancers."
  },
  {
    cvx: "03",
    code: "MMR",
    name: "MMR (Measles, Mumps, Rubella)",
    plainName: "Measles-Mumps-Rubella Vaccine",
    category: "Core Immunity",
    interval: "series-complete",
    targetDoses: 2,
    minAge: 1,
    description: "Core childhood/adult series providing durable lifelong immunity against measles, mumps, and rubella."
  },
  {
    cvx: "21",
    code: "VARICELLA",
    name: "Varicella (Varivax)",
    plainName: "Chickenpox Vaccine",
    category: "Core Immunity",
    interval: "series-complete",
    targetDoses: 2,
    minAge: 1,
    description: "Live attenuated vaccine preventing chickenpox and subsequent primary varicella complications."
  },
  {
    cvx: "45",
    code: "HEPB",
    name: "Hepatitis B (Recombinant)",
    plainName: "Hepatitis B Vaccine",
    category: "Core Immunity",
    interval: "series-complete",
    targetDoses: 3,
    minAge: 0,
    description: "Universal recommendation for adults 19-59 to prevent acute and chronic Hepatitis B liver infection."
  },
  {
    cvx: "305",
    code: "RSV",
    name: "RSV (Abrysvo / Arexvy)",
    plainName: "RSV Vaccine",
    category: "Older Adult Preventive",
    interval: "once-at-60",
    minAge: 60,
    description: "Protects adults 60 and older against severe lower respiratory tract disease caused by RSV."
  }
];

/**
 * Return all standard CDC CVX vaccine definitions
 */
export function getStandardVaccines() {
  return CDC_STANDARD_VACCINES;
}

/**
 * Evaluates patient immunization status based on CDC ACIP intervals and derived age.
 * @param {string|object} vaccine - CVX code, name, or vaccine record object
 * @param {string} [dateAdministered] - ISO Date string YYYY-MM-DD
 * @param {number} [patientAge] - Patient derived age in years
 * @param {number} [doseNumber=1] - Dose sequence number
 * @returns {{
 *   status: 'up-to-date' | 'due' | 'recommended' | 'unverified' | 'not-indicated',
 *   label: string,
 *   isUpToDate: boolean,
 *   badgeColor: string,
 *   recommendationNote: string
 * }}
 */
export function evaluateVaccineStatus(vaccine, dateAdministered, patientAge = 35, doseNumber = 1) {
  // Extract fields if an object was passed
  let vaxName = "";
  let vaxCvx = "";
  let adminDateStr = dateAdministered;
  let dose = doseNumber;

  if (typeof vaccine === "object" && vaccine !== null) {
    vaxName = (vaccine.vaccine_name || vaccine.name || "").toLowerCase();
    vaxCvx = vaccine.cvx || "";
    adminDateStr = adminDateStr || vaccine.date_administered || vaccine.dateAdministered;
    dose = Number(vaccine.dose_number || vaccine.doseNumber || 1);
  } else if (typeof vaccine === "string") {
    vaxName = vaccine.toLowerCase();
    vaxCvx = vaccine;
  }

  // Find standard definition
  const match = CDC_STANDARD_VACCINES.find(
    (s) => s.cvx === vaxCvx || s.code.toLowerCase() === vaxName || vaxName.includes(s.plainName.toLowerCase()) || s.name.toLowerCase().includes(vaxName)
  );

  const age = Number(patientAge) || 35;

  // If unadministered
  if (!adminDateStr) {
    // Check if age-indicated
    if (match && match.minAge && age < match.minAge) {
      return {
        status: "not-indicated",
        label: `Indicated at Age ${match.minAge}+`,
        isUpToDate: true,
        badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700",
        recommendationNote: `Not currently indicated for patient age (${age} yrs). Indicated at age ${match.minAge}.`
      };
    }

    return {
      status: "due",
      label: "Recommended / Due",
      isUpToDate: false,
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
      recommendationNote: match?.description || "Vaccine documentation recommended."
    };
  }

  const adminDate = new Date(adminDateStr);
  if (isNaN(adminDate.getTime())) {
    return {
      status: "unverified",
      label: "Unverified Date",
      isUpToDate: false,
      badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700",
      recommendationNote: "Administered date format unverified."
    };
  }

  const now = new Date();
  const diffMonths = (now.getFullYear() - adminDate.getFullYear()) * 12 + (now.getMonth() - adminDate.getMonth());
  const diffYears = diffMonths / 12;

  // 1. Seasonal Influenza
  if (vaxName.includes("flu") || vaxName.includes("influenza") || vaxCvx === "140") {
    if (diffMonths <= 12) {
      return {
        status: "up-to-date",
        label: "Up to Date (This Season)",
        isUpToDate: true,
        badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
        recommendationNote: "Seasonal influenza vaccination current."
      };
    }
    return {
      status: "due",
      label: "Due for Autumn Flu Shot",
      isUpToDate: false,
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
      recommendationNote: "Annual booster due for current respiratory viral season."
    };
  }

  // 2. Updated COVID-19 Formula
  if (vaxName.includes("covid") || vaxName.includes("sars") || vaxCvx === "311" || vaxCvx === "208") {
    if (diffMonths <= 12) {
      return {
        status: "up-to-date",
        label: "Up to Date (Updated Booster)",
        isUpToDate: true,
        badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
        recommendationNote: "Updated formulation booster current within 12 months."
      };
    }
    return {
      status: "due",
      label: "Recommended Updated Booster",
      isUpToDate: false,
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
      recommendationNote: "Booster recommended with latest circulating variant formulation."
    };
  }

  // 3. Tdap / Tetanus (10-Year Interval)
  if (vaxName.includes("tdap") || vaxName.includes("tetanus") || vaxCvx === "115") {
    if (diffYears < 10) {
      const remainingYears = Math.max(1, Math.round(10 - diffYears));
      return {
        status: "up-to-date",
        label: `Up to Date (${remainingYears} yrs remaining)`,
        isUpToDate: true,
        badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
        recommendationNote: `Next booster indicated in approximately ${remainingYears} year(s).`
      };
    }
    return {
      status: "due",
      label: "Booster Due (10-Yr Interval Exceeded)",
      isUpToDate: false,
      badgeColor: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700",
      recommendationNote: "More than 10 years elapsed since last documented Tdap dose."
    };
  }

  // 4. Shingrix (Zoster Recombinant - Age 50+, 2 doses)
  if (vaxName.includes("shingrix") || vaxName.includes("zoster") || vaxCvx === "187") {
    if (dose >= 2) {
      return {
        status: "up-to-date",
        label: "Series Complete (Protected)",
        isUpToDate: true,
        badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
        recommendationNote: "Completed 2-dose series for shingles prevention."
      };
    }
    return {
      status: "due",
      label: "Dose 2 Due",
      isUpToDate: false,
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
      recommendationNote: "Second dose of Shingrix recommended 2-6 months after Dose 1."
    };
  }

  // 5. Pneumococcal (PCV20 - Age 65+)
  if (vaxName.includes("pneumo") || vaxName.includes("pcv") || vaxCvx === "216") {
    return {
      status: "up-to-date",
      label: "Up to Date (Documented)",
      isUpToDate: true,
      badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
      recommendationNote: "Pneumococcal conjugate vaccination documented."
    };
  }

  // Default fallback for general vaccines
  return {
    status: "up-to-date",
    label: "Documented",
    isUpToDate: true,
    badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
    recommendationNote: "Vaccine documented in clinical health record."
  };
}
