import React from "react";
import { Plus, Edit2, Trash2, AlertCircle, ShieldCheck, Calendar, MapPin, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { calculateVaccineStatus, CLINICAL_CATALOG } from "../../lib/clinicalCatalog";

export function VaccineList({
  vaccinations = [],
  searchQuery = "",
  onAddVaccination,
  onEditVaccination,
  onDeleteVaccination,
  theme = "light"
}) {
  const isLight = theme === "light";

  const filteredVaccines = vaccinations.filter((vax) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (vax.vaccine_name || vax.name || "").toLowerCase();
    const facility = (vax.administering_facility || vax.administeringFacility || "").toLowerCase();
    return name.includes(q) || facility.includes(q);
  });

  // Evaluate status for each vaccine record
  const analyzedRecords = filteredVaccines.map(vax => ({
    ...vax,
    statusInfo: calculateVaccineStatus(vax)
  }));

  const upToDateList = analyzedRecords.filter(r => r.statusInfo.isUpToDate);
  const dueList = analyzedRecords.filter(r => !r.statusInfo.isUpToDate);

  // Identify CDC catalog vaccines that are missing entirely from patient record
  const documentedNames = vaccinations.map(v => (v.vaccine_name || v.name || "").toLowerCase());
  const missingRecommended = (CLINICAL_CATALOG.vaccines || []).filter(v => {
    const isDoc = documentedNames.some(d => d.includes(v.name.toLowerCase()) || d.includes((v.plainName || "").toLowerCase()) || v.name.toLowerCase().includes(d));
    return !isDoc;
  });

  const formatVaccineDate = (dateStr) => {
    if (!dateStr) return "Date unrecorded";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const handleQuickAdd = (cdcSeed) => {
    const today = new Date().toISOString().split("T")[0];
    onAddVaccination({
      vaccine_name: cdcSeed.name,
      plainName: cdcSeed.plainName,
      date_administered: today,
      dose_number: 1,
      administering_facility: "Local Pharmacy / Primary Care",
      next_due_date: cdcSeed.scheduleRule === "annual" ? `${new Date().getFullYear() + 1}-10-01` : null
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Pill & Add Action */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-700/10 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-700/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Immunizations & Vaccine Schedule</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAddVaccination({})}
          className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs transition-all"
          title="Add immunization record"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vaccine</span>
        </button>
      </div>

      {/* Quick Action Pills for seasonal vaccines */}
      <div className="mb-3 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 rounded-lg">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quick Log Seasonal Vaccines:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleQuickAdd({ name: "Influenza (Flu Quadrivalent)", plainName: "Annual Flu Shot", scheduleRule: "annual" })}
            className="text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 px-2 py-1 rounded-md shadow-2xs transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>+ Annual Flu Shot</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd({ name: "COVID-19 Updated Booster (mRNA)", plainName: "Updated COVID-19 Booster", scheduleRule: "annual" })}
            className="text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 px-2 py-1 rounded-md shadow-2xs transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>+ COVID-19 Booster</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd({ name: "Tdap (Tetanus, Diphtheria, Pertussis)", plainName: "Tetanus Booster", scheduleRule: "10_years" })}
            className="text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 px-2 py-1 rounded-md shadow-2xs transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>+ Tdap Booster</span>
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {filteredVaccines.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-lg">
            <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {searchQuery ? `No vaccines matching "${searchQuery}"` : "No vaccination records found"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Use the quick buttons above or "Add Vaccine" to record your immunizations.
            </p>
          </div>
        ) : (
          <>
            {/* UP TO DATE SECTION */}
            {upToDateList.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Up to Date ({upToDateList.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {upToDateList.map((vax) => {
                    const name = vax.vaccine_name || vax.name || "Immunization";
                    const facility = vax.administering_facility || vax.administeringFacility;
                    const date = vax.date_administered || vax.dateAdministered;
                    const dose = vax.dose_number || vax.doseNumber || 1;

                    return (
                      <div
                        key={vax.id}
                        className={`group relative p-3 rounded-lg border transition-all ${
                          isLight
                            ? "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
                            : "bg-slate-900/60 hover:bg-slate-800/60 border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Emerald Badge */}
                            <div className="w-6 h-6 rounded-full border-2 border-emerald-600 bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                              <ShieldCheck className="w-3 h-3" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className={`text-xs font-bold leading-tight ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                                  {name}
                                </h4>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  Dose {dose}
                                </span>
                              </div>

                              <div className={`text-[11px] mt-1 space-y-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>Administered:</span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatVaccineDate(date)}</span>
                                </div>
                                {facility && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>Facility:</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{facility}</span>
                                  </div>
                                )}
                              </div>

                              {/* Status Chip */}
                              <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">CDC Schedule:</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vax.statusInfo.badgeColor}`}>
                                  {vax.statusInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onEditVaccination(vax)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-emerald-700 transition-colors"
                              title="Edit vaccination record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete immunization record for "${name}"?`)) {
                                  onDeleteVaccination(vax.id);
                                }
                              }}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RECOMMENDED / DUE SOON SECTION */}
            {dueList.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Recommended / Due for Booster ({dueList.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {dueList.map((vax) => {
                    const name = vax.vaccine_name || vax.name || "Immunization";
                    const facility = vax.administering_facility || vax.administeringFacility;
                    const date = vax.date_administered || vax.dateAdministered;

                    return (
                      <div
                        key={vax.id}
                        className={`group relative p-3 rounded-lg border border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className="w-6 h-6 rounded-full border-2 border-amber-500 bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Clock className="w-3 h-3" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">
                                {name}
                              </h4>
                              <div className="text-[11px] mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                                <div>Last given: <span className="font-medium text-slate-800 dark:text-slate-200">{formatVaccineDate(date)}</span></div>
                                {facility && <div>Facility: <span className="font-medium text-slate-800 dark:text-slate-200">{facility}</span></div>}
                              </div>

                              <div className="mt-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
                                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">Action recommended:</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vax.statusInfo.badgeColor}`}>
                                  {vax.statusInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditVaccination(vax)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-amber-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteVaccination(vax.id)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CDC SCHEDULE RECOMMENDATIONS EXPLORER */}
            {missingRecommended.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Additional Routine Vaccines to Review ({missingRecommended.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {missingRecommended.slice(0, 3).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rec.plainName}</div>
                        <div className="text-[10px] text-slate-500">{rec.targetGroup} • {rec.category}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(rec)}
                        className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors shrink-0"
                      >
                        + Log Dose
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
