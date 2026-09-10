import React from "react";
import {
  Activity,
  Scissors,
  Pill,
  FileText,
  Search,
  Sliders,
  Cloud,
  CloudOff,
  RefreshCw,
  Sun,
  Moon
} from "lucide-react";

export function Sidebar({
  activeTab,
  onTabChange,
  patientData,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onOpenDemographics,
  onOpenAuth,
  user,
  syncStatus,
  theme = "light",
  onToggleTheme
}) {
  const { profile, conditions, surgeries, medications } = patientData;
  const isLight = theme === "light";

  return (
    <aside
      className={`w-full lg:w-[460px] h-full flex flex-col border-l shadow-2xl z-20 transition-colors ${
        isLight
          ? "bg-white/95 border-slate-200 text-slate-800"
          : "bg-slate-950/90 border-slate-800/80 text-slate-100"
      }`}
    >
      {/* Patient Profile & Controls Header */}
      <div className={`p-4 border-b ${isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-900/40 border-slate-800"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                isLight
                  ? "bg-teal-700 text-white"
                  : "bg-gradient-to-br from-sky-500/20 to-teal-500/20 border border-sky-500/30 text-sky-400"
              }`}
            >
              {profile.name ? profile.name[0] : "P"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight">{profile.name}</h1>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isLight ? "bg-white text-slate-600 border-slate-300" : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {profile.mrn}
                </span>
              </div>
              <div className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                DOB: {profile.dob} • Age: {profile.age} yo
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle (Epic Clinical Light vs Dark Studio) */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-1.5 rounded-lg border text-xs transition-all ${
                isLight
                  ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title={isLight ? "Switch to Dark Studio" : "Switch to Epic Clinical Light"}
            >
              {isLight ? <Moon className="w-3.5 h-3.5 text-slate-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            {/* Avatar & Demographics Customize Button */}
            <button
              type="button"
              onClick={onOpenDemographics}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border shadow-sm transition-all ${
                isLight
                  ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title="Personal Information & Avatar Morph"
            >
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Avatar</span>
            </button>

            {/* Cloud Sync Button */}
            <button
              type="button"
              onClick={onOpenAuth}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border shadow-sm transition-all ${
                user
                  ? "bg-emerald-500/10 border-emerald-600/30 text-emerald-700"
                  : isLight
                  ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title={user ? `Signed in as ${user.email}` : "Connect Supabase Account"}
            >
              {syncStatus === "syncing" ? (
                <RefreshCw className="w-3.5 h-3.5 text-sky-500 animate-spin" />
              ) : user ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">{user ? "Synced" : "Sync"}</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search lines, drains, surgeries, conditions..."
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none transition-all ${
              isLight
                ? "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-teal-600"
                : "bg-slate-900/80 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-sky-500"
            }`}
          />
        </div>

        {/* Filter Chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] uppercase tracking-wider font-semibold mr-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Filter:
          </span>
          {[
            { key: "all", label: "All Pins" },
            { key: "lines", label: "Lines" },
            { key: "drains", label: "Drains" },
            { key: "surgeries", label: "Surgeries" },
            { key: "conditions", label: "Conditions" }
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onFilterChange(chip.key)}
              className={`text-[11px] px-2.5 py-0.5 rounded-full transition-all border ${
                activeFilter === chip.key
                  ? isLight
                    ? "bg-teal-700 text-white border-teal-700 font-semibold"
                    : "bg-sky-500/20 text-sky-300 border-sky-500 font-semibold"
                  : isLight
                  ? "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  : "bg-slate-800/40 text-slate-400 border-slate-800 hover:text-slate-300"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b px-2 pt-1 gap-0.5 overflow-x-auto ${isLight ? "bg-slate-100/70 border-slate-200" : "bg-slate-900/30 border-slate-800"}`}>
        {[
          { key: "lines", label: "Lines", count: (patientData.lines || []).length },
          { key: "drains", label: "Drains", count: (patientData.drains || []).length },
          { key: "surgeries", label: "Surgeries", count: surgeries.length },
          { key: "conditions", label: "Conditions", count: conditions.length },
          { key: "medications", label: "Meds", count: medications.length },
          { key: "summary", label: "Summary" }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`py-2 px-2.5 text-xs font-medium rounded-t-lg transition-all flex items-center justify-center gap-1 border-b-2 whitespace-nowrap ${
                isActive
                  ? isLight
                    ? "text-teal-800 border-teal-700 bg-white font-bold shadow-sm"
                    : "text-sky-400 border-sky-500 bg-slate-900/60 font-semibold"
                  : isLight
                  ? "text-slate-600 border-transparent hover:text-slate-900"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive
                      ? isLight
                        ? "bg-teal-100 text-teal-800"
                        : "bg-sky-500/20 text-sky-300"
                      : isLight
                      ? "bg-slate-200 text-slate-600"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
