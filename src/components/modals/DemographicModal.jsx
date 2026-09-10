import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Award,
  AlertTriangle,
  Calendar,
  Building,
  HeartHandshake,
  Edit3,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Clock,
  Pill
} from "lucide-react";

export function DemographicModal({
  isOpen,
  onClose,
  profile = {},
  allergiesList = [],
  onSaveProfile,
  onAddAllergy,
  onUpdateAllergy,
  onDeleteAllergy
}) {
  const isLight = true;

  // Active section currently in edit mode: null | "demographics" | "careTeam" | "pharmacy" | "allergyModal"
  const [editingSection, setEditingSection] = useState(null);

  // Helper: parse structured emergency contact
  const parseEmergencyContact = () => {
    const raw = profile.emergencyContact || "Eli Vance (Spouse) • (555) 234-9812";
    if (profile.emergencyContactName && profile.emergencyContactPhone) {
      return {
        name: profile.emergencyContactName,
        relation: profile.emergencyContactRelation || "Spouse",
        phone: profile.emergencyContactPhone
      };
    }
    const match = raw.match(/^([^(]+?)\s*(?:\(([^)]+)\))?\s*[-•–]\s*(.+)$/);
    if (match) {
      return {
        name: match[1]?.trim() || "Eli Vance",
        relation: match[2]?.trim() || "Spouse",
        phone: match[3]?.trim() || "(555) 234-9812"
      };
    }
    return {
      name: "Eli Vance",
      relation: "Spouse",
      phone: "(555) 234-9812"
    };
  };

  // Helper: parse gender / administrative sex
  const parseGenderState = () => {
    const current = profile.gender || profile.sex || "Female";
    if (current.toLowerCase() === "female") return { category: "Female", custom: "" };
    if (current.toLowerCase() === "male") return { category: "Male", custom: "" };
    return { category: "Other", custom: current };
  };

  const initialGender = parseGenderState();
  const initialEC = parseEmergencyContact();
  const isInitialVeteran =
    profile.veteranStatus === "Yes" ||
    profile.veteranStatus === "yes" ||
    (typeof profile.veteranStatus === "string" &&
      profile.veteranStatus.toLowerCase().includes("veteran"));

  // Demographics form draft
  const [demoDraft, setDemoDraft] = useState({
    name: profile.name || "Elena Vance",
    dob: profile.dob || "1968-04-12",
    age: profile.age || 58,
    genderCategory: initialGender.category,
    genderCustom: initialGender.custom,
    mrn: profile.mrn || "#PMHX-84920",
    phone: profile.phone || "(555) 839-2041",
    email: profile.email || "elena.vance@healthmail.net",
    address: profile.address || "742 Evergreen Terrace, Boston, MA 02115",
    veteranStatus: isInitialVeteran ? "Yes" : "No",
    preferredLanguage: profile.preferredLanguage || "English",
    bloodType: profile.bloodType || "O Positive"
  });

  // Care Team form draft
  const [careDraft, setCareDraft] = useState({
    pcp: (profile.pcp || "Dr. Robert Adams, MD").replace(/\s*\(Internal Medicine\)/gi, "").trim(),
    pcpPhone: profile.pcpPhone || "(555) 726-3000",
    clinic: (profile.clinic || "Mass General Brigham Associates, Suite 400").replace(/\s*Internal Medicine\s*/gi, " "),
    emergencyContactName: initialEC.name,
    emergencyContactRelation: initialEC.relation,
    emergencyContactPhone: initialEC.phone
  });

  // Pharmacy form draft
  const defaultPharmacy = {
    name: "CVS Pharmacy #04821",
    address: "1244 Massachusetts Ave, Cambridge, MA 02138",
    phone: "(617) 555-0198",
    fax: "(617) 555-0199",
    hours: "Open 24 Hours • 7 Days/Week",
    npi: "1487920114",
    ncpdp: "2210492",
    status: "Primary Preferred (E-Prescribe Enabled)"
  };
  const [pharmacyDraft, setPharmacyDraft] = useState(profile.pharmacy || defaultPharmacy);

  // New / Edit allergy modal state
  const [allergyDraft, setAllergyDraft] = useState(null);

  if (!isOpen) return null;

  // Handle demographic field edits
  const handleDemoChange = (field, value) => {
    setDemoDraft((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "dob" && value) {
        const birthDate = new Date(value);
        const diffYears = new Date().getFullYear() - birthDate.getFullYear();
        if (!isNaN(diffYears) && diffYears > 0 && diffYears < 125) {
          updated.age = diffYears;
        }
      }
      return updated;
    });
  };

  const handleSaveDemographics = (e) => {
    e.preventDefault();
    const finalGender =
      demoDraft.genderCategory === "Other"
        ? demoDraft.genderCustom || "Other"
        : demoDraft.genderCategory;
    const finalSex =
      demoDraft.genderCategory === "Male"
        ? "male"
        : demoDraft.genderCategory === "Female"
        ? "female"
        : "neutral";

    onSaveProfile({
      ...profile,
      name: demoDraft.name,
      dob: demoDraft.dob,
      age: demoDraft.age,
      gender: finalGender,
      sex: finalSex,
      genderCustom: demoDraft.genderCustom,
      mrn: demoDraft.mrn,
      phone: demoDraft.phone,
      email: demoDraft.email,
      address: demoDraft.address,
      veteranStatus: demoDraft.veteranStatus === "Yes" ? "Yes" : "No",
      preferredLanguage: demoDraft.preferredLanguage,
      bloodType: demoDraft.bloodType
    });
    setEditingSection(null);
  };

  const handleSaveCareTeam = (e) => {
    e.preventDefault();
    const formattedContact = `${careDraft.emergencyContactName || "Eli Vance"} (${careDraft.emergencyContactRelation || "Spouse"}) • ${careDraft.emergencyContactPhone || "(555) 234-9812"}`;
    onSaveProfile({
      ...profile,
      pcp: careDraft.pcp.replace(/\s*\(Internal Medicine\)/gi, "").trim(),
      pcpPhone: careDraft.pcpPhone,
      clinic: careDraft.clinic,
      emergencyContactName: careDraft.emergencyContactName,
      emergencyContactRelation: careDraft.emergencyContactRelation,
      emergencyContactPhone: careDraft.emergencyContactPhone,
      emergencyContact: formattedContact
    });
    setEditingSection(null);
  };

  const handleSavePharmacy = (e) => {
    e.preventDefault();
    onSaveProfile({ ...profile, pharmacy: pharmacyDraft });
    setEditingSection(null);
  };

  const handleSaveAllergy = (e) => {
    e.preventDefault();
    if (!allergyDraft.medication) return;
    if (allergyDraft.id) {
      onUpdateAllergy(allergyDraft.id, allergyDraft);
    } else {
      onAddAllergy({
        ...allergyDraft,
        id: `all-${Date.now()}`,
        status: "Active"
      });
    }
    setAllergyDraft(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-slate-900 border-slate-800 text-slate-100"
        }`}
      >
        {/* ================================================================= */}
        {/* MODAL HEADER: Patient Identification Capsule & Close */}
        {/* ================================================================= */}
        <div
          className={`p-5 border-b flex items-center justify-between shrink-0 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
                isLight
                  ? "bg-teal-700 text-white border-teal-800"
                  : "bg-teal-500/20 text-teal-400 border-teal-500/30"
              }`}
            >
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight leading-tight">
                  {profile.name || "Elena Vance"}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  {profile.mrn || "#PMHX-84920"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Active EMR Record
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Age {profile.age || 58} ({profile.dob || "1968-04-12"}) • {profile.gender || "Female"} • {profile.bloodType || "O Positive"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${
              isLight
                ? "text-slate-400 hover:text-slate-700 hover:bg-slate-200/80"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* MODAL BODY: Structured Clinical Sections */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SECTION 1: Personal Demographics */}
          <div
            className={`p-4 sm:p-5 rounded-xl border transition-all ${
              isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/40 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Personal Demographics
                </h3>
              </div>
              {editingSection !== "demographics" ? (
                <button
                  type="button"
                  onClick={() => {
                    const gState = parseGenderState();
                    const isVet =
                      profile.veteranStatus === "Yes" ||
                      profile.veteranStatus === "yes" ||
                      (typeof profile.veteranStatus === "string" &&
                        profile.veteranStatus.toLowerCase().includes("veteran"));
                    setDemoDraft({
                      name: profile.name || "Elena Vance",
                      dob: profile.dob || "1968-04-12",
                      age: profile.age || 58,
                      genderCategory: gState.category,
                      genderCustom: gState.custom,
                      mrn: profile.mrn || "#PMHX-84920",
                      phone: profile.phone || "(555) 839-2041",
                      email: profile.email || "elena.vance@healthmail.net",
                      address: profile.address || "742 Evergreen Terrace, Boston, MA 02115",
                      veteranStatus: isVet ? "Yes" : "No",
                      preferredLanguage: profile.preferredLanguage || "English",
                      bloodType: profile.bloodType || "O Positive"
                    });
                    setEditingSection("demographics");
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Demographics</span>
                </button>
              ) : null}
            </div>

            {editingSection === "demographics" ? (
              <form onSubmit={handleSaveDemographics} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Full Name</label>
                    <input
                      type="text"
                      value={demoDraft.name}
                      onChange={(e) => handleDemoChange("name", e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Medical Record # (MRN)</label>
                    <input
                      type="text"
                      value={demoDraft.mrn}
                      onChange={(e) => handleDemoChange("mrn", e.target.value)}
                      className={`w-full p-2 font-mono rounded-lg border text-xs focus:outline-none ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Date of Birth</label>
                    <input
                      type="date"
                      value={demoDraft.dob}
                      onChange={(e) => handleDemoChange("dob", e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Gender / Administrative Sex</label>
                    <select
                      value={demoDraft.genderCategory}
                      onChange={(e) => setDemoDraft({ ...demoDraft, genderCategory: e.target.value })}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other (Specify free-text)</option>
                    </select>
                  </div>

                  {demoDraft.genderCategory === "Other" && (
                    <div className="sm:col-span-2 animate-in fade-in">
                      <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">
                        Specify Gender / Identity (Free-Text)
                      </label>
                      <input
                        type="text"
                        value={demoDraft.genderCustom}
                        onChange={(e) => setDemoDraft({ ...demoDraft, genderCustom: e.target.value })}
                        placeholder="e.g. Non-binary, Transgender, Two-spirit, or self-described"
                        className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                          isLight
                            ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                            : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                        }`}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Primary Phone</label>
                    <input
                      type="tel"
                      value={demoDraft.phone}
                      onChange={(e) => handleDemoChange("phone", e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Email Address</label>
                    <input
                      type="email"
                      value={demoDraft.email}
                      onChange={(e) => handleDemoChange("email", e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Home / Residential Address</label>
                    <input
                      type="text"
                      value={demoDraft.address}
                      onChange={(e) => handleDemoChange("address", e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Veteran Status</label>
                    <select
                      value={demoDraft.veteranStatus}
                      onChange={(e) => handleDemoChange("veteranStatus", e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none font-medium ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                          : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-500"
                      }`}
                    >
                      <option value="Yes">Yes (US Armed Forces Veteran)</option>
                      <option value="No">No (Non-Veteran)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingSection(null)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-all"
                  >
                    Save Demographics
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Primary Phone</span>
                  <div className="flex items-center gap-1.5 font-medium mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>{profile.phone || "(555) 839-2041"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Email Address</span>
                  <div className="flex items-center gap-1.5 font-medium mt-0.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{profile.email || "elena.vance@healthmail.net"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Veteran Status</span>
                  <div className="flex items-center gap-1.5 font-medium mt-0.5">
                    {profile.veteranStatus === "Yes" ||
                    profile.veteranStatus === "yes" ||
                    profile.isVeteran === true ||
                    (typeof profile.veteranStatus === "string" &&
                      profile.veteranStatus.toLowerCase().includes("veteran")) ? (
                      <span className="flex items-center gap-1 text-indigo-700 font-bold">
                        <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Yes (Veteran)</span>
                      </span>
                    ) : (
                      <span className="text-slate-700 font-medium">No</span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Home / Mailing Address</span>
                  <div className="flex items-center gap-1.5 font-medium mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{profile.address || "742 Evergreen Terrace, Boston, MA 02115"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Language / Blood Type</span>
                  <div className="font-medium mt-0.5">
                    {profile.preferredLanguage || "English"} • {profile.bloodType || "O Positive"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Dedicated Allergies Registry */}
          <div
            className={`p-4 sm:p-5 rounded-xl border transition-all ${
              isLight ? "bg-rose-50/30 border-rose-200" : "bg-rose-950/20 border-rose-900/40"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-200/60 dark:border-rose-900/60">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Documented Allergies & Adverse Reactions ({allergiesList.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAllergyDraft({
                    medication: "",
                    reaction: "",
                    severity: "Severe / Anaphylactoid",
                    dateDocumented: new Date().toISOString().slice(0, 10),
                    documentedBy: profile.pcp || "Attending Physician"
                  })
                }
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Allergy</span>
              </button>
            </div>

            {/* Allergy Cards Grid */}
            <div className="space-y-2.5">
              {allergiesList.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">No known drug allergies (NKDA) currently documented.</div>
              ) : (
                allergiesList.map((allergy) => (
                  <div
                    key={allergy.id}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLight ? "bg-white border-rose-200 shadow-xs" : "bg-slate-900 border-rose-900/60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-rose-700 dark:text-rose-300">
                          {allergy.medication}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {allergy.severity || "Severe"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                        "{allergy.reaction}"
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>Documented: <strong className="text-slate-700 dark:text-slate-300">{allergy.dateDocumented}</strong></span>
                        {allergy.documentedBy && (
                          <span>• Recorded by: {allergy.documentedBy}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setAllergyDraft({ ...allergy })}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Edit Allergy"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAllergy && onDeleteAllergy(allergy.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                        title="Remove Allergy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Inline Modal/Editor for Adding or Editing Allergy */}
            {allergyDraft && (
              <form onSubmit={handleSaveAllergy} className={`mt-3 p-3.5 rounded-xl border space-y-3 ${
                isLight ? "bg-white border-rose-300 shadow-md" : "bg-slate-900 border-rose-700"
              }`}>
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  {allergyDraft.id ? "Edit Documented Allergy" : "Document New Allergy"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Medication / Allergen Name</label>
                    <input
                      type="text"
                      value={allergyDraft.medication}
                      onChange={(e) => setAllergyDraft({ ...allergyDraft, medication: e.target.value })}
                      placeholder="e.g. Penicillin, Codeine, Cefazolin"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-slate-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Clinical Severity / Type</label>
                    <select
                      value={allergyDraft.severity}
                      onChange={(e) => setAllergyDraft({ ...allergyDraft, severity: e.target.value })}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-slate-100"
                      }`}
                    >
                      <option value="Severe / Anaphylactoid">Severe / Anaphylactoid</option>
                      <option value="Moderate Intolerance">Moderate Intolerance</option>
                      <option value="Mild Pruritus / Rash">Mild Pruritus / Rash</option>
                      <option value="Severe Angioedema">Severe Angioedema</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Patient's Description of Reaction</label>
                    <textarea
                      rows={2}
                      value={allergyDraft.reaction}
                      onChange={(e) => setAllergyDraft({ ...allergyDraft, reaction: e.target.value })}
                      placeholder="In the patient's own words (e.g. 'Severe hives across chest and throat tightness within 15 minutes')"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-slate-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Date Documented</label>
                    <input
                      type="date"
                      value={allergyDraft.dateDocumented}
                      onChange={(e) => setAllergyDraft({ ...allergyDraft, dateDocumented: e.target.value })}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-slate-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Documented By</label>
                    <input
                      type="text"
                      value={allergyDraft.documentedBy || ""}
                      onChange={(e) => setAllergyDraft({ ...allergyDraft, documentedBy: e.target.value })}
                      placeholder="Provider Name"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-slate-100"
                      }`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAllergyDraft(null)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs"
                  >
                    Save Allergy
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* SECTION 3: Care Team & Clinical Safety */}
          <div
            className={`p-4 sm:p-5 rounded-xl border transition-all ${
              isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/40 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Care Team & Clinical Safety
                </h3>
              </div>
              {editingSection !== "careTeam" ? (
                <button
                  type="button"
                  onClick={() => {
                    const ec = parseEmergencyContact();
                    setCareDraft({
                      pcp: (profile.pcp || "Dr. Robert Adams, MD").replace(/\s*\(Internal Medicine\)/gi, "").trim(),
                      pcpPhone: profile.pcpPhone || "(555) 726-3000",
                      clinic: (profile.clinic || "Mass General Brigham Associates, Suite 400").replace(/\s*Internal Medicine\s*/gi, " "),
                      emergencyContactName: profile.emergencyContactName || ec.name,
                      emergencyContactRelation: profile.emergencyContactRelation || ec.relation,
                      emergencyContactPhone: profile.emergencyContactPhone || ec.phone
                    });
                    setEditingSection("careTeam");
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Care Team</span>
                </button>
              ) : null}
            </div>

            {editingSection === "careTeam" ? (
              <form onSubmit={handleSaveCareTeam} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Primary Care Physician</label>
                    <input
                      type="text"
                      value={careDraft.pcp}
                      onChange={(e) => setCareDraft({ ...careDraft, pcp: e.target.value })}
                      placeholder="e.g. Dr. Robert Adams, MD"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Clinic / Hospital Facility</label>
                    <input
                      type="text"
                      value={careDraft.clinic}
                      onChange={(e) => setCareDraft({ ...careDraft, clinic: e.target.value })}
                      placeholder="e.g. Mass General Brigham Associates, Suite 400"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Provider Contact Phone</label>
                    <input
                      type="tel"
                      value={careDraft.pcpPhone}
                      onChange={(e) => setCareDraft({ ...careDraft, pcpPhone: e.target.value })}
                      placeholder="(555) 726-3000"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                    />
                  </div>

                  {/* Structured Emergency Contact Inputs */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Emergency Contact Person & Relation
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Contact Full Name</label>
                        <input
                          type="text"
                          value={careDraft.emergencyContactName}
                          onChange={(e) => setCareDraft({ ...careDraft, emergencyContactName: e.target.value })}
                          placeholder="e.g. Eli Vance"
                          className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                            isLight ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600" : "bg-slate-900 border-slate-700 text-slate-100"
                          }`}
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Relationship</label>
                        <select
                          value={careDraft.emergencyContactRelation}
                          onChange={(e) => setCareDraft({ ...careDraft, emergencyContactRelation: e.target.value })}
                          className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                            isLight ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600" : "bg-slate-900 border-slate-700 text-slate-100"
                          }`}
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Partner">Partner</option>
                          <option value="Parent">Parent</option>
                          <option value="Child">Child (Adult)</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Power of Attorney">Health Care Proxy / POA</option>
                          <option value="Caregiver">Caregiver</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Emergency Phone</label>
                        <input
                          type="tel"
                          value={careDraft.emergencyContactPhone}
                          onChange={(e) => setCareDraft({ ...careDraft, emergencyContactPhone: e.target.value })}
                          placeholder="(555) 234-9812"
                          className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                            isLight ? "bg-white border-slate-300 text-slate-900 focus:border-teal-600" : "bg-slate-900 border-slate-700 text-slate-100"
                          }`}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingSection(null)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-all"
                  >
                    Save Care Team
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Primary Care Physician</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {profile.pcp ? profile.pcp.replace(/\s*\(Internal Medicine\)/gi, "").trim() : "Dr. Robert Adams, MD"}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Phone: {profile.pcpPhone || "(555) 726-3000"}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Clinical Facility</span>
                  <div className="flex items-center gap-1.5 font-medium mt-0.5">
                    <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{profile.clinic || "Mass General Brigham Associates, Suite 400"}</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Emergency Contact</span>
                  <div className="flex items-center gap-2 font-medium mt-0.5 text-slate-800 dark:text-slate-200">
                    <HeartHandshake className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="font-bold">{profile.emergencyContactName || "Eli Vance"}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                      {profile.emergencyContactRelation || "Spouse"}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono">
                      {profile.emergencyContactPhone || "(555) 234-9812"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Preferred Pharmacy & Dispensary Information */}
          <div
            className={`p-4 sm:p-5 rounded-xl border transition-all ${
              isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/40 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Preferred Pharmacy & Dispensary Information
                </h3>
              </div>
              {editingSection !== "pharmacy" ? (
                <button
                  type="button"
                  onClick={() => {
                    setPharmacyDraft(profile.pharmacy || defaultPharmacy);
                    setEditingSection("pharmacy");
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Pharmacy</span>
                </button>
              ) : null}
            </div>

            {editingSection === "pharmacy" ? (
              <form onSubmit={handleSavePharmacy} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Pharmacy Name</label>
                    <input
                      type="text"
                      value={pharmacyDraft.name}
                      onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, name: e.target.value })}
                      placeholder="e.g. CVS Pharmacy #04821, Walgreens"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">E-Prescribe Status / Network</label>
                    <select
                      value={pharmacyDraft.status || "Primary Preferred (E-Prescribe Enabled)"}
                      onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, status: e.target.value })}
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                    >
                      <option value="Primary Preferred (E-Prescribe Enabled)">Primary Preferred (E-Prescribe Enabled)</option>
                      <option value="Secondary / Backup Retail">Secondary / Backup Retail</option>
                      <option value="Mail Order Specialty Pharmacy">Mail Order Specialty Pharmacy</option>
                      <option value="Hospital Outpatient Pharmacy">Hospital Outpatient Pharmacy</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Pharmacy Physical Address</label>
                    <input
                      type="text"
                      value={pharmacyDraft.address}
                      onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, address: e.target.value })}
                      placeholder="Street, City, State, ZIP"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Pharmacy Phone</label>
                    <input
                      type="tel"
                      value={pharmacyDraft.phone}
                      onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, phone: e.target.value })}
                      placeholder="(617) 555-0198"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Pharmacy Fax</label>
                    <input
                      type="tel"
                      value={pharmacyDraft.fax}
                      onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, fax: e.target.value })}
                      placeholder="(617) 555-0199"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Hours of Operation</label>
                    <input
                      type="text"
                      value={pharmacyDraft.hours}
                      onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, hours: e.target.value })}
                      placeholder="e.g. Open 24 Hours • 7 Days/Week"
                      className={`w-full p-2 rounded-lg border text-xs focus:outline-none ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-600 dark:text-slate-400">Identifiers (NCPDP / NPI)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={pharmacyDraft.ncpdp || ""}
                        onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, ncpdp: e.target.value })}
                        placeholder="NCPDP (e.g. 2210492)"
                        className={`w-full p-2 rounded-lg border text-xs focus:outline-none font-mono ${
                          isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                        }`}
                      />
                      <input
                        type="text"
                        value={pharmacyDraft.npi || ""}
                        onChange={(e) => setPharmacyDraft({ ...pharmacyDraft, npi: e.target.value })}
                        placeholder="NPI (e.g. 1487920114)"
                        className={`w-full p-2 rounded-lg border text-xs focus:outline-none font-mono ${
                          isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingSection(null)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-all"
                  >
                    Save Pharmacy
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Primary Preferred Pharmacy</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {pharmacyDraft.name || "CVS Pharmacy #04821"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                      E-Prescribe
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{pharmacyDraft.address || "1244 Massachusetts Ave, Cambridge, MA 02138"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Dispensary Contact</span>
                  <div className="text-slate-700 dark:text-slate-300 text-xs font-medium mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Phone: {pharmacyDraft.phone || "(617) 555-0198"}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5 pl-5">
                    Fax: {pharmacyDraft.fax || "(617) 555-0199"}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Hours of Operation</span>
                  <div className="flex items-center gap-1.5 font-medium mt-0.5 text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{pharmacyDraft.hours || "Open 24 Hours • 7 Days/Week"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Electronic Prescribing Identifiers</span>
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    NCPDP: <strong className="text-slate-800 dark:text-slate-200">{pharmacyDraft.ncpdp || "2210492"}</strong> • NPI: <strong className="text-slate-800 dark:text-slate-200">{pharmacyDraft.npi || "1487920114"}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* MODAL FOOTER */}
        {/* ================================================================= */}
        <div
          className={`p-4 border-t flex items-center justify-between ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>EMR Verification: Validated Record ID</span>
            <span className="font-mono text-slate-600 dark:text-slate-400">PMHX-SECURE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
              isLight
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
