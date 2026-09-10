import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Avatar } from "../3d/Avatar";
import {
  Brain,
  Heart,
  Wind,
  Syringe,
  Shield,
  Activity,
  Droplets,
  Disc,
  Crosshair
} from "lucide-react";

// Representative clinical conditions & LDAs mapped anatomically (Anterior & Posterior)
const PREVIEW_ICONS = [
  // --- ANTERIOR CONDITIONS (Visible on the front) ---
  {
    id: "neuro",
    label: "Migraine with Aura",
    system: "Neurology",
    status: "Controlled • Sumatriptan",
    position: [0, 6.6, 0.95],
    normal: [0, 0, 1],
    icon: Brain
  },
  {
    id: "cvc",
    label: "Right IJ Triple-Lumen CVC",
    system: "Lines & Access",
    status: "Inserted 08/29 • Dressing Intact",
    position: [-0.75, 4.9, 1.05],
    normal: [-0.2, 0, 0.98],
    icon: Syringe
  },
  {
    id: "cardiac",
    label: "Coronary Artery Disease",
    system: "Cardiology",
    status: "DES to LAD • Aspirin 81mg",
    position: [-0.65, 3.65, 1.25],
    normal: [-0.2, 0, 0.98],
    icon: Heart
  },
  {
    id: "pulm",
    label: "Mild Persistent Asthma",
    system: "Pulmonology",
    status: "Albuterol HFA PRN • Stable",
    position: [0.85, 3.85, 1.15],
    normal: [0.2, 0, 0.98],
    icon: Wind
  },
  {
    id: "chole",
    label: "Laparoscopic Cholecystectomy",
    system: "Surgical History",
    status: "Post-Op Day 12 • Incisions Healing",
    position: [-0.85, 1.95, 1.15],
    normal: [-0.3, 0, 0.95],
    icon: Shield
  },
  {
    id: "drain",
    label: "Subhepatic JP Drain #1",
    system: "Lines & Access",
    status: "Serosanguinous 35 mL/24h",
    position: [-1.4, 0.75, 1.05],
    normal: [-0.5, 0, 0.86],
    icon: Droplets
  },
  {
    id: "diabetes",
    label: "Type 2 Diabetes Mellitus",
    system: "Endocrinology",
    status: "HbA1c 6.8% • Metformin 1000mg",
    position: [0.1, 1.25, 1.15],
    normal: [0, 0, 1],
    icon: Activity
  },
  {
    id: "hip",
    label: "Left Total Hip Arthroplasty",
    system: "Orthopedics",
    status: "Ceramic-on-Poly • Full Weight",
    position: [1.15, -1.25, 0.9],
    normal: [0.4, 0, 0.91],
    icon: Disc
  },
  {
    id: "knee",
    label: "Osteoarthritis (Right Knee)",
    system: "Rheumatology",
    status: "Grade 3 KL • Meloxicam PRN",
    position: [-1.15, -4.1, 1.0],
    normal: [-0.2, 0, 0.98],
    icon: Crosshair
  },

  // --- POSTERIOR CONDITIONS (Visible on the back) ---
  {
    id: "lumbar",
    label: "L4-S1 Posterior Lumbar Fusion",
    system: "Spine Surgery",
    status: "Pedicle Screws & Rods Intact",
    position: [0, 0.35, -0.95],
    normal: [0, 0, -1],
    icon: Shield
  },
  {
    id: "cervical",
    label: "Cervical Radiculopathy (C6-C7)",
    system: "Spine & Neuro",
    status: "Conservative PT • Stable",
    position: [0, 5.75, -0.85],
    normal: [0, 0, -1],
    icon: Brain
  },
  {
    id: "renal",
    label: "Left Renal Simple Cyst",
    system: "Nephrology",
    status: "Bosniak I (2.4 cm) • Benign",
    position: [0.95, 1.65, -0.95],
    normal: [0.35, 0, -0.93],
    icon: Activity
  }
];

/**
 * Individual Anatomical Condition Pin
 * Evaluates visibility dynamically based on anterior/posterior surface normal relative to the viewer.
 * Anchors the icon firmly so hovering does NOT displace the pin center by even a single pixel.
 */
function ConditionPin({ item, hoveredId, setHoveredId, relativeAngleRef }) {
  const pinGroupRef = useRef();
  const [isFacing, setIsFacing] = useState(true);

  useFrame(() => {
    if (!pinGroupRef.current) return;
    const alpha = relativeAngleRef.current;
    const [nx, , nz] = item.normal;
    // Dot product determines if the anatomical side is facing toward the camera
    const dot = nx * Math.sin(alpha) + nz * Math.cos(alpha);
    const facing = dot > 0.18;

    if (pinGroupRef.current.visible !== facing) {
      pinGroupRef.current.visible = facing;
      setIsFacing(facing);
    }
  });

  const IconComponent = item.icon;
  const isHovered = hoveredId === item.id;
  const isOtherHovered = hoveredId !== null && !isHovered;

  if (!isFacing) return null;

  return (
    <group ref={pinGroupRef} position={item.position}>
      {/* 3D Anchor Sphere */}
      {!isOtherHovered && (
        <mesh>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial
            color={isHovered ? "#0d9488" : "#64748b"}
            emissive={isHovered ? "#14b8a6" : "#475569"}
            emissiveIntensity={isHovered ? 0.9 : 0.25}
          />
        </mesh>
      )}

      {/* HTML Overlay with fixed coordinate anchor to prevent ANY icon movement */}
      <Html
        center
        distanceFactor={27}
        zIndexRange={isHovered ? [9999, 9000] : [100, 0]}
        style={{
          pointerEvents: isOtherHovered ? "none" : "auto",
          transition: "opacity 0.2s ease-in-out",
          opacity: isOtherHovered ? 0 : 1
        }}
      >
        {/* Fixed 28x28 container keeps pin precisely stationary */}
        <div className="w-7 h-7 relative flex items-center justify-center select-none">
          {/* Circular Pin Button */}
          <div
            onPointerEnter={(e) => {
              e.stopPropagation();
              setHoveredId(item.id);
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              setHoveredId(null);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 ${
              isHovered
                ? "bg-teal-600 text-white shadow-lg ring-4 ring-teal-400/40"
                : "bg-white/95 text-slate-700 border border-slate-300 shadow-md hover:border-teal-500 hover:text-teal-700"
            }`}
          >
            <IconComponent className="w-3.5 h-3.5" />
          </div>

          {/* Compact Foreground Detail Box - Smaller, does NOT displace pin */}
          {isHovered && (
            <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-48 p-2 bg-white/98 backdrop-blur-md rounded-xl border-2 border-teal-600 shadow-xl text-slate-900 text-left pointer-events-none z-50">
              <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  {item.system}
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
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-teal-600" />
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

/**
 * Continuous Clockwise Rotating Turntable
 * - Slowed rotation speed by 50% (speed = 0.21)
 * - Completely halts rotation when an item is hovered
 * - Maintains anterior / posterior visibility dynamically
 */
function RotatingMannequin({ hoveredId, setHoveredId }) {
  const groupRef = useRef();
  const relativeAngleRef = useRef(0);

  useFrame(({ camera }, delta) => {
    if (groupRef.current) {
      // Completely STOP rotating when hovering over an item
      if (!hoveredId) {
        // Slow rotation speed by 50% (0.42 * 0.5 = 0.21)
        groupRef.current.rotation.y -= delta * 0.21;
      }

      // Compute relative angle between avatar and camera
      const cameraAzimuth = Math.atan2(camera.position.x, camera.position.z);
      relativeAngleRef.current = groupRef.current.rotation.y - cameraAzimuth;
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

      {/* Anatomically Positioned Pins */}
      {PREVIEW_ICONS.map((item) => (
        <ConditionPin
          key={item.id}
          item={item}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          relativeAngleRef={relativeAngleRef}
        />
      ))}
    </group>
  );
}

export function LoginAvatarPreview() {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] flex flex-col items-center justify-center relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100/70 via-teal-50/40 to-slate-200/50 border border-slate-200/80 shadow-inner">
      {/* 3D WebGL Canvas: Zoomed out by 15% (position 23.5 -> 27.0) */}
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

        {/* Continuous Clockwise Rotating Avatar with Pins */}
        <RotatingMannequin
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      </Canvas>
    </div>
  );
}
