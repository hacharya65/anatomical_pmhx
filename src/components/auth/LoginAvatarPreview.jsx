import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Avatar } from "../3d/Avatar";
// Category styling and authentic SVG icons identical to MarkerPin.jsx on the main demo screen
const CATEGORY_CONFIG = {
  line: {
    color: "#16a34a",
    border: "#15803d",
    bg: "#f0fdf4",
    label: "Line / Access",
    renderIcon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10v14a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V4Z" />
        <path d="M10 2h4" />
        <path d="M12 11v6" />
        <path d="M9 14h6" />
      </svg>
    )
  },
  drain: {
    color: "#db2777",
    border: "#be185d",
    bg: "#fdf2f8",
    label: "Drain / Tube",
    renderIcon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6" />
        <circle cx="12" cy="14" r="6" />
        <path d="M12 11v4" />
        <path d="M10 13h4" />
      </svg>
    )
  },
  surgery: {
    color: "#4f46e5",
    border: "#4338ca",
    bg: "#eef2ff",
    label: "Surgery",
    renderIcon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14 4 7 7-9 9H5v-7l9-9Z" />
        <path d="m11 7 6 6" />
      </svg>
    )
  },
  condition: {
    color: "#d97706",
    border: "#b45309",
    bg: "#fffbeb",
    label: "Condition",
    renderIcon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    )
  }
};

// Representative clinical conditions & LDAs mapped across the mannequin
// Note: Migraine removed per user request; icons remain persistently visible across all rotations
const PREVIEW_ICONS = [
  {
    id: "cvc",
    label: "Right IJ Triple-Lumen CVC",
    category: "line",
    system: "Lines & Access",
    status: "Inserted 08/29 • Dressing Intact",
    position: [-0.75, 4.9, 1.05]
  },
  {
    id: "cardiac",
    label: "Coronary Artery Disease",
    category: "condition",
    system: "Cardiology",
    status: "DES to LAD • Aspirin 81mg",
    position: [-0.65, 3.65, 1.25]
  },
  {
    id: "pulm",
    label: "Mild Persistent Asthma",
    category: "condition",
    system: "Pulmonology",
    status: "Albuterol HFA PRN • Stable",
    position: [0.85, 3.85, 1.15]
  },
  {
    id: "chole",
    label: "Laparoscopic Cholecystectomy",
    category: "surgery",
    system: "Surgical History",
    status: "Post-Op Day 12 • Incisions Healing",
    position: [-0.85, 1.95, 1.15]
  },
  {
    id: "drain",
    label: "Subhepatic JP Drain #1",
    category: "drain",
    system: "Lines & Access",
    status: "Serosanguinous 35 mL/24h",
    position: [-1.4, 0.75, 1.05]
  },
  {
    id: "diabetes",
    label: "Type 2 Diabetes Mellitus",
    category: "condition",
    system: "Endocrinology",
    status: "HbA1c 6.8% • Metformin 1000mg",
    position: [0.1, 1.25, 1.15]
  },
  {
    id: "hip",
    label: "Left Total Hip Arthroplasty",
    category: "surgery",
    system: "Orthopedics",
    status: "Ceramic-on-Poly • Full Weight",
    position: [1.15, -1.25, 0.9]
  },
  {
    id: "knee",
    label: "Osteoarthritis (Right Knee)",
    category: "condition",
    system: "Rheumatology",
    status: "Grade 3 KL • Meloxicam PRN",
    position: [-1.15, -4.1, 1.0]
  },
  {
    id: "lumbar",
    label: "L4-S1 Posterior Lumbar Fusion",
    category: "surgery",
    system: "Spine Surgery",
    status: "Pedicle Screws & Rods Intact",
    position: [0, 0.35, -0.95]
  },
  {
    id: "renal",
    label: "Left Renal Simple Cyst",
    category: "condition",
    system: "Nephrology",
    status: "Bosniak I (2.4 cm) • Benign",
    position: [0.95, 1.65, -0.95]
  }
];

/**
 * Individual Clinical Condition Pin
 * - Identical size (w-7 h-7, distanceFactor 24) and colorful icons as seen on demo screen avatar
 * - Persistently visible across all full 360-degree rotations (never disappears)
 * - Fixed 28x28px container keeps pin precisely stationary when hovered
 * - Smaller, sleek floating detail card in the foreground
 */
function ConditionPin({ item, hoveredId, setHoveredId }) {
  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.condition;
  const isHovered = hoveredId === item.id;
  const isOtherHovered = hoveredId !== null && !isHovered;

  return (
    <group position={item.position}>
      {/* 3D Anchor Sphere - Identical to MarkerPin.jsx (radius 0.065, color matching category) */}
      {!isOtherHovered && (
        <mesh>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshBasicMaterial color={config.color} />
        </mesh>
      )}

      {/* HTML Overlay with fixed coordinate anchor to prevent ANY icon movement */}
      <Html
        center
        distanceFactor={24}
        zIndexRange={isHovered ? [9999, 9000] : [100, 0]}
        style={{
          pointerEvents: isOtherHovered ? "none" : "auto",
          transition: "opacity 0.2s ease-in-out",
          opacity: isOtherHovered ? 0 : 1
        }}
      >
        {/* Fixed 28x28 container keeps pin precisely stationary */}
        <div className="w-7 h-7 relative flex items-center justify-center select-none">
          {/* Circular Pin Button - Identical w-7 h-7 circular badge with 2px border & colorful category styling */}
          <div
            onPointerEnter={(e) => {
              e.stopPropagation();
              setHoveredId(item.id);
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              setHoveredId(null);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-transform duration-150 ${
              isHovered ? "scale-110" : "scale-100"
            }`}
            style={{
              backgroundColor: config.bg,
              border: `2px solid ${config.border}`,
              color: config.color,
              boxShadow: isHovered
                ? `0 0 12px ${config.color}88, 0 4px 10px rgba(0,0,0,0.15)`
                : "0 2px 6px rgba(0,0,0,0.12)"
            }}
          >
            {config.renderIcon()}
          </div>

          {/* Compact Foreground Detail Box - Sleek, does NOT displace pin */}
          {isHovered && (
            <div
              className="absolute bottom-9 left-1/2 -translate-x-1/2 w-48 p-2 bg-white/98 backdrop-blur-md rounded-xl border-2 shadow-xl text-slate-900 text-left pointer-events-none z-50"
              style={{ borderColor: config.border }}
            >
              <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-slate-100">
                <span
                  className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border"
                  style={{
                    backgroundColor: config.bg,
                    borderColor: config.border,
                    color: config.color
                  }}
                >
                  {item.system || config.label}
                </span>
                <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Active</span>
                </div>
              </div>

              <div className="font-bold text-[11px] text-slate-900 leading-tight">
                {item.label}
              </div>

              <div className="text-[10px] text-slate-600 font-medium mt-0.5 leading-snug">
                {item.status}
              </div>

              {/* Caret Pointer */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px]"
                style={{ borderTopColor: config.border }}
              />
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

/**
 * Continuous Clockwise Rotating Turntable
 * - Icons remain persistently visible across all 360-degree rotations
 * - Completely halts rotation when an item is hovered
 * - Slow continuous rotation speed (0.21)
 */
function RotatingMannequin({ hoveredId, setHoveredId }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (groupRef.current && !hoveredId) {
      // Rotation halts completely when an item is hovered
      groupRef.current.rotation.y -= delta * 0.21;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Porcelain Anatomical Avatar */}
      <Avatar
        profile={{
          sex: "female",
          build: "medium",
          skinTone: "#f8fafc"
        }}
        isDeepDive={false}
      />

      {/* Ground Pedestal Shadow / Ring */}
      <mesh position={[0, -8.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 3.8, 32]} />
        <meshBasicMaterial color="#cbd5e1" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, -8.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.2, 32]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.15} />
      </mesh>

      {/* Anatomically Positioned Pins - Persistently visible throughout full rotation */}
      {PREVIEW_ICONS.map((item) => (
        <ConditionPin
          key={item.id}
          item={item}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      ))}
    </group>
  );
}

export function LoginAvatarPreview() {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] flex flex-col items-center justify-center relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100/70 via-teal-50/40 to-slate-200/50 border border-slate-200/80 shadow-inner">
      {/* 3D WebGL Canvas: Zoomed out by 15% (position 27.0) */}
      <Canvas
        camera={{ position: [0, -0.2, 27.0], fov: 42 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Medical Studio Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 9, 6]} intensity={1.1} />
        <directionalLight position={[-6, 5, -4]} intensity={0.45} />
        <pointLight position={[0, -2, 5]} intensity={0.5} color="#e0f2fe" />

        {/* OrbitControls: Left/Right Horizontal Spin Only, strictly NO zoom, NO vertical movement */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          enableDamping={true}
          dampingFactor={0.08}
          target={[0, -0.2, 0]}
        />

        {/* Continuous Clockwise Rotating Avatar with Persistent Pins */}
        <RotatingMannequin
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      </Canvas>
    </div>
  );
}
