import React from "react";
import { Plus, Edit2, Trash2, AlertCircle, FileSearch, Calendar, UserCheck, Clock, MapPin } from "lucide-react";
import { calculateProcedureRecall, isItemRelevantForPerspective } from "../../lib/clinicalCatalog";

export function ProcedureList({
  procedures = [],
  searchQuery = "",
  focusedItem,
  onFocusItem,
  onAddProcedure,
  onEditProcedure,
  onDeleteProcedure,
  theme = "light"
}) {
  const isLight = theme === "light";

  const filteredProcedures = procedures.filter((proc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (proc.procedure_name || proc.name || "").toLowerCase();
    const plain = (proc.plainName || "").toLowerCase();
    const doctor = (proc.performing_clinician || proc.performingClinician || "").toLowerCase();
    const inst = (proc.institution || "").toLowerCase();
    const findings = (proc.findings || "").toLowerCase();
    const marker = (proc.anatomical_marker || proc.anatomicalMarker || "").toLowerCase();
    return name.includes(q) || plain.includes(q) || doctor.includes(q) || inst.includes(q) || findings.includes(q) || marker.includes(q);
  });

  const formatProcedureDate = (dateStr) => {
    if (!dateStr) return "Date unrecorded";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Pill & Action */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-sky-700/10 text-sky-800 text-xs font-bold px-2.5 py-1 rounded-md border border-sky-700/20 flex items-center gap-1.5">
            <FileSearch className="w-3.5 h-3.5 text-sky-700" />
            <span>Diagnostic & Screening Procedures</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddProcedure}
          className="flex items-center gap-1 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs transition-all"
          title="Add new diagnostic procedure or screening test"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Procedure</span>
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredProcedures.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-lg">
            <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {searchQuery ? `No procedures matching "${searchQuery}"` : "No diagnostic procedures recorded yet"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Add screening colonoscopies, echocardiograms, mammograms, or scans to track recall dates.
            </p>
          </div>
        ) : (
          filteredProcedures.map((proc) => {
            const isFocused = focusedItem?.id === proc.id;
            const recall = calculateProcedureRecall(proc);
            const procName = proc.procedure_name || proc.name || "Diagnostic Procedure";
            const plainName = proc.plainName;
            const doctor = proc.performing_clinician || proc.performingClinician;
            const date = proc.date_performed || proc.datePerformed;
            const marker = proc.anatomical_marker || proc.anatomicalMarker || "General";
            const intervalYears = proc.recall_interval_years || proc.recallIntervalYears;

            return (
              <div
                key={proc.id}
                onClick={() => onFocusItem({ ...proc, itemType: "procedure", name: procName })}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                  isFocused
                    ? isLight
                      ? "bg-sky-50/70 border-sky-600 shadow-md ring-1 ring-sky-500/20"
                      : "bg-slate-800 border-sky-500 shadow-md"
                    : isLight
                    ? "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
                    : "bg-slate-900/60 hover:bg-slate-800/60 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    {/* Sky Blue Diagnostic Icon Badge */}
                    <div className="w-6 h-6 rounded-full border-2 border-sky-600 bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSearch className="w-3 h-3" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={`text-xs font-bold leading-tight ${isLight ? "text-slate-900 group-hover:text-sky-800" : "text-slate-100"}`}>
                          {procName}
                        </h3>
                        {plainName && plainName !== procName && (
                          <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200/60 px-1.5 py-0.2 rounded font-medium">
                            {plainName}
                          </span>
                        )}
                      </div>

                      <div className={`text-[11px] mt-1 space-y-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Performed:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{formatProcedureDate(date)}</span>
                        </div>

                        {doctor && (
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Clinician:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{doctor}</span>
                          </div>
                        )}

                        {proc.institution && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Location:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{proc.institution}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-500">Body Area:</span>
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{marker}</span>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border ${
                              isItemRelevantForPerspective(proc, "posterior")
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-teal-50 text-teal-800 border-teal-200"
                            }`}
                          >
                            {isItemRelevantForPerspective(proc, "posterior") ? "Back" : "Front"}
                          </span>
                        </div>
                      </div>

                      {/* Findings */}
                      {proc.findings && (
                        <div className="mt-2 text-[11px] bg-slate-50 dark:bg-slate-800/80 p-2 rounded border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">Findings: </span>
                          {proc.findings}
                        </div>
                      )}

                      {/* Recall Chip & Schedule Info */}
                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Interval: {intervalYears ? `${intervalYears} ${intervalYears === 1 ? "Year" : "Years"}` : "Routine"}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${recall.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {recall.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProcedure(proc);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-sky-700 transition-colors"
                      title="Edit procedure details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove procedure record "${procName}"?`)) {
                          onDeleteProcedure(proc.id);
                        }
                      }}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete procedure"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
