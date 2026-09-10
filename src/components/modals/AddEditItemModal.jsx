import React, { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { CLINICAL_CATALOG } from "../../lib/clinicalCatalog";

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

  // Autocomplete matching against catalog
  const handleNameChange = (val) => {
    setFormData((prev) => ({ ...prev, name: val }));

    if (val.length >= 2) {
      let matches = [];
      if (type === "condition") {
        matches = CLINICAL_CATALOG.conditions.filter((c) =>
          c.name.toLowerCase().includes(val.toLowerCase())
        );
      } else if (type === "surgery") {
        matches = CLINICAL_CATALOG.surgeries.filter((s) =>
          s.name.toLowerCase().includes(val.toLowerCase())
        );
      } else if (type === "medication") {
        matches = CLINICAL_CATALOG.medications.filter((m) =>
          m.name.toLowerCase().includes(val.toLowerCase())
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
      id: prev.id || undefined
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const titles = {
    line: item ? "Edit Vascular Line" : "Add Patient Line",
    drain: item ? "Edit Drain / Catheter" : "Add Patient Drain",
    surgery: item ? "Edit Surgical History" : "Add Surgical Procedure",
    condition: item ? "Edit Medical Condition" : "Add Medical Condition",
    medication: item ? "Edit Medication" : "Add Medication"
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
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-sky-500/40 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50">
                <div className="p-1.5 text-[10px] text-sky-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Clinical Catalog Matches</span>
                </div>
                {suggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full text-left p-2 hover:bg-slate-800/80 transition-all text-xs text-slate-200 flex items-center justify-between border-t border-slate-800/60"
                  >
                    <div>
                      <div className="font-medium text-white">{sug.name}</div>
                      <div className="text-[10px] text-slate-400">{sug.region || sug.site || sug.indication}</div>
                    </div>
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
