import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { Avatar } from "./Avatar";
import { OrganHighlight } from "./OrganHighlight";
import { MarkerPin } from "./MarkerPin";
import { MedicationShelf } from "./MedicationShelf";
import { RotateCcw, Lock, Unlock, X, Sparkles } from "lucide-react";
import { isItemRelevantForPerspective } from "../../lib/clinicalCatalog";

/**
 * Camera Rig maintaining stable overview framing.
 * - Camera is locked in orientation so room fixtures (pharmacy shelf, medications) remain stationary.
 * - Supports zoom in/out when view lock is disabled.
 * - Instant 1-click baseline zoom reset.
 */
function CameraRig({ resetTrigger, isLocked = true }) {
  const controlsRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    if (controlsRef.current) {
      camera.position.set(0, -0.5, 28.8);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controlsRef.current.target.set(0, -0.5, 0);
      controlsRef.current.update();
    }
  }, [resetTrigger, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.06}
      enableRotate={false}
      enablePan={false}
      enableZoom={!isLocked}
      minDistance={14}
      maxDistance={38}
      target={[0, -0.5, 0]}
    />
  );
}

/**
 * Smooth 3D Turntable for the Anatomical Avatar
 * - Rotation is strictly limited to the avatar, its organs, and body markers.
 * - Smooth damped rotation around Y axis.
 * - Dynamically evaluates front vs rear facing without any feedback loop glitching.
 */
function AvatarTurntable({
  targetRotationYRef,
  turntableAngleRef,
  onFacingDetected,
  children
}) {
  const groupRef = useRef();
  const facingRef = useRef("anterior");

  useFrame((_, delta) => {
    if (groupRef.current && targetRotationYRef) {
      const current = groupRef.current.rotation.y;
      const target = targetRotationYRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.0005) {
        groupRef.current.rotation.y += diff * Math.min(1, delta * 9);
      } else {
        groupRef.current.rotation.y = target;
      }

      if (turntableAngleRef) {
        turntableAngleRef.current = groupRef.current.rotation.y;
      }

      // Evaluate whether Anterior or Posterior is facing camera (Camera is at +Z looking towards origin)
      const cosVal = Math.cos(groupRef.current.rotation.y);
      let detected = facingRef.current;
      if (cosVal < -0.18) {
        detected = "posterior";
      } else if (cosVal > 0.18) {
        detected = "anterior";
      }

      if (detected !== facingRef.current) {
        facingRef.current = detected;
        if (onFacingDetected) {
          onFacingDetected(detected);
        }
      }
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

/**
 * 3D Scene Root Component
 * Styled after Epic EMR Lines, Drains & Surgeries Avatar Viewer
 */
export function Scene({
  profile,
  conditions = [],
  surgeries = [],
  drains = [],
  lines = [],
  medications = [],
  procedures = [],
  focusedItem = null,
  perspective = "anterior",
  hideMarkers = false,
  onSelectItem,
  onResetFocus,
  onEditItem,
  onPerspectiveChange,
  onAddNewLDA
}) {
  const isDeepDive = !!focusedItem;
  const bgColor = "#f0f5f4";

  // Turntable angle & rotation target refs for avatar-only rotation
  const targetRotationYRef = useRef(perspective === "posterior" ? Math.PI : 0);
  const turntableAngleRef = useRef(perspective === "posterior" ? Math.PI : 0);
  const [facingPerspective, setFacingPerspective] = useState(perspective);

  // Floating guidance banner dismissal state
  const [isGuidanceDismissed, setIsGuidanceDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("dismiss_canvas_guidance") === "true";
    } catch {
      return false;
    }
  });

  // Sync facing perspective when perspective prop changes externally (e.g. from buttons or deep dives)
  useEffect(() => {
    if (targetRotationYRef.current !== undefined) {
      const cosVal = Math.cos(targetRotationYRef.current);
      const currentFacing = cosVal >= 0 ? "anterior" : "posterior";
      if (currentFacing !== perspective) {
        if (perspective === "posterior") {
          const k = Math.round((targetRotationYRef.current - Math.PI) / (2 * Math.PI));
          targetRotationYRef.current = k * 2 * Math.PI + Math.PI;
        } else {
          const k = Math.round(targetRotationYRef.current / (2 * Math.PI));
          targetRotationYRef.current = k * 2 * Math.PI;
        }
      }
    }
    setFacingPerspective(perspective);
  }, [perspective]);

  const handleFacingDetected = (detected) => {
    setFacingPerspective(detected);
    if (onPerspectiveChange && detected !== perspective) {
      onPerspectiveChange(detected);
    }
  };

  // Filter items dynamically based on the actual side facing the camera (Anterior vs Posterior)
  const visibleConditions = useMemo(
    () => conditions.filter((c) => isItemRelevantForPerspective(c, facingPerspective)),
    [conditions, facingPerspective]
  );
  const visibleSurgeries = useMemo(
    () => surgeries.filter((s) => isItemRelevantForPerspective(s, facingPerspective)),
    [surgeries, facingPerspective]
  );
  const visibleDrains = useMemo(
    () => drains.filter((d) => isItemRelevantForPerspective(d, facingPerspective)),
    [drains, facingPerspective]
  );
  const visibleLines = useMemo(
    () => lines.filter((l) => isItemRelevantForPerspective(l, facingPerspective)),
    [lines, facingPerspective]
  );
  const totalAnterior = useMemo(() => {
    return (
      conditions.filter((c) => isItemRelevantForPerspective(c, "anterior")).length +
      surgeries.filter((s) => isItemRelevantForPerspective(s, "anterior")).length +
      drains.filter((d) => isItemRelevantForPerspective(d, "anterior")).length +
      lines.filter((l) => isItemRelevantForPerspective(l, "anterior")).length
    );
  }, [conditions, surgeries, drains, lines]);

  const totalPosterior = useMemo(() => {
    return (
      conditions.filter((c) => isItemRelevantForPerspective(c, "posterior")).length +
      surgeries.filter((s) => isItemRelevantForPerspective(s, "posterior")).length +
      drains.filter((d) => isItemRelevantForPerspective(d, "posterior")).length +
      lines.filter((l) => isItemRelevantForPerspective(l, "posterior")).length
    );
  }, [conditions, surgeries, drains, lines]);

  // Hovered item state for Master Hover Tooltip (rendered with highest priority z-index)
  const [hoveredItem, setHoveredItem] = useState(null);

  // View Lock state: defaults to TRUE (locks both avatar spinning rotation AND zoom)
  const [isLocked, setIsLocked] = useState(true);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

  const handleResetZoom = () => {
    setResetCameraTrigger((c) => c + 1);
    if (perspective === "posterior") {
      targetRotationYRef.current = Math.PI;
    } else {
      targetRotationYRef.current = 0;
    }
  };

  useEffect(() => {
    setHoveredItem(null);
  }, [perspective, focusedItem]);

  // Drag-to-spin avatar state (strictly limited to avatar only, does NOT move pharmacy shelf or background)
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const pointerDownPos = useRef({ x: 0, y: 0, time: 0 });

  const handlePointerDown = (e) => {
    if (
      e.target &&
      e.target.closest &&
      (e.target.closest("button") || e.target.closest(".interactive-card") || e.target.closest("input"))
    ) {
      return;
    }
    pointerDownPos.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
    if (!isLocked) {
      isDraggingRef.current = true;
      lastPointerXRef.current = e.clientX;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || isLocked) return;
    const deltaX = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;
    targetRotationYRef.current += deltaX * 0.0075;
  };

  const handlePointerUp = (e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    const dt = Date.now() - pointerDownPos.current.time;

    // Under 6px displacement and under 500ms duration is a click (not an avatar spin drag)
    if (dx < 6 && dy < 6 && dt < 500) {
      if (focusedItem) {
        onResetFocus && onResetFocus();
      }
    }
  };

  // Double-click anywhere around the avatar resets camera view (and clears focus if card is open)
  const handleDoubleClick = (e) => {
    if (e.target && e.target.closest && (e.target.closest("button") || e.target.closest(".interactive-card"))) {
      return;
    }
    handleResetZoom();
    if (focusedItem) {
      onResetFocus && onResetFocus();
    }
  };

  return (
    <div
      id="tour-3d-viewport"
      className={`relative w-full h-full select-none overflow-hidden bg-[#f0f5f4] touch-none ${
        !isLocked ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* 3D R3F Canvas */}
      <Canvas
        camera={{ position: [0, -0.5, 28.8], fov: 42 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onDoubleClick={handleDoubleClick}
        onPointerMissed={() => {
          if (focusedItem) onResetFocus && onResetFocus();
        }}
      >
        <color attach="background" args={[bgColor]} />

        {/* High-Key Clinical Lighting */}
        <ambientLight intensity={0.94} color="#ffffff" />
        <directionalLight position={[10, 18, 16]} intensity={0.7} color="#f8fafc" />
        <directionalLight position={[-10, 14, -10]} intensity={0.35} color="#e2e8f0" />
        <pointLight position={[0, 4, 8]} intensity={0.35} color="#ffffff" distance={20} />

        {/* Camera Rig: Stays centered with stable view; zoom in/out when unlocked */}
        <CameraRig
          resetTrigger={resetCameraTrigger}
          isLocked={isLocked}
        />

        {/* ======================================================== */}
        {/* 1. ROTATING ANATOMICAL TURNTABLE (Avatar & Markers Only) */}
        {/* ======================================================== */}
        <AvatarTurntable
          targetRotationYRef={targetRotationYRef}
          turntableAngleRef={turntableAngleRef}
          onFacingDetected={handleFacingDetected}
        >
          {/* Seamless Anatomical Avatar */}
          <Avatar
            profile={profile}
            isDeepDive={isDeepDive}
            activeSystem={focusedItem?.system}
          />

          {/* 3D Organs for Deep Dive */}
          <OrganHighlight
            activeSystem={focusedItem?.system}
            isFocused={!!focusedItem}
          />

          {/* Avatar Markers: Anatomically Relevant to Current Perspective Only */}
          {!hideMarkers && (
            <>
              {/* Conditions Badge Markers (Amber) */}
              {visibleConditions.map((cond) => (
                <MarkerPin
                  key={cond.id}
                  item={cond}
                  type="condition"
                  isFocused={focusedItem?.id === cond.id}
                  turntableAngle={perspective === "posterior" ? Math.PI : 0}
                  onSelect={onSelectItem}
                  onClose={onResetFocus}
                  onEdit={onEditItem}
                  onHover={setHoveredItem}
                />
              ))}

              {/* Surgeries Badge Markers (Indigo Scalpel) */}
              {visibleSurgeries.map((surg) => (
                <MarkerPin
                  key={surg.id}
                  item={surg}
                  type="surgery"
                  isFocused={focusedItem?.id === surg.id}
                  turntableAngle={perspective === "posterior" ? Math.PI : 0}
                  onSelect={onSelectItem}
                  onClose={onResetFocus}
                  onEdit={onEditItem}
                  onHover={setHoveredItem}
                />
              ))}

              {/* Drains Badge Markers (Magenta Drain Bulb) */}
              {visibleDrains.map((drain) => (
                <MarkerPin
                  key={drain.id}
                  item={drain}
                  type="drain"
                  isFocused={focusedItem?.id === drain.id}
                  turntableAngle={perspective === "posterior" ? Math.PI : 0}
                  onSelect={onSelectItem}
                  onClose={onResetFocus}
                  onEdit={onEditItem}
                  onHover={setHoveredItem}
                />
              ))}

              {/* Lines Badge Markers (Green IV Line) */}
              {visibleLines.map((line) => (
                <MarkerPin
                  key={line.id}
                  item={line}
                  type="line"
                  isFocused={focusedItem?.id === line.id}
                  turntableAngle={perspective === "posterior" ? Math.PI : 0}
                  onSelect={onSelectItem}
                  onClose={onResetFocus}
                  onEdit={onEditItem}
                  onHover={setHoveredItem}
                />
              ))}


              {/* Master Hover Tooltip for Avatar Pins (Follows Avatar Rotation) */}
              {hoveredItem &&
                hoveredItem.category !== "medication" &&
                focusedItem?.id !== hoveredItem.id &&
                hoveredItem.coords &&
                isItemRelevantForPerspective(hoveredItem, perspective) && (
                  <Html
                    position={[hoveredItem.coords.x, hoveredItem.coords.y + 0.65, (hoveredItem.coords.z || 0) + 0.5]}
                    center
                    distanceFactor={26}
                    zIndexRange={[999999, 999999]}
                    style={{
                      zIndex: 999999,
                      pointerEvents: "none"
                    }}
                  >
                    <div
                      className="bg-slate-900 text-white text-[10.5px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 select-none"
                      style={{
                        boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.45), 0 4px 6px -2px rgba(0, 0, 0, 0.25)"
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: hoveredItem.badgeColor || "#0f766e" }}
                      />
                      <span className="font-bold tracking-tight text-white">{hoveredItem.name}</span>
                      {hoveredItem.region || hoveredItem.site ? (
                        <span className="text-slate-300 font-normal text-[9.5px]">
                          • {hoveredItem.region || hoveredItem.site}
                        </span>
                      ) : null}
                    </div>
                  </Html>
                )}
            </>
          )}
        </AvatarTurntable>

        {/* ======================================================== */}
        {/* 2. CLINICAL ROOM FIXTURES (Pharmacy Shelf at Bottom-Left) */}
        {/* ======================================================== */}
        {!hideMarkers && (
          <MedicationShelf
            medications={medications}
            focusedItem={focusedItem}
            onSelectMedication={onSelectItem}
            onClose={onResetFocus}
            onEdit={onEditItem}
            onHover={setHoveredItem}
          />
        )}

        {/* Master Hover Tooltip for Medication Bottles */}
        {hoveredItem && hoveredItem.category === "medication" && focusedItem?.id !== hoveredItem.id && hoveredItem.coords && (
          <Html
            position={[hoveredItem.coords.x, hoveredItem.coords.y + 0.65, (hoveredItem.coords.z || 0) + 0.5]}
            center
            distanceFactor={26}
            zIndexRange={[999999, 999999]}
            style={{
              zIndex: 999999,
              pointerEvents: "none"
            }}
          >
            <div
              className="bg-slate-900 text-white text-[10.5px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 select-none"
              style={{
                boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.45), 0 4px 6px -2px rgba(0, 0, 0, 0.25)"
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: hoveredItem.badgeColor || "#0f766e" }}
              />
              <span className="font-bold tracking-tight text-white">{hoveredItem.name}</span>
              {hoveredItem.dosage && (
                <span className="text-teal-300 font-medium">({hoveredItem.dosage})</span>
              )}
            </div>
          </Html>
        )}
      </Canvas>

      {/* Top Left: Close Details Button When an Item is Focused */}
      {focusedItem && (
        <div
          className="absolute top-4 left-4 flex items-center gap-2 z-10"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onResetFocus}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md shadow-xs border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 transition-all"
            title="Close details callout card and return to overview"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Close Details</span>
          </button>
        </div>
      )}

      {/* Top Right: Perspective Quick Switch (Anterior / Posterior) */}
      <div
        id="tour-perspective-toggle"
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex p-0.5 rounded-md border shadow-xs bg-white/95 border-slate-300 text-slate-700">
          <button
            type="button"
            onClick={() => {
              if (perspective !== "anterior") {
                if (focusedItem && !isItemRelevantForPerspective(focusedItem, "anterior")) {
                  onResetFocus && onResetFocus();
                }
                onPerspectiveChange("anterior");
              }
            }}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              perspective === "anterior"
                ? "bg-teal-700 text-white font-semibold shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Front</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                perspective === "anterior" ? "bg-teal-800/80 text-teal-100" : "bg-slate-200 text-slate-600"
              }`}
            >
              {totalAnterior}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (perspective !== "posterior") {
                if (focusedItem && !isItemRelevantForPerspective(focusedItem, "posterior")) {
                  onResetFocus && onResetFocus();
                }
                onPerspectiveChange("posterior");
              }
            }}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              perspective === "posterior"
                ? "bg-teal-700 text-white font-semibold shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Back</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                perspective === "posterior" ? "bg-teal-800/80 text-teal-100" : "bg-slate-200 text-slate-600"
              }`}
            >
              {totalPosterior}
            </span>
          </button>
        </div>
      </div>

      {/* Category Legend: Positioned at bottom-center */}
      <div
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full shadow-md border flex items-center gap-4 text-xs font-semibold z-10 bg-white/95 border-slate-200 text-slate-700 flex-wrap justify-center"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Lines */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 bg-emerald-50 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          </span>
          <span className="text-emerald-700 font-medium">Lines</span>
        </div>
        {/* Drains */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-pink-600 bg-pink-50 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-600" />
          </span>
          <span className="text-pink-700 font-medium">Drains</span>
        </div>
        {/* Surgeries */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 bg-indigo-50 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
          </span>
          <span className="text-indigo-700 font-medium">Surgeries</span>
        </div>
        {/* Conditions */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 bg-amber-50 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          </span>
          <span className="text-amber-700 font-medium">Conditions</span>
        </div>
        {/* Medications */}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-teal-600 bg-teal-50 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
          </span>
          <span className="text-teal-700 font-medium">Medications</span>
        </div>
      </div>

      {/* Bottom Right: Camera & Zoom Controls (Small Icons Stacked Vertically) */}
      <div
        id="tour-camera-controls"
        className="absolute bottom-4 right-4 flex flex-col items-center shadow-xs rounded-lg border border-slate-300 divide-y divide-slate-200 bg-white/95 overflow-hidden z-10"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Reset Zoom Button */}
        <button
          type="button"
          onClick={handleResetZoom}
          className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-teal-700 hover:bg-slate-50 transition-colors"
          title="Reset to baseline zoom view (Z=28.8)"
          aria-label="Reset Zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* View Lock / Unlock Toggle Button (Defaults to Locked: disables spinning & zoom) */}
        <button
          type="button"
          onClick={() => setIsLocked((l) => !l)}
          className={`w-8 h-8 flex items-center justify-center transition-colors ${
            !isLocked
              ? "text-teal-700 hover:bg-teal-50 bg-teal-50/70"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
          title={
            !isLocked
              ? "View is unlocked (drag to spin avatar, scroll to zoom). Click to lock view."
              : "View is locked (avatar spin & zoom disabled). Click to unlock to spin avatar."
          }
          aria-label={!isLocked ? "Lock view" : "Unlock view"}
        >
          {!isLocked ? (
            <Unlock className="w-3.5 h-3.5 text-teal-700" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-slate-700" />
          )}
        </button>
      </div>
    </div>
  );
}
