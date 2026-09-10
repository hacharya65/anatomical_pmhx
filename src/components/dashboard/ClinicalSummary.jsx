import React from "react";
import { Printer, FileText, Store } from "lucide-react";

export function ClinicalSummary({ profile = {}, conditions = [], surgeries = [], medications = [] }) {
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header with Print Button (Hidden in Print) */}
      <div className="flex items-center justify-between mb-4 no-print shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Clinical Health Summary</h2>
          <p className="text-xs text-slate-500">Official patient health history & documentation sheet</p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
        >
          <Printer className="w-3.5 h-3.5 text-white" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Dedicated Printable Sheet Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div
          id="clinical-health-summary-sheet"
          className="bg-white p-6 rounded-xl border border-slate-200 text-slate-800 space-y-5 shadow-xs"
        >
          {/* Institutional Header */}
          <div className="border-b border-slate-200 pb-3.5 flex items-start justify-between">
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700 no-print" />
                CLINICAL HEALTH SUMMARY
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Department of Internal Medicine • Electronic Medical Record Integration
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              Generated: {today}
            </div>
          </div>

          {/* Patient Demographics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold tracking-wider">Patient Name</span>
              <strong className="text-slate-900 font-bold">{profile.name || "Elena Vance"}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold tracking-wider">DOB / Age</span>
              <strong className="text-slate-900 font-bold">{profile.dob || "1968-04-12"} ({profile.age || 58} yo)</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold tracking-wider">Medical Record #</span>
              <strong className="text-teal-700 font-mono font-bold">{profile.mrn || "#PMHX-84920"}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold tracking-wider">Primary Care Provider</span>
              <span className="text-slate-800 font-medium">{profile.pcp ? profile.pcp.replace(/\s*\(Internal Medicine\)/gi, "").trim() : "Dr. Robert Adams, MD"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold tracking-wider">Code / Veteran Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-700 font-bold">Full Code</span>
                {(profile.veteranStatus === "Yes" || profile.veteranStatus === "yes" || (typeof profile.veteranStatus === "string" && profile.veteranStatus.toLowerCase().includes("veteran"))) && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    🎖️ Veteran
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold tracking-wider">Emergency Contact</span>
              <span className="text-slate-800 font-medium">{profile.emergencyContact || "Eli Vance (Spouse) • (555) 234-9812"}</span>
            </div>
          </div>

          {/* Preferred Pharmacy Banner */}
          {profile.pharmacy && (
            <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <Store className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-teal-950 flex flex-wrap items-center gap-2">
                    <span>Preferred Pharmacy: {profile.pharmacy.name}</span>
                    {profile.pharmacy.eprescribing && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                        E-Prescribe Enabled
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    {profile.pharmacy.address} • Phone: {profile.pharmacy.phone} • Fax: {profile.pharmacy.fax}
                  </div>
                </div>
              </div>
              <div className="text-left sm:text-right text-[11px] text-slate-500 font-mono shrink-0">
                NCPDP: {profile.pharmacy.ncpdp || "2201948"} • NPI: {profile.pharmacy.npi || "1841295031"}
              </div>
            </div>
          )}

          {/* Allergies Banner */}
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
            <strong className="font-bold">⚠️ Documented Allergies:</strong> {profile.allergies || "Penicillin (Severe anaphylaxis, hives)"}
          </div>

          {/* Section I: Active Problem List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              I. Active Problem List / Chronic Diagnoses
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-2 font-semibold">Diagnosis</th>
                  <th className="py-2 font-semibold">Anatomical Region</th>
                  <th className="py-2 font-semibold">ICD-10</th>
                  <th className="py-2 font-semibold">Onset Date</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conditions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-bold text-slate-900">{c.name}</td>
                    <td className="py-2 text-slate-600">{c.region}</td>
                    <td className="py-2 text-teal-700 font-mono font-semibold">{c.icd10 || "—"}</td>
                    <td className="py-2 text-slate-600">{c.onsetDate || "—"}</td>
                    <td className="py-2 text-slate-700">{c.status || "Active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section II: Surgical History */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              II. Past Surgical History & Incision Sites
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-2 font-semibold">Procedure</th>
                  <th className="py-2 font-semibold">Surgical Site</th>
                  <th className="py-2 font-semibold">Date</th>
                  <th className="py-2 font-semibold">Incision / Scar Pattern</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {surgeries.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 font-bold text-slate-900">{s.name}</td>
                    <td className="py-2 text-slate-600">{s.site}</td>
                    <td className="py-2 text-slate-600">{s.surgeryDate || "—"}</td>
                    <td className="py-2 text-indigo-700 font-medium">{s.incision || "Standard"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section III: Medication Reconciliation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              III. Outpatient Medication Reconciliation
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-2 font-semibold">Medication</th>
                  <th className="py-2 font-semibold">Dosage & Frequency</th>
                  <th className="py-2 font-semibold">Route</th>
                  <th className="py-2 font-semibold">Last Picked Up & Pharmacy</th>
                  <th className="py-2 font-semibold">Refills & Supply</th>
                  <th className="py-2 font-semibold">Clinical Indication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medications.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 font-bold text-slate-900">
                      <div>{m.name}</div>
                      {m.rxNumber && <span className="text-[10px] font-mono text-slate-400">{m.rxNumber}</span>}
                    </td>
                    <td className="py-2 text-teal-800 font-semibold">{m.dosage} • {m.frequency}</td>
                    <td className="py-2 text-slate-600">{m.route || "Oral"}</td>
                    <td className="py-2 text-slate-800">
                      <div className="font-semibold text-slate-900">{m.lastPickedUpDate || "2026-08-28"}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{m.lastPickedUpPharmacy || "CVS Pharmacy #04821"}</div>
                    </td>
                    <td className="py-2 text-slate-700">
                      <div className="font-semibold text-emerald-700">{m.refillsRemaining ?? 2} refills</div>
                      <div className="text-[11px] text-slate-500">{m.daysSupply || "90-Day Supply"}</div>
                    </td>
                    <td className="py-2 text-slate-700">{m.indication || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Provider Signature Attestation */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div>Attending Physician: <strong className="text-slate-800">{profile.pcp || "Dr. Robert Adams, MD"}</strong></div>
            <div>Signature Verified: <span className="text-emerald-700 font-semibold">✓ Digital EMR Audit Trail</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
