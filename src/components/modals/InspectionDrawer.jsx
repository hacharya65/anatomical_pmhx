import React, { useState, useEffect } from "react";
import {
  X,
  Scissors,
  Activity,
  MapPin,
  Calendar,
  User,
  Building,
  Store,
  BookOpen,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { getConditionEducation } from "../../services/medline.js";

export function InspectionDrawer({
  focusedItem,
  onClose,
  onEdit
}) {
  const [education, setEducation] = useState(null);
  const [loadingEdu, setLoadingEdu] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (focusedItem && !focusedItem.dosage && !focusedItem.incision) {
      setLoadingEdu(true);
      setEducation(null);
      getConditionEducation(focusedItem.icd10 || "", focusedItem.name || "")
        .then((res) => {
          if (isMounted) {
            setEducation(res);
            setLoadingEdu(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoadingEdu(false);
          }
        });
    } else {
      setEducation(null);
      setLoadingEdu(false);
    }
    return () => {
      isMounted = false;
    };
  }, [focusedItem]);

  if (!focusedItem) return null;

  const isMedication = focusedItem.itemType === "medication" || !!focusedItem.dosage;
  const isSurgery = !isMedication && (focusedItem.itemType === "surgery" || !!focusedItem.site);
  const isLine = !isMedication && focusedItem.name && focusedItem.name.toLowerCase().includes("line");

  let badgeColor = isMedication
    ? "text-teal-800 bg-teal-50 border-teal-600"
    : isLine
    ? "text-emerald-700 bg-emerald-50 border-emerald-600"
    : isSurgery
    ? "text-indigo-700 bg-indigo-50 border-indigo-600"
    : "text-amber-700 bg-amber-50 border-amber-600";

  let badgeLabel = isMedication
    ? "Prescription Medication (Rx)"
    : isLine
    ? "Intravenous / Arterial Line"
    : isSurgery
    ? "Drain / Surgical Site"
    : "Chronic Diagnosis";

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 shadow-2xl z-50 flex flex-col border-l animate-in slide-in-from-right duration-300 bg-white text-slate-800 border-slate-200">
      {/* Drawer Header */}
      <div className="p-3.5 border-b flex items-center justify-between bg-slate-50 border-slate-200">
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
          {badgeLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Title & Badges */}
        <div>
          <h2 className="text-base font-bold leading-snug text-slate-900">{focusedItem.name}</h2>
          
          {isMedication ? (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md border bg-teal-50 text-teal-800 border-teal-200">
                {focusedItem.dosage} • {focusedItem.frequency}
              </span>
              {focusedItem.route && (
                <span className="text-xs font-medium px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                  {focusedItem.route}
                </span>
              )}
              {focusedItem.system && (
                <span className="text-[11px] font-medium capitalize px-2 py-0.5 rounded border bg-teal-50/60 text-teal-700 border-teal-200">
                  Target: {focusedItem.system.replace("_", " ")}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border bg-teal-50 text-teal-800 border-teal-200 font-medium">
                <MapPin className="w-3 h-3 text-teal-600" />
                {focusedItem.region || focusedItem.site || "Anatomical Site"}
              </span>
              {focusedItem.icd10 && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                  ICD-10: {focusedItem.icd10}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Authoritative MedlinePlus Clinical Education Card */}
        {!isMedication && !isSurgery && (loadingEdu || education) && (
          <div className="p-3.5 rounded-xl border bg-gradient-to-br from-teal-50/70 to-slate-50 border-teal-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                <span>NIH MedlinePlus Overview</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100/80 text-teal-800 border border-teal-300/60 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-700" />
                Verified Clinical Source
              </span>
            </div>

            {loadingEdu ? (
              <div className="space-y-2 py-2 animate-pulse">
                <div className="h-3.5 bg-teal-200/50 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
              </div>
            ) : education ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900">
                  {education.title}
                </div>

                {education.keyPoints && education.keyPoints.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {education.keyPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-1.5 border-t border-teal-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    National Library of Medicine
                  </span>
                  {education.sourceUrl && (
                    <a
                      href={education.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold hover:underline"
                    >
                      <span>Read Patient Guide</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Surgical Incision Details */}
        {isSurgery && focusedItem.incision && (
          <div className="p-3 rounded-lg border space-y-1 bg-indigo-50/60 border-indigo-200 text-indigo-950">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <Scissors className="w-3.5 h-3.5 text-indigo-600" />
              <span>Incision / Scar Geometry</span>
            </div>
            <p className="text-xs pl-5 text-slate-700">{focusedItem.incision}</p>
          </div>
        )}

        {/* Medication Indication & Patient Instructions */}
        {isMedication && (
          <div className="space-y-3">
            {focusedItem.indication && (
              <div className="p-3 rounded-lg border bg-teal-50/50 border-teal-200 text-teal-950">
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-1">
                  Clinical Indication
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {focusedItem.indication}
                </p>
              </div>
            )}

            {focusedItem.instructions && (
              <div className="p-3 rounded-lg border bg-amber-50/50 border-amber-200 text-amber-950">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                  Patient Administration Instructions
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {focusedItem.instructions}
                </p>
              </div>
            )}

            {/* Dispensing & Pharmacy History */}
            <div className="p-3 rounded-lg border bg-emerald-50/60 border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Dispensing Pharmacy & Refill Status</span>
                </div>
                {focusedItem.rxNumber && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                    {focusedItem.rxNumber}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-100 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Last Picked Up</span>
                  <span className="font-semibold text-slate-900">
                    {focusedItem.lastPickedUpDate || "2026-08-28"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Dispensing Pharmacy</span>
                  <span className="font-semibold text-slate-900 truncate block" title={focusedItem.lastPickedUpPharmacy || "CVS Pharmacy #04821"}>
                    {focusedItem.lastPickedUpPharmacy || "CVS Pharmacy #04821"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Refills Remaining</span>
                  <span className="font-bold text-emerald-700">
                    {focusedItem.refillsRemaining ?? 2} refills
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Quantity / Supply</span>
                  <span className="font-medium text-slate-700">
                    {focusedItem.daysSupply || "90-Day Supply"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clinical History & Provider Details */}
        <div className="space-y-2.5 text-xs">
          {(focusedItem.onsetDate || focusedItem.surgeryDate || focusedItem.startDate) && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500">
                  {isMedication ? "Start / Prescription Date: " : "Placement / Onset: "}
                </span>
                <span className="font-semibold text-slate-800">
                  {focusedItem.startDate || focusedItem.onsetDate || focusedItem.surgeryDate}
                </span>
              </div>
            </div>
          )}

          {(focusedItem.provider || focusedItem.surgeon || focusedItem.prescriber) && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500">
                  {isMedication ? "Prescribing Physician: " : "Attending / Surgeon: "}
                </span>
                <span className="font-semibold text-slate-800">
                  {focusedItem.prescriber || focusedItem.provider || focusedItem.surgeon}
                </span>
              </div>
            </div>
          )}

          {focusedItem.hospital && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500">Facility: </span>
                <span className="font-semibold text-slate-800">{focusedItem.hospital}</span>
              </div>
            </div>
          )}

          {focusedItem.status && (
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500">Clinical Status: </span>
                <span className="text-emerald-700 font-bold">{focusedItem.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Clinical Notes */}
        {focusedItem.notes && (
          <div className="p-3 rounded-lg border space-y-1 bg-slate-50 border-slate-200 text-slate-700">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Clinical Documentation
            </div>
            <p className="text-xs leading-relaxed italic text-slate-700">
              "{focusedItem.notes}"
            </p>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-3.5 border-t flex items-center justify-between bg-slate-50 border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all"
        >
          Close Detail
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(focusedItem);
            }}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-all"
          >
            Edit Record
          </button>
        )}
      </div>
    </div>
  );
}
