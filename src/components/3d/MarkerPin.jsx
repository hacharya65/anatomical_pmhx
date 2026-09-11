import React, { useState, useMemo } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { X, MapPin, Scissors, Calendar, User, Building, Activity, Edit2 } from "lucide-react";
import { localizeConditionAnatomically } from "../../lib/clinicalCatalog";

/**
 * Epic EMR Style Circular Badge Marker with Flank Callout Card & Vector Line
 * 
 * Clinical UX Enhancements:
 * - Ultra-safe Viewport Boundaries: Sized compactly (w-60 to w-64) with strict clamping to visible area.
 * - Master hover tooltip overlay at Scene level guarantees text is ALWAYS in front of all icons.
 * - Full inspection details integrated into the flank callout box without blocking avatar.
 */
export function MarkerPin({
  item,
  type = "condition", // "condition" | "surgery" | "drain" | "line" | "medication"
  isFocused = false,
  hideUnfocusedBadge = false,
  turntableAngle = 0,
  onSelect,
  onClose,
  onEdit,
  onHover
}) {
  const { viewport } = useThree();
  const [hovered, setHovered] = useState(false);

  // Robust coordinates fallback: Dynamically localize conditions if coords missing or at default (0,0)
  let coords = item.coords;
  if (!coords || (coords.x === 0 && coords.y === 0)) {
    if (type === "condition" || item.category === "condition") {
      coords = localizeConditionAnatomically(item.name || item.title || item, item.icd10).coords;
    } else {
      coords = coords || { x: 0, y: 0, z: 0 };
    }
  }

  // Category determination
  let category = type;
  if (item.category) category = item.category;
  else if (item.itemType) category = item.itemType;
  else if (item.drainType || (item.name && (item.name.toLowerCase().includes("drain") || item.name.toLowerCase().includes("cath")))) {
    category = "drain";
  } else if (item.name && item.name.toLowerCase().includes("line")) {
    category = "line";
  } else if (item.dosage || (item.name && item.dosage)) {
    category = "medication";
  }

  let badgeColor = "#d97706"; // Amber (Conditions)
  let badgeBorder = "#b45309";
  let badgeBg = "#fffbeb";
  let iconSvg = null;

  if (category === "line") {
    // 🟢 Green: Lines / Vascular Access (IV Bottle)
    badgeColor = "#16a34a";
    badgeBorder = "#15803d";
    badgeBg = "#f0fdf4";
    iconSvg = (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10v14a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V4Z" />
        <path d="M10 2h4" />
        <path d="M12 11v6" />
        <path d="M9 14h6" />
      </svg>
    );
  } else if (category === "drain") {
    // 🟣 Magenta / Pink: Drains & Catheters (Drainage Bulb)
    badgeColor = "#db2777";
    badgeBorder = "#be185d";
    badgeBg = "#fdf2f8";
    iconSvg = (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6" />
        <circle cx="12" cy="14" r="6" />
        <path d="M12 11v4" />
        <path d="M10 13h4" />
      </svg>
    );
  } else if (category === "surgery") {
    // 🔵 Indigo / Purple: Surgeries & Surgical Scars (Surgical Scalpel / Incision)
    badgeColor = "#4f46e5";
    badgeBorder = "#4338ca";
    badgeBg = "#eef2ff";
    iconSvg = (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14 4 7 7-9 9H5v-7l9-9Z" />
        <path d="m11 7 6 6" />
      </svg>
    );
  } else if (category === "medication") {
    // 💊 Teal / Emerald: Pharmacy Medications / Rx
    badgeColor = "#0f766e";
    badgeBorder = "#0d9488";
    badgeBg = "#f0fdfa";
    iconSvg = (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    );
  } else if (category === "procedure") {
    // 🌐 Sky Blue: Diagnostic Procedures & Screenings
    badgeColor = "#0284c7";
    badgeBorder = "#0369a1";
    badgeBg = "#f0f9ff";
    iconSvg = (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  } else {
    // 🟡 Amber: Conditions & Chronic Diagnoses (Pulse / Heartbeat)
    badgeColor = "#d97706";
    badgeBorder = "#b45309";
    badgeBg = "#fffbeb";
    iconSvg = (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    );
  }

  // If hideUnfocusedBadge is true and not focused, do not render a floating badge
  if (hideUnfocusedBadge && !isFocused) {
    return null;
  }

  // Calculate flank position strictly bounded inside the visible viewport and on the far flanks
  const offset = useMemo(() => {
    // Viewport half-dimensions in 3D world units at origin
    const halfW = viewport.width / 2;
    const halfH = viewport.height / 2;

    // Conservative card footprint in world units (w ~215px, h ~275px at distanceFactor 24)
    const cardHalfWidth = 2.1;
    const cardHalfHeight = 2.1;
    const paddingX = 0.8;
    const paddingY = 1.0;

    // Strict boundary limits for the card center inside the visible frustum
    const maxSafeX = Math.max(4.5, halfW - cardHalfWidth - paddingX);
    const minSafeX = Math.min(-4.5, -halfW + cardHalfWidth + paddingX);
    const maxSafeY = Math.min(3.2, halfH - 1.2 - cardHalfHeight - paddingY);
    const minSafeY = Math.max(-3.2, -halfH + 1.2 + cardHalfHeight + paddingY);

    // Determine anchor X in world space considering turntable rotation
    const cosA = Math.cos(turntableAngle);
    const sinA = Math.sin(turntableAngle);
    const worldAnchorX = coords.x * cosA + (coords.z || 0) * sinA;

    // THE MEDICATION SHELF PROTECTION RULE:
    // The pharmacy shelf and bottles sit permanently in the bottom-left quadrant (X in [-7.5, -2.5], Y in [-7.5, -4.5]).
    // To guarantee NO box ever blocks or overlaps the medication shelf:
    // 1. Any lower-body item (coords.y < 1.5, such as Osteoarthritis Right Knee at Y=-4.05, TKA, Hip)
    //    on the left side is automatically routed to the Right Flank (+6.8), leaving the shelf 100% visible.
    // 2. Any medication bottle itself is routed to the Right Flank (+6.8, Y=-0.5), so all bottles on the shelf
    //    and their glowing selection pedestals remain completely unobstructed.
    // 3. Any upper-body item that stays on the Left Flank (-6.8) has its bottom edge strictly guarded
    //    (targetWorldY >= 0.5, ensuring its bottom edge sits > 2.8 units above the shelf).
    const isNearShelfZone = (coords.y < 1.5 && worldAnchorX < 0) || category === "medication";
    const preferRight = isNearShelfZone ? true : worldAnchorX >= 0;

    let targetWorldX;
    if (preferRight) {
      // Far right flank: target 6.8, safely bounded by visible screen
      targetWorldX = Math.min(maxSafeX, 6.8);
    } else {
      // Far left flank: target -6.8, safely bounded by visible screen
      targetWorldX = Math.max(minSafeX, -6.8);
    }

    // Determine vertical level
    let desiredY = coords.y + 0.1;
    if (category === "medication") {
      desiredY = -0.5; // float cleanly on right flank
    }

    // If on left flank, strictly enforce minimum Y so it never descends toward the shelf
    const safeMinY = preferRight ? minSafeY : Math.max(minSafeY, 0.5);
    const targetWorldY = Math.max(safeMinY, Math.min(maxSafeY, desiredY));

    const targetWorldZ = 0.8;

    // Invert turntable rotation to find local offset inside rotated group
    const localTargetX = targetWorldX * cosA - targetWorldZ * sinA;
    const localTargetZ = targetWorldX * sinA + targetWorldZ * cosA;

    const localX = localTargetX - coords.x;
    const localY = targetWorldY - coords.y;
    const localZ = localTargetZ - (coords.z || 0);

    return {
      x: localX,
      y: localY,
      z: localZ,
      isRightFlank: targetWorldX > 0
    };
  }, [coords.x, coords.y, coords.z, category, viewport.width, viewport.height, turntableAngle]);

  // Thin Three.js vector pointer line connecting anatomical surface anchor to flank callout card
  const lineGeometry = useMemo(() => {
    if (!isFocused) return null;
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(offset.x * 0.45, offset.y * 0.5, offset.z * 0.6),
      new THREE.Vector3(offset.x, offset.y, offset.z)
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [isFocused, offset]);

  return (
    <group position={[coords.x, coords.y, coords.z]}>
      {/* 1. Precise Anatomical Anchor on the Avatar / Organ Surface */}
      {isFocused ? (
        <group>
          {/* Target Surface Ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.07, 0.12, 32]} />
            <meshBasicMaterial color={badgeColor} side={THREE.DoubleSide} />
          </mesh>
          {/* Central Anchor Dot */}
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={badgeColor} />
          </mesh>
        </group>
      ) : (
        <mesh>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshBasicMaterial color={badgeColor} />
        </mesh>
      )}

      {/* 2. Thin Line Vector (Draws from Anchor to Flank Callout Card) */}
      {isFocused && lineGeometry && (
        <primitive object={new THREE.Line(
          lineGeometry,
          new THREE.LineBasicMaterial({
            color: new THREE.Color(badgeColor),
            transparent: true,
            opacity: 0.85,
            linewidth: 1.5
          })
        )} />
      )}

      {/* 3. Callout Box (Flank Position When Focused) or Circular Badge (When Unfocused) */}
      <group position={isFocused ? [offset.x, offset.y, offset.z] : [0, 0, 0]}>
        <Html
          center
          distanceFactor={24}
          zIndexRange={isFocused ? [90000, 80000] : [50, 1]}
          style={{
            zIndex: isFocused ? 90000 : 10,
            pointerEvents: isFocused ? "auto" : "none"
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect({ ...item, itemType: category, coords });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              setHovered(true);
              onHover && onHover({ ...item, badgeColor, category, coords });
            }}
            onMouseLeave={() => {
              setHovered(false);
              onHover && onHover(null);
            }}
            className="cursor-pointer select-none transition-all duration-200"
            style={{ pointerEvents: "auto" }}
          >
            {isFocused ? (
              /* Compact All-in-One Clinical Callout Card on Left/Right Flank */
              <div
                className="w-[210px] sm:w-[225px] max-h-[275px] bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col text-slate-800 transition-all animate-in fade-in zoom-95 z-[90000] overflow-hidden select-text text-left"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
              >
                {/* Header with Category Badge & Close Button */}
                <div className="p-1.5 px-2 border-b flex items-center justify-between bg-slate-50 border-slate-200">
                  <span
                    className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: badgeBg,
                      borderColor: badgeBorder,
                      color: badgeColor
                    }}
                  >
                    <span className="w-2.5 h-2.5 flex items-center justify-center">
                      {iconSvg}
                    </span>
                    {category === "line"
                      ? "Line / Access"
                      : category === "drain"
                      ? "Drain / Tube"
                      : category === "surgery"
                      ? "Surgery"
                      : category === "medication"
                      ? "Prescription Rx"
                      : category === "procedure"
                      ? "Procedure"
                      : "Medical Condition"}
                  </span>

                  {/* Close Dismiss Button */}
                  {onClose && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="p-0.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-all"
                      title="Close detail"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Scrollable Clinical Body (Compact Text & Spacing) */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[175px]">
                  {/* Title & Key Subtitle Badges */}
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-900 leading-snug">
                      {item.name}
                    </h3>

                    {category === "medication" ? (
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className="text-[8.5px] font-semibold px-1 py-0.5 rounded border bg-teal-50 text-teal-800 border-teal-200">
                          {item.dosage} • {item.frequency}
                        </span>
                        {item.route && (
                          <span className="text-[8px] font-medium px-1 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                            {item.route}
                          </span>
                        )}
                        {item.system && (
                          <span className="text-[8px] font-medium capitalize px-1 py-0.5 rounded border bg-teal-50/70 text-teal-700 border-teal-200">
                            Target: {item.system.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    ) : category === "procedure" ? (
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[8.5px] font-medium px-1 py-0.5 rounded border bg-sky-50 text-sky-800 border-sky-200">
                          <MapPin className="w-2.5 h-2.5 text-sky-600" />
                          {item.region || item.anatomical_marker || "Diagnostic Area"}
                        </span>
                        {item.procedure_type && (
                          <span className="text-[8px] uppercase font-bold text-sky-800 bg-sky-50/70 px-1 py-0.5 rounded border border-sky-200">
                            {item.procedure_type}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[8.5px] font-medium px-1 py-0.5 rounded border bg-teal-50 text-teal-800 border-teal-200">
                          <MapPin className="w-2.5 h-2.5 text-teal-600" />
                          {item.region || item.site || "Anatomical Site"}
                        </span>
                        {item.icd10 && (
                          <span className="text-[8px] font-mono font-bold text-teal-800 bg-teal-50/70 px-1 py-0.5 rounded border border-teal-200">
                            ICD: {item.icd10}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Diagnostic Procedure Details */}
                  {category === "procedure" && (
                    <div className="p-1.5 rounded border space-y-0.5 bg-sky-50/70 border-sky-200 text-sky-950">
                      <div className="flex items-center gap-1 text-[8.5px] font-bold text-sky-900">
                        <Activity className="w-2.5 h-2.5 text-sky-700 shrink-0" />
                        <span>Performed: {item.date_performed || item.datePerformed || "Documented"}</span>
                      </div>
                      {item.findings && (
                        <p className="text-[8px] text-sky-850 leading-snug pt-0.5">
                          <strong>Findings:</strong> {item.findings}
                        </p>
                      )}
                      {item.recall_interval_years && (
                        <div className="text-[7.5px] font-bold text-sky-700 pt-0.5">
                          Recall: Repeat every {item.recall_interval_years} {item.recall_interval_years === 1 ? "Year" : "Years"}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Surgical Incision Geometry */}
                  {category === "surgery" && item.incision && (
                    <div className="p-1 rounded border space-y-0.5 bg-indigo-50/60 border-indigo-200 text-indigo-950">
                      <div className="flex items-center gap-1 text-[8.5px] font-bold text-indigo-900">
                        <Scissors className="w-2.5 h-2.5 text-indigo-600" />
                        <span>Incision / Geometry</span>
                      </div>
                      <p className="text-[8.5px] pl-3.5 text-slate-700">{item.incision}</p>
                    </div>
                  )}

                  {/* Medication Details */}
                  {category === "medication" && (
                    <div className="space-y-1">
                      {item.indication && (
                        <div className="p-1 rounded border bg-teal-50/60 border-teal-200 text-teal-950">
                          <div className="text-[7.5px] font-bold uppercase tracking-wider text-teal-700">
                            Indication
                          </div>
                          <p className="text-[8.5px] font-semibold text-slate-800">
                            {item.indication}
                          </p>
                        </div>
                      )}

                      {/* Pharmacy & Last Picked Up Dispensing Details */}
                      <div className="p-1 rounded border bg-teal-50/70 border-teal-200 text-teal-950 space-y-0.5">
                        <div className="flex items-center justify-between text-[7.5px] font-bold text-teal-800 uppercase tracking-wider">
                          <span>Last Picked Up</span>
                          <span className="font-bold text-teal-900 lowercase">
                            {item.lastPickedUpDate || "2026-08-28"}
                          </span>
                        </div>
                        <div className="text-[8.5px] font-semibold text-slate-900 truncate">
                          {item.lastPickedUpPharmacy || "CVS Pharmacy #04821 (Cambridge, MA)"}
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-slate-600 pt-0.5">
                          <span>{item.daysSupply || "90-Day Supply"}</span>
                          <span className="font-medium text-teal-800">
                            {item.refillsRemaining !== undefined ? `${item.refillsRemaining} refills left` : "2 refills"}
                          </span>
                        </div>
                      </div>

                      {item.instructions && (
                        <div className="p-1 rounded border bg-amber-50/60 border-amber-200 text-amber-950">
                          <div className="text-[7.5px] font-bold uppercase tracking-wider text-amber-700">
                            Instructions
                          </div>
                          <p className="text-[8.5px] leading-tight text-slate-700">
                            {item.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clinical History & Provider Details */}
                  <div className="space-y-0.5 text-[8.5px] border-t border-slate-100 pt-1">
                    {(item.startDate || item.onsetDate || item.surgeryDate || item.placementDate) && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500">
                          {category === "medication" ? "Start: " : "Date: "}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {item.startDate || item.onsetDate || item.surgeryDate || item.placementDate}
                        </span>
                      </div>
                    )}

                    {(item.prescriber || item.provider || item.surgeon) && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500">
                          {category === "medication" ? "Rx By: " : "Attending: "}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {item.prescriber || item.provider || item.surgeon}
                        </span>
                      </div>
                    )}

                    {item.hospital && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Building className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500">Facility: </span>
                        <span className="font-semibold text-slate-800">{item.hospital}</span>
                      </div>
                    )}

                    {item.status && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Activity className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500">Status: </span>
                        <span className="font-bold text-emerald-700">{item.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Clinical Documentation / Notes */}
                  {item.notes && (
                    <div className="p-1 rounded border bg-slate-50 border-slate-200 text-slate-700">
                      <div className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">
                        Notes
                      </div>
                      <p className="text-[8.5px] leading-tight italic text-slate-700">
                        "{item.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-1.5 px-2 border-t flex items-center justify-between bg-slate-50 border-slate-200">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose && onClose();
                    }}
                    className="text-[8.5px] font-semibold px-1.5 py-0.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all"
                  >
                    Close
                  </button>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      className="flex items-center gap-1 text-[8.5px] font-semibold px-2 py-0.5 rounded bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-all"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>Edit Record</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Standard Compact Unfocused Circular Badge on Avatar Surface */
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-transform ${
                  hovered ? "scale-110" : "scale-100"
                }`}
                style={{
                  backgroundColor: badgeBg,
                  border: `2px solid ${badgeBorder}`,
                  color: badgeColor,
                  boxShadow: hovered
                    ? `0 0 12px ${badgeColor}88, 0 4px 10px rgba(0,0,0,0.15)`
                    : "0 2px 6px rgba(0,0,0,0.12)"
                }}
              >
                {iconSvg}
              </div>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}
