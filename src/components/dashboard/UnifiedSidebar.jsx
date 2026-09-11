import React, { useState } from "react";
import { LineList } from "./LineList";
import { DrainList } from "./DrainList";
import { SurgeryList } from "./SurgeryList";
import { ConditionList } from "./ConditionList";
import { MedicationList } from "./MedicationList";
import { ProcedureList } from "./ProcedureList";
import { VaccineList } from "./VaccineList";
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
  filteredProcedures = [],
  filteredVaccinations = [],
  focusedItem,
  onFocusItem,
  onFocusOrgan,
  onOpenAdd,
  onOpenEdit,
  deleteLine,
  deleteDrain,
  deleteSurgery,
  deleteCondition,
  deleteMedication,
  deleteProcedure,
  deleteVaccination,
  onToggleSidebar
}) {
  const { profile } = patientData;
  const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0);
  const [linesDrainsFilter, setLinesDrainsFilter] = useState("all"); // "all" | "lines" | "drains"

  // 7 Streamlined Navigation Tabs:
  // 1. Summary
  // 2. Medical History
  // 3. Surgical History
  // 4. Medications
  // 5. Procedures (Diagnostic & Screenings)
  // 6. Vaccines (Immunizations)
  // 7. Lines & Drains
  const tabs = [
    { key: "summary", label: "Summary", lines: ["Summary"] },
    {
      key: "conditions",
      label: "Medical History",
      lines: ["Medical", "History"]
    },
    {
      key: "surgeries",
      label: "Surgical History",
      lines: ["Surgical", "History"]
    },
    { key: "medications", label: "Medications", lines: ["Medications"] },
    {
      key: "procedures",
      label: "Procedures",
      lines: ["Procedures"]
    },
    {
      key: "vaccines",
      label: "Vaccines",
      lines: ["Vaccines"]
    },
    {
      key: "lines_drains",
      label: "Lines & Drains",
      lines: ["Lines &", "Drains"]
    }
  ];

  return (
    <aside
      id="tour-unified-sidebar"
      className="w-full lg:w-[600px] xl:w-[640px] h-full flex flex-col border-l shadow-xl z-20 select-none bg-white border-slate-200 text-slate-800 transition-all"
    >
      {/* 1. Unified Navigation Tabs across top of sidebar */}
      <div id="tour-sidebar-tabs" className="border-b px-2 pt-1.5 min-h-[52px] flex items-stretch justify-between gap-1 bg-slate-50 border-slate-200">
        <div className="flex items-stretch gap-1.5 flex-1 min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`flex-1 min-w-0 py-2 px-1 text-[11px] xl:text-xs font-semibold rounded-t-lg transition-all flex items-center justify-center border-b-2 cursor-pointer select-none ${
                  isActive
                    ? "text-teal-900 border-teal-700 bg-white shadow-xs font-bold"
                    : "text-slate-600 border-transparent hover:text-teal-950 hover:bg-slate-200/75 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col items-center justify-center leading-[1.2] text-center shrink-0">
                  {tab.lines.map((lineText, idx) => (
                    <span key={idx} className="whitespace-nowrap tracking-tight">
                      {lineText}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
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

        {/* Medical History Tab */}
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

        {/* Diagnostic Procedures Tab */}
        {activeTab === "procedures" && (
          <ProcedureList
            procedures={filteredProcedures}
            searchQuery={searchQuery}
            focusedItem={focusedItem}
            onFocusItem={onFocusItem}
            onAddProcedure={() => onOpenAdd("procedure")}
            onEditProcedure={(p) => onOpenEdit(p, "procedure")}
            onDeleteProcedure={deleteProcedure}
          />
        )}

        {/* Immunizations & Vaccines Tab */}
        {activeTab === "vaccines" && (
          <VaccineList
            vaccinations={filteredVaccinations}
            searchQuery={searchQuery}
            onAddVaccination={(v) => onOpenAdd("vaccine", v)}
            onEditVaccination={(v) => onOpenEdit(v, "vaccine")}
            onDeleteVaccination={deleteVaccination}
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
