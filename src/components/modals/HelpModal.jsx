import React, { useState, useMemo } from "react";
import {
  X,
  HelpCircle,
  Search,
  Sparkles,
  RotateCw,
  Eye,
  Camera,
  Layers,
  Pill,
  Scissors,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Keyboard,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export const FAQ_DATA = [
  {
    id: "faq-search-auto-jump",
    category: "Search",
    question: "How does the search auto-tab switching feature work?",
    answer:
      "When you type any clinical keyword into the global search bar (e.g., 'Cholecystectomy', 'Lisinopril', 'PICC', 'Spine'), the workstation inspects all 5 categories simultaneously. If your currently active tab has 0 matches, it automatically moves you over to the tab containing the matching item. If the item is located on the posterior aspect of the body, the 3D avatar turntable will also smoothly revolve to the Posterior view automatically.",
    tags: ["search", "navigation", "auto-jump", "tabs", "perspective"]
  },
  {
    id: "faq-reset-camera",
    category: "3D Workstation",
    question: "How do I reset my 3D camera view?",
    answer:
      "You have two instant options: 1) Double-click anywhere on the 3D background canvas to immediately reset framing to calibrated baseline overview. 2) Click the small circular 'Reset' icon in the stacked controls in the bottom-right corner.",
    tags: ["camera", "zoom", "reset", "double click", "overview"]
  },
  {
    id: "faq-zoom-lock",
    category: "3D Workstation",
    question: "Why is camera zoom locked by default?",
    answer:
      "In clinical environments, accidental trackpad or mouse-wheel scrolling can cause the anatomical model to suddenly fly out of frame or zoom unexpectedly. By default, zoom is locked to maintain perfect clinical overview. You can unlock free zooming anytime by clicking the Lock icon in the bottom-right corner.",
    tags: ["zoom", "lock", "camera", "scroll", "trackpad"]
  },
  {
    id: "faq-perspective-diff",
    category: "3D Workstation",
    question: "Why do some icons only appear on the Anterior or Posterior view?",
    answer:
      "To maintain anatomical accuracy and prevent visual clutter, clinical pins are strictly filtered by perspective. Anterior records (like Cardiac History, Laparoscopic Cholecystectomy, Knee Joint, and Foley Catheter) only appear on the front. Posterior records (like Lumbar Spinal Fusion L4-S1 and titanium pedicle screws) only appear on the rear. Toggle between them using the top-right perspective button.",
    tags: ["anterior", "posterior", "perspective", "spine", "cardiac"]
  },
  {
    id: "faq-pin-boxes",
    category: "3D Workstation",
    question: "Where do clinical detail cards appear when I click a pin?",
    answer:
      "Clinical cards are strictly routed to the far-left or far-right flanks of the workstation. Sizing and margins are calibrated so that the entire patient avatar — including hands, fingers, and thumbs — remains 100% visible and un-occluded. Pins and medication bottles never get blocked by open boxes.",
    tags: ["pins", "callout", "boxes", "occlusion", "hands"]
  },
  {
    id: "faq-pharmacy-shelf",
    category: "Meds & Pharmacy",
    question: "How does the 3D pharmacy shelf and prescription bottles work?",
    answer:
      "Each active prescription is physically represented as an amber prescription vial on the shelf in the lower-left foreground. Clicking any bottle displays its clinical dosage and links a direct 3D vector to its flank card, while simultaneously highlighting the targeted physiological organ system (e.g., Cardiovascular System for Lisinopril, Endocrine Pancreas for Metformin).",
    tags: ["medication", "shelf", "bottles", "organ", "dosage"]
  },
  {
    id: "faq-add-lda",
    category: "LDAs & Surgeries",
    question: "How do I add a new line, drain, surgery, or condition?",
    answer:
      "You can add items in three ways: 1) Switch to the relevant tab in the right sidebar and click the '+ Add' button at the top. 2) Use the global keyboard shortcut Alt + Shift + N to quickly add a new vascular line. 3) To edit an existing record, click the pencil 'Edit' icon on any card in the sidebar or directly in the 3D callout box.",
    tags: ["add", "lda", "line", "drain", "surgery", "shortcut"]
  },
  {
    id: "faq-days-calculation",
    category: "LDAs & Surgeries",
    question: "How is 'Days Active' or time elapsed calculated?",
    answer:
      "For temporary access devices (such as IV lines, arterial lines, and surgical drains), the system tracks calendar days since the placement date. For surgical histories, it calculates elapsed days or years since the operation (e.g., '14 yrs' for a cholecystectomy).",
    tags: ["days", "active", "placement", "calendar", "audit"]
  },
  {
    id: "faq-demographics-allergies",
    category: "Demographics",
    question: "How do I update patient demographics and documented allergies?",
    answer:
      "Click the patient capsule in the header (displaying Elena Vance, 58yo, MRN #PMHX-84920) or click the 'Edit' button. This opens the comprehensive Patient Demographics modal, allowing you to update patient identity, verified allergy reaction histories, and primary care contacts.",
    tags: ["demographics", "allergies", "mrn", "patient", "care team"]
  },
  {
    id: "faq-cloud-sync",
    category: "Cloud Sync",
    question: "How does Cloud Sync and local data storage work?",
    answer:
      "You can sign in with your Supabase account to enable real-time cloud backup, cross-device synchronization, and multi-user clinician access with Row Level Security (RLS). When in Demo Mode, patient records are saved locally in your browser so you never lose work. Clicking 'Sign Out' in the top-right header returns to the clinician authentication screen.",
    tags: ["cloud", "sync", "supabase", "local storage", "backup", "authentication"]
  }
];

export const KEYBOARD_SHORTCUTS = [
  { keys: ["Enter"], context: "Search Bar", description: "Select and focus the top matched clinical item in 3D" },
  { keys: ["Esc"], context: "Search Bar", description: "Clear search query and restore all category counts" },
  { keys: ["Esc"], context: "Global / 3D Canvas", description: "Close active clinical callout card or modal" },
  { keys: ["Double Click"], context: "3D Canvas", description: "Reset camera to calibrated baseline overview" },
  { keys: ["Alt", "Shift", "N"], context: "Global", description: "Quickly open the 'Add New Line / LDA' dialog" },
  { keys: ["?"], context: "Global", description: "Open this Clinical Help & Knowledge Base dialog" }
];

export function HelpModal({
  isOpen,
  onClose,
  onStartTour
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  const categories = ["All", "Search", "3D Workstation", "Meds & Pharmacy", "LDAs & Surgeries", "Demographics", "Cloud Sync"];

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((faq) => {
      const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const toggleFaq = (id) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
        style={{
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)"
        }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Clinical Help & Knowledge Base
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Workstation guides, FAQs, and navigation shortcuts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
            title="Close Help (Esc)"
            aria-label="Close Help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Interactive Walkthrough Hero Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-5 shadow-sm border border-teal-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Guided Walkthrough</span>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug">
                New to Visual Medical History? Take a quick 1-minute tour.
              </h3>
              <p className="text-xs text-teal-100/90 leading-relaxed">
                Step through key workstation tools: 3D avatar rotation, auto-jumping search, pharmacy shelf, and camera reset controls.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onStartTour();
              }}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-teal-900 hover:bg-teal-50 font-bold text-xs shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Start Guided Tour</span>
            </button>
          </div>

          {/* 2. Search & Category Filters */}
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, questions, controls, keywords..."
                className="w-full pl-10 pr-9 py-2 text-xs rounded-lg border focus:outline-none transition-all shadow-xs bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3. FAQ Accordion List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Frequently Asked Questions ({filteredFaqs.length})
            </h3>

            {filteredFaqs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                <HelpCircle className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No questions matching "{searchQuery}"</p>
                <p className="text-[11px] text-slate-400 mt-1">Try a different search term or category filter.</p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-all hover:border-slate-300"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-xs font-bold text-slate-800 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {faq.category}
                        </span>
                        <span>{faq.question}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Keyboard Shortcuts & Gestures Quick Reference */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keyboard Shortcuts & Quick Actions</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2 px-3.5">Shortcut / Action</th>
                    <th className="py-2 px-3.5">Context</th>
                    <th className="py-2 px-3.5">Function</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {KEYBOARD_SHORTCUTS.map((sc, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3.5 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1">
                          {sc.keys.map((k, ki) => (
                            <kbd
                              key={ki}
                              className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-100 text-[11px] shadow-2xs"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3.5 text-slate-500 font-medium">{sc.context}</td>
                      <td className="py-2 px-3.5 text-slate-700">{sc.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>The Visual Medical History • Version 6.4 (Clinical Edition)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border text-xs font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-100 transition-all shadow-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
