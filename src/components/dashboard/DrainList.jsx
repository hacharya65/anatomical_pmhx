import React from "react";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";

export function DrainList({
  drains = [],
  searchQuery = "",
  focusedItem,
  onFocusItem,
  onAddDrain,
  onEditDrain,
  onDeleteDrain,
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
          <div className="bg-pink-700/10 text-pink-800 text-xs font-bold px-2.5 py-1 rounded-md border border-pink-700/20">
            Active Patient Drains & Catheters
          </div>
        </div>
        <button
          type="button"
          onClick={onAddDrain}
          className="flex items-center gap-1 bg-pink-700 hover:bg-pink-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Drain</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {drains.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-lg">
            <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {searchQuery ? `No drains matching "${searchQuery}"` : "No active drains or catheters"}
            </p>
          </div>
        ) : (
          drains.map((drain) => {
            const isFocused = focusedItem?.id === drain.id;
            const daysActive = calculateDays(drain.placementDate);

            return (
              <div
                key={drain.id}
                onClick={() => onFocusItem({ ...drain, itemType: "drain" })}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                  isFocused
                    ? isLight
                      ? "bg-pink-50/70 border-pink-600 shadow-md ring-1 ring-pink-500/20"
                      : "bg-slate-800 border-pink-500 shadow-md"
                    : isLight
                    ? "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
                    : "bg-slate-900/60 hover:bg-slate-800/60 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    {/* Pink/Magenta Drain Bulb Icon */}
                    <div className="w-6 h-6 rounded-full border-2 border-pink-600 bg-pink-50 text-pink-700 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v6" />
                        <circle cx="12" cy="14" r="6" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className={`text-xs font-bold leading-tight ${isLight ? "text-slate-900 group-hover:text-pink-800" : "text-slate-100"}`}>
                        {drain.name}
                      </h3>
                      <div className={`text-[11px] mt-1 space-y-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        <div>
                          Placement Date: <span className="font-medium text-slate-800 dark:text-slate-200">{drain.placementDate || "N/A"}</span>
                        </div>
                        <div>
                          Body Location: <span className="font-medium uppercase text-slate-800 dark:text-slate-200">{drain.site || "General"}</span>
                        </div>
                        {drain.drainType && (
                          <div className="text-[10px] text-pink-700 dark:text-pink-400 font-medium">
                            Type: {drain.drainType}
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
                          onEditDrain(drain);
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
                          onDeleteDrain(drain.id);
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
