import React from "react";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";

export function LineList({
  lines = [],
  searchQuery = "",
  focusedItem,
  onFocusItem,
  onAddLine,
  onEditLine,
  onDeleteLine,
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
          <div className="bg-emerald-700/10 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-700/20">
            Active Patient Lines & Vascular Access
          </div>
        </div>
        <button
          type="button"
          onClick={onAddLine}
          className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Line</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {lines.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-lg">
            <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {searchQuery ? `No lines matching "${searchQuery}"` : "No active IV or arterial lines recorded"}
            </p>
          </div>
        ) : (
          lines.map((line) => {
            const isFocused = focusedItem?.id === line.id;
            const daysActive = calculateDays(line.placementDate);

            return (
              <div
                key={line.id}
                onClick={() => onFocusItem({ ...line, itemType: "line" })}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                  isFocused
                    ? isLight
                      ? "bg-emerald-50/70 border-emerald-600 shadow-md ring-1 ring-emerald-500/20"
                      : "bg-slate-800 border-emerald-500 shadow-md"
                    : isLight
                    ? "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
                    : "bg-slate-900/60 hover:bg-slate-800/60 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    {/* Emerald IV Bag Icon */}
                    <div className="w-6 h-6 rounded-full border-2 border-emerald-600 bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M7 4h10v14a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V4Z" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className={`text-xs font-bold leading-tight ${isLight ? "text-slate-900 group-hover:text-emerald-800" : "text-slate-100"}`}>
                        {line.name}
                      </h3>
                      <div className={`text-[11px] mt-1 space-y-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        <div>
                          Placement Date: <span className="font-medium text-slate-800 dark:text-slate-200">{line.placementDate || "N/A"}</span>
                        </div>
                        <div>
                          Body Location: <span className="font-medium uppercase text-slate-800 dark:text-slate-200">{line.site || "General"}</span>
                        </div>
                        {line.lineType && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                            Type: {line.lineType}
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
                          onEditLine(line);
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
                          onDeleteLine(line.id);
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
