import React from "react";
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

  const tabs = [
    { key: "lines", label: "Lines", count: filteredLines.length },
    { key: "drains", label: "Drains", count: filteredDrains.length },
    { key: "surgeries", label: "Surgeries", count: filteredSurgeries.length },
    { key: "conditions", label: "Conditions", count: filteredConditions.length },
    { key: "medications", label: "Meds", count: filteredMedications.length },
    { key: "summary", label: "Summary" }
  ];

  return (
    <aside id="tour-unified-sidebar" className="w-full lg:w-[540px] xl:w-[560px] h-full flex flex-col border-l shadow-xl z-20 select-none bg-white border-slate-200 text-slate-800">
      {/* 1. Unified Navigation Tabs across top of sidebar - Fully expanded without truncation */}
      <div id="tour-sidebar-tabs" className="border-b px-2 pt-2 flex items-center justify-between gap-1 bg-slate-50 border-slate-200">
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
              {tab.count !== undefined && (
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
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Feed Content: Placed immediately under the tabs with zero dead space */}
      <div className="flex-1 overflow-hidden p-3.5 flex flex-col">
        {activeTab === "lines" && (
          <LineList
            lines={filteredLines}
            searchQuery={searchQuery}
            focusedItem={focusedItem}
            onFocusItem={onFocusItem}
            onAddLine={() => onOpenAdd("line")}
            onEditLine={(l) => onOpenEdit(l, "line")}
            onDeleteLine={deleteLine}
          />
        )}

        {activeTab === "drains" && (
          <DrainList
            drains={filteredDrains}
            searchQuery={searchQuery}
            focusedItem={focusedItem}
            onFocusItem={onFocusItem}
            onAddDrain={() => onOpenAdd("drain")}
            onEditDrain={(d) => onOpenEdit(d, "drain")}
            onDeleteDrain={deleteDrain}
          />
        )}

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

        {activeTab === "summary" && (
          <ClinicalSummary
            profile={profile}
            conditions={patientData.conditions}
            surgeries={patientData.surgeries}
            medications={patientData.medications}
          />
        )}
      </div>
    </aside>
  );
}
