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

export const CLINICAL_CATALOG = {
  // 20 Common Medical Conditions
  conditions: [
    {
      id: "cond-htn",
      name: "Hypertension (Essential)",
      region: "Heart / Thoracic Vasculature",
      icd10: "I10",
      coords: { x: 0.35, y: 4.25, z: 1.1 },
      system: "cardiac",
      notes: "Stage 2 primary hypertension under pharmacotherapy. Monitored for vascular impact."
    },
    {
      id: "cond-t2d",
      name: "Type 2 Diabetes Mellitus",
      region: "Pancreas / Epigastric Abdomen",
      icd10: "E11.9",
      coords: { x: 0.1, y: 2.7, z: 1.0 },
      system: "endocrine",
      notes: "Adult-onset metabolic dysfunction. Target HbA1c < 7.0%."
    },
    {
      id: "cond-asthma",
      name: "Bronchial Asthma",
      region: "Bilateral Pulmonary Bronchial Tree",
      icd10: "J45.909",
      coords: { x: -0.5, y: 4.5, z: 1.0 },
      system: "respiratory",
      notes: "Mild persistent airway hyperresponsiveness triggered by cold air and allergens."
    },
    {
      id: "cond-gerd",
      name: "Gastroesophageal Reflux Disease (GERD)",
      region: "Lower Esophagus / Epigastrium",
      icd10: "K21.9",
      coords: { x: 0.15, y: 3.4, z: 1.0 },
      system: "digestive",
      notes: "Chronic nocturnal acid regurgitation and postprandial pyrosis."
    },
    {
      id: "cond-afib",
      name: "Atrial Fibrillation (Paroxysmal)",
      region: "Left Atrium / Conduction System",
      icd10: "I48.0",
      coords: { x: 0.45, y: 4.6, z: 0.9 },
      system: "cardiac",
      notes: "Intermittent tachyarrhythmia managed on oral anticoagulation and rate control."
    },
    {
      id: "cond-hypothyroid",
      name: "Primary Hypothyroidism",
      region: "Anterior Cervical Neck / Thyroid",
      icd10: "E03.9",
      coords: { x: 0.0, y: 5.7, z: 0.65 },
      system: "endocrine",
      notes: "Chronic autoimmune Hashimoto's thyroiditis stabilized on levothyroxine."
    },
    {
      id: "cond-oa-knee",
      name: "Osteoarthritis (Right Knee)",
      region: "Right Knee Joint (Medial Compartment)",
      icd10: "M17.11",
      coords: { x: -1.18, y: -4.25, z: 0.8 },
      system: "orthopedic_knee",
      notes: "Severe degenerative tricompartmental joint disease; status post TKA."
    },
    {
      id: "cond-cad",
      name: "Coronary Artery Disease (CAD)",
      region: "Coronary Arteries (LAD & RCA)",
      icd10: "I25.10",
      coords: { x: 0.3, y: 3.9, z: 1.15 },
      system: "cardiac",
      notes: "Atherosclerotic ischemic heart disease with prior bypass revascularization."
    },
    {
      id: "cond-ckd",
      name: "Chronic Kidney Disease (Stage 3a)",
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
      region: "Right Frontotemporal Cranium",
      icd10: "G43.909",
      coords: { x: -0.7, y: 7.8, z: 0.8 },
      system: "neurologic",
      notes: "Throbbing unilateral cephalalgia with visual scintillating scotoma."
    },
    {
      id: "cond-mdd",
      name: "Major Depressive Disorder",
      region: "Prefrontal Cortex / Neuroaxis",
      icd10: "F33.0",
      coords: { x: 0.0, y: 8.2, z: 0.7 },
      system: "neurologic",
      notes: "Recurrent episodes in remission with selective serotonin reuptake inhibitor."
    },
    {
      id: "cond-hyperlipid",
      name: "Hyperlipidemia (Mixed)",
      region: "Aortic Arch & Vasculature",
      icd10: "E78.2",
      coords: { x: -0.1, y: 4.8, z: 1.0 },
      system: "cardiac",
      notes: "Elevated LDL cholesterol and triglycerides controlled with statin therapy."
    },
    {
      id: "cond-crohn",
      name: "Crohn's Disease",
      region: "Terminal Ileum / RLQ",
      icd10: "K50.00",
      coords: { x: -0.6, y: 1.5, z: 0.9 },
      system: "digestive",
      notes: "Transmural regional enteritis with episodic cramping and mucosal ulcerations."
    },
    {
      id: "cond-osteopor",
      name: "Osteoporosis",
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
      region: "Left Orbit / Optic Nerve",
      icd10: "H40.11",
      coords: { x: 0.38, y: 7.7, z: 0.95 },
      system: "ophthalmic",
      notes: "Elevated IOP controlled on prostaglandin analog topical drops."
    },
    {
      id: "cond-ra",
      name: "Rheumatoid Arthritis",
      region: "Right Hand / MCP & PIP Joints",
      icd10: "M06.9",
      coords: { x: -3.1, y: -1.7, z: 0.3 },
      system: "orthopedic",
      notes: "Systemic symmetric polyarthritis with morning joint stiffness."
    },
    {
      id: "cond-osa",
      name: "Obstructive Sleep Apnea (OSA)",
      region: "Oropharynx / Upper Airway",
      icd10: "G47.33",
      coords: { x: 0.0, y: 6.4, z: 0.7 },
      system: "respiratory",
      notes: "Moderate nocturnal airway collapse (AHI: 22). Compliant with auto-CPAP."
    },
    {
      id: "cond-copd",
      name: "COPD / Chronic Bronchitis",
      region: "Right Pulmonary Parenchyma",
      icd10: "J44.9",
      coords: { x: -0.8, y: 3.8, z: 0.95 },
      system: "respiratory",
      notes: "Exertional dyspnea and chronic productive morning cough."
    },
    {
      id: "cond-cholelith",
      name: "Cholelithiasis (History)",
      region: "Right Upper Quadrant (Gallbladder)",
      icd10: "K80.20",
      coords: { x: -0.75, y: 2.85, z: 0.95 },
      system: "digestive",
      notes: "Prior biliary colic episodes resolved following elective cholecystectomy."
    },
    {
      id: "cond-epilepsy",
      name: "Generalized Epilepsy",
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
      name: "Total Knee Arthroplasty (Right)",
      site: "Right Anterior Knee Joint",
      incision: "Midline anterior longitudinal right knee incision (15 cm)",
      coords: { x: -0.82, y: -4.55, z: 0.82 },
      system: "orthopedic_knee",
      surgeon: "Dr. David Sterling, MD",
      hospital: "New England Orthopedic Institute",
      notes: "Cobalt-chromium and crosslinked polyethylene bicompartmental prosthesis."
    },
    {
      id: "surg-cabg",
      name: "Coronary Artery Bypass Graft (CABG x3)",
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
      name: "Cataract Extraction with IOL (Right Eye)",
      site: "Right Eye / Corneal Limbus",
      incision: "Clear corneal micro-incision in right eye (2.4 mm)",
      coords: { x: -0.38, y: 7.7, z: 0.98 },
      system: "ophthalmic",
      surgeon: "Dr. Kenneth Moore, MD",
      hospital: "Eye & Ear Infirmary",
      notes: "Phacoemulsification with posterior chamber intraocular lens implant."
    },
    {
      id: "surg-hernia",
      name: "Inguinal Hernia Repair (Right)",
      site: "Right Inguinal Canal / Groin",
      incision: "Right oblique groin incision with polypropylene mesh",
      coords: { x: -0.6, y: 0.6, z: 1.1 },
      system: "pelvic",
      surgeon: "Dr. Richard Becker, MD",
      hospital: "Metro Ambulatory Surgery Center",
      notes: "Lichtenstein tension-free mesh reinforcement for indirect inguinal defect."
    },
    {
      id: "surg-carpal-tunnel",
      name: "Carpal Tunnel Release (Right)",
      site: "Right Volar Wrist",
      incision: "Right palmar incision along thenar crease (2.5 cm)",
      coords: { x: -3.05, y: -1.1, z: 0.35 },
      system: "orthopedic",
      surgeon: "Dr. Patricia Ramos, MD",
      hospital: "Hand & Microsurgery Center",
      notes: "Open division of the transverse carpal ligament with median nerve decompression."
    },
    {
      id: "surg-discectomy",
      name: "Lumbar Microdiscectomy (L4-L5)",
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
      name: "Total Hip Arthroplasty (Left)",
      site: "Left Posterolateral Hip",
      incision: "Posterolateral curved incision over left greater trochanter",
      coords: { x: 1.35, y: 0.5, z: 0.4 },
      system: "orthopedic_hip",
      surgeon: "Dr. David Sterling, MD",
      hospital: "New England Orthopedic Institute",
      notes: "Uncemented ceramic-on-polyethylene press-fit femoral stem and acetabular cup."
    },
    {
      id: "surg-rotator-cuff",
      name: "Rotator Cuff Repair (Right Shoulder)",
      site: "Right Anterior-Lateral Shoulder",
      incision: "3 arthroscopic portal puncture scars on right shoulder",
      coords: { x: -2.45, y: 4.9, z: 0.6 },
      system: "orthopedic",
      surgeon: "Dr. Brian Gallagher, MD",
      hospital: "Sports Medicine Surgical Institute",
      notes: "Double-row suture anchor repair of full-thickness supraspinatus tendon tear."
    },
    {
      id: "surg-thyroid",
      name: "Total Thyroidectomy",
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
      name: "Partial Mastectomy (Left Lumpectomy)",
      site: "Left Upper Outer Breast Quadrant",
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
  ]
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
