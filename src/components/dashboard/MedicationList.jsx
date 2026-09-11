import React from "react";
import { Plus, Pill, Eye, Edit2, Trash2, AlertCircle, Calendar, MapPin, Building, Clock } from "lucide-react";
import { getMedicationBottleCoords } from "../3d/MedicationShelf";

function formatPickupSummary(dateStr) {
  if (!dateStr) return { formatted: "Aug 28, 2026", daysAgoText: "13d ago" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { formatted: dateStr, daysAgoText: null };
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatted = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const now = new Date();
  const diffDays = Math.round((now - d) / (1000 * 60 * 60 * 24));
  const daysAgoText = diffDays <= 0 ? "today" : diffDays === 1 ? "yesterday" : `${diffDays}d ago`;
  return { formatted, daysAgoText };
}

export function MedicationList({
  medications = [],
  searchQuery = "",
  focusedItem,
  onFocusItem,
  onFocusOrgan,
  onAddMedication,
  onEditMedication,
  onDeleteMedication
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header Pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-teal-700/10 text-teal-800 text-xs font-bold px-2.5 py-1 rounded-md border border-teal-700/20">
            Active Patient Prescriptions (Rx)
          </div>
        </div>
        <button
          type="button"
          onClick={onAddMedication}
          className="flex items-center gap-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Med</span>
        </button>
      </div>

      {/* Medication Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {medications.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-lg">
            <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {searchQuery ? `No medications matching "${searchQuery}"` : "No active medications recorded"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {searchQuery ? "Try searching by generic name, brand name, indication, or class." : "Add prescriptions to display pharmacy bottles on the 3D shelf."}
            </p>
          </div>
        ) : (
          medications.map((med, index) => {
            const isFocused = focusedItem?.id === med.id;
            const bottleCoords = getMedicationBottleCoords(index, medications.length);

            return (
              <div
                key={med.id}
                onClick={() => {
                  if (onFocusItem) {
                    onFocusItem({
                      ...med,
                      itemType: "medication",
                      coords: bottleCoords
                    });
                  } else if (onFocusOrgan && med.system) {
                    onFocusOrgan(med.system, med.name);
                  }
                }}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                  isFocused
                    ? "bg-teal-50/70 border-teal-500 shadow-sm ring-1 ring-teal-500"
                    : "bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                        <Pill className="w-3.5 h-3.5 text-teal-600" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                        {med.name}
                      </h3>
                    </div>
                    <div className="text-[11px] font-semibold text-teal-700 mt-1 pl-8">
                      {med.dosage} • {med.frequency}
                    </div>
                  </div>

                  {med.route && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {med.route}
                    </span>
                  )}
                </div>

                {/* Indication & Target System Link */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] truncate max-w-[210px]">
                    Indication: <strong className="text-slate-800">{med.indication || "Unspecified"}</strong>
                  </span>
                  {med.system && (
                    <span className="capitalize text-[10px] font-medium text-teal-800 bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 rounded">
                      {med.system.replace("_", " ")}
                    </span>
                  )}
                </div>

                {/* Dispensing History & Last Picked Up Section */}
                {(() => {
                  const pickupInfo = formatPickupSummary(med.lastPickedUpDate);
                  return (
                    <div className="mt-2 p-2 rounded-lg bg-teal-50/50 border border-teal-100 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Calendar className="w-3 h-3 text-teal-700 shrink-0" />
                          <span>Last Picked Up: <strong className="text-teal-950 font-bold">{pickupInfo.formatted}</strong></span>
                        </span>
                        {pickupInfo.daysAgoText && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200">
                            {pickupInfo.daysAgoText}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-600 pt-0.5">
                        <span className="flex items-center gap-1 truncate max-w-[220px]">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{med.lastPickedUpPharmacy || "CVS Pharmacy #04821 (Cambridge, MA)"}</span>
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 shrink-0">
                          {med.refillsRemaining !== undefined ? `${med.refillsRemaining} refills left` : "2 refills"}
                        </span>
                      </div>

                      {med.daysSupply && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5 border-t border-teal-100/60">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span>{med.daysSupply}</span>
                          {med.rxNumber && <span className="text-slate-400">• {med.rxNumber}</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Prescriber / Instructions */}
                {med.prescriber && (
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    Prescriber: {med.prescriber}
                  </div>
                )}

                {/* Card Actions */}
                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-teal-600 font-medium flex items-center gap-1 group-hover:underline">
                    <Eye className="w-3 h-3" />
                    <span>Focus Bottle & Organ</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMedication(med);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-all"
                      title="Edit Prescription"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMedication(med.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all"
                      title="Delete Prescription"
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
