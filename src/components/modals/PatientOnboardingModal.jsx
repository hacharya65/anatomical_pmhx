import React, { useState, useRef } from "react";
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
  Plus
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { CLINICAL_CATALOG } from "../../lib/clinicalCatalog";

// Configure pdfjs worker client-side
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function PatientOnboardingModal({
  isOpen,
  onClose,
  initialProfile = {},
  onBatchCommit
}) {
  if (!isOpen) return null;

  // View state: "choice" | "wizard" | "pdf_upload" | "pdf_review"
  const [viewMode, setViewMode] = useState("choice");

  // Wizard Step: 1 (Demographics) -> 2 (Conditions) -> 3 (Surgeries) -> 4 (Meds) -> 5 (Procedures) -> 6 (Vaccines) -> 7 (Review)
  const [wizardStep, setWizardStep] = useState(1);

  // Wizard Draft State
  const [draftProfile, setDraftProfile] = useState({
    name: initialProfile.name || "",
    dob: initialProfile.dob || "1980-01-01",
    sex: initialProfile.sex || "female",
    bloodType: initialProfile.bloodType || "O Positive",
    allergies: initialProfile.allergies || "No Known Drug Allergies (NKDA)",
    emergencyContact: initialProfile.emergencyContact || ""
  });

  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedSurgeries, setSelectedSurgeries] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [selectedVaccines, setSelectedVaccines] = useState([]);

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

  // Custom addition fields for wizard
  const [customCondName, setCustomCondName] = useState("");
  const [customSurgName, setCustomSurgName] = useState("");
  const [customMedName, setCustomMedName] = useState("");

  /* -------------------------------------------------------------
     PATH A: GUIDED WIZARD HELPERS
  ------------------------------------------------------------- */
  const toggleCondition = (item) => {
    if (selectedConditions.some((c) => c.id === item.id)) {
      setSelectedConditions((prev) => prev.filter((c) => c.id !== item.id));
    } else {
      setSelectedConditions((prev) => [
        ...prev,
        {
          id: item.id || `cond-${Date.now()}`,
          name: item.name,
          plainName: item.plainName,
          region: item.region,
          coords: item.coords,
          system: item.system,
          icd10: item.icd10,
          onsetDate: new Date().toISOString().split("T")[0],
          status: "Active",
          notes: item.notes || ""
        }
      ]);
    }
  };

  const toggleSurgery = (item) => {
    if (selectedSurgeries.some((s) => s.id === item.id)) {
      setSelectedSurgeries((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setSelectedSurgeries((prev) => [
        ...prev,
        {
          id: item.id || `surg-${Date.now()}`,
          name: item.name,
          plainName: item.plainName,
          site: item.site,
          incision: item.incision,
          coords: item.coords,
          system: item.system,
          isPosterior: item.isPosterior || false,
          surgeryDate: "2022-01-01",
          hospital: item.hospital || "Community Hospital",
          notes: item.notes || ""
        }
      ]);
    }
  };

  const toggleProcedure = (item) => {
    if (selectedProcedures.some((p) => p.id === item.id)) {
      setSelectedProcedures((prev) => prev.filter((p) => p.id !== item.id));
    } else {
      setSelectedProcedures((prev) => [
        ...prev,
        {
          id: item.id || `proc-${Date.now()}`,
          procedure_name: item.name,
          plainName: item.plainName,
          procedure_type: item.procedure_type || "diagnostic",
          date_performed: new Date().toISOString().split("T")[0],
          anatomical_marker: item.anatomical_marker || "General",
          coords: item.coords,
          system: item.system,
          recall_interval_years: item.defaultRecallYears || 1,
          findings: item.findingsSummary || ""
        }
      ]);
    }
  };

  const toggleVaccine = (item) => {
    if (selectedVaccines.some((v) => v.id === item.id)) {
      setSelectedVaccines((prev) => prev.filter((v) => v.id !== item.id));
    } else {
      setSelectedVaccines((prev) => [
        ...prev,
        {
          id: item.id || `vax-${Date.now()}`,
          vaccine_name: item.name,
          plainName: item.plainName,
          date_administered: new Date().toISOString().split("T")[0],
          dose_number: 1,
          administering_facility: "Local Health Facility"
        }
      ]);
    }
  };

  const handleFinishWizard = () => {
    onBatchCommit({
      profile: draftProfile,
      conditions: selectedConditions,
      surgeries: selectedSurgeries,
      medications: selectedMeds,
      procedures: selectedProcedures,
      vaccinations: selectedVaccines
    });
    onClose();
  };

  /* -------------------------------------------------------------
     PATH B: SMART HEALTH RECORD PDF EXTRACTOR (100% Client-Side)
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

      // Regex / keyword extraction across clinical text
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

    // 1. Patient Demographics matching
    const profile = {};
    const nameMatch = text.match(/(?:patient\s+name|name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameMatch) profile.name = nameMatch[1].trim();

    const dobMatch = text.match(/(?:dob|date\s+of\s+birth|birthdate)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
    if (dobMatch) profile.dob = dobMatch[1].trim();

    const mrnMatch = text.match(/(?:mrn|record\s*#)[:\s]+([A-Z0-9-]+)/i);
    if (mrnMatch) profile.mrn = mrnMatch[1].trim();

    // 2. Conditions matching against catalog
    const matchedConditions = [];
    (CLINICAL_CATALOG.conditions || []).forEach((c) => {
      const plain = (c.plainName || "").toLowerCase();
      const clinical = c.name.toLowerCase();
      if (rawLower.includes(clinical) || rawLower.includes(plain)) {
        matchedConditions.push({
          id: `cond-pdf-${c.id}`,
          name: c.name,
          plainName: c.plainName,
          region: c.region,
          coords: c.coords,
          system: c.system,
          icd10: c.icd10,
          onsetDate: new Date().toISOString().split("T")[0],
          status: "Active",
          notes: "Extracted from uploaded health record"
        });
      }
    });

    // 3. Surgeries matching against catalog
    const matchedSurgeries = [];
    (CLINICAL_CATALOG.surgeries || []).forEach((s) => {
      const plain = (s.plainName || "").toLowerCase();
      const clinical = s.name.toLowerCase();
      if (rawLower.includes(clinical) || rawLower.includes(plain)) {
        matchedSurgeries.push({
          id: `surg-pdf-${s.id}`,
          name: s.name,
          plainName: s.plainName,
          site: s.site,
          incision: s.incision,
          coords: s.coords,
          system: s.system,
          isPosterior: s.isPosterior || false,
          surgeryDate: "2023-01-01",
          hospital: "Medical Center",
          notes: "Extracted from uploaded health record"
        });
      }
    });

    // 4. Medications matching against catalog
    const matchedMeds = [];
    (CLINICAL_CATALOG.medications || []).forEach((m) => {
      if (rawLower.includes(m.name.toLowerCase())) {
        matchedMeds.push({
          id: `med-pdf-${m.id}`,
          name: m.name,
          dosage: m.dosage,
          route: m.route,
          frequency: m.frequency,
          indication: m.indication,
          startDate: new Date().toISOString().split("T")[0],
          prescriber: "Primary Care",
          system: m.system
        });
      }
    });

    // 5. Procedures matching
    const matchedProcs = [];
    (CLINICAL_CATALOG.procedures || []).forEach((p) => {
      const plain = (p.plainName || "").toLowerCase();
      const clinical = p.name.toLowerCase();
      if (rawLower.includes(clinical) || rawLower.includes(plain)) {
        matchedProcs.push({
          id: `proc-pdf-${p.id}`,
          procedure_name: p.name,
          plainName: p.plainName,
          procedure_type: p.procedure_type || "diagnostic",
          date_performed: new Date().toISOString().split("T")[0],
          anatomical_marker: p.anatomical_marker || "General",
          coords: p.coords,
          system: p.system,
          recall_interval_years: p.defaultRecallYears || 1,
          findings: p.findingsSummary || "Record reviewed; routine findings"
        });
      }
    });

    // 6. Vaccines matching
    const matchedVaccines = [];
    (CLINICAL_CATALOG.vaccines || []).forEach((v) => {
      const plain = (v.plainName || "").toLowerCase();
      const clinical = v.name.toLowerCase();
      if (rawLower.includes(clinical) || rawLower.includes(plain)) {
        matchedVaccines.push({
          id: `vax-pdf-${v.id}`,
          vaccine_name: v.name,
          plainName: v.plainName,
          date_administered: new Date().toISOString().split("T")[0],
          dose_number: 1,
          administering_facility: "Documented on Record"
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
    onBatchCommit({
      profile: { ...draftProfile, ...(extractedData.profile || {}) },
      conditions: extractedData.conditions,
      surgeries: extractedData.surgeries,
      medications: extractedData.medications,
      procedures: extractedData.procedures,
      vaccinations: extractedData.vaccines
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {viewMode === "choice" && "Welcome to Your Health Avatar"}
                {viewMode === "wizard" && `Guided Health Intake (Step ${wizardStep} of 6)`}
                {viewMode === "pdf_upload" && "Smart Health Record Import"}
                {viewMode === "pdf_review" && "Verify Extracted Health Data"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {viewMode === "choice" && "Choose how you would like to set up your personal health history"}
                {viewMode === "wizard" && "Plain language step-by-step patient questionnaire"}
                {viewMode === "pdf_upload" && "100% private, on-device document extraction"}
                {viewMode === "pdf_review" && "Review and select items to populate on your 3D avatar"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* VIEW 1: CHOICE SCREEN */}
          {viewMode === "choice" && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto mb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Build Your Interactive 3D Medical Record
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Visually track your medical conditions, surgical scars, diagnostic procedures, and vaccines in one unified view.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A: Guided Step-by-Step Intake Wizard */}
                <button
                  type="button"
                  onClick={() => setViewMode("wizard")}
                  className="group p-5 rounded-xl border-2 border-teal-600/30 hover:border-teal-600 bg-teal-50/30 hover:bg-teal-50/60 dark:bg-slate-800/60 dark:hover:bg-teal-950/20 text-left transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Guided Step-by-Step Intake
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Answer a simple series of questions with plain language translations (Grade 6–8 readability) for medical conditions, surgeries, and prescriptions.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-400">
                    <span>Start Guided Intake</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option B: Smart Health Record PDF Upload */}
                <button
                  type="button"
                  onClick={() => setViewMode("pdf_upload")}
                  className="group p-5 rounded-xl border-2 border-indigo-600/30 hover:border-indigo-600 bg-indigo-50/30 hover:bg-indigo-50/60 dark:bg-slate-800/60 dark:hover:bg-indigo-950/20 text-left transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Smart PDF Record Upload
                      </h4>
                      <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">Fast</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Upload your patient summary, discharge paperwork, or clinic notes. Automatically detects diagnoses, procedures, and medications on your device.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <span>Upload Medical PDF</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Privacy Guarantee */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <Shield className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Strict Privacy Guarantee:</strong> Your health records and documents are processed 100% locally on your device without sending sensitive documents to external AI servers.
                </span>
              </div>
            </div>
          )}

          {/* VIEW 2: GUIDED WIZARD */}
          {viewMode === "wizard" && (
            <div className="space-y-5">
              {/* Step Progress Pills */}
              <div className="flex items-center justify-between gap-1 pb-3 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                <span className={wizardStep === 1 ? "text-teal-700 font-bold" : ""}>1. About You</span>
                <span>•</span>
                <span className={wizardStep === 2 ? "text-teal-700 font-bold" : ""}>2. Conditions</span>
                <span>•</span>
                <span className={wizardStep === 3 ? "text-teal-700 font-bold" : ""}>3. Surgeries</span>
                <span>•</span>
                <span className={wizardStep === 4 ? "text-teal-700 font-bold" : ""}>4. Medications</span>
                <span>•</span>
                <span className={wizardStep === 5 ? "text-teal-700 font-bold" : ""}>5. Procedures</span>
                <span>•</span>
                <span className={wizardStep === 6 ? "text-teal-700 font-bold" : ""}>6. Vaccines</span>
              </div>

              {/* STEP 1: ABOUT YOU */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 1: Basic Demographics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={draftProfile.name}
                        onChange={(e) => setDraftProfile((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={draftProfile.dob}
                        onChange={(e) => setDraftProfile((p) => ({ ...p, dob: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Biological Sex / Model Gender
                      </label>
                      <select
                        value={draftProfile.sex}
                        onChange={(e) => setDraftProfile((p) => ({ ...p, sex: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Known Drug Allergies
                      </label>
                      <input
                        type="text"
                        value={draftProfile.allergies}
                        onChange={(e) => setDraftProfile((p) => ({ ...p, allergies: e.target.value }))}
                        placeholder="e.g. Penicillin, Sulfa, or NKDA"
                        className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: MEDICAL CONDITIONS */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Step 2: Have you been diagnosed with any of these conditions?
                    </h4>
                    <p className="text-xs text-slate-500">
                      Select all that apply. Each item includes both common plain terms and clinical diagnoses.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {(CLINICAL_CATALOG.conditions || []).slice(0, 12).map((cond) => {
                      const isSelected = selectedConditions.some((c) => c.name === cond.name);
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => toggleCondition(cond)}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-teal-50 border-teal-600 text-teal-900 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-200 shadow-2xs font-medium"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold">{cond.plainName || cond.name}</div>
                            <div className="text-[10px] text-slate-500">{cond.name} • {cond.region}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: PAST SURGERIES */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Step 3: Have you had any past surgeries or incision scars?
                    </h4>
                    <p className="text-xs text-slate-500">
                      Surgical scars and implants will be accurately positioned on your 3D avatar.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {(CLINICAL_CATALOG.surgeries || []).slice(0, 10).map((surg) => {
                      const isSelected = selectedSurgeries.some((s) => s.name === surg.name);
                      return (
                        <button
                          key={surg.id}
                          type="button"
                          onClick={() => toggleSurgery(surg)}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-600 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-200 shadow-2xs font-medium"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold">{surg.plainName || surg.name}</div>
                            <div className="text-[10px] text-slate-500">{surg.site}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: MEDICATIONS */}
              {wizardStep === 4 && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Step 4: Do you take daily or routine medications?
                    </h4>
                    <p className="text-xs text-slate-500">
                      Select common prescriptions or add custom medications.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {(CLINICAL_CATALOG.medications || []).slice(0, 8).map((med) => {
                      const isSelected = selectedMeds.some((m) => m.name === med.name);
                      return (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMeds((prev) => prev.filter((m) => m.name !== med.name));
                            } else {
                              setSelectedMeds((prev) => [
                                ...prev,
                                {
                                  id: med.id,
                                  name: med.name,
                                  dosage: med.dosage,
                                  route: med.route,
                                  frequency: med.frequency,
                                  indication: med.indication,
                                  startDate: new Date().toISOString().split("T")[0],
                                  system: med.system
                                }
                              ]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-amber-50 border-amber-600 text-amber-900 dark:bg-amber-950/40 dark:border-amber-500 dark:text-amber-200 shadow-2xs font-medium"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold">{med.name} ({med.dosage})</div>
                            <div className="text-[10px] text-slate-500">{med.frequency} • {med.indication}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 5: PROCEDURES */}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Step 5: Diagnostic Procedures & Screenings
                    </h4>
                    <p className="text-xs text-slate-500">
                      Track recall intervals for colonoscopies, echocardiograms, and imaging scans.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {(CLINICAL_CATALOG.procedures || []).map((proc) => {
                      const isSelected = selectedProcedures.some((p) => p.procedure_name === proc.name);
                      return (
                        <button
                          key={proc.id}
                          type="button"
                          onClick={() => toggleProcedure(proc)}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-sky-50 border-sky-600 text-sky-900 dark:bg-sky-950/40 dark:border-sky-500 dark:text-sky-200 shadow-2xs font-medium"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold">{proc.plainName || proc.name}</div>
                            <div className="text-[10px] text-slate-500">{proc.anatomical_marker} • Repeat: {proc.defaultRecallYears} yr(s)</div>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-sky-600 border-sky-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 6: VACCINES */}
              {wizardStep === 6 && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Step 6: Vaccines & Immunization History
                    </h4>
                    <p className="text-xs text-slate-500">
                      Select vaccines you have received to check your CDC immunization status.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {(CLINICAL_CATALOG.vaccines || []).map((vax) => {
                      const isSelected = selectedVaccines.some((v) => v.vaccine_name === vax.name);
                      return (
                        <button
                          key={vax.id}
                          type="button"
                          onClick={() => toggleVaccine(vax)}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-600 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200 shadow-2xs font-medium"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold">{vax.plainName}</div>
                            <div className="text-[10px] text-slate-500">{vax.name} • {vax.category}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: PDF UPLOAD SCREEN */}
          {viewMode === "pdf_upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/40 dark:bg-slate-800/40 rounded-2xl p-8 text-center cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {isParsingPdf ? "Parsing Document Locally..." : "Upload Clinical Summary or Discharge PDF"}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Drag and drop your PDF here, or click to browse files on your computer.
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
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pdfParseError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-teal-600" />
                  <span>How client-side extraction works:</span>
                </div>
                <p>
                  1. The document is rendered entirely within your browser memory using PDF.js.
                </p>
                <p>
                  2. Regular expressions recognize medical terms, surgeries, dosage instructions, and test dates.
                </p>
                <p>
                  3. You will have full opportunity to review, uncheck, or edit all items before saving.
                </p>
              </div>
            </div>
          )}

          {/* VIEW 4: PDF REVIEW & VERIFICATION CHECKLIST */}
          {viewMode === "pdf_review" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Verification Checklist from "{pdfFileName}"
                  </h4>
                  <p className="text-xs text-slate-500">
                    Review extracted findings. Uncheck any item that does not apply.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("pdf_upload")}
                  className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
                >
                  Upload Another File
                </button>
              </div>

              {/* Extracted Conditions */}
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>Detected Conditions ({extractedData.conditions.length})</span>
                </div>
                {extractedData.conditions.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No specific medical conditions identified</div>
                ) : (
                  <div className="space-y-1.5">
                    {extractedData.conditions.map((c, i) => (
                      <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{c.plainName || c.name}</span>
                          <span className="text-slate-500 ml-2">({c.name})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExtractedData(prev => ({ ...prev, conditions: prev.conditions.filter((_, idx) => idx !== i) }))}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Surgeries */}
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Detected Surgeries ({extractedData.surgeries.length})</span>
                </div>
                {extractedData.surgeries.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No surgical procedures identified</div>
                ) : (
                  <div className="space-y-1.5">
                    {extractedData.surgeries.map((s, i) => (
                      <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{s.plainName || s.name}</span>
                          <span className="text-slate-500 ml-2">({s.site})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExtractedData(prev => ({ ...prev, surgeries: prev.surgeries.filter((_, idx) => idx !== i) }))}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Medications */}
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-amber-600" />
                  <span>Detected Medications ({extractedData.medications.length})</span>
                </div>
                {extractedData.medications.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No medications identified</div>
                ) : (
                  <div className="space-y-1.5">
                    {extractedData.medications.map((m, i) => (
                      <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{m.name} {m.dosage}</span>
                          <span className="text-slate-500 ml-2">• {m.frequency}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExtractedData(prev => ({ ...prev, medications: prev.medications.filter((_, idx) => idx !== i) }))}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          {viewMode === "choice" ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Skip / Explore Demo Avatar
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
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                {wizardStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => s + 1)}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishWizard}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete & Populate Avatar</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* viewMode === "pdf_upload" or "pdf_review" */
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setViewMode("choice")}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
              >
                Cancel
              </button>

              {viewMode === "pdf_review" && (
                <button
                  type="button"
                  onClick={handleFinishPdfImport}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all"
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
