import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Activity,
  Heart,
  Pill,
  FileSearch,
  ShieldCheck,
  User,
  Trash2,
  Plus,
  Search,
  Check,
  Stethoscope,
  Syringe,
  Layers,
  MapPin,
  Calendar,
  Building2,
  Building,
  HeartHandshake,
  Info
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { CLINICAL_CATALOG, calculateAge, MEDICATION_CLINICAL_ASSOCIATIONS } from "../../lib/clinicalCatalog";
import { searchConditions } from "../../services/ctss.js";
import { searchMedications, getMedicationStrengths } from "../../services/rxnorm.js";
import { getStandardVaccines, evaluateVaccineStatus } from "../../services/cdcSchedule.js";

// Configure pdfjs worker client-side
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const currentYear = new Date().getFullYear();
const HISTORICAL_YEARS = Array.from({ length: 76 }, (_, i) => (currentYear - i).toString());

const SURGERY_MONTHS = [
  { value: "01", label: "01 - Jan" },
  { value: "02", label: "02 - Feb" },
  { value: "03", label: "03 - Mar" },
  { value: "04", label: "04 - Apr" },
  { value: "05", label: "05 - May" },
  { value: "06", label: "06 - Jun" },
  { value: "07", label: "07 - Jul" },
  { value: "08", label: "08 - Aug" },
  { value: "09", label: "09 - Sep" },
  { value: "10", label: "10 - Oct" },
  { value: "11", label: "11 - Nov" },
  { value: "12", label: "12 - Dec" }
];

const EMERGENCY_RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Partner",
  "Relative",
  "Friend",
  "Caregiver",
  "Other"
];

const BLOOD_TYPES = [
  "I don't know",
  "A Positive (A+)",
  "A Negative (A-)",
  "B Positive (B+)",
  "B Negative (B-)",
  "AB Positive (AB+)",
  "AB Negative (AB-)",
  "O Positive (O+)",
  "O Negative (O-)"
];

const STANDARD_FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every morning",
  "At bedtime",
  "Every other day",
  "Once weekly",
  "As needed"
];

const getMedicationClinicalDefaults = (drugName, existingConditions = []) => {
  const clean = (drugName || "").split("(")[0].trim().toLowerCase();
  const matchedKey = Object.keys(MEDICATION_CLINICAL_ASSOCIATIONS).find(
    (k) => clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean)
  );

  if (matchedKey) {
    const assoc = MEDICATION_CLINICAL_ASSOCIATIONS[matchedKey];
    return {
      doseNumber: assoc.defaultDose.number,
      doseUnit: assoc.defaultDose.unit,
      frequency: assoc.defaultFrequency,
      indication: assoc.indication,
      standardDoses: assoc.standardDoses
    };
  }

  return {
    doseNumber: "10",
    doseUnit: "mg",
    frequency: "Once daily",
    indication: existingConditions[0]?.name || "General Health Maintenance",
    standardDoses: ["5 mg", "10 mg", "20 mg"]
  };
};

// Predefined catalogs and lookups
const COMMON_ALLERGIC_DRUGS = [
  "Penicillin",
  "Amoxicillin",
  "Sulfa / Bactrim (TMP-SMX)",
  "Ciprofloxacin (Cipro)",
  "Cephalosporins (Keflex)",
  "Morphine Sulfate",
  "Codeine",
  "Aspirin / NSAIDs (Ibuprofen)",
  "Lisinopril / ACE Inhibitors",
  "IV Contrast Dye (Iodine)",
  "Latex"
];

const REACTION_TYPES = [
  "Anaphylaxis / Airway Closure",
  "Rash / Hives (Urticaria)",
  "Angioedema (Lip / Facial Swelling)",
  "GI Upset / Nausea / Vomiting",
  "Respiratory / Wheezing",
  "Severe Itching (Pruritus)",
  "Other"
];

const ANATOMICAL_REGIONS = [
  { id: "head_neck", label: "Head & Neck", coords: { x: 0.0, y: 7.0, z: 0.7 }, system: "neurologic", isPosterior: false },
  { id: "chest_cardiac", label: "Chest & Heart (Cardiac)", coords: { x: 0.3, y: 4.2, z: 1.1 }, system: "cardiac", isPosterior: false },
  { id: "lungs_respiratory", label: "Lungs & Respiratory", coords: { x: -0.6, y: 4.5, z: 0.9 }, system: "respiratory", isPosterior: false },
  { id: "upper_gi_liver", label: "Upper Abdomen & Liver / Gallbladder", coords: { x: -0.7, y: 2.8, z: 0.9 }, system: "digestive", isPosterior: false },
  { id: "stomach_esophagus", label: "Stomach & Esophagus (Acid Reflux)", coords: { x: 0.2, y: 3.2, z: 0.95 }, system: "digestive", isPosterior: false },
  { id: "lower_bowel", label: "Lower Abdomen & Colon / Bowel", coords: { x: 0.0, y: 1.4, z: 0.9 }, system: "digestive", isPosterior: false },
  { id: "pelvis_urinary", label: "Pelvis & Bladder / Urinary", coords: { x: 0.0, y: 0.3, z: 0.9 }, system: "pelvic", isPosterior: false },
  { id: "spine_back", label: "Spine & Lower Back (Posterior)", coords: { x: 0.0, y: 2.0, z: -0.9 }, system: "spine", isPosterior: true },
  { id: "right_arm", label: "Right Shoulder & Arm", coords: { x: -2.3, y: 4.2, z: 0.5 }, system: "orthopedic", isPosterior: false },
  { id: "left_arm", label: "Left Shoulder & Arm", coords: { x: 2.3, y: 4.2, z: 0.5 }, system: "orthopedic", isPosterior: false },
  { id: "right_leg", label: "Right Hip, Knee & Leg", coords: { x: -1.0, y: -3.8, z: 0.8 }, system: "orthopedic_knee", isPosterior: false },
  { id: "left_leg", label: "Left Hip, Knee & Leg", coords: { x: 1.0, y: -3.8, z: 0.8 }, system: "orthopedic_hip", isPosterior: false },
  { id: "general_systemic", label: "General / Systemic / Endocrine", coords: { x: 0.0, y: 3.5, z: 1.0 }, system: "endocrine", isPosterior: false }
];

const ALPHABETICAL_COMMON_MEDICATIONS = [
  "Acetaminophen (Tylenol)",
  "Albuterol (ProAir / Ventolin)",
  "Allopurinol (Zyloprim)",
  "Amlodipine (Norvasc)",
  "Amoxicillin",
  "Apixaban (Eliquis)",
  "Aspirin (Bayer / Ecotrin)",
  "Atorvastatin (Lipitor)",
  "Bupropion (Wellbutrin)",
  "Carvedilol (Coreg)",
  "Celecoxib (Celebrex)",
  "Citalopram (Celexa)",
  "Clopidogrel (Plavix)",
  "Duloxetine (Cymbalta)",
  "Escitalopram (Lexapro)",
  "Furosemide (Lasix)",
  "Gabapentin (Neurontin)",
  "Hydrochlorothiazide (HCTZ)",
  "Ibuprofen (Advil / Motrin)",
  "Latanoprost (Xalatan)",
  "Levothyroxine (Synthroid)",
  "Lisinopril (Zestril)",
  "Losartan (Cozaar)",
  "Meloxicam (Mobic)",
  "Metformin (Glucophage)",
  "Metoprolol Succinate (Toprol-XL)",
  "Metoprolol Tartrate (Lopressor)",
  "Omeprazole (Prilosec)",
  "Pantoprazole (Protonix)",
  "Rosuvastatin (Crestor)",
  "Sertraline (Zoloft)",
  "Spironolactone (Aldactone)",
  "Tamsulosin (Flomax)",
  "Tramadol (Ultram)",
  "Warfarin (Coumadin)"
].sort();

const COMMON_PROCEDURES = [
  { name: "Screening Colonoscopy", plainName: "Colonoscopy (Colon Exam)", marker: "Lower Bowel / Colon", type: "diagnostic", recall: 10, findings: "" },
  { name: "Upper Endoscopy (EGD)", plainName: "Stomach Camera Exam (EGD)", marker: "Esophagus / Stomach", type: "diagnostic", recall: 3, findings: "" },
  { name: "Transthoracic Echocardiogram (TTE)", plainName: "Heart Ultrasound (Echo)", marker: "Heart / Thorax", type: "diagnostic", recall: 1, findings: "" },
  { name: "Screening Mammogram (Bilateral)", plainName: "Breast Cancer Screening (Mammogram)", marker: "Bilateral Breast Tissue", type: "screening", recall: 1, findings: "" },
  { name: "Low-Dose Chest CT Scan", plainName: "Lung Screening CT Scan", marker: "Bilateral Lung Fields", type: "diagnostic", recall: 1, findings: "" },
  { name: "DEXA Bone Mineral Density Scan", plainName: "Bone Density Scan (Osteoporosis)", marker: "Lumbar Spine & Femoral Neck", type: "screening", recall: 2, findings: "" },
  { name: "Cardiac Stress Test (SPECT)", plainName: "Heart Stress Test", marker: "Myocardial Perfusion", type: "diagnostic", recall: 3, findings: "" },
  { name: "Abdominal Ultrasound", plainName: "Abdominal Ultrasound (Liver/Gallbladder)", marker: "Right Upper Quadrant", type: "diagnostic", recall: 2, findings: "" }
];

const COMMON_VACCINES = getStandardVaccines().map((v) => ({
  cvx: v.cvx,
  name: v.name,
  plainName: v.plainName,
  category: v.category,
  intervalYears: v.interval === "annual" ? 1 : v.interval === "10-year" ? 10 : 99,
  description: v.description
}));

const isArthroplastyOrSided = (surgName = "") => {
  const lower = (surgName || "").toLowerCase();
  return (
    lower.includes("replacement") ||
    lower.includes("arthroplasty") ||
    lower.includes("knee") ||
    lower.includes("hip") ||
    lower.includes("shoulder") ||
    lower.includes("elbow") ||
    lower.includes("wrist") ||
    lower.includes("ankle") ||
    lower.includes("carpal") ||
    lower.includes("cataract") ||
    lower.includes("hernia") ||
    lower.includes("rotator") ||
    lower.includes("mastectomy") ||
    lower.includes("lumpectomy") ||
    lower.includes("joint replacement")
  );
};

const isConditionWithLaterality = (condName = "") => {
  const lower = (condName || "").toLowerCase();
  return (
    lower.includes("osteoarthritis") ||
    lower.includes("carpal") ||
    lower.includes("rotator") ||
    lower.includes("hernia") ||
    lower.includes("sciatica") ||
    lower.includes("bursitis") ||
    lower.includes("tendonitis") ||
    lower.includes("fracture") ||
    lower.includes("sprain")
  );
};

export function PatientOnboardingModal({
  isOpen,
  onClose,
  initialProfile = {},
  onBatchCommit,
  onExploreDemo
}) {
  // View state: "choice" | "wizard" | "pdf_upload" | "pdf_review"
  const [viewMode, setViewMode] = useState("choice");

  // Wizard Step: 1 (Demographics/Allergies) -> 2 (Conditions) -> 3 (Surgeries) -> 4 (Meds) -> 5 (Procedures) -> 6 (Vaccines) -> 7 (Review)
  const [wizardStep, setWizardStep] = useState(1);
  const [validationError, setValidationError] = useState("");

  // Check if initialProfile is demo data to prevent bleed-through
  const isInitialElena = initialProfile.name === "Elena Vance" || initialProfile.mrn === "PT-88201";
  const cleanInitialName = isInitialElena ? "" : (initialProfile.name || "").trim();
  const initialNames = cleanInitialName.split(" ");

  // STEP 1 STATE: Demographics, Contact, Care Team & Pharmacy (All start blank)
  const [firstName, setFirstName] = useState(initialNames[0] || "");
  const [lastName, setLastName] = useState(initialNames.slice(1).join(" ") || "");
  const [dob, setDob] = useState((!isInitialElena && initialProfile.dob && initialProfile.dob !== "1968-04-12") ? initialProfile.dob : "");
  const [sex, setSex] = useState(initialProfile.sex || "female");
  const [otherSexSpecification, setOtherSexSpecification] = useState(
    initialProfile.sex === "other" ? (initialProfile.otherSexSpecification || "") : ""
  );
  const [bloodType, setBloodType] = useState(initialProfile.bloodType || "I don't know");
  const [veteranStatus, setVeteranStatus] = useState(
    initialProfile.veteranStatus === "Yes" || initialProfile.veteranStatus === "yes" || (typeof initialProfile.veteranStatus === "string" && initialProfile.veteranStatus.toLowerCase().includes("veteran")) ? "Yes" : "No"
  );
  const [phone, setPhone] = useState(!isInitialElena ? (initialProfile.phone || "") : "");
  const [email, setEmail] = useState(!isInitialElena ? (initialProfile.email || "") : "");
  const [address, setAddress] = useState(!isInitialElena ? (initialProfile.address || "") : "");

  // Emergency Contact (Split First Name and Last Name)
  const initialEcFirst = !isInitialElena ? (initialProfile.emergencyContactFirstName || (initialProfile.emergencyContactName ? initialProfile.emergencyContactName.split(" ")[0] : "")) : "";
  const initialEcLast = !isInitialElena ? (initialProfile.emergencyContactLastName || (initialProfile.emergencyContactName ? initialProfile.emergencyContactName.split(" ").slice(1).join(" ") : "")) : "";
  const [emergencyContactFirstName, setEmergencyContactFirstName] = useState(initialEcFirst);
  const [emergencyContactLastName, setEmergencyContactLastName] = useState(initialEcLast);
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(initialProfile.emergencyContactRelation || "Spouse");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(!isInitialElena ? (initialProfile.emergencyContactPhone || "") : "");

  // Care Team
  const [pcpName, setPcpName] = useState(!isInitialElena && initialProfile.pcp ? initialProfile.pcp.replace(/\s*\(Internal Medicine\)/gi, "").trim() : "");
  const [pcpClinic, setPcpClinic] = useState(!isInitialElena ? (initialProfile.clinic || "") : "");
  const [pcpPhone, setPcpPhone] = useState(!isInitialElena ? (initialProfile.pcpPhone || "") : "");

  // Preferred Pharmacy
  const [pharmacyName, setPharmacyName] = useState(!isInitialElena && initialProfile.pharmacy?.name ? initialProfile.pharmacy.name : "");
  const [pharmacyAddress, setPharmacyAddress] = useState(!isInitialElena && initialProfile.pharmacy?.address ? initialProfile.pharmacy.address : "");
  const [pharmacyPhone, setPharmacyPhone] = useState(!isInitialElena && initialProfile.pharmacy?.phone ? initialProfile.pharmacy.phone : "");

  // Multi-entry structured drug allergies
  const [isNkda, setIsNkda] = useState(false);
  const [allergiesList, setAllergiesList] = useState([
    {
      id: `allg-${Date.now()}`,
      drugName: "",
      reactionType: "Rash / Hives (Urticaria)",
      approximateDate: ""
    }
  ]);



  // STEP 2 STATE: Conditions (selected + custom addition)
  const [conditionSearch, setConditionSearch] = useState("");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isAddingCustomCond, setIsAddingCustomCond] = useState(false);
  const [customCond, setCustomCond] = useState({
    name: "",
    regionId: "general_systemic",
    onsetDate: currentYear.toString(),
    provider: "",
    facility: "",
    laterality: "Right",
    notes: ""
  });

  // STEP 3 STATE: Surgeries (with conditional orthopedic / arthroplasty branching)
  const [surgerySearch, setSurgerySearch] = useState("");
  const [selectedSurgeries, setSelectedSurgeries] = useState([]);
  const [isAddingCustomSurg, setIsAddingCustomSurg] = useState(false);
  const [customSurg, setCustomSurg] = useState({
    name: "",
    site: "Knee Joint",
    surgeryMonth: "06",
    surgeryYear: currentYear.toString(),
    timingUnknown: false,
    surgeryDate: `06/${currentYear}`,
    hospital: "",
    surgeon: "",
    laterality: "Right",
    approach: "Total",
    hardwareNotes: "",
    notes: ""
  });

  // STEP 4 STATE: Medications (decoupled alphabetical + progressive disclosure)
  const [medSearch, setMedSearch] = useState("");
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [isAddingCustomMed, setIsAddingCustomMed] = useState(false);
  const [customMedName, setCustomMedName] = useState("");

  // STEP 5 STATE: Procedures (structured fields: findings, recall, etc.)
  const [procSearch, setProcSearch] = useState("");
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [isAddingCustomProc, setIsAddingCustomProc] = useState(false);
  const [customProc, setCustomProc] = useState({
    name: "",
    type: "diagnostic",
    datePerformed: new Date().toISOString().split("T")[0],
    physician: "",
    facility: "",
    findings: "",
    recallYears: 1
  });

  // STEP 6 STATE: Vaccines (with optional lot numbers)
  const [vaxSearch, setVaxSearch] = useState("");
  const [selectedVaccines, setSelectedVaccines] = useState([]);
  const [isAddingCustomVax, setIsAddingCustomVax] = useState(false);
  const [customVax, setCustomVax] = useState({
    name: "",
    dateAdministered: new Date().toISOString().split("T")[0],
    clinic: "",
    lotNumber: ""
  });

  // PDF Upload State
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfParseError, setPdfParseError] = useState("");
  const [extractedData, setExtractedData] = useState({
    profile: {},
    conditions: [],
    surgeries: [],
    medications: [],
    procedures: [],
    vaccines: []
  });
  const fileInputRef = useRef(null);

  // FEDERAL HEALTH APIS: NLM CTSS (Conditions) & NIH RxNorm (Medications)
  const [ctssResults, setCtssResults] = useState([]);
  const [isSearchingCtss, setIsSearchingCtss] = useState(false);

  const [rxnormResults, setRxnormResults] = useState([]);
  const [isSearchingRxNorm, setIsSearchingRxNorm] = useState(false);

  // Synchronize initial state when opening modal with strict zero demo bleed
  useEffect(() => {
    if (isOpen) {
      setValidationError("");
      const isDemo = initialProfile.name === "Elena Vance" || initialProfile.mrn === "PT-88201";
      if (!isDemo && initialProfile.name) {
        const cleanName = (initialProfile.name || "").trim();
        const names = cleanName.split(" ");
        setFirstName(names[0] || "");
        setLastName(names.slice(1).join(" ") || "");
        if (initialProfile.dob && initialProfile.dob !== "1968-04-12") setDob(initialProfile.dob);
        if (initialProfile.sex) setSex(initialProfile.sex);
        if (initialProfile.bloodType) setBloodType(initialProfile.bloodType);
        if (initialProfile.phone) setPhone(initialProfile.phone);
        if (initialProfile.email) setEmail(initialProfile.email);
        if (initialProfile.address) setAddress(initialProfile.address);
        if (initialProfile.veteranStatus) {
          setVeteranStatus(initialProfile.veteranStatus === "Yes" || initialProfile.veteranStatus === "yes" || initialProfile.veteranStatus.toLowerCase().includes("veteran") ? "Yes" : "No");
        }
        
        const ecFirst = initialProfile.emergencyContactFirstName || (initialProfile.emergencyContactName ? initialProfile.emergencyContactName.split(" ")[0] : "");
        const ecLast = initialProfile.emergencyContactLastName || (initialProfile.emergencyContactName ? initialProfile.emergencyContactName.split(" ").slice(1).join(" ") : "");
        if (ecFirst) setEmergencyContactFirstName(ecFirst);
        if (ecLast) setEmergencyContactLastName(ecLast);
        if (initialProfile.emergencyContactRelation) setEmergencyContactRelation(initialProfile.emergencyContactRelation);
        if (initialProfile.emergencyContactPhone) setEmergencyContactPhone(initialProfile.emergencyContactPhone);

        if (initialProfile.pcp) setPcpName(initialProfile.pcp.replace(/\s*\(Internal Medicine\)/gi, "").trim());
        if (initialProfile.clinic) setPcpClinic(initialProfile.clinic);
        if (initialProfile.pcpPhone) setPcpPhone(initialProfile.pcpPhone);

        if (initialProfile.pharmacy?.name) setPharmacyName(initialProfile.pharmacy.name);
        if (initialProfile.pharmacy?.address) setPharmacyAddress(initialProfile.pharmacy.address);
        if (initialProfile.pharmacy?.phone) setPharmacyPhone(initialProfile.pharmacy.phone);
      } else {
        // Clear all fields for a fresh manual health intake
        setFirstName("");
        setLastName("");
        setDob("");
        setSex("female");
        setBloodType("I don't know");
        setVeteranStatus("No");
        setPhone("");
        setEmail("");
        setAddress("");
        setEmergencyContactFirstName("");
        setEmergencyContactLastName("");
        setEmergencyContactRelation("Spouse");
        setEmergencyContactPhone("");
        setPcpName("");
        setPcpClinic("");
        setPcpPhone("");
        setPharmacyName("");
        setPharmacyAddress("");
        setPharmacyPhone("");
        setSelectedConditions([]);
        setSelectedSurgeries([]);
        setSelectedMeds([]);
        setSelectedProcedures([]);
        setSelectedVaccines([]);
      }
    }
  }, [isOpen, initialProfile]);

  // Debounced search for NLM CTSS ICD-10 conditions
  useEffect(() => {
    const q = (conditionSearch || "").trim();
    if (q.length < 2) {
      setCtssResults([]);
      setIsSearchingCtss(false);
      return;
    }

    setIsSearchingCtss(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchConditions(q);
        setCtssResults(results || []);
      } catch (e) {
        console.warn("CTSS search error:", e);
      } finally {
        setIsSearchingCtss(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [conditionSearch]);

  // Debounced search for NIH RxNorm medications
  useEffect(() => {
    const q = (medSearch || "").trim();
    if (q.length < 2) {
      setRxnormResults([]);
      setIsSearchingRxNorm(false);
      return;
    }

    setIsSearchingRxNorm(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchMedications(q);
        setRxnormResults(results || []);
      } catch (e) {
        console.warn("RxNorm search error:", e);
      } finally {
        setIsSearchingRxNorm(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [medSearch]);

  /* -------------------------------------------------------------
     ALLERGY SUBFORM HANDLERS
  ------------------------------------------------------------- */
  const handleAddAllergyRow = () => {
    setAllergiesList((prev) => [
      ...prev,
      {
        id: `allg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        drugName: "",
        reactionType: "Rash / Hives (Urticaria)",
        approximateDate: ""
      }
    ]);
    setIsNkda(false);
  };

  const handleUpdateAllergyRow = (id, field, value) => {
    setAllergiesList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleRemoveAllergyRow = (id) => {
    setAllergiesList((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggleNkda = (checked) => {
    setIsNkda(checked);
    if (checked) {
      setAllergiesList([]);
    } else {
      setAllergiesList([
        {
          id: `allg-${Date.now()}`,
          drugName: "",
          reactionType: "Rash / Hives (Urticaria)",
          approximateDate: ""
        }
      ]);
    }
  };

  /* -------------------------------------------------------------
     STEP 2: CONDITIONS HANDLERS
  ------------------------------------------------------------- */
  const handleSelectCtssCondition = (ctssItem) => {
    if (selectedConditions.some((c) => c.name.toLowerCase() === ctssItem.name.toLowerCase())) {
      return;
    }
    const hasLat = isConditionWithLaterality(ctssItem.name);
    const regionObj = ANATOMICAL_REGIONS.find((r) => {
      const t = ctssItem.name.toLowerCase();
      if (t.includes("hypertens") || t.includes("heart") || t.includes("coronary")) return r.id === "chest_cardiac";
      if (t.includes("head") || t.includes("migraine") || t.includes("stroke") || t.includes("ear") || t.includes("eye")) return r.id === "head_neck";
      if (t.includes("lung") || t.includes("asthma") || t.includes("copd") || t.includes("bronch")) return r.id === "lungs_respiratory";
      if (t.includes("knee") || t.includes("leg") || t.includes("foot") || t.includes("ankle")) return r.id === "right_leg";
      if (t.includes("shoulder") || t.includes("arm") || t.includes("hand") || t.includes("wrist")) return r.id === "right_arm";
      if (t.includes("back") || t.includes("spine") || t.includes("lumbar")) return r.id === "spine_back";
      if (t.includes("gerd") || t.includes("reflux") || t.includes("stomach") || t.includes("gastric")) return r.id === "stomach_esophagus";
      if (t.includes("colon") || t.includes("bowel") || t.includes("rectal")) return r.id === "lower_bowel";
      return false;
    }) || ANATOMICAL_REGIONS[ANATOMICAL_REGIONS.length - 1];

    let coords = { ...regionObj.coords };
    if (hasLat) {
      coords.x = -Math.abs(coords.x || 1.0);
    }

    setSelectedConditions((prev) => [
      ...prev,
      {
        id: `cond-ctss-${Date.now()}`,
        name: ctssItem.name,
        plainName: ctssItem.name,
        region: regionObj.label,
        coords,
        system: regionObj.system,
        isPosterior: regionObj.isPosterior || false,
        icd10: ctssItem.code,
        onsetDate: currentYear.toString(),
        provider: "",
        facility: "",
        hasLaterality: hasLat,
        laterality: hasLat ? "Right" : "",
        notes: `ICD-10-CM: ${ctssItem.code}`
      }
    ]);
  };

  const toggleConditionPreset = (cond) => {
    if (selectedConditions.some((c) => c.name === cond.name)) {
      setSelectedConditions((prev) => prev.filter((c) => c.name !== cond.name));
    } else {
      const hasLat = cond.hasLaterality || isConditionWithLaterality(cond.name);
      setSelectedConditions((prev) => [
        ...prev,
        {
          id: cond.id || `cond-${Date.now()}`,
          name: cond.name,
          plainName: cond.plainName || cond.name,
          region: cond.region,
          coords: cond.coords,
          system: cond.system,
          icd10: cond.icd10,
          onsetDate: currentYear.toString(),
          provider: "",
          facility: "",
          hasLaterality: hasLat,
          laterality: hasLat ? "Right" : "",
          notes: cond.notes || ""
        }
      ]);
    }
  };

  const handleUpdateConditionField = (id, field, value) => {
    setSelectedConditions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        if (field === "laterality" && updated.coords) {
          if (value === "Right" && updated.coords.x > 0) {
            updated.coords = { ...updated.coords, x: -Math.abs(updated.coords.x) };
          } else if (value === "Left" && updated.coords.x < 0) {
            updated.coords = { ...updated.coords, x: Math.abs(updated.coords.x) };
          } else if (value === "Bilateral") {
            updated.coords = { ...updated.coords, x: 0 };
          }
        }
        return updated;
      })
    );
  };

  const handleSaveCustomCondition = () => {
    if (!customCond.name.trim()) return;
    const regionObj = ANATOMICAL_REGIONS.find((r) => r.id === customCond.regionId) || ANATOMICAL_REGIONS[ANATOMICAL_REGIONS.length - 1];
    const hasLat = isConditionWithLaterality(customCond.name);
    let coords = { ...regionObj.coords };
    if (hasLat && customCond.laterality === "Right") {
      coords.x = -Math.abs(coords.x || 1.0);
    } else if (hasLat && customCond.laterality === "Left") {
      coords.x = Math.abs(coords.x || 1.0);
    } else if (hasLat && customCond.laterality === "Bilateral") {
      coords.x = 0;
    }

    const newCond = {
      id: `cond-custom-${Date.now()}`,
      name: customCond.name.trim(),
      plainName: customCond.name.trim(),
      region: regionObj.label,
      coords,
      system: regionObj.system,
      isPosterior: regionObj.isPosterior || false,
      onsetDate: customCond.onsetDate || "N/A",
      provider: customCond.provider || "",
      facility: customCond.facility || "",
      hasLaterality: hasLat,
      laterality: hasLat ? (customCond.laterality || "Right") : "",
      notes: customCond.notes || ""
    };
    setSelectedConditions((prev) => [...prev, newCond]);
    setCustomCond({
      name: "",
      regionId: "general_systemic",
      onsetDate: currentYear.toString(),
      provider: "",
      facility: "",
      laterality: "Right",
      notes: ""
    });
    setIsAddingCustomCond(false);
  };

  /* -------------------------------------------------------------
     STEP 3: SURGERIES HANDLERS
  ------------------------------------------------------------- */
  const toggleSurgeryPreset = (surg) => {
    if (selectedSurgeries.some((s) => s.name === surg.name)) {
      setSelectedSurgeries((prev) => prev.filter((s) => s.name !== surg.name));
    } else {
      const isSided = isArthroplastyOrSided(surg.name);
      const defaultYear = (currentYear - 2).toString();
      setSelectedSurgeries((prev) => [
        ...prev,
        {
          id: surg.id || `surg-${Date.now()}`,
          name: surg.name,
          plainName: surg.plainName || surg.name,
          site: surg.site,
          incision: surg.incision,
          coords: surg.coords,
          system: surg.system,
          isPosterior: surg.isPosterior || false,
          timingUnknown: false,
          surgeryMonth: "06",
          surgeryYear: defaultYear,
          surgeryDate: `06/${defaultYear}`,
          hospital: surg.hospital || "",
          surgeon: surg.surgeon || "",
          notes: surg.notes || "",
          // Branching fields
          isSided,
          laterality: isSided ? "Right" : "Bilateral",
          approach: isSided ? "Total" : "Standard Open",
          hardwareNotes: ""
        }
      ]);
    }
  };

  const handleUpdateSurgeryField = (id, field, value) => {
    setSelectedSurgeries((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === "timingUnknown") {
          if (value) {
            updated.surgeryDate = "N/A";
          } else {
            const m = updated.surgeryMonth || "01";
            const y = updated.surgeryYear || currentYear.toString();
            updated.surgeryDate = `${m}/${y}`;
          }
        } else if (field === "surgeryMonth" || field === "surgeryYear") {
          if (!updated.timingUnknown) {
            const m = field === "surgeryMonth" ? value : (updated.surgeryMonth || "01");
            const y = field === "surgeryYear" ? value : (updated.surgeryYear || currentYear.toString());
            updated.surgeryDate = `${m}/${y}`;
          }
        }
        // If laterality changes, flip X coordinate if needed
        if (field === "laterality" && updated.coords) {
          if (value === "Right" && updated.coords.x > 0) {
            updated.coords = { ...updated.coords, x: -Math.abs(updated.coords.x) };
          } else if (value === "Left" && updated.coords.x < 0) {
            updated.coords = { ...updated.coords, x: Math.abs(updated.coords.x) };
          }
        }
        return updated;
      })
    );
  };

  const handleSaveCustomSurgery = () => {
    if (!customSurg.name.trim()) return;
    const isSided = isArthroplastyOrSided(customSurg.name);
    let coords = { x: -0.82, y: -4.55, z: 0.82 };
    if (customSurg.laterality === "Left") coords = { x: 0.82, y: -4.55, z: 0.82 };

    const surgeryDate = customSurg.timingUnknown
      ? "N/A"
      : customSurg.surgeryMonth && customSurg.surgeryYear
      ? `${customSurg.surgeryMonth}/${customSurg.surgeryYear}`
      : customSurg.surgeryYear || "N/A";

    const newSurg = {
      id: `surg-custom-${Date.now()}`,
      name: customSurg.name.trim(),
      plainName: customSurg.name.trim(),
      site: customSurg.site || "General Surgical Site",
      incision: "Surgical Incision Scar",
      coords,
      system: "orthopedic",
      timingUnknown: customSurg.timingUnknown,
      surgeryMonth: customSurg.surgeryMonth || "06",
      surgeryYear: customSurg.surgeryYear || currentYear.toString(),
      surgeryDate,
      hospital: customSurg.hospital || "",
      surgeon: customSurg.surgeon || "",
      isSided,
      laterality: customSurg.laterality,
      approach: customSurg.approach,
      hardwareNotes: customSurg.hardwareNotes,
      notes: customSurg.notes || ""
    };
    setSelectedSurgeries((prev) => [...prev, newSurg]);
    setCustomSurg({
      name: "",
      site: "Knee Joint",
      surgeryMonth: "06",
      surgeryYear: currentYear.toString(),
      timingUnknown: false,
      surgeryDate: `06/${currentYear}`,
      hospital: "",
      surgeon: "",
      laterality: "Right",
      approach: "Total",
      hardwareNotes: "",
      notes: ""
    });
    setIsAddingCustomSurg(false);
  };

  /* -------------------------------------------------------------
     STEP 4: MEDICATIONS HANDLERS
  ------------------------------------------------------------- */
  const toggleMedicationItem = (drugName, rxcui = "") => {
    if (selectedMeds.some((m) => m.name.toLowerCase() === drugName.toLowerCase())) {
      setSelectedMeds((prev) => prev.filter((m) => m.name.toLowerCase() !== drugName.toLowerCase()));
    } else {
      const defaults = getMedicationClinicalDefaults(drugName, selectedConditions);
      const newMedId = `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setSelectedMeds((prev) => [
        ...prev,
        {
          id: newMedId,
          name: drugName,
          rxcui: rxcui || "",
          doseNumber: defaults.doseNumber,
          doseUnit: defaults.doseUnit,
          dosage: `${defaults.doseNumber} ${defaults.doseUnit}`,
          standardDoses: defaults.standardDoses,
          frequency: defaults.frequency,
          startDate: currentYear.toString(),
          indication: defaults.indication,
          customIndication: "",
          route: "Oral (PO)",
          lastPickedUpDate: "",
          lastPickedUpPharmacy: "",
          daysSupply: "",
          quantityAmount: "",
          refillsRemaining: "",
          rxNumber: ""
        }
      ]);

      // Dynamically fetch standardized clinical strengths from NIH RxNorm
      getMedicationStrengths(rxcui, drugName).then((strengthInfo) => {
        if (strengthInfo?.strengths?.length > 0) {
          setSelectedMeds((prev) =>
            prev.map((m) => {
              if (m.id !== newMedId) return m;
              return {
                ...m,
                standardDoses: strengthInfo.strengths,
                dosageForms: strengthInfo.dosageForms
              };
            })
          );
        }
      }).catch((err) => console.warn("RxNorm strength lookup error:", err));
    }
  };

  const handleUpdateMedicationField = (id, field, value) => {
    setSelectedMeds((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        if (field === "doseNumber" || field === "doseUnit") {
          const num = field === "doseNumber" ? value : m.doseNumber;
          const unit = field === "doseUnit" ? value : m.doseUnit;
          updated.dosage = `${num} ${unit}`.trim();
        }
        return updated;
      })
    );
  };

  const handleSelectPredefinedDose = (id, doseStr) => {
    const parts = doseStr.trim().split(" ");
    const num = parts[0] || "10";
    const unit = parts.slice(1).join(" ") || "mg";
    setSelectedMeds((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              doseNumber: num,
              doseUnit: unit,
              dosage: doseStr
            }
          : m
      )
    );
  };

  const handleAddCustomMedication = () => {
    if (!customMedName.trim()) return;
    toggleMedicationItem(customMedName.trim());
    setCustomMedName("");
    setIsAddingCustomMed(false);
  };

  /* -------------------------------------------------------------
     STEP 5: PROCEDURES HANDLERS
  ------------------------------------------------------------- */
  const toggleProcedurePreset = (proc) => {
    if (selectedProcedures.some((p) => p.procedure_name === proc.name)) {
      setSelectedProcedures((prev) => prev.filter((p) => p.procedure_name !== proc.name));
    } else {
      setSelectedProcedures((prev) => [
        ...prev,
        {
          id: `proc-${Date.now()}`,
          procedure_name: proc.name,
          plainName: proc.name,
          procedure_type: proc.type,
          date_performed: new Date().toISOString().split("T")[0],
          anatomical_marker: proc.marker,
          performing_clinician: "",
          institution: "",
          findings: proc.findings || "",
          recall_interval_years: proc.recall
        }
      ]);
    }
  };

  const handleUpdateProcedureField = (id, field, value) => {
    setSelectedProcedures((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSaveCustomProcedure = () => {
    if (!customProc.name.trim()) return;
    if (!customProc.findings?.trim()) {
      alert("Please provide the procedure findings/results (Required).");
      return;
    }
    setSelectedProcedures((prev) => [
      ...prev,
      {
        id: `proc-custom-${Date.now()}`,
        procedure_name: customProc.name.trim(),
        plainName: customProc.name.trim(),
        procedure_type: customProc.type,
        date_performed: customProc.datePerformed || new Date().toISOString().split("T")[0],
        anatomical_marker: "General Diagnostic Site",
        performing_clinician: customProc.physician || "",
        institution: customProc.facility || "",
        findings: customProc.findings.trim(),
        recall_interval_years: Number(customProc.recallYears) || 1
      }
    ]);
    setCustomProc({
      name: "",
      type: "diagnostic",
      datePerformed: new Date().toISOString().split("T")[0],
      physician: "",
      facility: "",
      findings: "",
      recallYears: 1
    });
    setIsAddingCustomProc(false);
  };

  /* -------------------------------------------------------------
     STEP 6: VACCINES HANDLERS
  ------------------------------------------------------------- */
  const toggleVaccinePreset = (vax) => {
    if (selectedVaccines.some((v) => v.vaccine_name === vax.name)) {
      setSelectedVaccines((prev) => prev.filter((v) => v.vaccine_name !== vax.name));
    } else {
      setSelectedVaccines((prev) => [
        ...prev,
        {
          id: `vax-${Date.now()}`,
          vaccine_name: vax.name,
          plainName: vax.name,
          date_administered: new Date().toISOString().split("T")[0],
          dose_number: 1,
          administering_facility: "Local Health Center",
          lot_number: ""
        }
      ]);
    }
  };

  const handleUpdateVaccineField = (id, field, value) => {
    setSelectedVaccines((prev) =>
      prev.map((v) => (v.id === id ? { ...p, [field]: value } : v))
    );
  };

  const handleSaveCustomVaccine = () => {
    if (!customVax.name.trim()) return;
    setSelectedVaccines((prev) => [
      ...prev,
      {
        id: `vax-custom-${Date.now()}`,
        vaccine_name: customVax.name.trim(),
        plainName: customVax.name.trim(),
        date_administered: customVax.dateAdministered || new Date().toISOString().split("T")[0],
        dose_number: 1,
        administering_facility: customVax.clinic || "Clinic / Pharmacy",
        lot_number: customVax.lotNumber || ""
      }
    ]);
    setCustomVax({
      name: "",
      dateAdministered: new Date().toISOString().split("T")[0],
      clinic: "",
      lotNumber: ""
    });
    setIsAddingCustomVax(false);
  };

  /* -------------------------------------------------------------
     BATCH COMMIT (FINISH WIZARD)
  ------------------------------------------------------------- */
  const handleFinishWizard = () => {
    const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const fullName = combinedName || initialProfile.name || "Patient";
    const dynamicAge = calculateAge(dob);
    const combinedEcName = `${emergencyContactFirstName.trim()} ${emergencyContactLastName.trim()}`.trim();
    const formattedContact = combinedEcName
      ? `${combinedEcName} (${emergencyContactRelation}) • ${emergencyContactPhone.trim()}`
      : "N/A";

    // Validate procedure findings: Findings cannot be blank!
    const unenteredProc = selectedProcedures.find(
      (p) => !p.findings || !p.findings.trim()
    );
    if (unenteredProc) {
      alert(`Findings are required for all procedures. Please provide findings for "${unenteredProc.procedure_name || unenteredProc.plainName}" in Step 5.`);
      setWizardStep(5);
      return;
    }

    // Format structured allergies for demographics
    const formattedAllergiesList = isNkda
      ? []
      : allergiesList
          .filter((a) => a.drugName.trim().length > 0)
          .map((a) => ({
            id: a.id,
            medication: a.drugName.trim(),
            drugName: a.drugName.trim(),
            reaction: a.reactionType,
            severity: a.reactionType.includes("Anaphylaxis") ? "Severe" : "Moderate",
            dateDocumented: a.approximateDate || new Date().getFullYear().toString(),
            status: "Active"
          }));

    // Process medications with final indications and dispensing fields
    const finalizedMeds = selectedMeds.map((m) => ({
      ...m,
      dosage: m.dosage || `${m.doseNumber || "10"} ${m.doseUnit || "mg"}`,
      indication: m.indication === "Other" && m.customIndication ? m.customIndication : m.indication,
      days_supply: m.daysSupply ? Number(m.daysSupply) : null,
      daysSupply: m.daysSupply,
      last_picked_up_date: m.lastPickedUpDate || null,
      lastPickedUpDate: m.lastPickedUpDate,
      last_picked_up_pharmacy: m.lastPickedUpPharmacy || null,
      lastPickedUpPharmacy: m.lastPickedUpPharmacy,
      quantity_amount: m.quantityAmount ? Number(m.quantityAmount) : null,
      quantityAmount: m.quantityAmount,
      refills_remaining: m.refillsRemaining !== "" && m.refillsRemaining !== undefined ? Number(m.refillsRemaining) : null,
      refillsRemaining: m.refillsRemaining,
      rx_number: m.rxNumber || null,
      rxNumber: m.rxNumber
    }));

    // Finalize conditions coords based on laterality
    const finalizedConditions = selectedConditions.map((c) => {
      let x = c.coordinates?.x || 0;
      if (c.laterality === "Right") {
        x = -Math.abs(x === 0 ? 0.35 : x);
      } else if (c.laterality === "Left") {
        x = Math.abs(x === 0 ? 0.35 : x);
      } else if (c.laterality === "Bilateral") {
        x = 0;
      }
      return {
        ...c,
        coordinates: {
          x,
          y: c.coordinates?.y || 0,
          z: c.coordinates?.z || 0
        }
      };
    });

    onBatchCommit({
      profile: {
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
        age: dynamicAge,
        sex,
        otherSexSpecification: sex === "other" ? otherSexSpecification : "",
        bloodType,
        veteranStatus,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        emergencyContactFirstName: emergencyContactFirstName.trim(),
        emergencyContactLastName: emergencyContactLastName.trim(),
        emergencyContactName: combinedEcName,
        emergencyContactRelation,
        emergencyContactPhone: emergencyContactPhone.trim(),
        emergencyContact: formattedContact,
        pcp: pcpName.trim() ? (pcpName.trim().toLowerCase().includes("dr.") ? pcpName.trim() : `Dr. ${pcpName.trim()}`) : "",
        clinic: pcpClinic.trim(),
        pcpPhone: pcpPhone.trim(),
        pharmacy: {
          name: pharmacyName.trim(),
          address: pharmacyAddress.trim(),
          phone: pharmacyPhone.trim()
        }
      },
      isNkda,
      allergiesList: formattedAllergiesList,
      conditions: finalizedConditions,
      surgeries: selectedSurgeries,
      medications: finalizedMeds,
      procedures: selectedProcedures,
      vaccinations: selectedVaccines
    });
    onClose();
  };

  const handleStepForward = () => {
    if (wizardStep === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        alert("Please enter both First Name and Last Name.");
        return;
      }
      if (!dob) {
        alert("Please enter Date of Birth.");
        return;
      }
    }
    if (wizardStep === 5) {
      const emptyProc = selectedProcedures.find((p) => !p.findings || !p.findings.trim());
      if (emptyProc) {
        alert(`Findings are required for all procedures. Please document findings for "${emptyProc.procedure_name || emptyProc.plainName}" before continuing.`);
        return;
      }
    }
    setWizardStep((s) => s + 1);
  };

  /* -------------------------------------------------------------
     PDF EXTRACTION HANDLERS
  ------------------------------------------------------------- */
  const handlePdfFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setPdfParseError("Please select a valid PDF health record document.");
      return;
    }

    setPdfFileName(file.name);
    setIsParsingPdf(true);
    setPdfParseError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      let fullText = "";
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += "\n" + pageText;
      }

      // Extraction across clinical text
      const extracted = parseClinicalText(fullText);
      setExtractedData(extracted);
      setViewMode("pdf_review");
    } catch (err) {
      console.error("PDF Parsing error:", err);
      setPdfParseError("Could not read PDF document text. Please ensure the file is not password-protected.");
    } finally {
      setIsParsingPdf(false);
    }
  };

  const parseClinicalText = (text) => {
    const rawLower = text.toLowerCase();
    const profile = {};
    const nameMatch = text.match(/(?:patient\s+name|name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameMatch) profile.name = nameMatch[1].trim();

    const dobMatch = text.match(/(?:dob|date\s+of\s+birth|birthdate)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
    if (dobMatch) profile.dob = dobMatch[1].trim();

    const matchedConditions = [];
    (CLINICAL_CATALOG.conditions || []).forEach((c) => {
      const plain = (c.plainName || "").toLowerCase();
      const clinical = c.name.toLowerCase();
      if (rawLower.includes(clinical) || (plain && rawLower.includes(plain))) {
        matchedConditions.push({
          id: `cond-pdf-${c.id}`,
          name: c.name,
          plainName: c.plainName,
          region: c.region,
          coords: c.coords,
          system: c.system,
          icd10: c.icd10,
          onsetDate: new Date().getFullYear().toString(),
          status: "Active",
          notes: "Extracted from uploaded health record."
        });
      }
    });

    const matchedSurgeries = [];
    (CLINICAL_CATALOG.surgeries || []).forEach((s) => {
      const plain = (s.plainName || "").toLowerCase();
      const clinical = s.name.toLowerCase();
      if (rawLower.includes(clinical) || (plain && rawLower.includes(plain))) {
        matchedSurgeries.push({
          id: `surg-pdf-${s.id}`,
          name: s.name,
          plainName: s.plainName,
          site: s.site,
          incision: s.incision,
          coords: s.coords,
          system: s.system,
          isPosterior: s.isPosterior || false,
          surgeryDate: "2022",
          hospital: "Medical Center",
          notes: "Extracted from uploaded health record."
        });
      }
    });

    const matchedMeds = [];
    ALPHABETICAL_COMMON_MEDICATIONS.forEach((m) => {
      const baseName = m.split("(")[0].trim().toLowerCase();
      if (rawLower.includes(baseName)) {
        matchedMeds.push({
          id: `med-pdf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: m,
          dosage: "Standard Dose",
          frequency: "Once daily (QD)",
          startDate: new Date().getFullYear().toString(),
          indication: "General Indication"
        });
      }
    });

    const matchedProcs = [];
    COMMON_PROCEDURES.forEach((p) => {
      if (rawLower.includes(p.name.toLowerCase()) || rawLower.includes(p.plainName.toLowerCase())) {
        matchedProcs.push({
          id: `proc-pdf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          procedure_name: p.name,
          plainName: p.plainName,
          procedure_type: p.type,
          date_performed: new Date().toISOString().split("T")[0],
          anatomical_marker: p.marker,
          findings: p.findings,
          recall_interval_years: p.recall
        });
      }
    });

    const matchedVaccines = [];
    COMMON_VACCINES.forEach((v) => {
      if (rawLower.includes(v.name.toLowerCase()) || rawLower.includes(v.plainName.toLowerCase())) {
        matchedVaccines.push({
          id: `vax-pdf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          vaccine_name: v.name,
          plainName: v.plainName,
          date_administered: new Date().toISOString().split("T")[0],
          dose_number: 1,
          administering_facility: "Medical Center Clinic"
        });
      }
    });

    return {
      profile,
      conditions: matchedConditions,
      surgeries: matchedSurgeries,
      medications: matchedMeds,
      procedures: matchedProcs,
      vaccines: matchedVaccines
    };
  };

  const handleFinishPdfImport = () => {
    const finalDob = extractedData.profile?.dob || dob;
    const dynamicAge = calculateAge(finalDob);
    const formattedContact = emergencyContactName.trim()
      ? `${emergencyContactName.trim()} (${emergencyContactRelation}) • ${emergencyContactPhone.trim()}`
      : "N/A";

    onBatchCommit({
      profile: {
        name: extractedData.profile?.name || `${firstName} ${lastName}`.trim() || initialProfile.name || "Patient",
        dob: finalDob,
        age: dynamicAge,
        sex,
        otherSexSpecification: sex === "other" ? otherSexSpecification : "",
        bloodType,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        emergencyContact: formattedContact
      },
      isNkda: false,
      allergiesList: [],
      conditions: extractedData.conditions,
      surgeries: extractedData.surgeries,
      medications: extractedData.medications,
      procedures: extractedData.procedures,
      vaccinations: extractedData.vaccines
    });
    onClose();
  };

  /* -------------------------------------------------------------
     FILTERED SEARCH LISTS
  ------------------------------------------------------------- */
  const filteredConditions = useMemo(() => {
    const list = CLINICAL_CATALOG.conditions || [];
    if (!conditionSearch.trim()) return list.slice(0, 16);
    const q = conditionSearch.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.plainName && c.plainName.toLowerCase().includes(q)) ||
        (c.region && c.region.toLowerCase().includes(q))
    );
  }, [conditionSearch]);

  const filteredSurgeries = useMemo(() => {
    const list = CLINICAL_CATALOG.surgeries || [];
    if (!surgerySearch.trim()) return list.slice(0, 14);
    const q = surgerySearch.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.plainName && s.plainName.toLowerCase().includes(q)) ||
        (s.site && s.site.toLowerCase().includes(q))
    );
  }, [surgerySearch]);

  const filteredMedications = useMemo(() => {
    if (!medSearch.trim()) return ALPHABETICAL_COMMON_MEDICATIONS;
    const q = medSearch.toLowerCase();
    return ALPHABETICAL_COMMON_MEDICATIONS.filter((m) => m.toLowerCase().includes(q));
  }, [medSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal Container expanded to max-w-5xl */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[90vh] max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {viewMode === "choice" && "Welcome to Your Interactive Health Avatar"}
                  {viewMode === "wizard" && `Patient Health Intake (Step ${wizardStep} of 7)`}
                  {viewMode === "pdf_upload" && "Smart Health Record Import"}
                  {viewMode === "pdf_review" && "Verify Extracted Health Data"}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {viewMode === "choice" && "Select an intake method to calibrate your personalized 3D medical history"}
                {viewMode === "wizard" && "Structured clinical health questionnaire with anatomical precision"}
                {viewMode === "pdf_upload" && "100% private, on-device parsing with zero sensitive data egress"}
                {viewMode === "pdf_review" && "Review findings extracted from your clinical summary"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* VIEW 1: CHOICE SCREEN */}
          {viewMode === "choice" && (
            <div className="space-y-6 max-w-3xl mx-auto my-auto py-4">
              <div className="text-center mb-6">
                <span className="text-[11px] uppercase tracking-wider font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                  Getting Started
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-3">
                  How would you like to build your 3D health avatar?
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Populate your clinical profile, active conditions, surgical scars, medications, and routine screenings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Guided Intake Option */}
                <button
                  type="button"
                  onClick={() => setViewMode("wizard")}
                  className="group p-6 rounded-2xl border-2 border-teal-600/30 hover:border-teal-600 bg-teal-50/40 hover:bg-teal-50/70 dark:bg-slate-800/60 dark:hover:bg-teal-950/30 text-left transition-all flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Guided Step-by-Step Intake
                      </h4>
                      <span className="text-[10px] font-bold bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Structured 7-step clinical questionnaire with anatomical precision, laterality controls, and full verification.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
                    <span>Start Guided Intake</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* PDF Upload Option */}
                <button
                  type="button"
                  onClick={() => setViewMode("pdf_upload")}
                  className="group p-6 rounded-2xl border-2 border-indigo-600/30 hover:border-indigo-600 bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-slate-800/60 dark:hover:bg-indigo-950/30 text-left transition-all flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Smart PDF Record Upload
                      </h4>
                      <span className="text-[10px] font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full">
                        Automated
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Upload clinical visit summaries or discharge papers. Automatically detects diagnoses and tests 100% locally on your computer.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <span>Upload Medical Record</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Strict Privacy Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
                <span>
                  <strong>Strict Privacy & Zero PHI Egress:</strong> Your health information is rendered and processed completely inside your web browser. No document files or personal details are ever transferred to third-party AI APIs.
                </span>
              </div>
            </div>
          )}

          {/* VIEW 2: GUIDED WIZARD */}
          {viewMode === "wizard" && (
            <div className="space-y-6">
              {/* Wizard Progress Stepper Bar (7 Steps) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                {[
                  { step: 1, title: "Demographics & Contacts", sub: "Profile" },
                  { step: 2, title: "Medical Conditions", sub: "Diagnoses" },
                  { step: 3, title: "Past Surgeries", sub: "Incisions & Joints" },
                  { step: 4, title: "Medications", sub: "Active Rx & Dosing" },
                  { step: 5, title: "Procedures", sub: "Diagnostic Tests" },
                  { step: 6, title: "Vaccines", sub: "Immunizations" },
                  { step: 7, title: "Review & Confirm", sub: "Confirmation" }
                ].map((item) => {
                  const isActive = wizardStep === item.step;
                  const isCompleted = wizardStep > item.step;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setWizardStep(item.step)}
                      className={`text-left p-2 rounded-xl transition-all border ${
                        isActive
                          ? "bg-teal-50 border-teal-600 dark:bg-teal-950/40 dark:border-teal-500 shadow-xs ring-1 ring-teal-500"
                          : isCompleted
                          ? "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:bg-slate-100"
                          : "bg-transparent border-transparent opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-teal-600 text-white"
                              : isCompleted
                              ? "bg-teal-100 text-teal-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isCompleted ? "✓" : item.step}
                        </span>
                        <span className={`text-xs font-bold truncate ${isActive ? "text-teal-900 dark:text-teal-200" : "text-slate-700 dark:text-slate-300"}`}>
                          {item.sub}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5 pl-5">
                        {item.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* -------------------------------------------------------------
                  STEP 1: DEMOGRAPHICS, CONTACT, VETERAN STATUS & ALLERGIES
              ------------------------------------------------------------- */}
              {wizardStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-teal-600" />
                      <span>Step 1: Patient Demographics, Veteran Status & Care Details</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure your clinical identity, contact channels, emergency contacts, care team, and drug allergies.
                    </p>
                  </div>

                  {/* Section A: Basic Identification */}
                  <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Basic Identification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* First Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          First Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. John"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-medium"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Last Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Smith"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-medium"
                        />
                      </div>

                      {/* Date of Birth & Dynamic Age */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Date of Birth <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-teal-300 dark:border-teal-700">
                            Age: {calculateAge(dob)} yo
                          </span>
                        </div>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-medium"
                        />
                      </div>

                      {/* Sex Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Sex <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={sex}
                          onChange={(e) => setSex(e.target.value)}
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-medium"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        {sex === "other" && (
                          <div className="mt-1.5 animate-in fade-in duration-150">
                            <input
                              type="text"
                              value={otherSexSpecification}
                              onChange={(e) => setOtherSexSpecification(e.target.value)}
                              placeholder="Specify identification..."
                              className="w-full px-2.5 py-1 text-xs border rounded-lg bg-teal-50/50 dark:bg-slate-800 border-teal-300 dark:border-teal-700 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blood Type & Veteran Status Explicit Question */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Blood Type
                        </label>
                        <select
                          value={bloodType}
                          onChange={(e) => setBloodType(e.target.value)}
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        >
                          {BLOOD_TYPES.map((bt) => (
                            <option key={bt} value={bt}>
                              {bt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          U.S. Military Veteran Status <span className="text-slate-400 font-normal">(Defaults to No)</span>
                        </label>
                        <select
                          value={veteranStatus}
                          onChange={(e) => setVeteranStatus(e.target.value)}
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                        >
                          <option value="No">No (Non-Veteran)</option>
                          <option value="Yes">Yes (U.S. Military Veteran)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Contact Information & Address */}
                  <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Contact Information & Mailing Address
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Primary Phone Number
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. (555) 234-5678"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. patient@example.com"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Full Mailing Address
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 124 Main Street, Boston, MA 02115"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section C: Emergency Contact (Split First & Last Name) */}
                  <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Emergency Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Contact First Name
                        </label>
                        <input
                          type="text"
                          value={emergencyContactFirstName}
                          onChange={(e) => setEmergencyContactFirstName(e.target.value)}
                          placeholder="e.g. David"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Contact Last Name
                        </label>
                        <input
                          type="text"
                          value={emergencyContactLastName}
                          onChange={(e) => setEmergencyContactLastName(e.target.value)}
                          placeholder="e.g. Smith"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Relationship
                        </label>
                        <select
                          value={emergencyContactRelation}
                          onChange={(e) => setEmergencyContactRelation(e.target.value)}
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        >
                          {EMERGENCY_RELATIONSHIPS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Emergency Phone Number
                        </label>
                        <input
                          type="tel"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(e.target.value)}
                          placeholder="e.g. (555) 987-6543"
                          className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section D: Care Team & Preferred Pharmacy */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Care Team */}
                    <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
                        <span>Care Team (Primary Clinician)</span>
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Primary Care Physician
                          </label>
                          <input
                            type="text"
                            value={pcpName}
                            onChange={(e) => setPcpName(e.target.value)}
                            placeholder="e.g. Dr. Sarah Jenkins"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Clinic / Hospital
                            </label>
                            <input
                              type="text"
                              value={pcpClinic}
                              onChange={(e) => setPcpClinic(e.target.value)}
                              placeholder="e.g. Mass General Hospital"
                              className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Office Phone
                            </label>
                            <input
                              type="tel"
                              value={pcpPhone}
                              onChange={(e) => setPcpPhone(e.target.value)}
                              placeholder="e.g. (617) 555-0199"
                              className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preferred Pharmacy */}
                    <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-teal-600" />
                        <span>Preferred Pharmacy</span>
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Pharmacy Name
                          </label>
                          <input
                            type="text"
                            value={pharmacyName}
                            onChange={(e) => setPharmacyName(e.target.value)}
                            placeholder="e.g. Walgreens #1042 / CVS Pharmacy"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Pharmacy Address
                            </label>
                            <input
                              type="text"
                              value={pharmacyAddress}
                              onChange={(e) => setPharmacyAddress(e.target.value)}
                              placeholder="e.g. 456 Elm St, Boston"
                              className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Pharmacy Phone
                            </label>
                            <input
                              type="tel"
                              value={pharmacyPhone}
                              onChange={(e) => setPharmacyPhone(e.target.value)}
                              placeholder="e.g. (617) 555-8800"
                              className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Granular Multi-Entry Allergy Subform */}
                  <div className="bg-rose-50/40 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Structured Drug Allergies & Adverse Reactions</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Specify each medication, the reaction experienced, and approximate year.
                        </p>
                      </div>

                      {/* NKDA Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={isNkda}
                          onChange={(e) => handleToggleNkda(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          No Known Drug Allergies (NKDA)
                        </span>
                      </label>
                    </div>

                    {!isNkda && (
                      <div className="space-y-3">
                        {allergiesList.map((allergy, index) => (
                          <div
                            key={allergy.id}
                            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/40 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                          >
                            {/* Drug Name with Autocomplete datalist */}
                            <div className="md:col-span-5">
                              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                Medication / Drug Name
                              </label>
                              <input
                                type="text"
                                list={`allergy-drugs-${index}`}
                                value={allergy.drugName}
                                onChange={(e) => handleUpdateAllergyRow(allergy.id, "drugName", e.target.value)}
                                placeholder="e.g. Penicillin, Sulfa, Morphine"
                                className="w-full px-2.5 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-medium"
                              />
                              <datalist id={`allergy-drugs-${index}`}>
                                {COMMON_ALLERGIC_DRUGS.map((d) => (
                                  <option key={d} value={d} />
                                ))}
                              </datalist>
                            </div>

                            {/* Reaction Type */}
                            <div className="md:col-span-4">
                              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                Reaction Type
                              </label>
                              <select
                                value={allergy.reactionType}
                                onChange={(e) => handleUpdateAllergyRow(allergy.id, "reactionType", e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                              >
                                {REACTION_TYPES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Approximate Date / Year */}
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                Approx. Year
                              </label>
                              <input
                                type="text"
                                value={allergy.approximateDate}
                                onChange={(e) => handleUpdateAllergyRow(allergy.id, "approximateDate", e.target.value)}
                                placeholder="e.g. 2018"
                                className="w-full px-2.5 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-center"
                              />
                            </div>

                            {/* Delete Action */}
                            <div className="md:col-span-1 flex justify-end pt-3 md:pt-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveAllergyRow(allergy.id)}
                                disabled={allergiesList.length === 1}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors disabled:opacity-30"
                                title="Remove allergy row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="pt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handleAddAllergyRow}
                            className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 shadow-2xs hover:bg-rose-50 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Another Drug Allergy</span>
                          </button>
                          <span className="text-[11px] text-slate-500">
                            {allergiesList.filter((a) => a.drugName.trim()).length} recorded
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 2: MEDICAL CONDITIONS (CATALOG + CUSTOM)
              ------------------------------------------------------------- */}
              {wizardStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-teal-600" />
                        <span>Step 2: Have you been diagnosed with any medical conditions?</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select from common medical diagnoses or enter custom health conditions with anatomical regions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingCustomCond(!isAddingCustomCond)}
                      className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingCustomCond ? "Close Custom Form" : "Add Custom Condition"}</span>
                    </button>
                  </div>

                  {/* Inline Custom Condition Form */}
                  {isAddingCustomCond && (
                    <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border-2 border-teal-500/40 space-y-3">
                      <h4 className="text-xs font-bold text-teal-950 dark:text-teal-200">
                        Add Custom Medical Condition
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Condition Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customCond.name}
                            onChange={(e) => setCustomCond((c) => ({ ...c, name: e.target.value }))}
                            placeholder="e.g. Raynaud's Phenomenon"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Body Region / 3D Avatar Location
                          </label>
                          <select
                            value={customCond.regionId}
                            onChange={(e) => setCustomCond((c) => ({ ...c, regionId: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          >
                            {ANATOMICAL_REGIONS.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Diagnosis Year
                          </label>
                          <select
                            value={customCond.onsetDate || "N/A"}
                            onChange={(e) => setCustomCond((c) => ({ ...c, onsetDate: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                          >
                            <option value="N/A">I don't know</option>
                            {HISTORICAL_YEARS.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Split Clinician & Hospital and Laterality */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Laterality (If Sided)
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {["Right", "Left", "Bilateral"].map((side) => (
                              <button
                                key={side}
                                type="button"
                                onClick={() => setCustomCond((c) => ({ ...c, laterality: side }))}
                                className={`py-1 text-xs font-bold rounded border transition-colors ${
                                  customCond.laterality === side
                                    ? "bg-teal-700 text-white border-teal-700"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {side}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Diagnosing Clinician
                          </label>
                          <input
                            type="text"
                            value={customCond.provider}
                            onChange={(e) => setCustomCond((c) => ({ ...c, provider: e.target.value }))}
                            placeholder="e.g. Dr. Adams"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Facility / Hospital
                          </label>
                          <input
                            type="text"
                            value={customCond.facility}
                            onChange={(e) => setCustomCond((c) => ({ ...c, facility: e.target.value }))}
                            placeholder="e.g. Mass General Hospital"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <input
                          type="text"
                          value={customCond.notes}
                          onChange={(e) => setCustomCond((c) => ({ ...c, notes: e.target.value }))}
                          placeholder="Optional clinical notes or symptoms..."
                          className="flex-1 mr-3 px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomCondition}
                          disabled={!customCond.name.trim()}
                          className="bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm"
                        >
                          Save Condition
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={conditionSearch}
                      onChange={(e) => setConditionSearch(e.target.value)}
                      placeholder="Search common conditions (e.g. Hypertension, GERD, Osteoarthritis, Asthma)..."
                      className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* NLM CTSS ICD-10 Search Autocompletions */}
                  {conditionSearch.trim().length >= 2 && (
                    <div className="p-3 rounded-xl border bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-teal-950 dark:text-teal-200 px-1">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-teal-600" />
                          <span>NLM Standardized ICD-10-CM Conditions</span>
                        </span>
                        {isSearchingCtss ? (
                          <span className="text-[10px] text-teal-600 animate-pulse">Searching NIH CTSS...</span>
                        ) : (
                          <span className="text-[10px] text-teal-600 font-mono">{ctssResults.length} matches</span>
                        )}
                      </div>

                      {ctssResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {ctssResults.map((item) => {
                            const isAdded = selectedConditions.some(
                              (c) => c.name.toLowerCase() === item.name.toLowerCase() || (c.icd10 && c.icd10 === item.code)
                            );
                            return (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => handleSelectCtssCondition(item)}
                                className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-1.5 ${
                                  isAdded
                                    ? "bg-teal-700 text-white border-teal-700 font-bold shadow-2xs"
                                    : "bg-white dark:bg-slate-900 border-teal-200 dark:border-teal-800 text-slate-800 dark:text-slate-200 hover:border-teal-400 hover:bg-teal-50/50"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold truncate text-[11px]">{item.name}</div>
                                  <div className="text-[10px] font-mono opacity-80">ICD-10: {item.code}</div>
                                </div>
                                <span className="text-xs font-bold shrink-0">{isAdded ? "✓" : "+"}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : !isSearchingCtss && (
                        <div className="text-[11px] text-slate-500 italic px-1">
                          No exact ICD-10 matches found for "{conditionSearch}". You can add it as a custom condition.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grid of Common Conditions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {filteredConditions.map((cond) => {
                      const selectedItem = selectedConditions.find((c) => c.name === cond.name);
                      const isSelected = !!selectedItem;

                      return (
                        <div
                          key={cond.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-teal-50/80 border-teal-600 dark:bg-teal-950/40 dark:border-teal-500 shadow-2xs"
                              : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div
                            onClick={() => toggleConditionPreset(cond)}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {cond.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {cond.region}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Reveal diagnosis year dropdown, laterality selector and split clinician/hospital inputs when checked */}
                          {isSelected && (
                            <div className="mt-2.5 pt-2.5 border-t border-teal-200/60 dark:border-teal-800/60 space-y-2">
                              {isConditionWithLaterality(cond.name) && (
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-950 dark:text-teal-200 mb-1">
                                    Laterality (Side)
                                  </label>
                                  <div className="grid grid-cols-3 gap-1">
                                    {["Right", "Left", "Bilateral"].map((side) => (
                                      <button
                                        key={side}
                                        type="button"
                                        onClick={() => {
                                          setSelectedConditions((prev) =>
                                            prev.map((c) => (c.name === cond.name ? { ...c, laterality: side } : c))
                                          );
                                        }}
                                        className={`py-1 text-[11px] font-bold rounded border transition-colors ${
                                          (selectedItem.laterality || "Right") === side
                                            ? "bg-teal-700 text-white border-teal-700 shadow-2xs"
                                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        {side}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-950 dark:text-teal-200 mb-0.5">
                                    Diagnosis Year
                                  </label>
                                  <select
                                    value={selectedItem.onsetDate || "N/A"}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSelectedConditions((prev) =>
                                        prev.map((c) => (c.name === cond.name ? { ...c, onsetDate: val } : c))
                                      );
                                    }}
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-700 font-medium"
                                  >
                                    <option value="N/A">I don't know</option>
                                    {HISTORICAL_YEARS.map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-950 dark:text-teal-200 mb-0.5">
                                    Diagnosing Clinician
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.provider || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSelectedConditions((prev) =>
                                        prev.map((c) => (c.name === cond.name ? { ...c, provider: val } : c))
                                      );
                                    }}
                                    placeholder="e.g. Dr. Adams"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-950 dark:text-teal-200 mb-0.5">
                                    Hospital / Facility
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.facility || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSelectedConditions((prev) =>
                                        prev.map((c) => (c.name === cond.name ? { ...c, facility: val } : c))
                                      );
                                    }}
                                    placeholder="e.g. Mass General"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-700"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 3: PAST SURGERIES & CONDITIONAL ORTHOPEDIC GRANULARITY
              ------------------------------------------------------------- */}
              {wizardStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Heart className="w-4 h-4 text-indigo-600" />
                        <span>Step 3: Past Surgeries, Joint Replacements & Incision Scars</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select previous procedures. For joint replacements or side-dependent surgeries, configure laterality and approach.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingCustomSurg(!isAddingCustomSurg)}
                      className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingCustomSurg ? "Close Custom Form" : "Add Custom Surgery"}</span>
                    </button>
                  </div>

                  {/* Inline Custom Surgery Form */}
                  {isAddingCustomSurg && (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-500/40 space-y-3">
                      <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        Add Custom Surgical Procedure
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Procedure Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customSurg.name}
                            onChange={(e) => setCustomSurg((s) => ({ ...s, name: e.target.value }))}
                            placeholder="e.g. Total Shoulder Arthroplasty"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Laterality / Side
                          </label>
                          <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
                            {["Left", "Right", "Bilateral"].map((side) => (
                              <button
                                key={side}
                                type="button"
                                onClick={() => setCustomSurg((s) => ({ ...s, laterality: side }))}
                                className={`flex-1 py-1.5 font-bold transition-all ${
                                  customSurg.laterality === side
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {side}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Surgery Date
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              <input
                                type="checkbox"
                                checked={customSurg.timingUnknown}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setCustomSurg((s) => ({
                                    ...s,
                                    timingUnknown: checked,
                                    surgeryDate: checked ? "N/A" : `${s.surgeryMonth || "06"}/${s.surgeryYear || currentYear}`
                                  }));
                                }}
                                className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>I don't know</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              disabled={customSurg.timingUnknown}
                              value={customSurg.surgeryMonth}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomSurg((s) => ({
                                  ...s,
                                  surgeryMonth: val,
                                  surgeryDate: s.timingUnknown ? "N/A" : `${val}/${s.surgeryYear || currentYear}`
                                }));
                              }}
                              className="w-full px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                            >
                              {SURGERY_MONTHS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                            <select
                              disabled={customSurg.timingUnknown}
                              value={customSurg.surgeryYear}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomSurg((s) => ({
                                  ...s,
                                  surgeryYear: val,
                                  surgeryDate: s.timingUnknown ? "N/A" : `${s.surgeryMonth || "06"}/${val}`
                                }));
                              }}
                              className="w-full px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                            >
                              {HISTORICAL_YEARS.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Performing Surgeon
                          </label>
                          <input
                            type="text"
                            value={customSurg.surgeon || ""}
                            onChange={(e) => setCustomSurg((s) => ({ ...s, surgeon: e.target.value }))}
                            placeholder="e.g. Dr. Sterling"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Surgical Hospital / Facility
                          </label>
                          <input
                            type="text"
                            value={customSurg.hospital}
                            onChange={(e) => setCustomSurg((s) => ({ ...s, hospital: e.target.value }))}
                            placeholder="e.g. New England Orthopedic"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Implant / Hardware Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={customSurg.hardwareNotes}
                            onChange={(e) => setCustomSurg((s) => ({ ...s, hardwareNotes: e.target.value }))}
                            placeholder="e.g. Titanium stem, polyethylene"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleSaveCustomSurgery}
                          disabled={!customSurg.name.trim()}
                          className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm"
                        >
                          Save Surgery
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={surgerySearch}
                      onChange={(e) => setSurgerySearch(e.target.value)}
                      placeholder="Search surgeries (e.g. Knee Replacement, Appendectomy, CABG, Cataract, Cholecystectomy)..."
                      className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Grid of Common Surgeries with Conditional Branching */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {filteredSurgeries.map((surg) => {
                      const selectedItem = selectedSurgeries.find((s) => s.name === surg.name);
                      const isSelected = !!selectedItem;
                      const isSided = isArthroplastyOrSided(surg.name);

                      return (
                        <div
                          key={surg.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-indigo-50/80 border-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-2xs"
                              : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div
                            onClick={() => toggleSurgeryPreset(surg)}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {surg.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {surg.site}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Conditional Branching Fields for Orthopedic / Sided Surgeries */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-2.5">
                              {isSided && (
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Laterality Toggle */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                                      Laterality (Side)
                                    </label>
                                    <div className="flex rounded border border-indigo-300 dark:border-indigo-700 overflow-hidden text-[11px]">
                                      {["Left", "Right", "Bilateral"].map((side) => (
                                        <button
                                          key={side}
                                          type="button"
                                          onClick={() => handleUpdateSurgeryField(selectedItem.id, "laterality", side)}
                                          className={`flex-1 py-1 font-bold transition-all ${
                                            selectedItem.laterality === side
                                              ? "bg-indigo-600 text-white"
                                              : "bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-100"
                                          }`}
                                        >
                                          {side}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Approach / Extent */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                                      Approach / Extent
                                    </label>
                                    <select
                                      value={selectedItem.approach || "Total"}
                                      onChange={(e) => handleUpdateSurgeryField(selectedItem.id, "approach", e.target.value)}
                                      className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 font-medium"
                                    >
                                      <option value="Total">Total Arthroplasty / Full</option>
                                      <option value="Partial / Hemi">Partial / Hemiarthroplasty</option>
                                      <option value="Arthroscopic / Minimally Invasive">Arthroscopic / Keyhole</option>
                                      <option value="Open">Traditional Open</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="block text-[10px] font-bold text-indigo-950 dark:text-indigo-200">
                                      Surgery Timing
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                      <input
                                        type="checkbox"
                                        checked={selectedItem.timingUnknown || selectedItem.surgeryDate === "N/A"}
                                        onChange={(e) => handleUpdateSurgeryField(selectedItem.id, "timingUnknown", e.target.checked)}
                                        className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span>I don't know</span>
                                    </label>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    <select
                                      disabled={selectedItem.timingUnknown || selectedItem.surgeryDate === "N/A"}
                                      value={selectedItem.surgeryMonth || "06"}
                                      onChange={(e) => handleUpdateSurgeryField(selectedItem.id, "surgeryMonth", e.target.value)}
                                      className="w-full px-1.5 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                    >
                                      {SURGERY_MONTHS.map((m) => (
                                        <option key={m.value} value={m.value}>
                                          {m.label}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      disabled={selectedItem.timingUnknown || selectedItem.surgeryDate === "N/A"}
                                      value={selectedItem.surgeryYear || currentYear.toString()}
                                      onChange={(e) => handleUpdateSurgeryField(selectedItem.id, "surgeryYear", e.target.value)}
                                      className="w-full px-1.5 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                    >
                                      {HISTORICAL_YEARS.map((y) => (
                                        <option key={y} value={y}>
                                          {y}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-950 dark:text-indigo-200 mb-0.5">
                                    Performing Surgeon
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.surgeon || ""}
                                    onChange={(e) => handleUpdateSurgeryField(selectedItem.id, "surgeon", e.target.value)}
                                    placeholder="e.g. Dr. Sterling"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-950 dark:text-indigo-200 mb-0.5">
                                    Hospital / Facility
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.hospital || ""}
                                    onChange={(e) => handleUpdateSurgeryField(selectedItem.id, "hospital", e.target.value)}
                                    placeholder="e.g. Mass General Hospital"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700"
                                  />
                                </div>
                              </div>

                              {isSided && (
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-950 dark:text-indigo-200 mb-0.5">
                                    Implants / Hardware Notes
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.hardwareNotes || ""}
                                    onChange={(e) => handleUpdateSurgeryField(selectedItem.id, "hardwareNotes", e.target.value)}
                                    placeholder="e.g. Ceramic head, cross-linked polyethylene, cemented stem"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 4: MEDICATIONS (DENSE FLUID GRID & CLINICAL LINKAGE)
              ------------------------------------------------------------- */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Pill className="w-4 h-4 text-amber-600" />
                        <span>Step 4: Active Prescription & Routine Medications</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Search and select medications. Dosage presets, patient-friendly schedules, and probable clinical indications are automatically linked.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingCustomMed(!isAddingCustomMed)}
                      className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingCustomMed ? "Close Custom Drug" : "Add Other Medication"}</span>
                    </button>
                  </div>

                  {/* Custom Medication addition input */}
                  {isAddingCustomMed && (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-center gap-2">
                      <input
                        type="text"
                        value={customMedName}
                        onChange={(e) => setCustomMedName(e.target.value)}
                        placeholder="Enter medication generic or brand name (e.g. Clonazepam, Synthroid)..."
                        className="flex-1 px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomMedication}
                        disabled={!customMedName.trim()}
                        className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm disabled:opacity-40"
                      >
                        Add to List
                      </button>
                    </div>
                  )}

                  {/* Dense Fluid 2-Column Split: Catalog on Left (5 cols) & Active Prescriptions on Right (7 cols) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* LEFT COLUMN: Search & Alphabetical Directory */}
                    <div className="lg:col-span-5 flex flex-col space-y-2.5">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={medSearch}
                          onChange={(e) => setMedSearch(e.target.value)}
                          placeholder="Filter medications catalog..."
                          className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>

                      {/* NIH RxNorm Live Drug Autocompletions */}
                      {medSearch.trim().length >= 2 && (
                        <div className="p-3 rounded-xl border bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-950 dark:text-amber-200 px-1">
                            <span className="flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-amber-600" />
                              <span>NIH RxNorm Standardized Formulations</span>
                            </span>
                            {isSearchingRxNorm ? (
                              <span className="text-[10px] text-amber-600 animate-pulse">Searching RxNorm...</span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-mono">{rxnormResults.length} matches</span>
                            )}
                          </div>

                          {rxnormResults.length > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {rxnormResults.map((item) => {
                                const isSelected = selectedMeds.some((m) => m.name.toLowerCase() === item.name.toLowerCase());
                                return (
                                  <button
                                    key={item.rxcui}
                                    type="button"
                                    onClick={() => toggleMedicationItem(item.name, item.rxcui)}
                                    className={`w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-1.5 ${
                                      isSelected
                                        ? "bg-amber-700 text-white border-amber-700 font-bold shadow-2xs"
                                        : "bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-200 hover:border-amber-400 hover:bg-amber-50/50"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold truncate text-[11px]">{item.name}</div>
                                      <div className="text-[10px] opacity-75 font-mono">
                                        RxCUI: {item.rxcui} {item.synonym && `• ${item.synonym}`}
                                      </div>
                                    </div>
                                    <span className="text-xs font-bold shrink-0">{isSelected ? "✓" : "+"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : !isSearchingRxNorm && (
                            <div className="text-[11px] text-slate-500 italic px-1">
                              No standardized RxNorm drugs found for "{medSearch}". You can use "Add Other Medication".
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 p-2 max-h-[460px] overflow-y-auto pr-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1 flex items-center justify-between">
                          <span>Common Clinical Medications</span>
                          <span>{filteredMedications.length} available</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {filteredMedications.map((drug) => {
                            const isSelected = selectedMeds.some((m) => m.name.toLowerCase() === drug.toLowerCase());
                            return (
                              <button
                                key={drug}
                                type="button"
                                onClick={() => toggleMedicationItem(drug)}
                                className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-1.5 ${
                                  isSelected
                                    ? "bg-amber-100 border-amber-600 text-amber-950 font-bold dark:bg-amber-950 dark:text-amber-200 shadow-2xs"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400 hover:bg-amber-50/50"
                                }`}
                              >
                                <span className="truncate">{drug}</span>
                                <span
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    isSelected ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300 text-slate-400"
                                  }`}
                                >
                                  {isSelected ? "✓" : "+"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Active Configured Prescriptions */}
                    <div className="lg:col-span-7 flex flex-col space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-amber-600" />
                          <span>Configured Prescriptions ({selectedMeds.length})</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {selectedMeds.length === 0 ? "None selected" : "Standard doses & schedules linked"}
                        </span>
                      </div>

                      {selectedMeds.length === 0 ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/40 dark:bg-slate-800/20">
                          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3">
                            <Pill className="w-6 h-6" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            No Medications Selected
                          </h5>
                          <p className="text-xs text-slate-500 max-w-sm mt-1">
                            Click any medication from the catalog on the left to configure starting doses, non-abbreviated schedules, and linked health conditions.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                          {selectedMeds.map((med) => (
                            <div
                              key={med.id}
                              className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/90 dark:border-amber-800/60 shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                                    <Pill className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {med.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedMeds((prev) => prev.filter((m) => m.id !== med.id))}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                  title="Remove medication"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Quick-Select Clinical Standard Dose Pill Bar */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Standard Clinical Doses
                                  </label>
                                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                                    Current: {med.dosage || `${med.doseNumber || "10"} ${med.doseUnit || "mg"}`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {(med.standardDoses || ["5 mg", "10 mg", "20 mg"]).map((d) => {
                                    const isCurrentDose = med.dosage === d || `${med.doseNumber} ${med.doseUnit}` === d;
                                    return (
                                      <button
                                        key={d}
                                        type="button"
                                        onClick={() => handleSelectPredefinedDose(med.id, d)}
                                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                                          isCurrentDose
                                            ? "bg-amber-600 text-white border-amber-600 shadow-2xs scale-105"
                                            : "bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200 dark:bg-slate-800 dark:text-amber-300 dark:border-slate-700"
                                        }`}
                                      >
                                        {d}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Dosing, Frequency, Start Date & Indication Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                {/* Custom Dose Override */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Dose & Unit
                                  </label>
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={med.doseNumber || ""}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "doseNumber", e.target.value)}
                                      placeholder="e.g. 20"
                                      className="w-14 px-1.5 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-center font-bold"
                                    />
                                    <select
                                      value={med.doseUnit || "mg"}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "doseUnit", e.target.value)}
                                      className="flex-1 px-1 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                                    >
                                      <option value="mg">mg</option>
                                      <option value="mcg">mcg</option>
                                      <option value="g">g</option>
                                      <option value="mL">mL</option>
                                      <option value="units">units</option>
                                      <option value="puffs">puffs</option>
                                      <option value="drops">drops</option>
                                      <option value="tablets">tablets</option>
                                      <option value="patches">patches</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Frequency (Non-abbreviated simple patient-friendly language) */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Schedule
                                  </label>
                                  <select
                                    value={med.frequency}
                                    onChange={(e) => handleUpdateMedicationField(med.id, "frequency", e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                                  >
                                    {STANDARD_FREQUENCIES.map((f) => (
                                      <option key={f} value={f}>
                                        {f}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Start Year */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Year Started
                                  </label>
                                  <select
                                    value={med.startDate || "N/A"}
                                    onChange={(e) => handleUpdateMedicationField(med.id, "startDate", e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                                  >
                                    <option value="N/A">I don't know</option>
                                    {HISTORICAL_YEARS.map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Linked Indication with Suggested Clinical Cross-Reference */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                    Indication
                                  </label>
                                  <select
                                    value={med.indication}
                                    onChange={(e) => handleUpdateMedicationField(med.id, "indication", e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                                  >
                                    {med.indication && !selectedConditions.some((c) => c.name === med.indication) && (
                                      <option value={med.indication}>{med.indication} (Suggested)</option>
                                    )}
                                    {selectedConditions.map((c) => (
                                      <option key={c.name} value={c.name}>
                                        {c.name}
                                      </option>
                                    ))}
                                    <option value="General Health Maintenance">General Health Maintenance</option>
                                    <option value="Pain Management">Pain Management</option>
                                    <option value="Infection Treatment">Infection Treatment</option>
                                    <option value="Other">Other / Custom...</option>
                                  </select>
                                </div>
                              </div>

                              {med.indication === "Other" && (
                                <input
                                  type="text"
                                  value={med.customIndication || ""}
                                  onChange={(e) => handleUpdateMedicationField(med.id, "customIndication", e.target.value)}
                                  placeholder="Specify exact medical reason..."
                                  className="w-full px-2.5 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                                />
                              )}

                              {/* Dispensing History & Pharmacy Breakdown */}
                              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 rounded-lg space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center justify-between">
                                  <span>Dispensing History & Pharmacy Details</span>
                                  <span className="text-[10px] font-normal text-slate-500">Rx details for clinical reconciliation</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                      Last Picked Up Date
                                    </label>
                                    <input
                                      type="date"
                                      value={med.lastPickedUpDate || ""}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "lastPickedUpDate", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                      Dispensing Pharmacy
                                    </label>
                                    <input
                                      type="text"
                                      value={med.lastPickedUpPharmacy || ""}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "lastPickedUpPharmacy", e.target.value)}
                                      placeholder="e.g. CVS #04821"
                                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                      Rx Number
                                    </label>
                                    <input
                                      type="text"
                                      value={med.rxNumber || ""}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "rxNumber", e.target.value)}
                                      placeholder="e.g. RX-648102"
                                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                      Days Supply
                                    </label>
                                    <input
                                      type="number"
                                      value={med.daysSupply || ""}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "daysSupply", e.target.value)}
                                      placeholder="e.g. 30, 90"
                                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                      Quantity / Amount
                                    </label>
                                    <input
                                      type="number"
                                      value={med.quantityAmount || ""}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "quantityAmount", e.target.value)}
                                      placeholder="e.g. 30, 60"
                                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                      Refills Remaining
                                    </label>
                                    <input
                                      type="number"
                                      value={med.refillsRemaining ?? ""}
                                      onChange={(e) => handleUpdateMedicationField(med.id, "refillsRemaining", e.target.value)}
                                      placeholder="e.g. 2"
                                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 5: PROCEDURES & DIAGNOSTIC STUDIES
              ------------------------------------------------------------- */}
              {wizardStep === 5 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileSearch className="w-4 h-4 text-sky-600" />
                        <span>Step 5: Diagnostic Procedures & Screenings</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track colonoscopies, mammograms, echocardiograms, and imaging studies with surveillance recall intervals.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingCustomProc(!isAddingCustomProc)}
                      className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingCustomProc ? "Close Custom Form" : "Add Custom Procedure"}</span>
                    </button>
                  </div>

                  {/* Custom Procedure Form */}
                  {isAddingCustomProc && (
                    <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border-2 border-sky-500/40 space-y-3">
                      <h4 className="text-xs font-bold text-sky-950 dark:text-sky-200">
                        Add Custom Diagnostic Procedure
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Procedure Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customProc.name}
                            onChange={(e) => setCustomProc((p) => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Cardiac MRI"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Date Performed
                          </label>
                          <input
                            type="date"
                            value={customProc.datePerformed}
                            onChange={(e) => setCustomProc((p) => ({ ...p, datePerformed: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Repeat Recall Interval (Years)
                          </label>
                          <select
                            value={customProc.recallYears}
                            onChange={(e) => setCustomProc((p) => ({ ...p, recallYears: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          >
                            <option value="1">1 Year (Annual)</option>
                            <option value="2">2 Years</option>
                            <option value="3">3 Years</option>
                            <option value="5">5 Years</option>
                            <option value="10">10 Years</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Performing Physician
                          </label>
                          <input
                            type="text"
                            value={customProc.physician}
                            onChange={(e) => setCustomProc((p) => ({ ...p, physician: e.target.value }))}
                            placeholder="e.g. Dr. Patel"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Diagnostic Facility / Hospital
                          </label>
                          <input
                            type="text"
                            value={customProc.facility}
                            onChange={(e) => setCustomProc((p) => ({ ...p, facility: e.target.value }))}
                            placeholder="e.g. Metro Endoscopy Center"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Findings / Results Summary <span className="text-rose-500">* (Required)</span>
                        </label>
                        <input
                          type="text"
                          value={customProc.findings}
                          onChange={(e) => setCustomProc((p) => ({ ...p, findings: e.target.value }))}
                          placeholder="Document biopsy or imaging findings (Required)..."
                          className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleSaveCustomProcedure}
                          disabled={!customProc.name.trim()}
                          className="bg-sky-700 hover:bg-sky-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm"
                        >
                          Save Procedure
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Procedures Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {COMMON_PROCEDURES.map((proc) => {
                      const selectedItem = selectedProcedures.find((p) => p.procedure_name === proc.name);
                      const isSelected = !!selectedItem;

                      return (
                        <div
                          key={proc.name}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-sky-50/80 border-sky-600 dark:bg-sky-950/40 dark:border-sky-500 shadow-2xs"
                              : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div
                            onClick={() => toggleProcedurePreset(proc)}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {proc.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {proc.marker} • {proc.type === "screening" ? "Preventive Screening" : "Diagnostic Evaluation"}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? "bg-sky-600 border-sky-600 text-white" : "border-slate-300 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Structured Fields when selected */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-sky-200/60 dark:border-sky-800/60 space-y-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-sky-950 dark:text-sky-200 mb-0.5">
                                    Date Performed
                                  </label>
                                  <input
                                    type="date"
                                    value={selectedItem.date_performed || ""}
                                    onChange={(e) => handleUpdateProcedureField(selectedItem.id, "date_performed", e.target.value)}
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-sky-950 dark:text-sky-200 mb-0.5">
                                    Recall Interval
                                  </label>
                                  <select
                                    value={selectedItem.recall_interval_years || 1}
                                    onChange={(e) => handleUpdateProcedureField(selectedItem.id, "recall_interval_years", e.target.value)}
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-700"
                                  >
                                    <option value="1">1 Year (Annual)</option>
                                    <option value="2">2 Years</option>
                                    <option value="3">3 Years</option>
                                    <option value="5">5 Years</option>
                                    <option value="10">10 Years</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-sky-950 dark:text-sky-200 mb-0.5">
                                    Performing Physician
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.performing_clinician || ""}
                                    onChange={(e) => handleUpdateProcedureField(selectedItem.id, "performing_clinician", e.target.value)}
                                    placeholder="e.g. Dr. Patel"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-sky-950 dark:text-sky-200 mb-0.5">
                                    Diagnostic Facility / Hospital
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.institution || ""}
                                    onChange={(e) => handleUpdateProcedureField(selectedItem.id, "institution", e.target.value)}
                                    placeholder="e.g. Endoscopy Center"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-700"
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="block text-[10px] font-bold text-sky-950 dark:text-sky-200">
                                    Findings / Results Summary <span className="text-rose-500">* (Required)</span>
                                  </label>
                                  {!selectedItem.findings?.trim() && (
                                    <span className="text-[10px] text-rose-500 font-bold">Required to proceed</span>
                                  )}
                                </div>
                                <textarea
                                  rows={2}
                                  value={selectedItem.findings || ""}
                                  onChange={(e) => handleUpdateProcedureField(selectedItem.id, "findings", e.target.value)}
                                  placeholder="Document key biopsy or imaging results (e.g. Normal screening, Benign polyp removed at hepatic flexure)..."
                                  className={`w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 resize-none ${
                                    !selectedItem.findings?.trim()
                                      ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                      : "border-sky-300 dark:border-sky-700"
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 6: VACCINATIONS & IMMUNIZATIONS (WITH LOT NUMBERS)
              ------------------------------------------------------------- */}
              {wizardStep === 6 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-emerald-600" />
                        <span>Step 6: Vaccines & Immunization History</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Document vaccinations received to monitor CDC preventive health status. Enter administering clinic and lot numbers.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingCustomVax(!isAddingCustomVax)}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingCustomVax ? "Close Custom Vaccine" : "Add Custom Vaccine"}</span>
                    </button>
                  </div>

                  {/* Custom Vaccine Form */}
                  {isAddingCustomVax && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-500/40 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        Add Custom Immunization
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Vaccine Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customVax.name}
                            onChange={(e) => setCustomVax((v) => ({ ...v, name: e.target.value }))}
                            placeholder="e.g. RSV Vaccine (Abrysvo)"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Date Administered
                          </label>
                          <input
                            type="date"
                            value={customVax.dateAdministered}
                            onChange={(e) => setCustomVax((v) => ({ ...v, dateAdministered: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Lot Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={customVax.lotNumber}
                            onChange={(e) => setCustomVax((v) => ({ ...v, lotNumber: e.target.value }))}
                            placeholder="e.g. FL-92841"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <input
                          type="text"
                          value={customVax.clinic}
                          onChange={(e) => setCustomVax((v) => ({ ...v, clinic: e.target.value }))}
                          placeholder="Administering clinic or pharmacy (e.g. Walgreens #0482)..."
                          className="flex-1 mr-3 px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomVaccine}
                          disabled={!customVax.name.trim()}
                          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm"
                        >
                          Save Vaccine
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Vaccines Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {COMMON_VACCINES.map((vax) => {
                      const selectedItem = selectedVaccines.find((v) => v.vaccine_name === vax.name);
                      const isSelected = !!selectedItem;

                      return (
                        <div
                          key={vax.name}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-emerald-50/80 border-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-500 shadow-2xs"
                              : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div
                            onClick={() => toggleVaccinePreset(vax)}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {vax.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {vax.category}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Vaccination details when selected */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-emerald-950 dark:text-emerald-200 mb-0.5">
                                    Date Administered
                                  </label>
                                  <input
                                    type="date"
                                    value={selectedItem.date_administered || ""}
                                    onChange={(e) => handleUpdateVaccineField(selectedItem.id, "date_administered", e.target.value)}
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-emerald-950 dark:text-emerald-200 mb-0.5">
                                    Lot Number (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.lot_number || ""}
                                    onChange={(e) => handleUpdateVaccineField(selectedItem.id, "lot_number", e.target.value)}
                                    placeholder="e.g. 094A23B"
                                    className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 font-mono"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-emerald-950 dark:text-emerald-200 mb-0.5">
                                  Administering Location / Clinic
                                </label>
                                <input
                                  type="text"
                                  value={selectedItem.administering_facility || ""}
                                  onChange={(e) => handleUpdateVaccineField(selectedItem.id, "administering_facility", e.target.value)}
                                  placeholder="e.g. CVS Pharmacy #04821"
                                  className="w-full px-2 py-1 text-[11px] border rounded bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700"
                                />
                              </div>

                              {/* CDC Standard Status Badge */}
                              {(() => {
                                const statusInfo = evaluateVaccineStatus(
                                  vax.name,
                                  selectedItem.date_administered,
                                  calculateAge(dob),
                                  selectedItem.dose_number
                                );
                                return (
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                      CDC CVX: {vax.cvx || "Standard"}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.badgeColor}`}>
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 7: REVIEW & CONFIRMATION
              ------------------------------------------------------------- */}
              {wizardStep === 7 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      <span>Step 7: Clinical Review & Intake Confirmation</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review all entered health information before committing data to your 3D anatomical avatar and profile.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Patient Identification Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Patient Demographics
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="text-[11px] text-teal-700 dark:text-teal-400 font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <div>
                          <strong>Name:</strong> {`${firstName} ${lastName}`.trim() || "Not entered"}
                        </div>
                        <div>
                          <strong>DOB / Age:</strong> {dob || "Not entered"} ({calculateAge(dob)} yo) • <strong>Sex:</strong> {sex} {sex === "other" && otherSexSpecification ? `(${otherSexSpecification})` : ""}
                        </div>
                        <div>
                          <strong>Veteran Status:</strong> {veteranStatus === "Yes" ? "Yes (U.S. Military Veteran)" : "No"} • <strong>Blood Type:</strong> {bloodType}
                        </div>
                        <div>
                          <strong>Phone:</strong> {phone || "Not entered"} • <strong>Email:</strong> {email || "Not entered"}
                        </div>
                        <div>
                          <strong>Address:</strong> {address || "Not entered"}
                        </div>
                        <div>
                          <strong>Emergency Contact:</strong> {`${emergencyContactFirstName} ${emergencyContactLastName}`.trim() || "None"} ({emergencyContactRelation}) • {emergencyContactPhone || "No phone"}
                        </div>
                        <div>
                          <strong>Care Team (PCP):</strong> {pcpName || "None assigned"} {pcpClinic ? `at ${pcpClinic}` : ""} {pcpPhone ? `(${pcpPhone})` : ""}
                        </div>
                        <div>
                          <strong>Preferred Pharmacy:</strong> {pharmacyName || "None documented"} {pharmacyAddress ? `(${pharmacyAddress})` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Allergies Card */}
                    <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                          Documented Allergies
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="text-[11px] text-rose-700 dark:text-rose-400 font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      {isNkda ? (
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          ✓ No Known Drug Allergies (NKDA)
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {allergiesList.filter((a) => a.drugName.trim()).length === 0 ? (
                            <div className="text-xs text-slate-500">No allergies documented.</div>
                          ) : (
                            allergiesList
                              .filter((a) => a.drugName.trim())
                              .map((a) => (
                                <div key={a.id} className="text-xs text-rose-800 dark:text-rose-300">
                                  • <strong>{a.drugName}</strong>: {a.reactionType} {a.approximateDate ? `(${a.approximateDate})` : ""}
                                </div>
                              ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conditions & Surgeries Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Conditions */}
                    <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/30 dark:bg-teal-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider">
                          Medical Conditions ({selectedConditions.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="text-[11px] text-teal-700 dark:text-teal-400 font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedConditions.length === 0 ? (
                          <div className="text-xs text-slate-500">No medical conditions selected.</div>
                        ) : (
                          selectedConditions.map((c) => (
                            <div key={c.id || c.name} className="text-xs text-slate-700 dark:text-slate-300">
                              • <strong>{c.name}</strong> {c.laterality ? `[${c.laterality}]` : ""} {c.onsetDate && c.onsetDate !== "N/A" ? `(Dx: ${c.onsetDate})` : ""}
                              {c.provider ? ` — ${c.provider}` : ""} {c.facility ? `@ ${c.facility}` : ""}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Surgeries */}
                    <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                          Past Surgeries ({selectedSurgeries.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedSurgeries.length === 0 ? (
                          <div className="text-xs text-slate-500">No past surgeries selected.</div>
                        ) : (
                          selectedSurgeries.map((s) => (
                            <div key={s.id || s.name} className="text-xs text-slate-700 dark:text-slate-300">
                              • <strong>{s.name}</strong> {s.laterality ? `[${s.laterality}]` : ""} {s.surgeryDate && s.surgeryDate !== "N/A" ? `(${s.surgeryDate})` : ""}
                              {s.surgeon ? ` — Dr. ${s.surgeon.replace(/^Dr\.\s*/i, '')}` : ""} {s.hospital ? `@ ${s.hospital}` : ""}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Medications, Procedures & Vaccines */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Medications */}
                    <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                          Medications ({selectedMeds.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          className="text-[11px] text-amber-700 dark:text-amber-400 font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedMeds.length === 0 ? (
                          <div className="text-xs text-slate-500">No medications selected.</div>
                        ) : (
                          selectedMeds.map((m) => (
                            <div key={m.id || m.name} className="text-xs text-slate-700 dark:text-slate-300">
                              • <strong>{m.name}</strong> {m.dosage} ({m.frequency})
                              {m.daysSupply ? ` [${m.daysSupply}d supply]` : ""}
                              {m.lastPickedUpPharmacy ? ` @ ${m.lastPickedUpPharmacy}` : ""}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Procedures */}
                    <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/30 dark:bg-sky-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
                          Procedures ({selectedProcedures.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(5)}
                          className="text-[11px] text-sky-700 dark:text-sky-400 font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedProcedures.length === 0 ? (
                          <div className="text-xs text-slate-500">No procedures recorded.</div>
                        ) : (
                          selectedProcedures.map((p) => (
                            <div key={p.id || p.procedure_name} className="text-xs text-slate-700 dark:text-slate-300">
                              • <strong>{p.procedure_name || p.plainName}</strong> ({p.date_performed || "Date unk"})
                              <div className="text-[11px] text-slate-500 italic pl-2">
                                Findings: {p.findings || "None documented"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Vaccines */}
                    <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                          Vaccines ({selectedVaccines.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(6)}
                          className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedVaccines.length === 0 ? (
                          <div className="text-xs text-slate-500">No vaccines recorded.</div>
                        ) : (
                          selectedVaccines.map((v) => (
                            <div key={v.id || v.vaccine_name} className="text-xs text-slate-700 dark:text-slate-300">
                              • <strong>{v.vaccine_name || v.plainName}</strong> ({v.date_administered || "Date unk"})
                              {v.administering_facility ? ` @ ${v.administering_facility}` : ""}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: PDF UPLOAD SCREEN */}
          {viewMode === "pdf_upload" && (
            <div className="space-y-6 max-w-2xl mx-auto my-auto py-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/50 dark:bg-slate-800/40 rounded-3xl p-10 text-center cursor-pointer transition-all shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {isParsingPdf ? "Parsing Document Locally in Memory..." : "Upload Clinical Summary or Discharge PDF"}
                </h4>
                <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                  Drag and drop your PDF medical record here, or click to browse files on your device.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileSelect}
                  className="hidden"
                />
              </div>

              {pdfParseError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pdfParseError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>How Private Client-Side Parsing Works:</span>
                </div>
                <p>
                  1. The file is interpreted directly by <strong>Mozilla PDF.js</strong> running entirely in your browser sandbox.
                </p>
                <p>
                  2. Regular expressions extract medical diagnoses, surgeries, prescription dosing, and diagnostic studies.
                </p>
                <p>
                  3. You will be able to review, edit, or remove any item on the verification card before saving.
                </p>
              </div>
            </div>
          )}

          {/* VIEW 4: PDF REVIEW & VERIFICATION CHECKLIST */}
          {viewMode === "pdf_review" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Verification Checklist: Extracted from "{pdfFileName}"
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review extracted findings. Items will be calibrated onto your 3D avatar upon confirmation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("pdf_upload")}
                  className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline"
                >
                  Upload Another File
                </button>
              </div>

              {/* Four-Column Extracted Cards Review Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Conditions */}
                <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200 dark:bg-slate-800 dark:border-teal-900/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-teal-900 dark:text-teal-200">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <span>Conditions ({extractedData.conditions.length})</span>
                    </span>
                  </div>
                  {extractedData.conditions.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">No conditions detected</div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {extractedData.conditions.map((c, i) => (
                        <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded-lg border text-xs flex items-center justify-between">
                          <span className="font-bold truncate">{c.plainName || c.name}</span>
                          <button
                            type="button"
                            onClick={() => setExtractedData((prev) => ({ ...prev, conditions: prev.conditions.filter((_, idx) => idx !== i) }))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Surgeries */}
                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 dark:bg-slate-800 dark:border-indigo-900/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-indigo-600" />
                      <span>Surgeries ({extractedData.surgeries.length})</span>
                    </span>
                  </div>
                  {extractedData.surgeries.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">No surgeries detected</div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {extractedData.surgeries.map((s, i) => (
                        <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded-lg border text-xs flex items-center justify-between">
                          <span className="font-bold truncate">{s.plainName || s.name}</span>
                          <button
                            type="button"
                            onClick={() => setExtractedData((prev) => ({ ...prev, surgeries: prev.surgeries.filter((_, idx) => idx !== i) }))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 dark:bg-slate-800 dark:border-amber-900/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-amber-600" />
                      <span>Medications ({extractedData.medications.length})</span>
                    </span>
                  </div>
                  {extractedData.medications.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">No medications detected</div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {extractedData.medications.map((m, i) => (
                        <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded-lg border text-xs flex items-center justify-between">
                          <span className="font-bold truncate">{m.name}</span>
                          <button
                            type="button"
                            onClick={() => setExtractedData((prev) => ({ ...prev, medications: prev.medications.filter((_, idx) => idx !== i) }))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Procedures & Vaccines */}
                <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-200 dark:bg-slate-800 dark:border-sky-900/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-900 dark:text-sky-200">
                    <span className="flex items-center gap-1.5">
                      <FileSearch className="w-4 h-4 text-sky-600" />
                      <span>Tests & Vaccines ({extractedData.procedures.length + extractedData.vaccines.length})</span>
                    </span>
                  </div>
                  {extractedData.procedures.length === 0 && extractedData.vaccines.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">No studies detected</div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {extractedData.procedures.map((p, i) => (
                        <div key={`p-${i}`} className="p-2 bg-white dark:bg-slate-900 rounded-lg border text-xs flex items-center justify-between">
                          <span className="font-bold truncate">{p.plainName || p.procedure_name}</span>
                          <button
                            type="button"
                            onClick={() => setExtractedData((prev) => ({ ...prev, procedures: prev.procedures.filter((_, idx) => idx !== i) }))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {extractedData.vaccines.map((v, i) => (
                        <div key={`v-${i}`} className="p-2 bg-white dark:bg-slate-900 rounded-lg border text-xs flex items-center justify-between">
                          <span className="font-bold truncate">{v.plainName || v.vaccine_name}</span>
                          <button
                            type="button"
                            onClick={() => setExtractedData((prev) => ({ ...prev, vaccines: prev.vaccines.filter((_, idx) => idx !== i) }))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          {viewMode === "choice" ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  if (onExploreDemo) {
                    onExploreDemo();
                  }
                  onClose();
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Skip / Explore Demo Patient
              </button>
            </div>
          ) : viewMode === "wizard" ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) {
                    setWizardStep((s) => s - 1);
                  } else {
                    setViewMode("choice");
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-200/60"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{wizardStep === 1 ? "Back to Choices" : "Previous Step"}</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Step {wizardStep} of 7
                </span>

                {wizardStep < 7 ? (
                  <button
                    type="button"
                    onClick={handleStepForward}
                    className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md transition-all hover:translate-x-0.5"
                  >
                    <span>
                      Next: {wizardStep === 1 ? "Conditions" : wizardStep === 2 ? "Surgeries" : wizardStep === 3 ? "Medications" : wizardStep === 4 ? "Procedures" : wizardStep === 5 ? "Vaccines" : "Review & Confirm"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishWizard}
                    className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-lg transition-all hover:scale-102"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Intake & Populate Avatar</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* PDF Mode Footer */
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setViewMode("choice")}
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline"
              >
                Cancel
              </button>

              {viewMode === "pdf_review" && (
                <button
                  type="button"
                  onClick={handleFinishPdfImport}
                  className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-lg transition-all hover:scale-102"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Save to Health Avatar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
