import React, { useState, useEffect } from "react";
import { X, Sparkles, ShieldCheck } from "lucide-react";
import { CLINICAL_CATALOG } from "../../lib/clinicalCatalog";
import { searchMedications, getMedicationStrengths } from "../../services/rxnorm.js";
import { searchConditions } from "../../services/ctss.js";

export function AddEditItemModal({
  isOpen,
  onClose,
  type = "line", // "line" | "drain" | "surgery" | "condition" | "medication"
  item = null,
  onSave
}) {
  const [formData, setFormData] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableStrengths, setAvailableStrengths] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
    } else {
      const today = new Date().toISOString().split("T")[0];
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
          frequency: "Once Daily (QD)",
          indication: "",
          startDate: today,
          prescriber: "Dr. R. Adams, MD",
          system: "cardiac",
          notes: ""
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
        searchMedications(val).then((rxResults) => {
          if (rxResults && rxResults.length > 0) {
            setSuggestions(rxResults.map(r => ({
              id: `rx-${r.rxcui || r.name}`,
              name: r.name,
              rxcui: r.rxcui,
              synonym: r.synonym,
              isRxNorm: true
            })));
            setShowSuggestions(true);
          } else {
            const matches = CLINICAL_CATALOG.medications.filter((m) =>
              m.name.toLowerCase().includes(val.toLowerCase())
            );
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
          }
          setIsSearchingApi(false);
        }).catch(() => {
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
        searchConditions(val).then((ctssResults) => {
          if (ctssResults && ctssResults.length > 0) {
            setSuggestions(ctssResults.map(c => ({
              id: `ctss-${c.icd10 || c.name}`,
              name: c.name,
              icd10: c.icd10,
              isCtss: true
            })));
            setShowSuggestions(true);
          } else {
            const matches = CLINICAL_CATALOG.conditions.filter((c) =>
              c.name.toLowerCase().includes(val.toLowerCase()) ||
              (c.plainName && c.plainName.toLowerCase().includes(val.toLowerCase()))
            );
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
          }
          setIsSearchingApi(false);
        }).catch(() => {
          const matches = CLINICAL_CATALOG.conditions.filter((c) =>
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
        matches = CLINICAL_CATALOG.surgeries.filter((s) =>
          s.name.toLowerCase().includes(val.toLowerCase()) ||
          (s.plainName && s.plainName.toLowerCase().includes(val.toLowerCase()))
        );
      } else if (type === "procedure") {
        matches = (CLINICAL_CATALOG.procedures || []).filter((p) =>
          p.name.toLowerCase().includes(val.toLowerCase()) ||
          (p.plainName && p.plainName.toLowerCase().includes(val.toLowerCase()))
        );
      } else if (type === "vaccine") {
        matches = (CLINICAL_CATALOG.vaccines || []).filter((v) =>
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
    setFormData((prev) => ({
      ...prev,
      ...catItem,
      name: catItem.name,
      rxcui: catItem.rxcui || prev.rxcui,
      icd10: catItem.icd10 || prev.icd10,
      id: prev.id || undefined,
      ...(type === "vaccine" ? { vaccine_name: catItem.name } : {}),
      ...(type === "procedure" ? { procedure_name: catItem.name, anatomical_marker: catItem.anatomical_marker, recall_interval_years: catItem.defaultRecallYears } : {})
    }));
    setShowSuggestions(false);

    if (type === "medication") {
      getMedicationStrengths(catItem.rxcui, catItem.name).then((strengthInfo) => {
        if (strengthInfo?.strengths?.length > 0) {
          setAvailableStrengths(strengthInfo.strengths);
          if (!formData.dosage) {
            setFormData((prev) => ({ ...prev, dosage: strengthInfo.strengths[0] }));
          }
        }
      }).catch(() => {});
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submission = { ...formData };
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

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h2 className="text-sm font-bold text-white">{titles[type] || "Add / Edit Record"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name with Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {type === "line"
                ? "Line Description (e.g. PICC Double Lumen, Arterial Line)"
                : type === "drain"
                ? "Drain Description (e.g. Orogastric Drain, Foley Catheter)"
                : type === "surgery"
                ? "Procedure Name"
                : type === "condition"
                ? "Condition Name / Diagnosis"
                : "Medication Name"}
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter name..."
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
              required
            />

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-teal-500/40 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50">
                <div className="p-2 text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center justify-between border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>
                      {type === "medication"
                        ? "NIH RxNorm Live Drug Database"
                        : type === "condition"
                        ? "NLM CTSS Standardized ICD-10"
                        : "Clinical Catalog Matches"}
                    </span>
                  </div>
                  {isSearchingApi && (
                    <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {suggestions.map((sug) => (
                  <button
                    key={sug.id || sug.name}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full text-left p-2.5 hover:bg-slate-800/80 transition-all text-xs text-slate-200 flex items-center justify-between border-t border-slate-800/60 first:border-t-0"
                  >
                    <div>
                      <div className="font-semibold text-white">{sug.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {sug.rxcui
                          ? `RxCUI: ${sug.rxcui}`
                          : sug.icd10
                          ? `ICD-10-CM: ${sug.icd10}`
                          : sug.region || sug.site || sug.indication}
                      </div>
                    </div>
                    {sug.isRxNorm && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700/60 shrink-0">
                        RxNorm
                      </span>
                    )}
                    {sug.isCtss && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-700/60 shrink-0">
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">Anatomical Site</label>
                  <input
                    type="text"
                    value={formData.site || ""}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    placeholder="e.g. Left Radial Artery"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Placement Date</label>
                  <input
                    type="date"
                    value={formData.placementDate || ""}
                    onChange={(e) => setFormData({ ...formData, placementDate: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Line Specification / Gauge</label>
                <input
                  type="text"
                  value={formData.lineType || ""}
                  onChange={(e) => setFormData({ ...formData, lineType: e.target.value })}
                  placeholder="e.g. 20G Radial Catheter, 5 Fr Double Lumen"
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}

          {/* Drain Fields */}
          {type === "drain" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Body Location</label>
                  <input
                    type="text"
                    value={formData.site || ""}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    placeholder="e.g. Mouth, Pelvis, RUQ"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Placement Date</label>
                  <input
                    type="date"
                    value={formData.placementDate || ""}
                    onChange={(e) => setFormData({ ...formData, placementDate: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Drainage Device Type</label>
                <input
                  type="text"
                  value={formData.drainType || ""}
                  onChange={(e) => setFormData({ ...formData, drainType: e.target.value })}
                  placeholder="e.g. Orogastric Sump, 16 Fr Foley, JP Closed Suction Bulb"
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}

          {/* Surgery Fields */}
          {type === "surgery" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Surgical Site</label>
                  <input
                    type="text"
                    value={formData.site || ""}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Surgery Date</label>
                  <input
                    type="date"
                    value={formData.surgeryDate || ""}
                    onChange={(e) => setFormData({ ...formData, surgeryDate: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Incision / Scar Description</label>
                <input
                  type="text"
                  value={formData.incision || ""}
                  onChange={(e) => setFormData({ ...formData, incision: e.target.value })}
                  placeholder="e.g. 4-trocar laparoscopic punctures, 15cm midline knee incision"
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}

          {/* Condition Fields */}
          {type === "condition" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Anatomical Region</label>
                  <input
                    type="text"
                    value={formData.region || ""}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ICD-10 Code</label>
                  <input
                    type="text"
                    value={formData.icd10 || ""}
                    onChange={(e) => setFormData({ ...formData, icd10: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Onset Date</label>
                  <input
                    type="date"
                    value={formData.onsetDate || ""}
                    onChange={(e) => setFormData({ ...formData, onsetDate: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status || "Active"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
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
              {availableStrengths.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-teal-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>NIH RxNorm Standard Strengths</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {availableStrengths.map((str) => (
                      <button
                        key={str}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, dosage: str }))}
                        className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                          formData.dosage === str
                            ? "bg-teal-600 text-white border-teal-500 shadow-sm"
                            : "bg-slate-950 text-slate-300 border-slate-800 hover:border-teal-500 hover:text-white"
                        }`}
                      >
                        {str}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={formData.dosage || ""}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g. 20 mg"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Frequency</label>
                  <input
                    type="text"
                    value={formData.frequency || ""}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    placeholder="e.g. Daily with breakfast"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Picked Up Date</label>
                  <input
                    type="date"
                    value={formData.lastPickedUpDate || ""}
                    onChange={(e) => setFormData({ ...formData, lastPickedUpDate: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dispensing Pharmacy</label>
                  <input
                    type="text"
                    value={formData.lastPickedUpPharmacy || ""}
                    onChange={(e) => setFormData({ ...formData, lastPickedUpPharmacy: e.target.value })}
                    placeholder="e.g. CVS Pharmacy #04821"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Refills Remaining</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={formData.refillsRemaining ?? 2}
                    onChange={(e) => setFormData({ ...formData, refillsRemaining: parseInt(e.target.value, 10) || 0 })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Days Supply</label>
                  <input
                    type="text"
                    value={formData.daysSupply || ""}
                    onChange={(e) => setFormData({ ...formData, daysSupply: e.target.value })}
                    placeholder="e.g. 90-Day Supply"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">Anatomical Target / Organ Area</label>
                  <input
                    type="text"
                    value={formData.anatomical_marker || ""}
                    onChange={(e) => setFormData({ ...formData, anatomical_marker: e.target.value })}
                    placeholder="e.g. Lower Abdomen / Colon, Heart, Lungs"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date Performed</label>
                  <input
                    type="date"
                    value={formData.date_performed || ""}
                    onChange={(e) => setFormData({ ...formData, date_performed: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Performing Clinician</label>
                  <input
                    type="text"
                    value={formData.performing_clinician || ""}
                    onChange={(e) => setFormData({ ...formData, performing_clinician: e.target.value })}
                    placeholder="e.g. Dr. Marcus Vance, MD"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Facility / Institution</label>
                  <input
                    type="text"
                    value={formData.institution || ""}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g. Boston Endoscopy Center"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Procedure Type</label>
                  <select
                    value={formData.procedure_type || "diagnostic"}
                    onChange={(e) => setFormData({ ...formData, procedure_type: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="diagnostic">Diagnostic Exam</option>
                    <option value="screening">Routine Screening</option>
                    <option value="imaging">Imaging Scan (CT / MRI / Ultrasound)</option>
                    <option value="interventional">Interventional / Biopsy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Repeat Recall (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.recall_interval_years ?? 1}
                    onChange={(e) => setFormData({ ...formData, recall_interval_years: parseFloat(e.target.value) || 1 })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Findings Summary</label>
                <textarea
                  value={formData.findings || ""}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  placeholder="e.g. Benign polyps resected, clear margins; no evidence of dysplasia."
                  rows={2}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}

          {/* Vaccine Fields */}
          {type === "vaccine" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date Administered</label>
                  <input
                    type="date"
                    value={formData.date_administered || ""}
                    onChange={(e) => setFormData({ ...formData, date_administered: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dose Number</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.dose_number ?? 1}
                    onChange={(e) => setFormData({ ...formData, dose_number: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Administering Facility</label>
                  <input
                    type="text"
                    value={formData.administering_facility || ""}
                    onChange={(e) => setFormData({ ...formData, administering_facility: e.target.value })}
                    placeholder="e.g. CVS MinuteClinic #04821"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Next Due Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.next_due_date || ""}
                    onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Clinical Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 px-4 py-2 rounded-lg shadow-md transition-all"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
