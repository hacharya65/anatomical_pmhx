import React from "react";
import {
  HeartPulse,
  Search,
  Edit3,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  X,
  HelpCircle,
  LogOut,
  Sparkles,
  Award,
  PanelRightClose,
  PanelRightOpen
} from "lucide-react";

export function Header({
  profile = {},
  searchQuery,
  onSearchChange,
  onSearchKeyDown,
  onOpenDemographics,
  onOpenHelp,
  onSignOut,
  user,
  syncStatus,
  isDemoMode,
  isSidebarOpen = true,
  onToggleSidebar
}) {
  return (
    <header className="h-16 px-5 flex items-center justify-between border-b shrink-0 z-30 shadow-xs select-none bg-white border-slate-200 text-slate-800">
      {/* 1. Branding: Logo, Title & Subtitle */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs border bg-teal-700 border-teal-800 text-white">
          <HeartPulse className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight leading-none text-slate-900">
              The Visual Medical History
            </h1>
          </div>
          <p className="text-[11px] font-bold tracking-wide uppercase mt-0.5 text-teal-700">
            A New Type of EMR
          </p>
        </div>
      </div>

      {/* 2. Patient Demographics Capsule & Expanded Global Search Hub */}
      <div className="hidden md:flex items-center gap-3.5 flex-1 mx-4">
        {/* Patient Card Capsule with direct Click & Edit functionality */}
        <div
          id="tour-patient-capsule"
          onClick={onOpenDemographics}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border text-xs shrink-0 cursor-pointer transition-all shadow-xs group bg-slate-50 border-slate-200 hover:border-teal-500 hover:bg-teal-50/40"
          title="Click to view or edit full Patient Information"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <UserCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="text-slate-900 group-hover:text-teal-800 transition-colors">
              {profile.name || "Elena Vance"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDemographics();
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-white border-slate-300 text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 transition-all"
            >
              <Edit3 className="w-2.5 h-2.5" />
              <span>Edit</span>
            </button>
          </div>
          <span className="text-slate-300">|</span>
          <div className="text-slate-600">
            Age <strong className="text-slate-900 font-bold">{profile.age || 58}</strong>
          </div>
          <span className="text-slate-300">|</span>
          <div className="font-mono text-teal-800 font-medium text-[11px]">{profile.mrn || "#PMHX-84920"}</div>
          {profile.allergies && (
            <>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Allergies</span>
              </div>
            </>
          )}
          {/* Veteran Status: Displays ONLY if individual is a veteran */}
          {(profile.veteranStatus === "Yes" ||
            profile.veteranStatus === "yes" ||
            profile.isVeteran === true ||
            (typeof profile.veteranStatus === "string" &&
              profile.veteranStatus.toLowerCase().includes("veteran"))) && (
            <>
              <span className="text-slate-300">|</span>
              <div
                className="flex items-center gap-1 text-indigo-700 font-bold text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200"
                title="Verified Military Veteran"
              >
                <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Veteran</span>
              </div>
            </>
          )}
        </div>

        {/* Expanded Global Clinical Search Bar */}
        <div id="tour-search-bar" className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search lines, drains, surgeries, conditions, medications, clinical notes..."
            className="w-full pl-10 pr-9 py-2 text-xs rounded-lg border focus:outline-none transition-all shadow-xs bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
              title="Clear search (Esc)"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Controls: Help & FAQ + Status + Sign Out */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Help & FAQ Center Button */}
        <button
          id="tour-help-button"
          type="button"
          onClick={onOpenHelp}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border shadow-xs transition-all bg-white border-slate-300 text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300"
          title="Clinical Help & FAQ (Shortcuts & Interactive Tour)"
          aria-label="Help and FAQ"
        >
          <HelpCircle className="w-4 h-4 text-teal-700" />
          <span className="hidden sm:inline">Help & FAQ</span>
        </button>

        {/* User / Demo Status Pill */}
        {user ? (
          <div
            className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800"
            title={`Connected to Supabase Cloud (${user.email})`}
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="font-mono text-[11px] truncate max-w-[140px]">{user.email}</span>
          </div>
        ) : isDemoMode ? (
          <div
            className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800"
            title="Active clinical demonstration session with Elena Vance"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-semibold text-[11px]">Demo Mode</span>
          </div>
        ) : null}

        {/* Toggle Sidebar Panel Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border shadow-xs transition-all ${
              isSidebarOpen
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                : "bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100"
            }`}
            title={isSidebarOpen ? "Collapse sidebar panel to center 3D avatar" : "Open patient records sidebar panel"}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <PanelRightClose className="w-4 h-4 text-slate-600" />
            ) : (
              <PanelRightOpen className="w-4 h-4 text-teal-700" />
            )}
            <span className="hidden xl:inline">{isSidebarOpen ? "Collapse Panel" : "Open Panel"}</span>
          </button>
        )}

        {/* Sign Out Button */}
        <button
          id="header-signout-button"
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-xs transition-all bg-white border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
          title={user ? `Signed in as ${user.email} • Click to Sign Out` : "Exit Demo Mode & Return to Login"}
          aria-label="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
