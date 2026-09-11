import React, { useState, useEffect } from "react";
import { X, Sparkles, ShieldCheck, Check, Link, Plus, AlertCircle, Pill } from "lucide-react";
import { CLINICAL_CATALOG, localizeConditionAnatomically } from "../../lib/clinicalCatalog";
import { searchMedications, getMedicationStrengths } from "../../services/rxnorm.js";
import { searchConditions } from "../../services/ctss.js";

export const STANDARD_FREQUENCIES = [
  { value: "Once Daily (QD / Morning)", label: "Once Daily (QD / Morning)" },
  { value: "Once Daily at Bedtime (QHS)", label: "Once Daily at Bedtime (QHS)" },
  { value: "Twice Daily with Meals (BID)", label: "Twice Daily with Meals (BID)" },
  { value: "Three Times Daily with Meals (TID)", label: "Three Times Daily with Meals (TID)" },
  { value: "Four Times Daily (QID)", label: "Four Times Daily (QID)" },
  { value: "Every 4 to 6 Hours as Needed (PRN)", label: "Every 4 to 6 Hours as Needed (PRN Pain / Fever)" },
  { value: "As Needed for Shortness of Breath (PRN)", label: "As Needed for SOB / Wheezing (PRN Inhaler)" },
  { value: "Every 8 Hours (Q8H)", label: "Every 8 Hours (Q8H)" },
  { value: "Every 12 Hours (Q12H)", label: "Every 12 Hours (Q12H)" },
  { value: "Every Other Day (QOD)", label: "Every Other Day (QOD)" },
  { value: "Once Weekly (QW)", label: "Once Weekly (QW)" },
  { value: "Every 2 Weeks (Biweekly)", label: "Every 2 Weeks (Biweekly)" },
  { value: "Once Monthly", label: "Once Monthly" },
  { value: "Custom", label: "Custom / Other..." }
];

export function predictMedicationFrequency(drugName = "", dosageForms = []) {
  const name = (drugName || "").toLowerCase();
  const forms = (dosageForms || []).join(" ").toLowerCase();

  // 1. Statins / HMG-CoA reductase inhibitors -> Bedtime
  if (name.includes("statin")) {
    return {
      value: "Once Daily at Bedtime (QHS)",
      reason: "Cholesterol synthesis peaks overnight"
    };
  }
  // 2. Extended Release / 24-hr formulations -> Once Daily Morning
  if (
    name.includes("extended") ||
    name.includes(" er") ||
    name.includes(" xr") ||
    name.includes(" xl") ||
    name.includes("24hr") ||
    forms.includes("extended release")
  ) {
    return {
      value: "Once Daily (QD / Morning)",
      reason: "24-hr continuous release formulation"
    };
  }
  // 3. Blood pressure / ACE / ARB / Diuretics -> Once Daily Morning
  if (
    name.includes("lisinopril") ||
    name.includes("amlodipine") ||
    name.includes("losartan") ||
    name.includes("thiazide") ||
    name.includes("furosemide") ||
    name.includes("lasix")
  ) {
    return {
      value: "Once Daily (QD / Morning)",
      reason: "Morning dose avoids nocturnal diuresis"
    };
  }
  // 4. Metformin Immediate-Release / Antibiotics -> Twice or Three times daily with meals
  if (name.includes("metformin") && !name.includes("extended")) {
    return {
      value: "Twice Daily with Meals (BID)",
      reason: "Taken with meals to minimize GI distress"
    };
  }
  if (name.includes("amoxicillin") || name.includes("augmentin") || name.includes("cephalexin")) {
    return {
      value: "Three Times Daily with Meals (TID)",
      reason: "Antimicrobial therapeutic interval"
    };
  }
  // 5. Inhalers & Analgesics / PRN
  if (name.includes("albuterol") || name.includes("proair") || name.includes("ventolin")) {
    return {
      value: "As Needed for Shortness of Breath (PRN)",
      reason: "Fast-acting rescue bronchodilator"
    };
  }
  if (
    name.includes("ibuprofen") ||
    name.includes("acetaminophen") ||
    name.includes("tylenol") ||
    name.includes("oxycodone") ||
    name.includes("tramadol")
  ) {
    return {
      value: "Every 4 to 6 Hours as Needed (PRN)",
      reason: "Symptom-triggered pain relief interval"
    };
  }
  // 6. Weekly GLP-1 / Biologics
  if (
    name.includes("semaglutide") ||
    name.includes("ozempic") ||
    name.includes("wegovy") ||
    name.includes("mounjaro") ||
    name.includes("tirzepatide") ||
    name.includes("methotrexate")
  ) {
    return {
      value: "Once Weekly (QW)",
      reason: "Weekly long half-life depot dosing"
    };
  }
  // Default to Once Daily
  return {
    value: "Once Daily (QD / Morning)",
    reason: "Standard maintenance regimen"
  };
}

export function AddEditItemModal({
  isOpen,
  onClose,
  type = "line", // "line" | "drain" | "surgery" | "condition" | "medication" | "procedure" | "vaccine"
  item = null,
  onSave,
  existingConditions = [],
  onAddNewCondition
}) {
  const [formData, setFormData] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableStrengths, setAvailableStrengths] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // Diagnosis Linking state
  const [linkMode, setLinkMode] = useState("select"); // "select" | "new" | "custom"
  const [newDiagSearch, setNewDiagSearch] = useState("");
  const [newDiagSuggestions, setNewDiagSuggestions] = useState([]);
  const [isSearchingDiag, setIsSearchingDiag] = useState(false);

  // Frequency custom state
  const [isCustomFreq, setIsCustomFreq] = useState(false);
  const [predictedFrequency, setPredictedFrequency] = useState(null);

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
      const matchingFreq = STANDARD_FREQUENCIES.find((f) => f.value === item.frequency);
      setIsCustomFreq(!!item.frequency && !matchingFreq);

      // Check if existing indication is on chart
      if (item.indication) {
        const found = existingConditions.find((c) => c.name.toLowerCase() === item.indication.toLowerCase());
        if (found) {
          setLinkMode("select");
        } else {
          setLinkMode("custom");
        }
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      setAvailableStrengths([]);
      setPredictedFrequency(null);
      setIsCustomFreq(false);
      setLinkMode("select");

      if (type === "line") {
        setFormData({
          name: "",
          site: "Right Brachium",
          lineType: "5 Fr Double Lumen PICC",
          placementDate: today,
          hospital: "General Hospital",
          coords: { x: -2.0, y: 4.4, z: 0.35 },
          notes: ""
        });
      } else if (type === "drain") {
        setFormData({
          name: "",
          site: "Abdomen",
          drainType: "Closed Suction Bulb",
          placementDate: today,
          hospital: "General Hospital",
          surgeon: "Dr. Sarah Jenkins, FACS",
          coords: { x: 0.0, y: 3.0, z: 1.0 },
          notes: ""
        });
      } else if (type === "surgery") {
        setFormData({
          name: "",
          site: "",
          incision: "Standard surgical incision",
          surgeryDate: today,
          hospital: "General Hospital",
          surgeon: "Dr. Sarah Jenkins, FACS",
          coords: { x: 0, y: 3.0, z: 1.0 },
          system: "general",
          notes: ""
        });
      } else if (type === "condition") {
        setFormData({
          name: "",
          region: "",
          icd10: "",
          onsetDate: today,
          status: "Active",
          provider: "Dr. R. Adams, MD",
          coords: { x: 0, y: 3.5, z: 1.0 },
          system: "general",
          notes: ""
        });
      } else if (type === "procedure") {
        setFormData({
          name: "",
          procedure_type: "diagnostic",
          date_performed: today,
          anatomical_marker: "Lower Abdomen / Colon",
          performing_clinician: "",
          institution: "Endoscopy & Imaging Pavilion",
          findings: "",
          recall_interval_years: 1,
          coords: { x: 0.1, y: 1.8, z: 1.05 },
          system: "digestive"
        });
      } else if (type === "vaccine") {
        setFormData({
          name: "",
          vaccine_name: "",
          date_administered: today,
          dose_number: 1,
          administering_facility: "Local Pharmacy / Primary Care",
          next_due_date: ""
        });
      } else {
        setFormData({
          name: "",
          dosage: "10 mg",
          route: "Oral (PO)",
          frequency: "Once Daily (QD / Morning)",
          indication: "",
          startDate: today,
          prescriber: "Dr. R. Adams, MD",
          system: "cardiac",
          lastPickedUpPharmacy: "CVS Pharmacy #04821",
          refillsRemaining: 2,
          daysSupply: "90-Day Supply"
        });
      }
    }
  }, [item, type, isOpen]);

  if (!isOpen) return null;

  // Autocomplete matching against catalog & Federal APIs
  const handleNameChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      ...(type === "vaccine" ? { vaccine_name: val } : {}),
      ...(type === "procedure" ? { procedure_name: val } : {})
    }));

    if (val.length >= 2) {
      if (type === "medication") {
        setIsSearchingApi(true);
        searchMedications(val)
          .then((rxResults) => {
            if (rxResults && rxResults.length > 0) {
              setSuggestions(
                rxResults.map((r) => ({
                  id: `rx-${r.rxcui || r.name}`,
                  name: r.name,
                  displayName: r.displayName || r.name,
                  rxcui: r.rxcui,
                  synonym: r.synonym,
                  strengths: r.strengths,
                  isRxNorm: true
                }))
              );
              setShowSuggestions(true);
            } else {
              const matches = CLINICAL_CATALOG.medications.filter((m) =>
                m.name.toLowerCase().includes(val.toLowerCase())
              );
              setSuggestions(matches);
              setShowSuggestions(matches.length > 0);
            }
            setIsSearchingApi(false);
          })
          .catch(() => {
            const matches = CLINICAL_CATALOG.medications.filter((m) =>
              m.name.toLowerCase().includes(val.toLowerCase())
            );
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
            setIsSearchingApi(false);
          });
        return;
      }

      if (type === "condition") {
        setIsSearchingApi(true);
        searchConditions(val)
          .then((ctssResults) => {
            if (ctssResults && ctssResults.length > 0) {
              setSuggestions(
                ctssResults.map((c) => ({
                  id: `ctss-${c.icd10 || c.name}`,
                  name: c.name,
                  icd10: c.icd10,
                  isCtss: true
                }))
              );
              setShowSuggestions(true);
            } else {
              const matches = CLINICAL_CATALOG.conditions.filter(
                (c) =>
                  c.name.toLowerCase().includes(val.toLowerCase()) ||
                  (c.plainName && c.plainName.toLowerCase().includes(val.toLowerCase()))
              );
              setSuggestions(matches);
              setShowSuggestions(matches.length > 0);
            }
            setIsSearchingApi(false);
          })
          .catch(() => {
            const matches = CLINICAL_CATALOG.conditions.filter(
              (c) =>
                c.name.toLowerCase().includes(val.toLowerCase()) ||
                (c.plainName && c.plainName.toLowerCase().includes(val.toLowerCase()))
            );
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
            setIsSearchingApi(false);
          });
        return;
      }

      let matches = [];
      if (type === "surgery") {
        matches = CLINICAL_CATALOG.surgeries.filter(
          (s) =>
            s.name.toLowerCase().includes(val.toLowerCase()) ||
            (s.plainName && s.plainName.toLowerCase().includes(val.toLowerCase()))
        );
      } else if (type === "procedure") {
        matches = (CLINICAL_CATALOG.procedures || []).filter(
          (p) =>
            p.name.toLowerCase().includes(val.toLowerCase()) ||
            (p.plainName && p.plainName.toLowerCase().includes(val.toLowerCase()))
        );
      } else if (type === "vaccine") {
        matches = (CLINICAL_CATALOG.vaccines || []).filter(
          (v) =>
            v.name.toLowerCase().includes(val.toLowerCase()) ||
            (v.plainName && v.plainName.toLowerCase().includes(val.toLowerCase()))
        );
      }
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (catItem) => {
    let extraConditionProps = {};
    if (type === "condition") {
      const localized = localizeConditionAnatomically(catItem.name, catItem.icd10);
      extraConditionProps = {
        region: catItem.region || localized.region,
        system: catItem.system || localized.system,
        coords: catItem.coords || localized.coords,
        isPosterior: catItem.isPosterior ?? localized.isPosterior
      };
    }

    setFormData((prev) => ({
      ...prev,
      ...catItem,
      ...extraConditionProps,
      name: catItem.name,
      rxcui: catItem.rxcui || prev.rxcui,
      icd10: catItem.icd10 || prev.icd10,
      id: prev.id || undefined,
      ...(type === "vaccine" ? { vaccine_name: catItem.name } : {}),
      ...(type === "procedure"
        ? {
            procedure_name: catItem.name,
            anatomical_marker: catItem.anatomical_marker,
            recall_interval_years: catItem.defaultRecallYears
          }
        : {})
    }));
    setShowSuggestions(false);

    if (type === "medication") {
      if (catItem.strengths && catItem.strengths.length > 0) {
        setAvailableStrengths(catItem.strengths);
        if (!formData.dosage || formData.dosage === "10 mg") {
          setFormData((prev) => ({ ...prev, dosage: catItem.strengths[0] }));
        }
      }

      getMedicationStrengths(catItem.rxcui, catItem.name)
        .then((strengthInfo) => {
          if (strengthInfo?.strengths?.length > 0) {
            setAvailableStrengths(strengthInfo.strengths);
            if (!formData.dosage || formData.dosage === "10 mg") {
              setFormData((prev) => ({ ...prev, dosage: strengthInfo.strengths[0] }));
            }
          }
          // Predict optimal clinical dosing frequency
          const pred = predictMedicationFrequency(catItem.name, strengthInfo?.dosageForms);
          setPredictedFrequency(pred);
          if (!formData.frequency || formData.frequency === "Once Daily (QD / Morning)") {
            setFormData((prev) => ({ ...prev, frequency: pred.value }));
          }
        })
        .catch(() => {});
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submission = { ...formData };
    if (type === "condition") {
      const localized = localizeConditionAnatomically(submission.name, submission.icd10);
      submission.region = (submission.region && submission.region !== "General") ? submission.region : localized.region;
      submission.system = (submission.system && submission.system !== "general") ? submission.system : localized.system;
      submission.coords = (submission.coords && (submission.coords.x !== 0 || submission.coords.y !== 0)) ? submission.coords : localized.coords;
      submission.isPosterior = submission.isPosterior ?? localized.isPosterior;
    }
    if (type === "medication" && linkMode === "custom" && submission.indication && onAddNewCondition) {
      const existing = existingConditions.find((c) => c.name.toLowerCase() === submission.indication.toLowerCase());
      if (!existing) {
        const localized = localizeConditionAnatomically(submission.indication, submission.icd10);
        onAddNewCondition({
          id: `cond-${Date.now()}`,
          name: submission.indication,
          icd10: submission.icd10 || "",
          status: "Active",
          onsetDate: new Date().toISOString().split("T")[0],
          region: localized.region,
          system: localized.system,
          coords: localized.coords,
          isPosterior: localized.isPosterior
        });
      }
    }
    if (type === "vaccine") {
      submission.vaccine_name = submission.vaccine_name || submission.name;
    }
    if (type === "procedure") {
      submission.procedure_name = submission.procedure_name || submission.name;
    }
    onSave(submission);
    onClose();
  };

  const titles = {
    line: item ? "Edit Vascular Line" : "Add Patient Line",
    drain: item ? "Edit Drain / Catheter" : "Add Patient Drain",
    surgery: item ? "Edit Surgical History" : "Add Surgical Procedure",
    condition: item ? "Edit Medical Condition" : "Add Medical Condition",
    medication: item ? "Edit Medication" : "Add Medication",
    procedure: item ? "Edit Diagnostic Procedure" : "Add Diagnostic Procedure",
    vaccine: item ? "Edit Immunization Record" : "Add Immunization Record"
  };

  const subtitles = {
    line: "Central venous and arterial access tracking",
    drain: "Surgical, urinary, or gastrointestinal drain monitoring",
    surgery: "Operative history, approach, and anatomical hardware",
    condition: "Standardized ICD-10 medical condition record",
    medication: "NIH RxNorm standardized prescription pharmacology",
    procedure: "Diagnostic exams, biopsies, and endoscopy records",
    vaccine: "CDC CVX standardized immunization schedule"
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Clean Light Clinical Header */}
        <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{titles[type] || "Add / Edit Record"}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Clinical EMR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitles[type]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* Name Field with Live Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>
                {type === "line"
                  ? "Line Description (e.g. PICC Double Lumen, Arterial Line)"
                  : type === "drain"
                  ? "Drain Description (e.g. Orogastric Drain, Foley Catheter)"
                  : type === "surgery"
                  ? "Procedure Name"
                  : type === "condition"
                  ? "Condition Name / Diagnosis"
                  : "Medication Name (Generic or Brand)"}
              </span>
              {type === "medication" && (
                <span className="text-[10px] font-semibold text-teal-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  <span>NIH RxNorm Connected</span>
                </span>
              )}
              {type === "condition" && (
                <span className="text-[10px] font-semibold text-sky-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-600" />
                  <span>NLM CTSS Connected</span>
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={
                type === "medication"
                  ? "e.g. Lisinopril, Metformin, Atorvastatin..."
                  : type === "condition"
                  ? "e.g. Hypertension, Type 2 Diabetes..."
                  : "Enter name..."
              }
              className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
              required
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-teal-300 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 z-50">
                <div className="p-2 text-[10px] text-teal-900 font-bold uppercase tracking-wider flex items-center justify-between bg-teal-50/80 border-b border-teal-100">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    <span>
                      {type === "medication"
                        ? "NIH RxNorm Live Drug Database"
                        : type === "condition"
                        ? "NLM CTSS Standardized ICD-10"
                        : "Clinical Catalog Matches"}
                    </span>
                  </div>
                  {isSearchingApi && (
                    <div className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {suggestions.map((sug) => (
                  <button
                    key={sug.id || sug.name}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full text-left p-2.5 hover:bg-teal-50/60 transition-all text-xs text-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{sug.displayName || sug.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {sug.rxcui
                          ? `RxCUI: ${sug.rxcui}${sug.synonym && sug.synonym !== (sug.displayName || sug.name) ? ` • ${sug.synonym}` : ""}`
                          : sug.icd10
                          ? `ICD-10-CM: ${sug.icd10}`
                          : sug.region || sug.site || sug.indication}
                      </div>
                    </div>
                    {sug.isRxNorm && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200 shrink-0">
                        RxNorm
                      </span>
                    )}
                    {sug.isCtss && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200 shrink-0">
                        ICD-10
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line Fields */}
          {type === "line" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Anatomical Site</label>
                  <input
                    type="text"
                    value={formData.site || ""}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    placeholder="e.g. Left Radial Artery"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Line Type / Gauge</label>
                  <input
                    type="text"
                    value={formData.lineType || ""}
                    onChange={(e) => setFormData({ ...formData, lineType: e.target.value })}
                    placeholder="e.g. 20-Gauge Radial"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Placement Date</label>
                  <input
                    type="date"
                    value={formData.placementDate || ""}
                    onChange={(e) => setFormData({ ...formData, placementDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Hospital / Facility</label>
                  <input
                    type="text"
                    value={formData.hospital || ""}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    placeholder="e.g. Mass General Hospital"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Drain Fields */}
          {type === "drain" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Anatomical Site</label>
                  <input
                    type="text"
                    value={formData.site || ""}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    placeholder="e.g. RUQ Gallbladder Bed"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Drain Type</label>
                  <input
                    type="text"
                    value={formData.drainType || ""}
                    onChange={(e) => setFormData({ ...formData, drainType: e.target.value })}
                    placeholder="e.g. Closed Suction Bulb"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Placement Date</label>
                  <input
                    type="date"
                    value={formData.placementDate || ""}
                    onChange={(e) => setFormData({ ...formData, placementDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Placing Clinician</label>
                  <input
                    type="text"
                    value={formData.surgeon || ""}
                    onChange={(e) => setFormData({ ...formData, surgeon: e.target.value })}
                    placeholder="e.g. Dr. Sarah Jenkins, FACS"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Surgery Fields */}
          {type === "surgery" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Anatomical Site / Organ</label>
                  <input
                    type="text"
                    value={formData.site || ""}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    placeholder="e.g. Right Anterior Knee"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Surgery Date</label>
                  <input
                    type="date"
                    value={formData.surgeryDate || ""}
                    onChange={(e) => setFormData({ ...formData, surgeryDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Incision & Scar Geometry</label>
                <input
                  type="text"
                  value={formData.incision || ""}
                  onChange={(e) => setFormData({ ...formData, incision: e.target.value })}
                  placeholder="e.g. Midline longitudinal right knee scar (15 cm)"
                  className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Operating Surgeon</label>
                  <input
                    type="text"
                    value={formData.surgeon || ""}
                    onChange={(e) => setFormData({ ...formData, surgeon: e.target.value })}
                    placeholder="e.g. Dr. David Sterling, MD"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Hospital / Surgical Center</label>
                  <input
                    type="text"
                    value={formData.hospital || ""}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    placeholder="e.g. New England Orthopedic"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Condition Fields */}
          {type === "condition" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Anatomical Region</label>
                  <input
                    type="text"
                    value={formData.region || ""}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g. Pancreas / Epigastrium"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ICD-10 Code</label>
                  <input
                    type="text"
                    value={formData.icd10 || ""}
                    onChange={(e) => setFormData({ ...formData, icd10: e.target.value })}
                    placeholder="e.g. E11.9"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Onset Date</label>
                  <input
                    type="date"
                    value={formData.onsetDate || ""}
                    onChange={(e) => setFormData({ ...formData, onsetDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinical Status</label>
                  <select
                    value={formData.status || "Active"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Controlled">Controlled</option>
                    <option value="In Remission">In Remission</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Medication Fields */}
          {type === "medication" && (
            <>
              {/* NIH RxNorm Clickable Strength Chips with clear instructions */}
              {availableStrengths.length > 0 && (
                <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>NIH RxNorm Standard Strengths</span>
                    </label>
                    <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">
                      Live API
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-800 leading-snug">
                    💡 <strong>Click any strength chip below</strong> to auto-fill your prescription dosage, or type a custom amount in the dosage field:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {availableStrengths.map((str) => {
                      const isSelected = formData.dosage === str;
                      return (
                        <button
                          key={str}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, dosage: str }))}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                            isSelected
                              ? "bg-teal-700 text-white border-teal-800 shadow-xs ring-2 ring-teal-600/30"
                              : "bg-white text-teal-950 border-teal-300 hover:bg-teal-100 hover:border-teal-500 hover:scale-[1.02] cursor-pointer"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                          <span>{str}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dosage and Frequency (Dropdown with Smart Prediction) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Dosage Amount</label>
                  <input
                    type="text"
                    value={formData.dosage || ""}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g. 20 mg, 1000 mg"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Dosing Frequency</span>
                    {predictedFrequency?.value && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomFreq(false);
                          setFormData((prev) => ({ ...prev, frequency: predictedFrequency.value }));
                        }}
                        className="text-[10px] font-bold text-teal-800 bg-teal-100/90 hover:bg-teal-200 px-2 py-0.5 rounded-md transition-colors border border-teal-300 flex items-center gap-1"
                        title={predictedFrequency.reason}
                      >
                        <Sparkles className="w-3 h-3 text-teal-700" />
                        <span>Suggested</span>
                      </button>
                    )}
                  </label>

                  <select
                    value={isCustomFreq ? "Custom" : formData.frequency || "Once Daily (QD / Morning)"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Custom") {
                        setIsCustomFreq(true);
                      } else {
                        setIsCustomFreq(false);
                        setFormData((prev) => ({ ...prev, frequency: val }));
                      }
                    }}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  >
                    {STANDARD_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {isCustomFreq && (
                    <input
                      type="text"
                      value={formData.frequency || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
                      placeholder="e.g. Every 6 hours with food..."
                      className="mt-2 w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    />
                  )}
                </div>
              </div>

              {/* Clinical Indication / Linked Diagnosis */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-teal-700" />
                    <span>Clinical Indication / Linked Diagnosis</span>
                  </div>
                  {formData.indication && (
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      Linked: {formData.indication}
                    </span>
                  )}
                </label>

                <select
                  value={
                    linkMode === "new"
                      ? "__new__"
                      : linkMode === "custom"
                      ? "__custom__"
                      : formData.indication || ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__new__") {
                      setLinkMode("new");
                    } else if (val === "__custom__") {
                      setLinkMode("custom");
                    } else {
                      setLinkMode("select");
                      const matched = existingConditions.find((c) => c.name === val);
                      setFormData((prev) => ({
                        ...prev,
                        indication: val,
                        icd10: matched?.icd10 || prev.icd10,
                        conditionId: matched?.id || null
                      }));
                    }
                  }}
                  className="w-full text-xs bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                >
                  <option value="">-- Select Active Condition from Patient Chart --</option>
                  {existingConditions.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name} {c.icd10 ? `(${c.icd10})` : ""} - {c.status || "Active"}
                    </option>
                  ))}
                  <option value="__new__">+ Link New Diagnosis (Search NLM ICD-10)...</option>
                  <option value="__custom__">Enter Custom Indication text...</option>
                </select>

                {/* Inline NLM CTSS Diagnosis Creator */}
                {linkMode === "new" && (
                  <div className="mt-2 p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="text-[11px] font-bold text-sky-950 flex items-center justify-between">
                      <span>Search NLM CTSS to Create & Link Diagnosis:</span>
                      <button
                        type="button"
                        onClick={() => setLinkMode("select")}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={newDiagSearch}
                        onChange={(e) => {
                          const q = e.target.value;
                          setNewDiagSearch(q);
                          if (q.length >= 2) {
                            setIsSearchingDiag(true);
                            searchConditions(q)
                              .then((res) => {
                                setNewDiagSuggestions(res || []);
                                setIsSearchingDiag(false);
                              })
                              .catch(() => setIsSearchingDiag(false));
                          } else {
                            setNewDiagSuggestions([]);
                          }
                        }}
                        placeholder="Type diagnosis (e.g. Hyperlipidemia, Asthma)..."
                        className="w-full text-xs bg-white border border-sky-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                      {isSearchingDiag && (
                        <div className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {newDiagSuggestions.length > 0 && (
                      <div className="max-h-36 overflow-y-auto bg-white border border-sky-200 rounded-lg shadow-md divide-y divide-slate-100">
                        {newDiagSuggestions.map((s) => (
                          <button
                            key={s.icd10 || s.name}
                            type="button"
                            onClick={() => {
                              const localized = localizeConditionAnatomically(s.name, s.icd10);
                              const newCond = {
                                id: `cond-${Date.now()}`,
                                name: s.name,
                                icd10: s.icd10,
                                status: "Active",
                                onsetDate: new Date().toISOString().split("T")[0],
                                region: localized.region,
                                system: localized.system,
                                coords: localized.coords,
                                isPosterior: localized.isPosterior
                              };
                              if (onAddNewCondition) {
                                onAddNewCondition(newCond);
                              }
                              setFormData((prev) => ({
                                ...prev,
                                indication: s.name,
                                icd10: s.icd10,
                                conditionId: newCond.id
                              }));
                              setLinkMode("select");
                              setNewDiagSearch("");
                              setNewDiagSuggestions([]);
                            }}
                            className="w-full text-left p-2 hover:bg-sky-50 text-xs text-slate-800 flex items-center justify-between"
                          >
                            <span className="font-semibold">{s.name}</span>
                            <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                              {s.icd10}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Indication Input */}
                {linkMode === "custom" && (
                  <input
                    type="text"
                    value={formData.indication || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, indication: e.target.value }))}
                    placeholder="Enter custom clinical reason or indication..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                )}
              </div>

              {/* Refills, Days Supply & Pharmacy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Picked Up Date</label>
                  <input
                    type="date"
                    value={formData.lastPickedUpDate || ""}
                    onChange={(e) => setFormData({ ...formData, lastPickedUpDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Dispensing Pharmacy</label>
                  <input
                    type="text"
                    value={formData.lastPickedUpPharmacy || ""}
                    onChange={(e) => setFormData({ ...formData, lastPickedUpPharmacy: e.target.value })}
                    placeholder="e.g. CVS Pharmacy #04821"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Refills Remaining</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={formData.refillsRemaining ?? 2}
                    onChange={(e) =>
                      setFormData({ ...formData, refillsRemaining: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Days Supply</label>
                  <input
                    type="text"
                    value={formData.daysSupply || ""}
                    onChange={(e) => setFormData({ ...formData, daysSupply: e.target.value })}
                    placeholder="e.g. 90-Day Supply"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Procedure Fields */}
          {type === "procedure" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Anatomical Target / Organ Area</label>
                  <input
                    type="text"
                    value={formData.anatomical_marker || ""}
                    onChange={(e) => setFormData({ ...formData, anatomical_marker: e.target.value })}
                    placeholder="e.g. Lower Abdomen / Colon, Heart, Lungs"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date Performed</label>
                  <input
                    type="date"
                    value={formData.date_performed || ""}
                    onChange={(e) => setFormData({ ...formData, date_performed: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Performing Clinician</label>
                  <input
                    type="text"
                    value={formData.performing_clinician || ""}
                    onChange={(e) => setFormData({ ...formData, performing_clinician: e.target.value })}
                    placeholder="e.g. Dr. Marcus Vance, MD"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Facility / Institution</label>
                  <input
                    type="text"
                    value={formData.institution || ""}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g. Boston Endoscopy Center"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Procedure Type</label>
                  <select
                    value={formData.procedure_type || "diagnostic"}
                    onChange={(e) => setFormData({ ...formData, procedure_type: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  >
                    <option value="diagnostic">Diagnostic Exam</option>
                    <option value="screening">Routine Screening</option>
                    <option value="imaging">Imaging Scan (CT / MRI / Ultrasound)</option>
                    <option value="interventional">Interventional / Biopsy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Repeat Recall (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.recall_interval_years ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, recall_interval_years: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Findings Summary</label>
                <textarea
                  value={formData.findings || ""}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  placeholder="e.g. Benign polyps resected, clear margins; no evidence of dysplasia."
                  rows={2}
                  className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                />
              </div>
            </>
          )}

          {/* Vaccine Fields */}
          {type === "vaccine" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date Administered</label>
                  <input
                    type="date"
                    value={formData.date_administered || ""}
                    onChange={(e) => setFormData({ ...formData, date_administered: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Dose Number</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.dose_number ?? 1}
                    onChange={(e) => setFormData({ ...formData, dose_number: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Administering Facility</label>
                  <input
                    type="text"
                    value={formData.administering_facility || ""}
                    onChange={(e) => setFormData({ ...formData, administering_facility: e.target.value })}
                    placeholder="e.g. CVS MinuteClinic #04821"
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Next Due Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.next_due_date || ""}
                    onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                    className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinical Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional clinical instructions, reactions, or provider notes..."
              className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-2.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xs"
            />
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50/70 -mx-5 -mb-5 p-4 px-5">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 px-4 py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
