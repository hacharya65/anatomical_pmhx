import React, { useState } from "react";
import { LineList } from "./LineList";
import { DrainList } from "./DrainList";
import { SurgeryList } from "./SurgeryList";
import { ConditionList } from "./ConditionList";
import { MedicationList } from "./MedicationList";
import { ClinicalSummary } from "./ClinicalSummary";

export function UnifiedSidebar({
  activeTab,
  onTabChange,
  searchQuery = "",
  patientData,
  filteredLines,
  filteredDrains,
  filteredSurgeries,
  filteredConditions,
  filteredMedications,
  focusedItem,
  onFocusItem,
  onFocusOrgan,
  onOpenAdd,
  onOpenEdit,
  deleteLine,
  deleteDrain,
  deleteSurgery,
  deleteCondition,
  deleteMedication
}) {
  const { profile } = patientData;
  const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0);
  const [linesDrainsFilter, setLinesDrainsFilter] = useState("all"); // "all" | "lines" | "drains"

  // Reorganized navigation tabs:
  // 1. Summary (opens first!)
  // 2. Medical Conditions (reworded from Conditions)
  // 3. Surgical History (reworded from Surgeries)
  // 4. Medications (reworded from Meds)
  // 5. Lines / Drains (grouped under 1 tab with distinct icons and colors)
  const tabs = [
    { key: "summary", label: "Summary" },
    { key: "conditions", label: "Medical Conditions", count: filteredConditions.length },
    { key: "surgeries", label: "Surgical History", count: filteredSurgeries.length },
    { key: "medications", label: "Medications", count: filteredMedications.length },
    {
      key: "lines_drains",
      label: "Lines / Drains",
      count: filteredLines.length + filteredDrains.length,
      linesCount: filteredLines.length,
      drainsCount: filteredDrains.length
    }
  ];

  return (
    <aside id="tour-unified-sidebar" className="w-full lg:w-[540px] xl:w-[560px] h-full flex flex-col border-l shadow-xl z-20 select-none bg-white border-slate-200 text-slate-800">
      {/* 1. Unified Navigation Tabs across top of sidebar */}
      <div id="tour-sidebar-tabs" className="border-b px-2 pt-2 flex items-center justify-between gap-1 bg-slate-50 border-slate-200 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const hasMatches = isSearching && tab.count > 0;
          const isZeroMatches = isSearching && tab.count === 0 && tab.key !== "summary";

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 py-2 px-1 text-xs font-semibold rounded-t-lg transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
                isActive
                  ? "text-teal-800 border-teal-700 bg-white shadow-xs font-bold"
                  : isZeroMatches
                  ? "text-slate-400 border-transparent opacity-60 hover:opacity-100 hover:text-slate-700 hover:bg-slate-100/60"
                  : hasMatches
                  ? "text-teal-700 border-transparent hover:bg-teal-50/60 font-semibold"
                  : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/60"
              }`}
            >
              <span>{tab.label}</span>

              {/* Special grouped badge for Lines / Drains keeping individual colors and icons */}
              {tab.key === "lines_drains" ? (
                <div className="flex items-center gap-1 shrink-0 ml-0.5">
                  {/* Line indicator: Green IV icon + count */}
                  <span
                    title={`${tab.linesCount} Active Vascular Lines`}
                    className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold border transition-colors ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    <svg className="w-2.5 h-2.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 4h10v14a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V4Z" />
                      <path d="M10 2h4" />
                      <path d="M12 11v6" />
                      <path d="M9 14h6" />
                    </svg>
                    <span>{tab.linesCount}</span>
                  </span>

                  {/* Drain indicator: Pink drainage bulb icon + count */}
                  <span
                    title={`${tab.drainsCount} Active Surgical Drains`}
                    className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold border transition-colors ${
                      isActive
                        ? "bg-pink-100 text-pink-800 border-pink-300"
                        : "bg-pink-50 text-pink-700 border-pink-200"
                    }`}
                  >
                    <svg className="w-2.5 h-2.5 text-pink-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v6" />
                      <circle cx="12" cy="14" r="6" />
                      <path d="M12 11v4" />
                      <path d="M10 13h4" />
                    </svg>
                    <span>{tab.drainsCount}</span>
                  </span>
                </div>
              ) : (
                tab.count !== undefined && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold shrink-0 transition-colors ${
                      isActive
                        ? hasMatches
                          ? "bg-teal-700 text-white shadow-xs"
                          : "bg-teal-100 text-teal-800"
                        : hasMatches
                        ? "bg-teal-600 text-white shadow-xs animate-pulse"
                        : isZeroMatches
                        ? "bg-slate-200 text-slate-400"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Feed Content */}
      <div className="flex-1 overflow-hidden p-3.5 flex flex-col">
        {/* Summary Tab (Opens first) */}
        {activeTab === "summary" && (
          <ClinicalSummary
            profile={profile}
            conditions={patientData.conditions}
            surgeries={patientData.surgeries}
            medications={patientData.medications}
          />
        )}

        {/* Medical Conditions Tab */}
        {activeTab === "conditions" && (
          <ConditionList
            conditions={filteredConditions}
            searchQuery={searchQuery}
            focusedItem={focusedItem}
            onFocusItem={onFocusItem}
            onAddCondition={() => onOpenAdd("condition")}
            onEditCondition={(c) => onOpenEdit(c, "condition")}
            onDeleteCondition={deleteCondition}
          />
        )}

        {/* Surgical History Tab */}
        {activeTab === "surgeries" && (
          <SurgeryList
            surgeries={filteredSurgeries}
            searchQuery={searchQuery}
            focusedItem={focusedItem}
            onFocusItem={onFocusItem}
            onAddSurgery={() => onOpenAdd("surgery")}
            onEditSurgery={(s) => onOpenEdit(s, "surgery")}
            onDeleteSurgery={deleteSurgery}
          />
        )}

        {/* Medications Tab */}
        {activeTab === "medications" && (
          <MedicationList
            medications={filteredMedications}
            searchQuery={searchQuery}
            focusedItem={focusedItem}
            onFocusItem={onFocusItem}
            onFocusOrgan={onFocusOrgan}
            onAddMedication={() => onOpenAdd("medication")}
            onEditMedication={(m) => onOpenEdit(m, "medication")}
            onDeleteMedication={deleteMedication}
          />
        )}

        {/* Grouped Lines / Drains Tab: Preserving unique icons and colors */}
        {activeTab === "lines_drains" && (
          <div className="flex flex-col h-full">
            {/* Dedicated sub-filter pill selector */}
            <div className="flex items-center justify-between gap-1 mb-2.5 px-1 py-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <div className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  onClick={() => setLinesDrainsFilter("all")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    linesDrainsFilter === "all"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({filteredLines.length + filteredDrains.length})
                </button>

                {/* Lines filter pill with Green IV Icon */}
                <button
                  type="button"
                  onClick={() => setLinesDrainsFilter("lines")}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    linesDrainsFilter === "lines"
                      ? "bg-white text-emerald-800 shadow-xs border border-emerald-300"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <svg className="w-3 h-3 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4h10v14a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V4Z" />
                    <path d="M10 2h4" />
                    <path d="M12 11v6" />
                    <path d="M9 14h6" />
                  </svg>
                  <span>Lines ({filteredLines.length})</span>
                </button>

                {/* Drains filter pill with Magenta Drain Bulb Icon */}
                <button
                  type="button"
                  onClick={() => setLinesDrainsFilter("drains")}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    linesDrainsFilter === "drains"
                      ? "bg-white text-pink-800 shadow-xs border border-pink-300"
                      : "text-pink-700 hover:bg-pink-50"
                  }`}
                >
                  <svg className="w-3 h-3 text-pink-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v6" />
                    <circle cx="12" cy="14" r="6" />
                    <path d="M12 11v4" />
                    <path d="M10 13h4" />
                  </svg>
                  <span>Drains ({filteredDrains.length})</span>
                </button>
              </div>
            </div>

            {/* List Feeds */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {(linesDrainsFilter === "all" || linesDrainsFilter === "lines") && (
                <div>
                  <LineList
                    lines={filteredLines}
                    searchQuery={searchQuery}
                    focusedItem={focusedItem}
                    onFocusItem={onFocusItem}
                    onAddLine={() => onOpenAdd("line")}
                    onEditLine={(l) => onOpenEdit(l, "line")}
                    onDeleteLine={deleteLine}
                  />
                </div>
              )}

              {(linesDrainsFilter === "all" || linesDrainsFilter === "drains") && (
                <div className={linesDrainsFilter === "all" ? "pt-3 border-t border-slate-200" : ""}>
                  <DrainList
                    drains={filteredDrains}
                    searchQuery={searchQuery}
                    focusedItem={focusedItem}
                    onFocusItem={onFocusItem}
                    onAddDrain={() => onOpenAdd("drain")}
                    onEditDrain={(d) => onOpenEdit(d, "drain")}
                    onDeleteDrain={deleteDrain}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
