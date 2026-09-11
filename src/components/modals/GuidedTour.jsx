import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  UserCheck,
  Search,
  Eye,
  Pill,
  RotateCw,
  Camera,
  Layers,
  CheckCircle2
} from "lucide-react";

export const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to The Visual Medical History",
    badge: "Interactive Workstation Tour",
    icon: Sparkles,
    target: null, // Center dialog
    placement: "center",
    content:
      "A next-generation electronic medical record (EMR) interface that replaces endless flat text charts with an intuitive, spatial 3D anatomical map. Let's take a quick 1-minute guided tour of key tools and clinical workflows.",
    highlightText: "Tip: You can re-launch this tour anytime from the '?' Help button in the top navigation header."
  },
  {
    id: "patient-capsule",
    title: "Patient Demographics & Safety Capsule",
    badge: "Safety & Verification",
    icon: UserCheck,
    target: "#tour-patient-capsule",
    placement: "bottom",
    content:
      "Essential patient identifiers — Name, Age, MRN, and verified Allergy alerts — are always visible at a glance. Clicking anywhere on this capsule or the 'Edit' button opens the full Demographics modal to update allergy reactions, vitals, and care team records.",
    highlightText: "Quick Action: Click the capsule or 'Edit' button anytime to view full clinical details."
  },
  {
    id: "search-bar",
    title: "Smart Cross-Category Search & Auto-Jump",
    badge: "Real-Time Auto-Navigation",
    icon: Search,
    target: "#tour-search-bar",
    placement: "bottom",
    content:
      "Search across all lines, drains, surgeries, chronic diagnoses, medications, and clinical notes. The workstation intelligently evaluates your query: if the item lives in another category, it automatically switches tabs for you! It also auto-revolves the avatar if the item is posterior.",
    highlightText: "Shortcuts: Press [Enter] to focus the top matched item in 3D, or [Esc] to clear your search."
  },
  {
    id: "3d-avatar",
    title: "Interactive 3D Anatomical Workstation",
    badge: "Spatial Charting",
    icon: Eye,
    target: "#tour-3d-viewport",
    placement: "center-left",
    content:
      "Anatomical pins show verified patient landmarks: Lines (Emerald), Drains (Pink), Surgeries & Incisions (Indigo), and Diagnoses (Amber). Clicking any pin opens a full clinical card on the far left or right flank — sized and positioned so it never occludes the patient or hands.",
    highlightText: "Hovering over any pin displays a crisp foreground tooltip with anatomical region and record details."
  },
  {
    id: "pharmacy-shelf",
    title: "3D Pharmacy Shelf & Prescriptions",
    badge: "Visual Pharmacology",
    icon: Pill,
    target: "#tour-pharmacy-shelf",
    placement: "top-shelf",
    content:
      "Active prescriptions are physically represented as realistic amber vials on the 3D shelf in the lower-left foreground. Clicking any bottle displays its clinical dosage and illuminates its physiological organ target (e.g., Cardiovascular System, Endocrine Pancreas, Knee Joint).",
    highlightText: "A thin 3D leader line attaches directly from the bottle cap to its far-flank clinical prescription card."
  },
  {
    id: "perspective-toggle",
    title: "Anterior vs. Posterior Turntable",
    badge: "180° Smooth Revolution",
    icon: RotateCw,
    target: "#tour-perspective-toggle",
    placement: "bottom-right",
    content:
      "Smoothly revolve between Front (Anterior) and Rear (Posterior) views with dynamic record counts. Posterior view specifically displays rear-aspect landmarks such as the Posterior Lumbar Spinal Fusion (L4-S1), titanium pedicle hardware, and renal cortex.",
    highlightText: "Relevant pins only: Anterior conditions like Cardiac History stay hidden on the posterior view."
  },
  {
    id: "camera-controls",
    title: "Camera Controls & Fast View Reset",
    badge: "Ergonomic Navigation",
    icon: Camera,
    target: "#tour-camera-controls",
    placement: "top-right",
    content:
      "Zoom is locked by default so accidental trackpad or mouse scrolling won't lose your clinical framing. Click the Lock icon to toggle free zoom, or click the Reset icon to snap back. Double-clicking anywhere on the 3D background immediately resets the camera view.",
    highlightText: "Pro Tip: Double-click anywhere on the canvas background to reset the camera."
  },
  {
    id: "unified-sidebar",
    title: "Unified Clinical Sidebar & LDA Tracking",
    badge: "Comprehensive Records",
    icon: Layers,
    target: "#tour-sidebar-tabs",
    placement: "left",
    content:
      "Access all 6 clinical domains: Lines, Drains, Surgeries, Conditions, Meds, and Patient Summary. Click any record card to focus and highlight it in 3D. Add new LDAs with the '+ Add' button or shortcut Alt+Shift+N.",
    highlightText: "Badge numbers live-update as items are added, resolved, or filtered by search."
  },
  {
    id: "federal-apis",
    title: "Federal Health APIs & RxNorm Standard Dosing",
    badge: "Open-Access Health Data",
    icon: Sparkles,
    target: null,
    placement: "center",
    content:
      "The workstation connects directly to open-access federal health APIs: NIH RxNorm provides live medication search with 1-click standardized dosage strengths and frequency recommendations; NLM CTSS searches official ICD-10 diagnoses; MedlinePlus delivers authoritative monographs; and CDC CVX tracks standardized immunization schedules.",
    highlightText: "Tip: When adding a medication, click any NIH RxNorm standard strength chip to instantly set the dosage and recommended frequency."
  }
];

export function GuidedTour({
  isOpen,
  onClose,
  onComplete,
  onPerspectiveChange
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Measure target DOM element bounding rect
  const updateTargetPosition = useCallback(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // Recalculate position on step change or resize
  useEffect(() => {
    if (!isOpen) return;

    if (step.id === "pharmacy-shelf" && onPerspectiveChange) {
      onPerspectiveChange("anterior");
    }

    updateTargetPosition();
    const rafId = requestAnimationFrame(() => {
      updateTargetPosition();
    });
    const timer1 = setTimeout(updateTargetPosition, 60);
    const timer2 = setTimeout(updateTargetPosition, 180);
    const timer3 = setTimeout(updateTargetPosition, 360);

    const handleResize = () => updateTargetPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", updateTargetPosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", updateTargetPosition, true);
    };
  }, [isOpen, currentStepIndex, step, updateTargetPosition, onPerspectiveChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleDismiss();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (!isLastStep) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          handleFinish();
        }
      } else if (e.key === "ArrowLeft") {
        if (!isFirstStep) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFirstStep, isLastStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("has_seen_onboarding_tour", "true");
    if (dontShowAgain) {
      localStorage.setItem("suppress_onboarding_tour", "true");
    }
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  const handleDismiss = () => {
    localStorage.setItem("has_seen_onboarding_tour", "true");
    if (dontShowAgain) {
      localStorage.setItem("suppress_onboarding_tour", "true");
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const StepIcon = step.icon || Sparkles;

  // Compute card position based on placement
  let cardStyle = {};
  if (!targetRect || step.placement === "center") {
    if (step.placement === "top-shelf") {
      cardStyle = {
        bottom: "220px",
        left: "140px"
      };
    } else {
      cardStyle = {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }
  } else if (step.placement === "top-shelf") {
    const cardHeight = 340;
    const cardWidth = 430;
    // Position comfortably above the 3D pharmacy shelf
    let topPos = targetRect.top - cardHeight - 20;
    if (topPos < 75) {
      topPos = 75;
    }
    const leftPos = Math.max(
      24,
      Math.min(window.innerWidth - cardWidth - 24, targetRect.left + targetRect.width / 2 - cardWidth / 2)
    );
    cardStyle = {
      top: `${topPos}px`,
      left: `${leftPos}px`
    };
  } else if (step.placement === "bottom") {
    cardStyle = {
      top: Math.min(window.innerHeight - 340, targetRect.bottom + 16),
      left: Math.max(20, Math.min(window.innerWidth - 440, targetRect.left + targetRect.width / 2 - 210))
    };
  } else if (step.placement === "bottom-right") {
    cardStyle = {
      top: Math.min(window.innerHeight - 340, targetRect.bottom + 16),
      right: Math.max(20, window.innerWidth - targetRect.right)
    };
  } else if (step.placement === "top-right") {
    cardStyle = {
      bottom: Math.max(20, window.innerHeight - targetRect.top + 16),
      right: Math.max(20, window.innerWidth - targetRect.right)
    };
  } else if (step.placement === "left") {
    cardStyle = {
      top: Math.max(80, Math.min(window.innerHeight - 360, targetRect.top + 20)),
      right: Math.max(20, window.innerWidth - targetRect.left + 16)
    };
  } else if (step.placement === "center-left") {
    cardStyle = {
      top: "50%",
      left: "28%",
      transform: "translate(-50%, -50%)"
    };
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto select-none overflow-hidden animate-in fade-in duration-200">
      {/* Semi-transparent Backdrop with SVG Cutout Spotlight */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White reveals the dark overlay */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out a spotlight hole for the target element */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 8)}
                y={Math.max(0, targetRect.top - 8)}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.62)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Target Element Spotlight Ring (Glowing Teal Outline) */}
      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-xl border-2 border-teal-400 shadow-[0_0_24px_rgba(20,184,166,0.5)] transition-all duration-300 animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16
          }}
        />
      )}

      {/* Tour Dialog Card */}
      <div
        className="absolute w-[92vw] max-w-[430px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 text-slate-800"
        style={{
          ...cardStyle,
          boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)"
        }}
      >
        {/* Top Header Bar with Badge, Step Counter, and Close */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <StepIcon className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                {step.badge}
              </span>
              <div className="text-[11px] font-semibold text-slate-500">
                Step {currentStepIndex + 1} of {TOUR_STEPS.length}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            title="Skip Tour (Esc)"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3.5">
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {step.title}
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed">
            {step.content}
          </p>

          {step.highlightText && (
            <div className="p-2.5 rounded-lg bg-teal-50/80 border border-teal-200/70 text-[11px] text-teal-900 font-medium leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>{step.highlightText}</span>
            </div>
          )}

          {/* Step Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? "w-6 bg-teal-700"
                    : "w-1.5 bg-slate-200 hover:bg-slate-300"
                }`}
                title={`Go to step ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Card Footer with Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          {/* Skip Tour Link */}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Skip Tour
          </button>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-100 transition-all shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-all"
            >
              <span>{isLastStep ? "Finish Tour" : "Next"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
