import React from "react";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { isItemRelevantForPerspective } from "../../lib/clinicalCatalog";

export function SurgeryList({
  surgeries = [],
  searchQuery = "",
  focusedItem,
  onFocusItem,
  onAddSurgery,
  onEditSurgery,
  onDeleteSurgery,
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
      {/* Header Pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-700/10 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-700/20">
            Past Surgical Procedures & Incision Scars
          </div>
        </div>
        <button
          type="button"
          onClick={onAddSurgery}
          className="flex items-center gap-1 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Surgery</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {surgeries.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-lg">
            <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {searchQuery ? `No surgeries matching "${searchQuery}"` : "No surgical history recorded"}
            </p>
          </div>
        ) : (
          surgeries.map((surg) => {
            const isFocused = focusedItem?.id === surg.id;
            const daysActive = calculateDays(surg.surgeryDate);

            return (
              <div
                key={surg.id}
                onClick={() => onFocusItem({ ...surg, itemType: "surgery" })}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                  isFocused
                    ? isLight
                      ? "bg-indigo-50/70 border-indigo-600 shadow-md ring-1 ring-indigo-500/20"
                      : "bg-slate-800 border-indigo-500 shadow-md"
                    : isLight
                    ? "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
                    : "bg-slate-900/60 hover:bg-slate-800/60 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    {/* Indigo Scalpel Icon Badge */}
                    <div className="w-6 h-6 rounded-full border-2 border-indigo-600 bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m14 4 7 7-9 9H5v-7l9-9Z" />
                        <path d="m11 7 6 6" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={`text-xs font-bold leading-tight ${isLight ? "text-slate-900 group-hover:text-indigo-800" : "text-slate-100"}`}>
                          {surg.name}
                        </h3>
                      </div>
                      <div className={`text-[11px] mt-1 space-y-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        <div>
                          Surgery Date: <span className="font-medium text-slate-800 dark:text-slate-200">{surg.surgeryDate || "N/A"}</span>
                        </div>
                        <div>
                          Surgical Site: <span className="font-medium uppercase text-slate-800 dark:text-slate-200">{surg.site || "General"}</span>
                          <span
                            className={`ml-1.5 px-1.5 py-0.2 text-[9px] font-semibold rounded border ${
                              isItemRelevantForPerspective(surg, "posterior")
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-teal-50 text-teal-800 border-teal-200"
                            }`}
                          >
                            {isItemRelevantForPerspective(surg, "posterior") ? "Posterior" : "Anterior"}
                          </span>
                        </div>
                        {surg.incision && (
                          <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                            Incision: {surg.incision}
                          </div>
                        )}
                        {surg.surgeon && (
                          <div className="text-[10px] text-slate-500">
                            Surgeon: {surg.surgeon}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      {daysActive}
                    </span>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSurgery(surg);
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
                          onDeleteSurgery(surg.id);
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
