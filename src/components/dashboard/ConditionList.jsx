import React from "react";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { isItemRelevantForPerspective } from "../../lib/clinicalCatalog";

export function ConditionList({
  conditions = [],
  searchQuery = "",
  focusedItem,
  onFocusItem,
  onAddCondition,
  onEditCondition,
  onDeleteCondition,
  theme = "light"
}) {
  const isLight = theme === "light";

  const calculateDays = (dateStr) => {
    if (!dateStr) return "0 days";
    const date = new Date(dateStr);
    const diffTime = Math.abs(new Date() - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return "0 days";
    if (diffDays > 365) return `${Math.floor(diffDays / 365)} yrs`;
    return `${diffDays} days`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Epic Header Pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-amber-700/10 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-700/20">
            Medical History & Conditions
          </div>
        </div>
        <button
          type="button"
          onClick={onAddCondition}
          className="flex items-center gap-1 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Condition</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {conditions.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-lg">
            <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {searchQuery ? `No conditions matching "${searchQuery}"` : "No active conditions recorded"}
            </p>
          </div>
        ) : (
          conditions.map((cond) => {
            const isFocused = focusedItem?.id === cond.id;
            const daysActive = calculateDays(cond.onsetDate);

            return (
              <div
                key={cond.id}
                onClick={() => onFocusItem({ ...cond, itemType: "condition" })}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                  isFocused
                    ? isLight
                      ? "bg-amber-50/70 border-amber-600 shadow-md ring-1 ring-amber-500/20"
                      : "bg-slate-800 border-amber-500 shadow-md"
                    : isLight
                    ? "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
                    : "bg-slate-900/60 hover:bg-slate-800/60 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    {/* Epic Amber Badge Icon */}
                    <div className="w-6 h-6 rounded-full border-2 border-amber-600 bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={`text-xs font-bold leading-tight ${isLight ? "text-slate-900 group-hover:text-amber-800" : "text-slate-100"}`}>
                          {cond.name}
                        </h3>
                        {cond.plainName && cond.plainName !== cond.name && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded font-medium">
                            {cond.plainName}
                          </span>
                        )}
                        {cond.icd10 && (
                          <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {cond.icd10}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-1 space-y-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        <div>
                          Diagnosed / Started: <span className="font-medium text-slate-800 dark:text-slate-200">{cond.onsetDate || "N/A"}</span>
                        </div>
                        <div>
                          Body Area: <span className="font-medium uppercase text-slate-800 dark:text-slate-200">{cond.region || "Systemic"}</span>
                          <span
                            className={`ml-1.5 px-1.5 py-0.2 text-[9px] font-semibold rounded border ${
                              isItemRelevantForPerspective(cond, "posterior")
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-teal-50 text-teal-800 border-teal-200"
                            }`}
                          >
                            {isItemRelevantForPerspective(cond, "posterior") ? "Posterior" : "Anterior"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            {cond.status || "Active"}
                          </span>
                          {cond.provider && (
                            <span className="text-[10px] text-slate-500">
                              {cond.provider}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Active duration */}
                  <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      {daysActive}
                    </span>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCondition(cond);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCondition(cond.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
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
