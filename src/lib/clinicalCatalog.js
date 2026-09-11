/**
 * clinicalCatalog.js
 * Seed dataset of Top 50 Conditions, Surgeries, and Medications
 *
 * ANATOMICAL COORDINATE SYSTEM (Facing patient in Anterior View):
 * - Patient's Anatomical RIGHT = Negative X (Viewer's Left)
 * - Patient's Anatomical LEFT  = Positive X (Viewer's Right)
 * - Anterior = Positive Z | Posterior = Negative Z
 * - Head = Positive Y (~8.0), Feet = Negative Y (~ -10.0)
 */

/**
 * Determines whether a clinical item / marker is anatomically relevant for the
 * current viewing perspective ("anterior" vs "posterior").
 * e.g., Cardiac history, cholecystectomy, and foley catheter are Anterior only;
 * Spinal hardware, lumbar fusion, and renal flank are Posterior only.
 */
export function isItemRelevantForPerspective(item, perspective = "anterior") {
  if (!item) return false;

  // 1. Explicit property override
  if (item.isPosterior === true || item.view === "posterior" || item.perspective === "posterior") {
    return perspective === "posterior";
  }
  if (item.isAnterior === true || item.view === "anterior" || item.perspective === "anterior") {
    return perspective === "anterior";
  }

  // 2. Anatomical keywords
  const text = `${item.name || ""} ${item.region || ""} ${item.site || ""} ${item.incision || ""} ${item.system || ""}`.toLowerCase();

  const posteriorKeywords = [
    "posterior", "spine", "spinal", "lumbar", "sacral", "sacrum",
    "thoracic spine", "cervical spine", "vertebra", "vertebrae",
    "back", "flank", "renal", "kidney", "buttock", "gluteal",
    "occiput", "occipital", "scapula", "scapular", "nuchal",
    "discectomy", "laminectomy", "hardware", "fusion", "spondylolisthesis"
  ];

  const anteriorKeywords = [
    "anterior", "heart", "cardiac", "coronary", "sternum", "sternal",
    "chest", "breast", "abdomen", "abdominal", "epigastric",
    "ruq", "luq", "rlq", "llq", "gallbladder", "cholecystectomy",
    "umbilicus", "umbilical", "foley", "bladder", "urethra",
    "throat", "thyroid", "mouth", "face", "orbit", "knee"
  ];

  const hasPosterior = posteriorKeywords.some(kw => text.includes(kw));
  const hasAnterior = anteriorKeywords.some(kw => text.includes(kw));

  if (hasPosterior && !hasAnterior) {
    return perspective === "posterior";
  }
  if (hasAnterior && !hasPosterior) {
    return perspective === "anterior";
  }

  // 3. 3D Z-coordinate: Z < -0.15 is posterior, Z >= -0.15 is anterior
  if (item.coords && typeof item.coords.z === "number") {
    if (item.coords.z < -0.15) {
      return perspective === "posterior";
    }
    return perspective === "anterior";
  }

  // Default to anterior
  return perspective === "anterior";
}

/**
 * Intelligent Clinical Anatomical Localization Engine
 * Analyzes diagnosis title, ICD-10 code, plain name, and organ system keywords
 * to dynamically map new clinical conditions to their authentic 3D anatomical landmarks.
 * Eliminates generic pelvic/groin clustering at (0, 0, 0).
 *
 * @param {string|Object} conditionOrName - Condition name, ICD-10 label, or full condition object
 * @param {string} [icd10Code] - Optional ICD-10 code
 * @returns {{ coords: { x: number, y: number, z: number }, region: string, system: string, isPosterior: boolean }}
 */
export function localizeConditionAnatomically(conditionOrName, icd10Code = "") {
  let name = "";
  let icd10 = (icd10Code || "").trim().toUpperCase();
  let existingCoords = null;

  if (typeof conditionOrName === "string") {
    name = conditionOrName;
  } else if (conditionOrName && typeof conditionOrName === "object") {
    name = conditionOrName.name || conditionOrName.plainName || conditionOrName.title || "";
    icd10 = (conditionOrName.icd10 || conditionOrName.code || icd10).trim().toUpperCase();
    if (conditionOrName.coords && (conditionOrName.coords.x !== 0 || conditionOrName.coords.y !== 0)) {
      existingCoords = conditionOrName.coords;
    }
  }

  const q = name.toLowerCase();
  const code = icd10.split(".")[0]; // e.g. "I73", "I10", "E11"

  // 1. Lower Extremity Arteries & Peripheral Vasculature (PAD, PVD, Claudication, Arteriosclerosis, DVT)
  if (
    code === "I70" || code === "I73" || code === "I74" || code === "I82" ||
    q.includes("peripheral arterial") || q.includes("peripheral artery") ||
    q.includes("pad") || q.includes("pvd") || q.includes("claudication") ||
    q.includes("atherosclerosis of native arteries") || q.includes("poor circulation in leg") ||
    q.includes("deep vein thrombosis") || q.includes("dvt") || q.includes("arterial disease")
  ) {
    const isLeft = q.includes("left");
    return {
      coords: existingCoords || { x: isLeft ? 0.95 : -0.95, y: -4.8, z: 0.82 },
      region: "Lower Extremity Arteries / Peripheral Vasculature",
      system: "vascular",
      isPosterior: false
    };
  }

  // 2. Cardiac & Coronary (HTN, CAD, CHF, AFib, MI, Angina, Heart Failure)
  if (
    code === "I10" || code === "I11" || code === "I12" || code === "I13" ||
    code === "I20" || code === "I21" || code === "I25" || code === "I48" || code === "I50" ||
    q.includes("hypertension") || q.includes("high blood pressure") || q.includes("htn") ||
    q.includes("coronary") || q.includes("cad") || q.includes("heart failure") || q.includes("chf") ||
    q.includes("atrial fibrillation") || q.includes("afib") || q.includes("myocardial") || q.includes("angina") ||
    q.includes("cardiac") || q.includes("heart") || q.includes("arrhythmia")
  ) {
    return {
      coords: existingCoords || { x: 0.35, y: 4.25, z: 1.1 },
      region: "Heart / Thoracic Vasculature",
      system: "cardiac",
      isPosterior: false
    };
  }

  // 3. Pulmonary / Respiratory (Asthma, COPD, Sleep Apnea, Bronchitis)
  if (
    code.startsWith("J") || q.includes("asthma") || q.includes("copd") || q.includes("bronchitis") ||
    q.includes("emphysema") || q.includes("pneumonia") || q.includes("pulmonary") || q.includes("respiratory") ||
    q.includes("sleep apnea") || q.includes("osa")
  ) {
    if (q.includes("sleep apnea") || q.includes("osa") || code === "G47") {
      return {
        coords: existingCoords || { x: 0.0, y: 6.1, z: 0.8 },
        region: "Upper Airway / Pharynx",
        system: "respiratory",
        isPosterior: false
      };
    }
    return {
      coords: existingCoords || { x: -0.55, y: 4.5, z: 0.95 },
      region: "Bilateral Pulmonary Bronchial Tree",
      system: "respiratory",
      isPosterior: false
    };
  }

  // 4. Renal / Kidneys / Flank (CKD, Nephropathy, Renal Failure, Stones)
  if (
    code === "N18" || code === "N17" || code === "N19" || code === "N20" ||
    q.includes("chronic kidney") || q.includes("ckd") || q.includes("renal") || q.includes("kidney") || q.includes("nephropathy")
  ) {
    return {
      coords: existingCoords || { x: 0.72, y: 2.25, z: -0.85 },
      region: "Bilateral Renal Cortex (Posterior Flank)",
      system: "renal",
      isPosterior: true
    };
  }

  // 5. Gastrointestinal (GERD, Acid Reflux, Liver, Gallbladder, Stomach, Colon)
  if (
    code.startsWith("K") || q.includes("gerd") || q.includes("reflux") || q.includes("liver") ||
    q.includes("colon") || q.includes("gastric") || q.includes("gallbladder") || q.includes("cholecyst") ||
    q.includes("bowel") || q.includes("crohn") || q.includes("colitis")
  ) {
    if (q.includes("liver") || q.includes("gallbladder") || q.includes("hepatic") || q.includes("cholecyst") || code === "K70" || code === "K76" || code === "K80") {
      return {
        coords: existingCoords || { x: -0.7, y: 2.9, z: 0.95 },
        region: "Right Upper Quadrant / Liver & Gallbladder",
        system: "digestive",
        isPosterior: false
      };
    }
    if (q.includes("colon") || q.includes("bowel") || q.includes("crohn") || q.includes("diverticul") || q.includes("colitis") || code.startsWith("K5")) {
      return {
        coords: existingCoords || { x: 0.05, y: 1.5, z: 0.95 },
        region: "Lower Abdomen / Colonic Tract",
        system: "digestive",
        isPosterior: false
      };
    }
    return {
      coords: existingCoords || { x: 0.2, y: 3.2, z: 0.95 },
      region: "Stomach / Esophagus (Epigastric)",
      system: "digestive",
      isPosterior: false
    };
  }

  // 6. Endocrine / Metabolic (Diabetes, Thyroid, Hyperlipidemia)
  if (code.startsWith("E") || q.includes("diabetes") || q.includes("t2d") || q.includes("thyroid") || q.includes("cholesterol")) {
    if (q.includes("thyroid") || code === "E03" || code === "E06") {
      return {
        coords: existingCoords || { x: 0.0, y: 5.8, z: 0.85 },
        region: "Anterior Cervical Neck / Thyroid",
        system: "endocrine",
        isPosterior: false
      };
    }
    if (q.includes("cholesterol") || q.includes("hyperlipidemia") || code === "E78") {
      return {
        coords: existingCoords || { x: 0.35, y: 3.9, z: 1.0 },
        region: "Thoracic Vasculature / Metabolic",
        system: "cardiovascular",
        isPosterior: false
      };
    }
    return {
      coords: existingCoords || { x: 0.1, y: 2.7, z: 1.0 },
      region: "Pancreas / Epigastric Abdomen",
      system: "endocrine",
      isPosterior: false
    };
  }

  // 7. Cranial & Neurologic (Stroke, CVA, Migraine, Dementia, Neuropathy)
  if (
    code.startsWith("G") || code.startsWith("I6") || code.startsWith("F") ||
    q.includes("stroke") || q.includes("cva") || q.includes("migraine") || q.includes("headache") ||
    q.includes("neuropathy") || q.includes("dementia") || q.includes("brain") || q.includes("seizure")
  ) {
    return {
      coords: existingCoords || { x: 0.0, y: 7.2, z: 0.8 },
      region: "Cranial Vault / Central Nervous System",
      system: "neurologic",
      isPosterior: false
    };
  }

  // 8. Musculoskeletal & Joints (Knee, Hip, Spine, Lumbar, Shoulder)
  if (
    code.startsWith("M") || q.includes("osteoarthritis") || q.includes("arthritis") ||
    q.includes("knee") || q.includes("hip") || q.includes("spine") || q.includes("back") || q.includes("joint")
  ) {
    if (q.includes("knee") || code === "M17") {
      const isLeft = q.includes("left");
      return {
        coords: existingCoords || { x: isLeft ? 0.9 : -0.9, y: -4.55, z: 0.85 },
        region: isLeft ? "Left Knee Joint / Patellofemoral" : "Right Knee Joint / Patellofemoral",
        system: "orthopedic_knee",
        isPosterior: false
      };
    }
    if (q.includes("hip") || code === "M16") {
      const isLeft = q.includes("left");
      return {
        coords: existingCoords || { x: isLeft ? 1.1 : -1.1, y: -1.2, z: 0.85 },
        region: isLeft ? "Left Hip Joint" : "Right Hip Joint",
        system: "orthopedic_hip",
        isPosterior: false
      };
    }
    if (q.includes("spine") || q.includes("lumbar") || q.includes("back") || code.startsWith("M5") || code.startsWith("M4")) {
      return {
        coords: existingCoords || { x: 0.0, y: 1.9, z: -0.9 },
        region: "Lumbar-Sacral Spine (Posterior)",
        system: "spine",
        isPosterior: true
      };
    }
    if (q.includes("shoulder") || code === "M75") {
      const isLeft = q.includes("left");
      return {
        coords: existingCoords || { x: isLeft ? 2.3 : -2.3, y: 4.2, z: 0.5 },
        region: isLeft ? "Left Shoulder Joint" : "Right Shoulder Joint",
        system: "orthopedic",
        isPosterior: false
      };
    }
  }

  // 9. Genitourinary / Bladder / Prostate / Pelvic
  if (code.startsWith("N") || q.includes("bladder") || q.includes("uti") || q.includes("urinary") || q.includes("prostate")) {
    return {
      coords: existingCoords || { x: 0.0, y: 0.25, z: 0.85 },
      region: "Pelvis / Genitourinary System",
      system: "pelvic",
      isPosterior: false
    };
  }

  // Default: Anterior Midline Torso
  return {
    coords: existingCoords || { x: 0.0, y: 3.5, z: 1.0 },
    region: "Anterior Torso / Systemic",
    system: "general",
    isPosterior: false
  };
}

export const CLINICAL_CATALOG = {
  // Common Medical Conditions
  conditions: [
    {
      id: "cond-pad",
      name: "Peripheral Arterial Disease (PAD)",
      plainName: "Poor Leg Circulation / PAD",
      region: "Lower Extremity Arteries / Peripheral Vasculature",
      icd10: "I73.9",
      coords: { x: -0.95, y: -4.8, z: 0.82 },
      system: "vascular",
      notes: "Atherosclerotic narrowing of lower extremity native arteries causing claudication."
    },
    {
      id: "cond-htn",
      name: "Hypertension (Essential)",
      plainName: "High Blood Pressure",
      region: "Heart / Thoracic Vasculature",
      icd10: "I10",
      coords: { x: 0.35, y: 4.25, z: 1.1 },
      system: "cardiac",
      notes: "Stage 2 primary hypertension under pharmacotherapy. Monitored for vascular impact."
    },
    {
      id: "cond-t2d",
      name: "Type 2 Diabetes Mellitus",
      plainName: "Type 2 Diabetes (High Blood Sugar)",
      region: "Pancreas / Epigastric Abdomen",
      icd10: "E11.9",
      coords: { x: 0.1, y: 2.7, z: 1.0 },
      system: "endocrine",
      notes: "Adult-onset metabolic dysfunction. Target HbA1c < 7.0%."
    },
    {
      id: "cond-asthma",
      name: "Bronchial Asthma",
      plainName: "Asthma (Breathing Difficulty)",
      region: "Bilateral Pulmonary Bronchial Tree",
      icd10: "J45.909",
      coords: { x: -0.5, y: 4.5, z: 1.0 },
      system: "respiratory",
      notes: "Mild persistent airway hyperresponsiveness triggered by cold air and allergens."
    },
    {
      id: "cond-gerd",
      name: "Gastroesophageal Reflux Disease (GERD)",
      plainName: "Acid Reflux / Heartburn",
      region: "Lower Esophagus / Epigastrium",
      icd10: "K21.9",
      coords: { x: 0.15, y: 3.4, z: 1.0 },
      system: "digestive",
      notes: "Chronic nocturnal acid regurgitation and postprandial pyrosis."
    },
    {
      id: "cond-afib",
      name: "Atrial Fibrillation (Paroxysmal)",
      plainName: "Irregular Heartbeat (AFib)",
      region: "Left Atrium / Conduction System",
      icd10: "I48.0",
      coords: { x: 0.45, y: 4.6, z: 0.9 },
      system: "cardiac",
      notes: "Intermittent tachyarrhythmia managed on oral anticoagulation and rate control."
    },
    {
      id: "cond-hypothyroid",
      name: "Primary Hypothyroidism",
      plainName: "Underactive Thyroid Gland",
      region: "Anterior Cervical Neck / Thyroid",
      icd10: "E03.9",
      coords: { x: 0.0, y: 5.7, z: 0.65 },
      system: "endocrine",
      notes: "Chronic autoimmune Hashimoto's thyroiditis stabilized on levothyroxine."
    },
    {
      id: "cond-oa",
      name: "Osteoarthritis",
      plainName: "Joint Wear & Tear (Osteoarthritis)",
      region: "Knee Joint",
      icd10: "M17.9",
      coords: { x: -1.18, y: -4.25, z: 0.8 },
      system: "orthopedic_knee",
      hasLaterality: true,
      notes: "Degenerative joint disease."
    },
    {
      id: "cond-cad",
      name: "Coronary Artery Disease (CAD)",
      plainName: "Heart Artery Disease (Blocked Arteries)",
      region: "Coronary Arteries (LAD & RCA)",
      icd10: "I25.10",
      coords: { x: 0.3, y: 3.9, z: 1.15 },
      system: "cardiac",
      notes: "Atherosclerotic ischemic heart disease with prior bypass revascularization."
    },
    {
      id: "cond-ckd",
      name: "Chronic Kidney Disease (Stage 3a)",
      plainName: "Reduced Kidney Function",
      region: "Left Posterior Flank / Renal Cortex",
      icd10: "N18.31",
      coords: { x: 0.8, y: 2.6, z: -0.9 },
      system: "renal",
      isPosterior: true,
      notes: "eGFR ~52 mL/min/1.73m² secondary to hypertensive nephrosclerosis."
    },
    {
      id: "cond-migraine",
      name: "Chronic Migraine with Aura",
      plainName: "Severe Migraine Headaches",
      region: "Right Frontotemporal Cranium",
      icd10: "G43.909",
      coords: { x: -0.7, y: 7.8, z: 0.8 },
      system: "neurologic",
      notes: "Throbbing unilateral cephalalgia with visual scintillating scotoma."
    },
    {
      id: "cond-mdd",
      name: "Major Depressive Disorder",
      plainName: "Clinical Depression",
      region: "Prefrontal Cortex / Neuroaxis",
      icd10: "F33.0",
      coords: { x: 0.0, y: 8.2, z: 0.7 },
      system: "neurologic",
      notes: "Recurrent episodes in remission with selective serotonin reuptake inhibitor."
    },
    {
      id: "cond-hyperlipid",
      name: "Hyperlipidemia (Mixed)",
      plainName: "High Cholesterol & Blood Fats",
      region: "Aortic Arch & Vasculature",
      icd10: "E78.2",
      coords: { x: -0.1, y: 4.8, z: 1.0 },
      system: "cardiac",
      notes: "Elevated LDL cholesterol and triglycerides controlled with statin therapy."
    },
    {
      id: "cond-crohn",
      name: "Crohn's Disease",
      plainName: "Crohn's Inflammatory Bowel Disease",
      region: "Terminal Ileum / RLQ",
      icd10: "K50.00",
      coords: { x: -0.6, y: 1.5, z: 0.9 },
      system: "digestive",
      notes: "Transmural regional enteritis with episodic cramping and mucosal ulcerations."
    },
    {
      id: "cond-osteopor",
      name: "Osteoporosis",
      plainName: "Thin or Fragile Bones",
      region: "Lumbar Vertebrae / Spine",
      icd10: "M81.0",
      coords: { x: 0.0, y: 2.1, z: -0.85 },
      system: "orthopedic",
      isPosterior: true,
      notes: "DEXA T-score -2.8 at L1-L4 spine. Managed on antiresorptive therapy."
    },
    {
      id: "cond-glaucoma",
      name: "Primary Open-Angle Glaucoma",
      plainName: "High Eye Pressure (Glaucoma)",
      region: "Left Orbit / Optic Nerve",
      icd10: "H40.11",
      coords: { x: 0.38, y: 7.7, z: 0.95 },
      system: "ophthalmic",
      notes: "Elevated IOP controlled on prostaglandin analog topical drops."
    },
    {
      id: "cond-ra",
      name: "Rheumatoid Arthritis",
      plainName: "Autoimmune Joint Inflammation",
      region: "Right Hand / MCP & PIP Joints",
      icd10: "M06.9",
      coords: { x: -3.1, y: -1.7, z: 0.3 },
      system: "orthopedic",
      notes: "Systemic symmetric polyarthritis with morning joint stiffness."
    },
    {
      id: "cond-osa",
      name: "Obstructive Sleep Apnea (OSA)",
      plainName: "Sleep Breathing Pauses (Sleep Apnea)",
      region: "Oropharynx / Upper Airway",
      icd10: "G47.33",
      coords: { x: 0.0, y: 6.4, z: 0.7 },
      system: "respiratory",
      notes: "Moderate nocturnal airway collapse (AHI: 22). Compliant with auto-CPAP."
    },
    {
      id: "cond-copd",
      name: "COPD / Chronic Bronchitis",
      plainName: "Chronic Obstructive Lung Disease",
      region: "Right Pulmonary Parenchyma",
      icd10: "J44.9",
      coords: { x: -0.8, y: 3.8, z: 0.95 },
      system: "respiratory",
      notes: "Exertional dyspnea and chronic productive morning cough."
    },
    {
      id: "cond-cholelith",
      name: "Cholelithiasis (History)",
      plainName: "Gallstones History",
      region: "Right Upper Quadrant (Gallbladder)",
      icd10: "K80.20",
      coords: { x: -0.75, y: 2.85, z: 0.95 },
      system: "digestive",
      notes: "Prior biliary colic episodes resolved following elective cholecystectomy."
    },
    {
      id: "cond-epilepsy",
      name: "Generalized Epilepsy",
      plainName: "Seizure Disorder (Epilepsy)",
      region: "Temporal Lobe / Cerebral Cortex",
      icd10: "G40.909",
      coords: { x: 0.8, y: 7.7, z: 0.4 },
      system: "neurologic",
      notes: "Controlled tonic-clonic seizure history; seizure-free over 4 years."
    }
  ],

  // 15 Surgical Procedures
  surgeries: [
    {
      id: "surg-lap-chole",
      name: "Laparoscopic Cholecystectomy",
      plainName: "Gallbladder Removal Surgery",
      site: "Right Upper Quadrant (RUQ)",
      incision: "4-trocar laparoscopic punctures (umbilical, epigastric, 2 subcostal in RUQ)",
      coords: { x: -0.92, y: 3.25, z: 1.05 },
      system: "digestive",
      surgeon: "Dr. Sarah Jenkins, FACS",
      hospital: "Mass General Hospital",
      notes: "Elective laparoscopic gallbladder removal for symptomatic cholelithiasis."
    },
    {
      id: "surg-appendectomy",
      name: "Appendectomy (Laparoscopic)",
      plainName: "Appendix Removal Surgery",
      site: "Right Lower Quadrant / McBurney's Point",
      incision: "Tri-port laparoscopic puncture scars in RLQ",
      coords: { x: -0.8, y: 1.2, z: 0.95 },
      system: "digestive",
      surgeon: "Dr. Marcus Vance, MD",
      hospital: "St. Jude Surgical Pavilion",
      notes: "Emergent resection for acute non-perforated appendicitis."
    },
    {
      id: "surg-c-section",
      name: "Cesarean Section (Low Transverse)",
      plainName: "C-Section Delivery",
      site: "Suprapubic Pelvis",
      incision: "Pfannenstiel horizontal low transverse incision (12 cm)",
      coords: { x: 0.0, y: 0.4, z: 1.15 },
      system: "pelvic",
      surgeon: "Dr. Linda Chen, MD (OB/GYN)",
      hospital: "Women's Specialty Pavilion",
      notes: "Primary low cervical C-section for cephalopelvic disproportion."
    },
    {
      id: "surg-tka-right",
      name: "Knee Arthroplasty / Joint Replacement",
      plainName: "Knee Arthroplasty / Joint Replacement",
      site: "Anterior Knee Joint",
      incision: "Midline anterior longitudinal knee incision (15 cm)",
      coords: { x: -0.82, y: -4.55, z: 0.82 },
      system: "orthopedic_knee",
      surgeon: "Dr. David Sterling, MD",
      hospital: "New England Orthopedic Institute",
      notes: "Cobalt-chromium and crosslinked polyethylene bicompartmental prosthesis."
    },
    {
      id: "surg-cabg",
      name: "Coronary Artery Bypass Graft (CABG x3)",
      plainName: "Coronary Artery Bypass Graft (CABG)",
      site: "Anterior Midline Thorax",
      incision: "Median sternotomy scar & right saphenous vein harvest sites",
      coords: { x: 0.0, y: 4.1, z: 1.25 },
      system: "cardiac",
      surgeon: "Dr. Anthony Hayes, MD (Cardiothoracic)",
      hospital: "Heart & Vascular Center",
      notes: "LIMA to LAD, SVG to OM1 and RCA. Excellent sternal union."
    },
    {
      id: "surg-cataract",
      name: "Cataract Extraction with Intraocular Lens",
      plainName: "Cataract Extraction with Intraocular Lens",
      site: "Eye / Corneal Limbus",
      incision: "Clear corneal micro-incision (2.4 mm)",
      coords: { x: -0.38, y: 7.7, z: 0.98 },
      system: "ophthalmic",
      surgeon: "Dr. Kenneth Moore, MD",
      hospital: "Eye & Ear Infirmary",
      notes: "Phacoemulsification with posterior chamber intraocular lens implant."
    },
    {
      id: "surg-hernia",
      name: "Inguinal Hernia Repair",
      plainName: "Inguinal Hernia Repair",
      site: "Inguinal Canal / Groin",
      incision: "Oblique groin incision with polypropylene mesh",
      coords: { x: -0.6, y: 0.6, z: 1.1 },
      system: "pelvic",
      surgeon: "Dr. Richard Becker, MD",
      hospital: "Metro Ambulatory Surgery Center",
      notes: "Lichtenstein tension-free mesh reinforcement for indirect inguinal defect."
    },
    {
      id: "surg-carpal-tunnel",
      name: "Carpal Tunnel Release",
      plainName: "Carpal Tunnel Release",
      site: "Volar Wrist",
      incision: "Palmar incision along thenar crease (2.5 cm)",
      coords: { x: -3.05, y: -1.1, z: 0.35 },
      system: "orthopedic",
      surgeon: "Dr. Patricia Ramos, MD",
      hospital: "Hand & Microsurgery Center",
      notes: "Open division of the transverse carpal ligament with median nerve decompression."
    },
    {
      id: "surg-discectomy",
      name: "Lumbar Microdiscectomy (L4-L5)",
      plainName: "Lumbar Microdiscectomy (L4-L5)",
      site: "Posterior Midline Lumbar Spine",
      incision: "Posterior midline vertical lumbar incision (3 cm)",
      coords: { x: 0.0, y: 1.8, z: -1.05 },
      system: "spine",
      isPosterior: true,
      surgeon: "Dr. Julian Thorne, MD (Neurosurgery)",
      hospital: "Spine & Neuroscience Hospital",
      notes: "Flavotomy and microdiscectomy for herniated L4-L5 disc fragment."
    },
    {
      id: "surg-tha-left",
      name: "Hip Arthroplasty / Joint Replacement",
      plainName: "Hip Arthroplasty / Joint Replacement",
      site: "Posterolateral Hip",
      incision: "Posterolateral curved incision over greater trochanter",
      coords: { x: 1.35, y: 0.5, z: 0.4 },
      system: "orthopedic_hip",
      surgeon: "Dr. David Sterling, MD",
      hospital: "New England Orthopedic Institute",
      notes: "Uncemented ceramic-on-polyethylene press-fit femoral stem and acetabular cup."
    },
    {
      id: "surg-rotator-cuff",
      name: "Rotator Cuff Repair",
      plainName: "Rotator Cuff Repair",
      site: "Anterior-Lateral Shoulder",
      incision: "Arthroscopic portal puncture scars",
      coords: { x: -2.45, y: 4.9, z: 0.6 },
      system: "orthopedic",
      surgeon: "Dr. Brian Gallagher, MD",
      hospital: "Sports Medicine Surgical Institute",
      notes: "Double-row suture anchor repair of full-thickness supraspinatus tendon tear."
    },
    {
      id: "surg-thyroid",
      name: "Total Thyroidectomy",
      plainName: "Total Thyroidectomy",
      site: "Anterior Low Cervical Neck",
      incision: "Low transverse collar incision following natural skin crease",
      coords: { x: 0.0, y: 5.6, z: 0.65 },
      system: "endocrine",
      surgeon: "Dr. Christine Bailey, FACS",
      hospital: "Endocrine Surgery Associates",
      notes: "Bilateral thyroid lobe resection preserving recurrent laryngeal nerves."
    },
    {
      id: "surg-tonsils",
      name: "Bilateral Tonsillectomy",
      plainName: "Bilateral Tonsillectomy",
      site: "Oropharynx / Palatine Tonsils",
      incision: "Internal mucosal electrocautery (no external scar)",
      coords: { x: 0.0, y: 6.2, z: 0.6 },
      system: "respiratory",
      surgeon: "Dr. Eric Watson, MD (ENT)",
      hospital: "Children's & Community Hospital",
      notes: "Childhood excision for recurrent tonsillitis and airway resistance."
    },
    {
      id: "surg-pacemaker",
      name: "Dual-Chamber Pacemaker Implantation",
      plainName: "Dual-Chamber Pacemaker Implantation",
      site: "Left Subclavian Prepectoral Region",
      incision: "Horizontal infraclavicular pocket incision on left chest (4 cm)",
      coords: { x: 1.2, y: 4.7, z: 1.05 },
      system: "cardiac",
      surgeon: "Dr. Gregory Miller, MD (Electrophysiology)",
      hospital: "Cardiac Arrhythmia Pavilion",
      notes: "Transvenous atrial and ventricular leads for symptomatic sinus bradycardia."
    },
    {
      id: "surg-lumpectomy",
      name: "Partial Mastectomy (Lumpectomy)",
      plainName: "Partial Mastectomy (Lumpectomy)",
      site: "Upper Outer Breast Quadrant",
      incision: "Curvilinear incision with sentinel lymph node biopsy scar",
      coords: { x: 1.1, y: 3.9, z: 1.2 },
      system: "pelvic",
      surgeon: "Dr. Rebecca Nolan, MD (Surgical Oncology)",
      hospital: "Dana Farber Cancer Institute",
      notes: "Clear surgical margins obtained for localized ductal carcinoma in situ."
    }
  ],

  // 15 Standard Clinical Medications
  medications: [
    {
      id: "med-lisinopril",
      name: "Lisinopril",
      dosage: "20 mg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Hypertension (Essential)",
      system: "cardiac",
      prescriber: "Dr. R. Adams, MD",
      instructions: "Take in the morning with water. Monitor blood pressure periodically."
    },
    {
      id: "med-metformin",
      name: "Metformin Extended-Release",
      dosage: "1000 mg",
      route: "Oral (PO)",
      frequency: "Twice Daily (BID)",
      indication: "Type 2 Diabetes Mellitus",
      system: "endocrine",
      prescriber: "Dr. R. Adams, MD",
      instructions: "Take with meals to minimize gastrointestinal discomfort."
    },
    {
      id: "med-atorvastatin",
      name: "Atorvastatin",
      dosage: "40 mg",
      route: "Oral (PO)",
      frequency: "Once Daily at Bedtime (QHS)",
      indication: "Hyperlipidemia & Atherosclerosis",
      system: "cardiac",
      prescriber: "Dr. Anthony Hayes, MD",
      instructions: "Take nightly. Report any unexplained muscle soreness or weakness."
    },
    {
      id: "med-omeprazole",
      name: "Omeprazole Delayed-Release",
      dosage: "20 mg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "GERD & Acid Reflux",
      system: "digestive",
      prescriber: "Dr. R. Adams, MD",
      instructions: "Take 30 to 60 minutes prior to first morning meal."
    },
    {
      id: "med-apixaban",
      name: "Apixaban (Eliquis)",
      dosage: "5 mg",
      route: "Oral (PO)",
      frequency: "Twice Daily (BID)",
      indication: "Atrial Fibrillation (Stroke Prevention)",
      system: "cardiac",
      prescriber: "Dr. Gregory Miller, MD",
      instructions: "Take consistently 12 hours apart. Do not skip doses."
    },
    {
      id: "med-levothyroxine",
      name: "Levothyroxine Sodium",
      dosage: "88 mcg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Primary Hypothyroidism",
      system: "endocrine",
      prescriber: "Dr. Christine Bailey, FACS",
      instructions: "Take on empty stomach 60 minutes before breakfast with full glass of water."
    },
    {
      id: "med-albuterol",
      name: "Albuterol Sulfate HFA Inhaler",
      dosage: "90 mcg/actuation",
      route: "Inhalation",
      frequency: "1-2 Puffs PRN every 4-6h",
      indication: "Bronchial Asthma / Bronchospasm",
      system: "respiratory",
      prescriber: "Dr. R. Adams, MD",
      instructions: "Inhale deeply with spacer device as needed for acute shortness of breath."
    },
    {
      id: "med-metoprolol",
      name: "Metoprolol Succinate ER",
      dosage: "50 mg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Hypertension & Atrial Fibrillation Rate Control",
      system: "cardiac",
      prescriber: "Dr. Anthony Hayes, MD",
      instructions: "Swallow whole; do not crush or chew. Take with or immediately after food."
    },
    {
      id: "med-escitalopram",
      name: "Escitalopram (Lexapro)",
      dosage: "10 mg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Major Depressive Disorder",
      system: "neurologic",
      prescriber: "Dr. R. Adams, MD",
      instructions: "Take in the morning with or without food. Avoid abrupt cessation."
    },
    {
      id: "med-meloxicam",
      name: "Meloxicam",
      dosage: "7.5 mg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Osteoarthritis Joint Inflammation",
      system: "orthopedic_knee",
      prescriber: "Dr. David Sterling, MD",
      instructions: "Take with food or milk to minimize gastric upset."
    },
    {
      id: "med-latanoprost",
      name: "Latanoprost Ophthalmic Solution",
      dosage: "0.005% (1 Drop)",
      route: "Ophthalmic (Left Eye)",
      frequency: "Once Daily at Night (QHS)",
      indication: "Primary Open-Angle Glaucoma",
      system: "ophthalmic",
      prescriber: "Dr. Kenneth Moore, MD",
      instructions: "Instill one drop into affected left eye every evening."
    },
    {
      id: "med-losartan",
      name: "Losartan Potassium",
      dosage: "50 mg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Hypertension & Renal Protection",
      system: "renal",
      prescriber: "Dr. R. Adams, MD",
      instructions: "Monitor renal profile and serum potassium levels regularly."
    },
    {
      id: "med-aspirin",
      name: "Enteric-Coated Baby Aspirin",
      dosage: "81 mg",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Secondary Cardiovascular Prophylaxis (Post-CABG)",
      system: "cardiac",
      prescriber: "Dr. Anthony Hayes, MD",
      instructions: "Swallow whole with water."
    },
    {
      id: "med-gabapentin",
      name: "Gabapentin",
      dosage: "300 mg",
      route: "Oral (PO)",
      frequency: "Three Times Daily (TID)",
      indication: "Peripheral Neuropathy / Radiculopathy",
      system: "spine",
      prescriber: "Dr. Julian Thorne, MD",
      instructions: "May cause drowsiness; avoid driving until individual response is known."
    },
    {
      id: "med-cholecalciferol",
      name: "Vitamin D3 (Cholecalciferol)",
      dosage: "2000 IU",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Osteoporosis Bone Density Support",
      system: "orthopedic",
      prescriber: "Dr. R. Adams, MD",
      instructions: "Take with a meal containing dietary healthy fats for optimal absorption."
    }
  ],

  // Diagnostic & Screening Procedures Catalog
  procedures: [
    {
      id: "proc-colonoscopy",
      name: "Screening Colonoscopy",
      plainName: "Colon Camera Check (Colonoscopy)",
      procedure_type: "screening",
      anatomical_marker: "Lower Abdomen / Large Intestine",
      coords: { x: 0.1, y: 1.8, z: 1.05 },
      system: "digestive",
      defaultRecallYears: 5,
      findingsSummary: "Endoscopic visualization of the entire colon and terminal ileum for polyps or inflammation.",
      layExplanation: "A doctor uses a tiny camera to look inside your large intestine to check for polyps or health changes."
    },
    {
      id: "proc-egd",
      name: "Upper Endoscopy (EGD)",
      plainName: "Upper Stomach Camera Exam (EGD)",
      procedure_type: "diagnostic",
      anatomical_marker: "Upper Abdomen / Esophagus & Stomach",
      coords: { x: 0.15, y: 3.3, z: 1.0 },
      system: "digestive",
      defaultRecallYears: 3,
      findingsSummary: "Esophagogastroduodenoscopy evaluating mucosal lining of esophagus, stomach, and duodenum.",
      layExplanation: "A thin tube with a camera examines your throat, food pipe, and stomach lining."
    },
    {
      id: "proc-echo",
      name: "Transthoracic Echocardiogram (Echo)",
      plainName: "Heart Ultrasound (Echo)",
      procedure_type: "diagnostic",
      anatomical_marker: "Thorax / Heart",
      coords: { x: 0.35, y: 4.35, z: 1.1 },
      system: "cardiac",
      defaultRecallYears: 1,
      findingsSummary: "Ultrasound evaluation of cardiac chambers, ejection fraction, valve dynamics, and wall motion.",
      layExplanation: "Sound waves create moving pictures of your heart pumping and heart valves."
    },
    {
      id: "proc-mammogram",
      name: "Screening Mammogram",
      plainName: "Breast Imaging (Mammogram)",
      procedure_type: "screening",
      anatomical_marker: "Bilateral Breasts / Anterior Thorax",
      coords: { x: 0.65, y: 4.6, z: 1.05 },
      system: "respiratory",
      defaultRecallYears: 1,
      findingsSummary: "Low-dose 3D tomosynthesis mammography evaluating breast tissue parenchyma.",
      layExplanation: "A low-dose X-ray picture of breast tissue used for early health screenings."
    },
    {
      id: "proc-dexa",
      name: "Bone Density Scan (DEXA)",
      plainName: "Bone Strength Scan (DEXA)",
      procedure_type: "diagnostic",
      anatomical_marker: "Lumbar Spine & Bilateral Hips",
      coords: { x: 0.0, y: 2.15, z: -0.95 },
      system: "spine",
      isPosterior: true,
      defaultRecallYears: 2,
      findingsSummary: "Dual-energy X-ray absorptiometry measuring bone mineral density and fracture risk T-scores.",
      layExplanation: "A gentle scan that measures how strong and dense your bones are."
    },
    {
      id: "proc-chest-ct",
      name: "Chest CT / Low-Dose CT",
      plainName: "Chest CT Scan (Lung Imaging)",
      procedure_type: "diagnostic",
      anatomical_marker: "Thorax / Bilateral Lungs",
      coords: { x: -0.5, y: 4.6, z: 1.0 },
      system: "respiratory",
      defaultRecallYears: 1,
      findingsSummary: "High-resolution computed tomography evaluating pulmonary parenchyma and mediastinum.",
      layExplanation: "Detailed 3D pictures of your lungs, chest, and airways."
    },
    {
      id: "proc-stress-test",
      name: "Exercise Cardiac Stress Test",
      plainName: "Treadmill Heart Stress Test",
      procedure_type: "diagnostic",
      anatomical_marker: "Thorax / Coronary Circulation",
      coords: { x: 0.3, y: 4.0, z: 1.15 },
      system: "cardiac",
      defaultRecallYears: 2,
      findingsSummary: "Electrocardiographic and blood pressure response to Bruce protocol treadmill exercise.",
      layExplanation: "Monitors your heart rate and rhythm while walking on a treadmill to check blood flow."
    },
    {
      id: "proc-brain-mri",
      name: "Brain MRI (Without Contrast)",
      plainName: "Brain MRI Scan",
      procedure_type: "diagnostic",
      anatomical_marker: "Head / Cranium & Brain",
      coords: { x: 0.0, y: 8.0, z: 0.7 },
      system: "neurologic",
      defaultRecallYears: 3,
      findingsSummary: "Multi-planar magnetic resonance imaging evaluating cerebral hemispheres and ventricles.",
      layExplanation: "Detailed magnetic imaging that takes pictures of the brain and head without radiation."
    }
  ],

  // CDC Adult Recommended Vaccines Catalog
  vaccines: [
    {
      id: "vax-flu",
      name: "Influenza (Flu Quadrivalent)",
      plainName: "Annual Flu Shot",
      category: "Annual Routine",
      scheduleRule: "annual",
      recommendedSeason: "Autumn (September - November)",
      doseDescription: "1 dose every year before flu season",
      targetGroup: "All adults 18+",
      protectionSummary: "Protects against 4 strains of the seasonal influenza respiratory virus."
    },
    {
      id: "vax-covid",
      name: "COVID-19 Updated Booster (mRNA)",
      plainName: "Updated COVID-19 Booster",
      category: "Annual / Seasonal",
      scheduleRule: "annual",
      recommendedSeason: "Autumn (September - November)",
      doseDescription: "1 updated dose annually or 2-3 months after prior infection",
      targetGroup: "All adults 18+",
      protectionSummary: "Updated immune protection against current circulating variants of SARS-CoV-2."
    },
    {
      id: "vax-tdap",
      name: "Tdap (Tetanus, Diphtheria, Pertussis)",
      plainName: "Tetanus & Whooping Cough Booster",
      category: "Every 10 Years",
      scheduleRule: "10_years",
      doseDescription: "1 dose every 10 years (or during each pregnancy)",
      targetGroup: "All adults every 10 years",
      protectionSummary: "Protects against painful muscle lockjaw (tetanus), diphtheria, and whooping cough."
    },
    {
      id: "vax-shingrix",
      name: "Shingrix (Recombinant Zoster)",
      plainName: "Shingles Vaccine (2 Doses)",
      category: "Adults 50+",
      scheduleRule: "series_completed",
      totalDoses: 2,
      doseDescription: "2 doses spaced 2 to 6 months apart (lifetime protection)",
      targetGroup: "Adults age 50 and older, or immunocompromised age 19+",
      protectionSummary: "Over 90% protection against painful shingles rash and long-term nerve pain."
    },
    {
      id: "vax-pneumococcal",
      name: "Pneumococcal Conjugate (PCV20 / PPSV23)",
      plainName: "Pneumonia Vaccine",
      category: "Adults 65+ or High Risk",
      scheduleRule: "once_or_series",
      doseDescription: "1 dose of PCV20 (or PCV15 followed by PPSV23)",
      targetGroup: "Adults age 65+, or adults 19-64 with asthma, diabetes, or heart conditions",
      protectionSummary: "Defends against severe bacterial pneumonia, bloodstream infections, and meningitis."
    },
    {
      id: "vax-rsv",
      name: "RSV Vaccine (Arexvy / Abrysvo)",
      plainName: "RSV Respiratory Vaccine",
      category: "Adults 60-75+ Clinical Decision",
      scheduleRule: "once",
      doseDescription: "1 dose for adults age 75+, or age 60-74 with chronic lung or heart disease",
      targetGroup: "Adults 75+ or adults 60-74 with risk factors",
      protectionSummary: "Protects vulnerable lungs against severe respiratory syncytial virus."
    },
    {
      id: "vax-hepb",
      name: "Hepatitis B Recombinant",
      plainName: "Hepatitis B Liver Protection",
      category: "Routine 2-3 Doses",
      scheduleRule: "series_completed",
      totalDoses: 3,
      doseDescription: "2 or 3 dose series for adults age 19-59",
      targetGroup: "Adults age 19-59 or high risk",
      protectionSummary: "Long-term protection against hepatitis B viral infection and liver damage."
    }
  ]
};

/**
 * Calculates procedure recall schedule and status
 */
export function calculateProcedureRecall(procedure) {
  if (!procedure) return { status: "unknown", text: "No schedule date", isDue: false, badgeColor: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  const performed = procedure.date_performed || procedure.datePerformed;
  const interval = Number(procedure.recall_interval_years || procedure.recallIntervalYears);

  if (!performed) {
    return { status: "unknown", text: "Date unrecorded", isDue: false, badgeColor: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  }

  const perfDate = new Date(performed);
  if (isNaN(perfDate.getTime())) {
    return { status: "unknown", text: "Invalid date", isDue: false, badgeColor: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  }

  if (!interval || interval <= 0) {
    return { status: "completed", text: "Completed (No repeat scheduled)", isDue: false, badgeColor: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
  }

  const nextDueDate = new Date(perfDate);
  nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
  const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

  const now = new Date();
  const diffDays = Math.round((nextDueDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "overdue",
      nextDueDate: nextDueDateStr,
      text: `Past due (Was due in ${nextDueDate.getFullYear()})`,
      isDue: true,
      badgeColor: "bg-red-500/15 text-red-400 border-red-500/30"
    };
  } else if (diffDays <= 180) {
    return {
      status: "due_soon",
      nextDueDate: nextDueDateStr,
      text: `Due soon (${nextDueDateStr})`,
      isDue: true,
      badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30"
    };
  } else {
    return {
      status: "scheduled",
      nextDueDate: nextDueDateStr,
      text: `Due again in ${nextDueDate.getFullYear()}`,
      isDue: false,
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    };
  }
}

/**
 * Evaluates CDC immunization status for an adult vaccine record
 */
export function calculateVaccineStatus(vaccine) {
  if (!vaccine) return { status: "recommended", label: "Recommended / Due", isUpToDate: false, badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  const administered = vaccine.date_administered || vaccine.dateAdministered;
  const name = (vaccine.vaccine_name || vaccine.name || "").toLowerCase();
  const dose = Number(vaccine.dose_number || vaccine.doseNumber || 1);

  if (!administered) {
    return { status: "due", label: "Recommended", isUpToDate: false, badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  }

  const adminDate = new Date(administered);
  if (isNaN(adminDate.getTime())) {
    return { status: "unknown", label: "Unverified", isUpToDate: false, badgeColor: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  }

  const now = new Date();
  const diffMonths = (now.getFullYear() - adminDate.getFullYear()) * 12 + (now.getMonth() - adminDate.getMonth());
  const diffYears = diffMonths / 12;

  // Flu: Annual (within last 12 months)
  if (name.includes("flu") || name.includes("influenza")) {
    if (diffMonths <= 12) {
      return { status: "current", label: "Up to Date (This Season)", isUpToDate: true, badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    }
    return { status: "due", label: "Due for Autumn Flu Shot", isUpToDate: false, badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  }

  // COVID-19: Updated booster within last 12 months
  if (name.includes("covid") || name.includes("sars")) {
    if (diffMonths <= 12) {
      return { status: "current", label: "Up to Date (Updated Booster)", isUpToDate: true, badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    }
    return { status: "due", label: "Recommended Updated Booster", isUpToDate: false, badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  }

  // Tdap / Tetanus: 10 years
  if (name.includes("tdap") || name.includes("tetanus")) {
    if (diffYears < 10) {
      const remainingYears = Math.max(1, Math.round(10 - diffYears));
      return { status: "current", label: `Up to Date (${remainingYears} yrs left)`, isUpToDate: true, badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    }
    return { status: "due", label: "Booster Due (10-Year Interval)", isUpToDate: false, badgeColor: "bg-red-500/15 text-red-400 border-red-500/30" };
  }

  // Shingrix: 2 doses
  if (name.includes("shingrix") || name.includes("zoster") || name.includes("shingles")) {
    if (dose >= 2) {
      return { status: "current", label: "Series Complete (Protected)", isUpToDate: true, badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    }
    return { status: "due", label: "Dose 2 Due", isUpToDate: false, badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  }

  // Pneumococcal, RSV, Hepatitis
  if (diffYears < 5) {
    return { status: "current", label: "Up to Date", isUpToDate: true, badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  }

  return { status: "current", label: "Documented", isUpToDate: true, badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
}

/**
 * Dynamically computes patient's chronological age derived from Date of Birth string (YYYY-MM-DD)
 */
export function calculateAge(dobStr, fallbackAge = 58) {
  if (!dobStr) return fallbackAge;
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return fallbackAge;
  const now = new Date();
  let a = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    a--;
  }
  return a >= 0 && a < 130 ? a : fallbackAge;
}

/**
 * Smart Clinical Association Engine Mapping:
 * Maps common active medications to their probable indication, standard clinical starting doses,
 * and clear, non-abbreviated patient-friendly frequencies.
 */
export const MEDICATION_CLINICAL_ASSOCIATIONS = {
  "Lisinopril": {
    indication: "Hypertension",
    standardDoses: ["5 mg", "10 mg", "20 mg", "40 mg"],
    defaultDose: { number: "10", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Losartan": {
    indication: "Hypertension",
    standardDoses: ["25 mg", "50 mg", "100 mg"],
    defaultDose: { number: "50", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Amlodipine": {
    indication: "Hypertension",
    standardDoses: ["2.5 mg", "5 mg", "10 mg"],
    defaultDose: { number: "5", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Hydrochlorothiazide": {
    indication: "Hypertension",
    standardDoses: ["12.5 mg", "25 mg", "50 mg"],
    defaultDose: { number: "25", unit: "mg" },
    defaultFrequency: "Every morning"
  },
  "Metoprolol Succinate": {
    indication: "Hypertension",
    standardDoses: ["25 mg", "50 mg", "100 mg", "200 mg"],
    defaultDose: { number: "50", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Metoprolol Tartrate": {
    indication: "Hypertension",
    standardDoses: ["25 mg", "50 mg", "100 mg"],
    defaultDose: { number: "50", unit: "mg" },
    defaultFrequency: "Twice daily"
  },
  "Metformin": {
    indication: "Type 2 Diabetes Mellitus",
    standardDoses: ["500 mg", "850 mg", "1000 mg"],
    defaultDose: { number: "500", unit: "mg" },
    defaultFrequency: "Twice daily"
  },
  "Atorvastatin": {
    indication: "Hyperlipidemia",
    standardDoses: ["10 mg", "20 mg", "40 mg", "80 mg"],
    defaultDose: { number: "20", unit: "mg" },
    defaultFrequency: "At bedtime"
  },
  "Rosuvastatin": {
    indication: "Hyperlipidemia",
    standardDoses: ["5 mg", "10 mg", "20 mg", "40 mg"],
    defaultDose: { number: "10", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Levothyroxine": {
    indication: "Hypothyroidism",
    standardDoses: ["25 mcg", "50 mcg", "75 mcg", "88 mcg", "100 mcg", "112 mcg", "125 mcg"],
    defaultDose: { number: "50", unit: "mcg" },
    defaultFrequency: "Every morning"
  },
  "Apixaban": {
    indication: "Atrial Fibrillation",
    standardDoses: ["2.5 mg", "5 mg"],
    defaultDose: { number: "5", unit: "mg" },
    defaultFrequency: "Twice daily"
  },
  "Warfarin": {
    indication: "Atrial Fibrillation",
    standardDoses: ["2 mg", "2.5 mg", "5 mg", "7.5 mg", "10 mg"],
    defaultDose: { number: "5", unit: "mg" },
    defaultFrequency: "At bedtime"
  },
  "Clopidogrel": {
    indication: "Coronary Artery Disease",
    standardDoses: ["75 mg"],
    defaultDose: { number: "75", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Aspirin": {
    indication: "Coronary Artery Disease",
    standardDoses: ["81 mg", "325 mg"],
    defaultDose: { number: "81", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Omeprazole": {
    indication: "Gastroesophageal Reflux Disease (GERD)",
    standardDoses: ["20 mg", "40 mg"],
    defaultDose: { number: "20", unit: "mg" },
    defaultFrequency: "Every morning"
  },
  "Pantoprazole": {
    indication: "Gastroesophageal Reflux Disease (GERD)",
    standardDoses: ["20 mg", "40 mg"],
    defaultDose: { number: "40", unit: "mg" },
    defaultFrequency: "Every morning"
  },
  "Albuterol": {
    indication: "Asthma",
    standardDoses: ["1-2 puffs", "2 puffs"],
    defaultDose: { number: "2", unit: "puffs" },
    defaultFrequency: "As needed"
  },
  "Gabapentin": {
    indication: "Neuropathy / Chronic Pain",
    standardDoses: ["100 mg", "300 mg", "600 mg", "800 mg"],
    defaultDose: { number: "300", unit: "mg" },
    defaultFrequency: "Three times daily"
  },
  "Duloxetine": {
    indication: "Major Depressive Disorder",
    standardDoses: ["20 mg", "30 mg", "60 mg"],
    defaultDose: { number: "30", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Sertraline": {
    indication: "Major Depressive Disorder",
    standardDoses: ["25 mg", "50 mg", "100 mg"],
    defaultDose: { number: "50", unit: "mg" },
    defaultFrequency: "Every morning"
  },
  "Escitalopram": {
    indication: "Generalized Anxiety Disorder",
    standardDoses: ["5 mg", "10 mg", "20 mg"],
    defaultDose: { number: "10", unit: "mg" },
    defaultFrequency: "Every morning"
  },
  "Furosemide": {
    indication: "Congestive Heart Failure",
    standardDoses: ["20 mg", "40 mg", "80 mg"],
    defaultDose: { number: "20", unit: "mg" },
    defaultFrequency: "Every morning"
  },
  "Spironolactone": {
    indication: "Congestive Heart Failure",
    standardDoses: ["25 mg", "50 mg", "100 mg"],
    defaultDose: { number: "25", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Allopurinol": {
    indication: "Gout",
    standardDoses: ["100 mg", "200 mg", "300 mg"],
    defaultDose: { number: "100", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Meloxicam": {
    indication: "Osteoarthritis",
    standardDoses: ["7.5 mg", "15 mg"],
    defaultDose: { number: "7.5", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Celecoxib": {
    indication: "Osteoarthritis",
    standardDoses: ["100 mg", "200 mg"],
    defaultDose: { number: "200", unit: "mg" },
    defaultFrequency: "Once daily"
  },
  "Tamsulosin": {
    indication: "Benign Prostatic Hyperplasia (BPH)",
    standardDoses: ["0.4 mg"],
    defaultDose: { number: "0.4", unit: "mg" },
    defaultFrequency: "At bedtime"
  }
};

// Default seed patient record
export const DEFAULT_PATIENT_RECORD = {
  profile: {
    name: "Elena Vance",
    dob: "1968-04-12",
    age: 58,
    sex: "female",
    gender: "Female",
    mrn: "#PMHX-84920",
    phone: "(555) 839-2041",
    email: "elena.vance@healthmail.net",
    address: "742 Evergreen Terrace, Boston, MA 02115",
    veteranStatus: "Yes",
    preferredLanguage: "English",
    bloodType: "O Positive",
    pcp: "Dr. Robert Adams, MD",
    pcpPhone: "(555) 726-3000",
    clinic: "Mass General Brigham Associates, Suite 400",
    emergencyContactName: "Eli Vance",
    emergencyContactRelation: "Spouse",
    emergencyContactPhone: "(555) 234-9812",
    emergencyContact: "Eli Vance (Spouse) • (555) 234-9812",
    allergies: "Penicillin (Severe Maculopapular Rash, Urticaria)",
    pharmacy: {
      name: "CVS Pharmacy #04821",
      address: "1244 Massachusetts Ave, Cambridge, MA 02138",
      phone: "(617) 555-0198",
      fax: "(617) 555-0199",
      hours: "Open 24 Hours • 7 Days/Week",
      npi: "1487920114",
      ncpdp: "2210492",
      status: "Primary Preferred (E-Prescribe Enabled)"
    }
  },
  allergiesList: [
    {
      id: "all-rec-1",
      medication: "Penicillin (Oral / IV)",
      reaction: "Severe hives, facial swelling of lips, and acute bronchospasm within 20 minutes of first dose",
      severity: "Severe / Anaphylactoid",
      dateDocumented: "2018-05-10",
      status: "Active",
      documentedBy: "Dr. R. Adams, MD"
    },
    {
      id: "all-rec-2",
      medication: "Morphine Sulfate",
      reaction: "Intractable nausea, projectile vomiting, and diffuse flushing",
      severity: "Moderate Intolerance",
      dateDocumented: "2021-03-18",
      status: "Active",
      documentedBy: "Dr. Sarah Jenkins, FACS"
    },
    {
      id: "all-rec-3",
      medication: "Sulfa Antibiotics (Bactrim / TMP-SMX)",
      reaction: "Mild pruritic erythematous rash on bilateral upper extremities",
      severity: "Mild / Moderate",
      dateDocumented: "2015-11-04",
      status: "Active",
      documentedBy: "Dr. R. Adams, MD"
    }
  ],
  conditions: [
    {
      id: "cond-rec-1",
      name: "Hypertension (Essential)",
      plainName: "High Blood Pressure",
      region: "Heart / Thoracic Vasculature",
      onsetDate: "2018-05-14",
      status: "Controlled",
      provider: "Dr. R. Adams, MD",
      icd10: "I10",
      coords: { x: 0.35, y: 4.25, z: 1.1 },
      system: "cardiac",
      notes: "Managed on Lisinopril 20mg. Normal LV systolic function on echocardiogram."
    },
    {
      id: "cond-rec-2",
      name: "Type 2 Diabetes Mellitus",
      plainName: "Type 2 Diabetes (High Blood Sugar)",
      region: "Pancreas / Epigastric Abdomen",
      onsetDate: "2019-11-03",
      status: "Active",
      provider: "Dr. R. Adams, MD",
      icd10: "E11.9",
      coords: { x: 0.1, y: 2.7, z: 1.0 },
      system: "endocrine",
      notes: "HbA1c 6.8% (Target < 7.0%). Diet and oral hypoglycemic regimen."
    },
    {
      id: "cond-rec-3",
      name: "Osteoarthritis (Right Knee)",
      plainName: "Right Knee Joint Wear & Tear",
      region: "Right Knee Joint (Medial Compartment)",
      onsetDate: "2016-08-22",
      status: "Treated / Status Post",
      provider: "Dr. David Sterling, MD",
      icd10: "M17.11",
      coords: { x: -1.30, y: -4.05, z: 0.80 },
      system: "orthopedic_knee",
      notes: "Underwent total knee replacement in 2022. Full active flexion achieved."
    },
    {
      id: "cond-rec-4",
      name: "Lumbar Spondylolisthesis (Spinal Hardware)",
      plainName: "Lower Back Spine Stabilization with Screws",
      region: "Posterior Lumbar Spine (L4-S1)",
      onsetDate: "2019-03-20",
      status: "Surgically Fused / Hardware Stable",
      provider: "Dr. Julian Thorne, MD",
      icd10: "M43.16",
      coords: { x: 0.0, y: 2.75, z: -0.92 },
      system: "spine",
      isPosterior: true,
      notes: "Grade 2 isthmic lumbar spondylolisthesis. Post-fusion imaging confirms solid posterior bony bridging and stable pedicle screw instrumentation."
    }
  ],
  surgeries: [
    {
      id: "surg-rec-1",
      name: "Laparoscopic Cholecystectomy",
      plainName: "Gallbladder Removal Surgery",
      site: "Right Upper Quadrant (Gallbladder Bed)",
      surgeryDate: "2021-03-18",
      hospital: "Mass General Hospital",
      surgeon: "Dr. Sarah Jenkins, FACS",
      incision: "4-trocar laparoscopic punctures (RUQ/Umbilicus)",
      coords: { x: -0.95, y: 3.45, z: 1.05 },
      system: "digestive",
      notes: "Elective gallbladder removal for symptomatic biliary colic. Pathology benign."
    },
    {
      id: "surg-rec-2",
      name: "Total Knee Arthroplasty (Right)",
      plainName: "Right Knee Joint Replacement",
      site: "Right Anterior Knee",
      surgeryDate: "2022-09-14",
      hospital: "New England Orthopedic Institute",
      surgeon: "Dr. David Sterling, MD",
      incision: "Midline longitudinal right anterior knee scar (15 cm)",
      coords: { x: -0.75, y: -4.70, z: 0.82 },
      system: "orthopedic_knee",
      notes: "Cobalt-chromium bicompartmental knee replacement with UHMWPE spacer."
    },
    {
      id: "surg-rec-3",
      name: "Posterior Lumbar Spinal Fusion (L4-S1)",
      plainName: "Lower Back Spine Fusion (Screws & Rods)",
      site: "Posterior Midline Lumbar Spine",
      surgeryDate: "2020-11-12",
      hospital: "Spine & Neuroscience Hospital",
      surgeon: "Dr. Julian Thorne, MD (Neurosurgery)",
      incision: "Posterior midline lumbar scar with titanium pedicle screw hardware (8 cm)",
      coords: { x: 0.0, y: 2.15, z: -0.95 },
      system: "spine",
      isPosterior: true,
      notes: "L4-S1 bilateral pedicle screw fixation with titanium rods and interbody cage fusion. Intact posterior spinal instrumentation."
    }
  ],
  procedures: [
    {
      id: "proc-rec-1",
      procedure_name: "Screening Colonoscopy",
      plainName: "Colon Camera Check (Colonoscopy)",
      procedure_type: "screening",
      date_performed: "2024-04-10",
      anatomical_marker: "Lower Abdomen / Large Intestine",
      coords: { x: 0.1, y: 1.8, z: 1.05 },
      system: "digestive",
      performing_clinician: "Dr. Marcus Vance, MD (Gastroenterology)",
      institution: "Boston Endoscopy Center",
      findings: "Two benign tubular adenomas (4mm and 6mm) resected from ascending colon with clean margins. No evidence of dysplasia or malignancy.",
      recall_interval_years: 5
    },
    {
      id: "proc-rec-2",
      procedure_name: "Transthoracic Echocardiogram (Echo)",
      plainName: "Heart Ultrasound (Echo)",
      procedure_type: "diagnostic",
      date_performed: "2025-01-15",
      anatomical_marker: "Thorax / Heart",
      coords: { x: 0.35, y: 4.35, z: 1.1 },
      system: "cardiac",
      performing_clinician: "Dr. Anthony Hayes, MD",
      institution: "Heart & Vascular Center",
      findings: "LVEF 55-60%, normal LV wall thickness, mild left atrial enlargement, trivial aortic regurgitation. Normal systolic dynamics.",
      recall_interval_years: 1
    }
  ],
  vaccinations: [
    {
      id: "vax-rec-1",
      cvx: "140",
      vaccine_name: "Influenza (Flu Quadrivalent)",
      plainName: "Annual Flu Shot",
      date_administered: "2025-10-12",
      dose_number: 1,
      administering_facility: "CVS MinuteClinic #04821 (Cambridge, MA)",
      next_due_date: "2026-10-01"
    },
    {
      id: "vax-rec-2",
      cvx: "311",
      vaccine_name: "COVID-19 Updated Booster (mRNA)",
      plainName: "Updated COVID-19 Booster",
      date_administered: "2025-10-12",
      dose_number: 4,
      administering_facility: "CVS MinuteClinic #04821 (Cambridge, MA)",
      next_due_date: "2026-10-01"
    },
    {
      id: "vax-rec-3",
      cvx: "115",
      vaccine_name: "Tdap (Tetanus, Diphtheria, Pertussis)",
      plainName: "Tetanus & Whooping Cough Booster",
      date_administered: "2019-06-15",
      dose_number: 1,
      administering_facility: "Mass General Hospital",
      next_due_date: "2029-06-15"
    },
    {
      id: "vax-rec-4",
      cvx: "187",
      vaccine_name: "Shingrix (Recombinant Zoster)",
      plainName: "Shingles Vaccine (2 Doses)",
      date_administered: "2023-08-20",
      dose_number: 2,
      administering_facility: "Metro Health Primary Care",
      next_due_date: null
    }
  ],
  drains: [
    {
      id: "drain-rec-1",
      name: "DRAIN GI: Orogastric MOUTH",
      site: "Mouth / Oropharynx",
      drainType: "Orogastric Sump",
      placementDate: "2024-02-14",
      hospital: "Mass General Hospital",
      surgeon: "Dr. Sarah Jenkins, FACS",
      coords: { x: 0.0, y: 7.05, z: 0.82 },
      notes: "Connected to low intermittent gastric decompression suction. Output clear."
    },
    {
      id: "drain-rec-2",
      name: "URINE CATH (Foley Catheter)",
      site: "Urethra / Bladder",
      drainType: "16 Fr 5mL Foley",
      placementDate: "2024-02-14",
      hospital: "Mass General Hospital",
      surgeon: "Dr. Linda Chen, MD",
      coords: { x: 0.0, y: 0.7, z: 1.12 },
      notes: "Patent to gravity drainage. Clear yellow urine output."
    },
    {
      id: "drain-rec-3",
      name: "Jackson-Pratt (JP) RUQ Drain",
      site: "Right Upper Quadrant (Subcostal / Flank)",
      drainType: "Closed Suction Bulb",
      placementDate: "2024-02-16",
      hospital: "Mass General Hospital",
      surgeon: "Dr. Sarah Jenkins, FACS",
      coords: { x: -0.42, y: 1.95, z: 1.05 },
      notes: "Subhepatic space drain post-cholecystectomy. Serosanguinous output."
    }
  ],
  lines: [
    {
      id: "line-rec-1",
      name: "PICC Double Lumen (Right Arm)",
      site: "Right Brachium / Basilic Vein",
      lineType: "5 Fr Double Lumen PICC",
      placementDate: "2024-02-14",
      hospital: "Mass General Hospital",
      coords: { x: -2.35, y: 4.10, z: 0.35 },
      notes: "Dedicated IV antibiotic & TPN access. Flushes easily."
    },
    {
      id: "line-rec-2",
      name: "Arterial Line (Left Wrist)",
      site: "Left Radial Artery / Wrist",
      lineType: "20-Gauge Radial A-Line",
      placementDate: "2024-02-14",
      hospital: "Mass General Hospital",
      coords: { x: 2.50, y: 1.35, z: 0.25 },
      notes: "Radial pulse palpable; transducer zeroed and leveled to phlebostatic axis."
    }
  ],
  medications: [
    {
      id: "med-rec-1",
      name: "Lisinopril",
      dosage: "20 mg",
      rxcui: "29046",
      route: "Oral (PO)",
      frequency: "Once Daily (QD)",
      indication: "Hypertension",
      startDate: "2018-05-15",
      prescriber: "Dr. R. Adams, MD",
      system: "cardiac",
      lastPickedUpDate: "2026-08-28",
      lastPickedUpPharmacy: "CVS Pharmacy #04821 (Cambridge, MA)",
      refillsRemaining: 2,
      daysSupply: "90-Day Supply (90 tablets)",
      rxNumber: "Rx #649102-01"
    },
    {
      id: "med-rec-2",
      name: "Metformin Extended-Release",
      dosage: "1000 mg",
      rxcui: "861007",
      route: "Oral (PO)",
      frequency: "Twice Daily with Meals (BID)",
      indication: "Type 2 Diabetes",
      startDate: "2019-11-05",
      prescriber: "Dr. R. Adams, MD",
      system: "endocrine",
      lastPickedUpDate: "2026-08-15",
      lastPickedUpPharmacy: "CVS Pharmacy #04821 (Cambridge, MA)",
      refillsRemaining: 1,
      daysSupply: "90-Day Supply (180 tablets)",
      rxNumber: "Rx #583921-04"
    },
    {
      id: "med-rec-3",
      name: "Atorvastatin",
      dosage: "40 mg",
      rxcui: "259255",
      route: "Oral (PO)",
      frequency: "Once Daily at Bedtime (QHS)",
      indication: "Cardiovascular Risk Reduction",
      startDate: "2020-02-10",
      prescriber: "Dr. Anthony Hayes, MD",
      system: "cardiac",
      lastPickedUpDate: "2026-09-02",
      lastPickedUpPharmacy: "CVS Pharmacy #04821 (Cambridge, MA)",
      refillsRemaining: 3,
      daysSupply: "30-Day Supply (30 tablets)",
      rxNumber: "Rx #729401-02"
    }
  ]
};
