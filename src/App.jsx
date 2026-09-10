import React, { useState, useMemo, useEffect } from "react";
import { Scene } from "./components/3d/Scene";
import { Header } from "./components/layout/Header";
import { UnifiedSidebar } from "./components/dashboard/UnifiedSidebar";
import { DemographicModal } from "./components/modals/DemographicModal";
import { AuthModal } from "./components/modals/AuthModal";
import { AddEditItemModal } from "./components/modals/AddEditItemModal";
import { HelpModal } from "./components/modals/HelpModal";
import { GuidedTour } from "./components/modals/GuidedTour";
import { usePatientData } from "./hooks/usePatientData";
import { isItemRelevantForPerspective } from "./lib/clinicalCatalog";
import { LoginView } from "./components/auth/LoginView";
import { supabase } from "./lib/supabase";
import { PanelRightOpen } from "lucide-react";

export default function App() {
  const {
    patientData,
    user,
    authLoading,
    syncStatus,
    updateProfile,
    addAllergy,
    updateAllergy,
    deleteAllergy,
    addCondition,
    updateCondition,
    deleteCondition,
    addSurgery,
    updateSurgery,
    deleteSurgery,
    addDrain,
    updateDrain,
    deleteDrain,
    addLine,
    updateLine,
    deleteLine,
    addMedication,
    updateMedication,
    deleteMedication
  } = usePatientData();

  // Navigation & 3D interaction state
  // Default to "summary" (opens with the Clinical Summary first!)
  const [activeTab, setActiveTab] = useState("summary");
  const [perspective, setPerspective] = useState("anterior");
  const [focusedItem, setFocusedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Demo mode state: allows bypassing login to view Elena Vance immediately
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem("pmhx_demo_mode") === "true";
  });

  const handleSignOut = async () => {
    localStorage.removeItem("pmhx_demo_mode");
    setIsDemoMode(false);
    if (user) {
      await supabase.auth.signOut();
    }
  };

  // Permanent Light Clinical Mode: clean up any legacy dark class
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("pmhx_theme");
  }, []);

  // Keyboard shortcut: Alt+Shift+N to add new LDA
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        handleOpenAdd("line");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Modals state
  const [isDemographicsOpen, setIsDemographicsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [modalItemState, setModalItemState] = useState({
    isOpen: false,
    type: "line",
    item: null
  });

  // Launch guided walkthrough for first-time visitors or after login
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("has_seen_onboarding_tour");
    const isSuppressed = localStorage.getItem("suppress_onboarding_tour");
    if (!hasSeenTour && !isSuppressed) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, []);

  // Global shortcut '?' to open Clinical Help & FAQ
  useEffect(() => {
    const handleHelpKey = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsHelpOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleHelpKey);
    return () => window.removeEventListener("keydown", handleHelpKey);
  }, []);

  // Filtered lists based on search query (searching across all clinical fields)
  const filteredLines = useMemo(() => {
    const lines = patientData.lines || [];
    if (!searchQuery) return lines;
    const q = searchQuery.toLowerCase().trim();
    return lines.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.site && l.site.toLowerCase().includes(q)) ||
        (l.lineType && l.lineType.toLowerCase().includes(q)) ||
        (l.hospital && l.hospital.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
    );
  }, [patientData.lines, searchQuery]);

  const filteredDrains = useMemo(() => {
    const drains = patientData.drains || [];
    if (!searchQuery) return drains;
    const q = searchQuery.toLowerCase().trim();
    return drains.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.site && d.site.toLowerCase().includes(q)) ||
        (d.drainType && d.drainType.toLowerCase().includes(q)) ||
        (d.hospital && d.hospital.toLowerCase().includes(q)) ||
        (d.surgeon && d.surgeon.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q))
    );
  }, [patientData.drains, searchQuery]);

  const filteredSurgeries = useMemo(() => {
    const surgs = patientData.surgeries || [];
    if (!searchQuery) return surgs;
    const q = searchQuery.toLowerCase().trim();
    return surgs.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.site && s.site.toLowerCase().includes(q)) ||
        (s.incision && s.incision.toLowerCase().includes(q)) ||
        (s.hospital && s.hospital.toLowerCase().includes(q)) ||
        (s.surgeon && s.surgeon.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.system && s.system.toLowerCase().includes(q))
    );
  }, [patientData.surgeries, searchQuery]);

  const filteredConditions = useMemo(() => {
    const conds = patientData.conditions || [];
    if (!searchQuery) return conds;
    const q = searchQuery.toLowerCase().trim();
    return conds.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.region && c.region.toLowerCase().includes(q)) ||
        (c.icd10 && c.icd10.toLowerCase().includes(q)) ||
        (c.status && c.status.toLowerCase().includes(q)) ||
        (c.provider && c.provider.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.system && c.system.toLowerCase().includes(q))
    );
  }, [patientData.conditions, searchQuery]);

  const filteredMedications = useMemo(() => {
    const meds = patientData.medications || [];
    if (!searchQuery) return meds;
    const q = searchQuery.toLowerCase().trim();
    return meds.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.indication && m.indication.toLowerCase().includes(q)) ||
        (m.dosage && m.dosage.toLowerCase().includes(q)) ||
        (m.route && m.route.toLowerCase().includes(q)) ||
        (m.frequency && m.frequency.toLowerCase().includes(q)) ||
        (m.prescriber && m.prescriber.toLowerCase().includes(q)) ||
        (m.system && m.system.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q))
    );
  }, [patientData.medications, searchQuery]);

  // Aggregate all matches across categories
  const allMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return [
      ...filteredLines.map((l) => ({ ...l, tabKey: "lines", itemType: "line" })),
      ...filteredDrains.map((d) => ({ ...d, tabKey: "drains", itemType: "drain" })),
      ...filteredSurgeries.map((s) => ({ ...s, tabKey: "surgeries", itemType: "surgery" })),
      ...filteredConditions.map((c) => ({ ...c, tabKey: "conditions", itemType: "condition" })),
      ...filteredMedications.map((m) => ({ ...m, tabKey: "medications", itemType: "medication" }))
    ];
  }, [searchQuery, filteredLines, filteredDrains, filteredSurgeries, filteredConditions, filteredMedications]);

  // Automatic Tab Switching on Search:
  // When searching, automatically jump to the tab containing the matched item
  // (e.g. searching "cholecystectomy" while on "lines" automatically moves over to "surgeries")
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const tabCounts = {
      summary: 0,
      conditions: filteredConditions.length,
      surgeries: filteredSurgeries.length,
      medications: filteredMedications.length,
      lines_drains: filteredLines.length + filteredDrains.length
    };

    // If current active tab already contains matches, keep the user on their current tab
    if (tabCounts[activeTab] > 0) {
      return;
    }

    // Otherwise, find the tab that contains the matched item(s)
    const tabOrder = ["conditions", "surgeries", "medications", "lines_drains"];
    let bestTab = null;
    let maxCount = 0;

    for (const tabKey of tabOrder) {
      if (tabCounts[tabKey] > maxCount) {
        maxCount = tabCounts[tabKey];
        bestTab = tabKey;
      }
    }

    if (bestTab && bestTab !== activeTab) {
      setActiveTab(bestTab);
    }

    // If all matching items are on one anatomical perspective, auto-orient the avatar
    if (allMatches.length > 0) {
      const allPosterior = allMatches.every((item) => isItemRelevantForPerspective(item, "posterior"));
      const allAnterior = allMatches.every((item) => isItemRelevantForPerspective(item, "anterior"));
      if (allPosterior && !allAnterior) {
        setPerspective("posterior");
      } else if (allAnterior && !allPosterior) {
        setPerspective("anterior");
      }
    }
  }, [searchQuery, filteredLines, filteredDrains, filteredSurgeries, filteredConditions, filteredMedications, allMatches, activeTab]);

  // Keyboard navigation for global search bar
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      if (allMatches.length > 0) {
        handleFocusItem(allMatches[0]);
      }
    } else if (e.key === "Escape") {
      setSearchQuery("");
    }
  };

  // Focus item with auto-perspective switching
  const handleFocusItem = (item) => {
    setFocusedItem(item);
    if (isItemRelevantForPerspective(item, "posterior")) {
      setPerspective("posterior");
    } else if (isItemRelevantForPerspective(item, "anterior")) {
      setPerspective("anterior");
    }
  };

  // Focus organ from medication
  const handleFocusOrgan = (system, medName) => {
    const organCoords = {
      cardiac: { x: 0.35, y: 4.2, z: 0.9, name: `Cardiovascular System (${medName})`, system: "cardiac" },
      endocrine: { x: 0.1, y: 2.7, z: 0.8, name: `Endocrine Pancreas (${medName})`, system: "endocrine" },
      orthopedic_knee: { x: -0.75, y: -4.7, z: 0.82, name: `Right Knee Joint (${medName})`, system: "orthopedic_knee" },
      orthopedic_hip: { x: 1.35, y: 0.5, z: 0.4, name: `Left Hip Joint (${medName})`, system: "orthopedic_hip" },
      respiratory: { x: -0.5, y: 4.5, z: 1.0, name: `Pulmonary System (${medName})`, system: "respiratory" },
      digestive: { x: 0.15, y: 3.4, z: 1.0, name: `Upper GI Tract (${medName})`, system: "digestive" },
      renal: { x: 0.8, y: 2.6, z: -0.9, isPosterior: true, name: `Renal Cortex (${medName})`, system: "renal" },
      spine: { x: 0.0, y: 2.15, z: -0.95, isPosterior: true, name: `Lumbar Spine & Hardware (${medName})`, system: "spine" },
      neurologic: { x: 0.0, y: 8.0, z: 0.7, name: `Central Nervous System (${medName})`, system: "neurologic" }
    };

    const target = organCoords[system] || { x: 0, y: 3.5, z: 1.0, name: medName, system };
    setFocusedItem(target);
    if (isItemRelevantForPerspective(target, "posterior")) {
      setPerspective("posterior");
    } else {
      setPerspective("anterior");
    }
  };

  const handleResetFocus = () => {
    setFocusedItem(null);
  };

  // Add / Edit handlers
  const handleOpenAdd = (type = "line") => {
    setModalItemState({ isOpen: true, type, item: null });
  };

  const handleOpenEdit = (item, type) => {
    setModalItemState({ isOpen: true, type, item });
  };

  const handleSaveModalItem = (itemData) => {
    const { type, item } = modalItemState;
    if (type === "line") {
      if (item) updateLine(item.id, itemData);
      else addLine(itemData);
    } else if (type === "drain") {
      if (item) updateDrain(item.id, itemData);
      else addDrain(itemData);
    } else if (type === "surgery") {
      if (item) updateSurgery(item.id, itemData);
      else addSurgery(itemData);
    } else if (type === "condition") {
      if (item) updateCondition(item.id, itemData);
      else addCondition(itemData);
    } else if (type === "medication") {
      if (item) updateMedication(item.id, itemData);
      else addMedication(itemData);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700 select-none">
        <div className="w-9 h-9 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading Clinical EMR Workstation...</p>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return (
      <LoginView
        onDemoAccess={() => {
          localStorage.setItem("pmhx_demo_mode", "true");
          setIsDemoMode(true);
        }}
        onLoginSuccess={() => {
          // supabase auth listener updates user state
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[#f0f5f4] text-slate-800">
      {/* 1. Epic-Style Healthcare Navigation Header */}
      <Header
        profile={patientData.profile}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchKeyDown={handleSearchKeyDown}
        onOpenDemographics={() => setIsDemographicsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onSignOut={handleSignOut}
        user={user}
        syncStatus={syncStatus}
        isDemoMode={isDemoMode}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      {/* 2. Main Clinical Workstation: 3D Scene (Left) + Unified Sidebar (Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D Scene Viewport (Main Canvas - Centers automatically when sidebar is closed) */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-100/50">
          {/* Floating button to reopen sidebar when collapsed */}
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-300 shadow-lg text-slate-800 hover:text-teal-700 hover:border-teal-500 font-bold text-xs transition-all animate-in fade-in group"
              title="Open patient records & clinical sidebar"
              aria-label="Open sidebar"
            >
              <PanelRightOpen className="w-4 h-4 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
              <span>Open Patient Panel</span>
            </button>
          )}

          <Scene
            profile={patientData.profile}
            conditions={filteredConditions}
            surgeries={filteredSurgeries}
            drains={filteredDrains}
            lines={filteredLines}
            medications={filteredMedications}
            focusedItem={focusedItem}
            perspective={perspective}
            hideMarkers={isDemographicsOpen}
            onSelectItem={handleFocusItem}
            onResetFocus={handleResetFocus}
            onEditItem={(item) => {
              const itemCat = item.category || item.itemType || (item.dosage ? "medication" : "condition");
              handleOpenEdit(item, itemCat);
            }}
            onPerspectiveChange={setPerspective}
            onAddNewLDA={() => handleOpenAdd("line")}
          />
        </main>

        {/* Unified Right Sidebar: Conditionally rendered with close function */}
        {isSidebarOpen && (
          <UnifiedSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onToggleSidebar={() => setIsSidebarOpen(false)}
            searchQuery={searchQuery}
            patientData={patientData}
            filteredLines={filteredLines}
            filteredDrains={filteredDrains}
            filteredSurgeries={filteredSurgeries}
            filteredConditions={filteredConditions}
            filteredMedications={filteredMedications}
            focusedItem={focusedItem}
            onFocusItem={handleFocusItem}
            onFocusOrgan={handleFocusOrgan}
            onOpenAdd={handleOpenAdd}
            onOpenEdit={handleOpenEdit}
            deleteLine={deleteLine}
            deleteDrain={deleteDrain}
            deleteSurgery={deleteSurgery}
            deleteCondition={deleteCondition}
            deleteMedication={deleteMedication}
          />
        )}
      </div>

      {/* Modals */}
      <DemographicModal
        isOpen={isDemographicsOpen}
        onClose={() => setIsDemographicsOpen(false)}
        profile={patientData.profile}
        allergiesList={patientData.allergiesList || []}
        onSaveProfile={updateProfile}
        onAddAllergy={addAllergy}
        onUpdateAllergy={updateAllergy}
        onDeleteAllergy={deleteAllergy}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={user}
        onAuthSuccess={() => setIsTourOpen(true)}
      />

      <AddEditItemModal
        isOpen={modalItemState.isOpen}
        onClose={() => setModalItemState({ isOpen: false, type: "line", item: null })}
        type={modalItemState.type}
        item={modalItemState.item}
        onSave={handleSaveModalItem}
      />

      {/* Clinical Help & FAQ Knowledge Base Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onStartTour={() => setIsTourOpen(true)}
      />

      {/* Interactive Guided Onboarding Tour */}
      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={() => setIsTourOpen(false)}
        onPerspectiveChange={setPerspective}
      />
    </div>
  );
}
