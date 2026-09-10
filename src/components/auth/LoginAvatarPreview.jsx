import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
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
  Crosshair,
  RotateCw,
  MoveHorizontal
} from "lucide-react";

// Representative clinical conditions & LDAs mapped across the humanoid body
const PREVIEW_ICONS = [
  {
    id: "neuro",
    label: "Migraine with Aura",
    system: "Neurology",
    status: "Controlled • Episodic Sumatriptan",
    position: [0, 6.6, 0.95],
    icon: Brain,
    color: "indigo"
  },
  {
    id: "cvc",
    label: "Right IJ Triple-Lumen CVC",
    system: "Lines & Access",
    status: "Inserted 08/29 • Chlorhexidine Dressing",
    position: [-0.75, 4.9, 1.05],
    icon: Syringe,
    color: "amber"
  },
  {
    id: "cardiac",
    label: "Coronary Artery Disease",
    system: "Cardiology",
    status: "DES to LAD (2021) • Aspirin 81mg",
    position: [-0.65, 3.65, 1.25],
    icon: Heart,
    color: "rose"
  },
  {
    id: "pulm",
    label: "Mild Persistent Asthma",
    system: "Pulmonology",
    status: "Albuterol HFA PRN • FEV1 86%",
    position: [0.85, 3.85, 1.15],
    icon: Wind,
    color: "cyan"
  },
  {
    id: "chole",
    label: "Laparoscopic Cholecystectomy",
    system: "Surgical History",
    status: "Post-Op Day 12 • Incisions Healing",
    position: [-0.85, 1.95, 1.15],
    icon: Shield,
    color: "emerald"
  },
  {
    id: "drain",
    label: "Subhepatic JP Drain #1",
    system: "Lines & Access",
    status: "Serosanguinous 35 mL/24h",
    position: [-1.4, 0.75, 1.05],
    icon: Droplets,
    color: "purple"
  },
  {
    id: "diabetes",
    label: "Type 2 Diabetes Mellitus",
    system: "Endocrinology",
    status: "HbA1c 6.8% • Metformin 1000mg",
    position: [0.1, 1.25, 1.15],
    icon: Activity,
    color: "teal"
  },
  {
    id: "hip",
    label: "Left Total Hip Arthroplasty",
    system: "Orthopedics",
    status: "Ceramic-on-Poly • Full Weight Bearing",
    position: [1.15, -1.25, 0.9],
    icon: Disc,
    color: "blue"
  },
  {
    id: "knee",
    label: "Osteoarthritis (Right Knee)",
    system: "Rheumatology",
    status: "Grade 3 KL • Meloxicam PRN",
    position: [-1.15, -4.1, 1.0],
    icon: Crosshair,
    color: "amber"
  }
];

/**
 * Continuous Clockwise Rotating Turntable with interactive pins
 * When an icon is hovered, other icons vanish and the active label is placed in the foreground.
 */
function RotatingMannequin({ hoveredId, setHoveredId }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Clockwise slow continuous rotation
      // Clockwise rotation corresponds to negative Y rotation
      // Pause or slow rotation slightly during hover so user can easily read details
      const speed = hoveredId ? 0.08 : 0.42;
      groupRef.current.rotation.y -= delta * speed;
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

      {/* Interactive Clinical Pins */}
      {PREVIEW_ICONS.map((item) => {
        const IconComponent = item.icon;
        const isHovered = hoveredId === item.id;
        const isOtherHovered = hoveredId !== null && !isHovered;

        return (
          <group key={item.id} position={item.position}>
            {/* 3D Pulse Anchor Mesh */}
            {!isOtherHovered && (
              <mesh>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial
                  color={isHovered ? "#0d9488" : "#64748b"}
                  emissive={isHovered ? "#14b8a6" : "#475569"}
                  emissiveIntensity={isHovered ? 0.8 : 0.2}
                />
              </mesh>
            )}

            {/* Interactive HTML Billboard Overlay */}
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
              <div
                onPointerEnter={(e) => {
                  e.stopPropagation();
                  setHoveredId(item.id);
                }}
                onPointerLeave={(e) => {
                  e.stopPropagation();
                  setHoveredId(null);
                }}
                className="relative cursor-pointer select-none"
              >
                {/* Active Hover State: Crisp Foreground Clinical Badge */}
                {isHovered ? (
                  <div className="relative z-50 flex flex-col items-center">
                    {/* Floating Detail Card in Foreground */}
                    <div className="mb-2 w-60 p-3 bg-white/98 backdrop-blur-md rounded-xl border-2 border-teal-600 shadow-2xl text-slate-900 text-left pointer-events-none transform -translate-y-1 transition-all">
                      <div className="flex items-center justify-between gap-1.5 mb-1 pb-1 border-b border-slate-100">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          {item.system}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>Active</span>
                        </div>
                      </div>

                      <div className="font-bold text-xs text-slate-900 leading-tight">
                        {item.label}
                      </div>

                      <div className="text-[11px] text-slate-600 font-semibold mt-1 leading-snug">
                        {item.status}
                      </div>

                      {/* Tooltip Downward Caret Arrow */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-teal-600" />
                    </div>

                    {/* Active Pulsing Pin Center */}
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/40 ring-4 ring-teal-400/30 scale-110 transition-transform">
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  /* Idle Pin State */
                  <div
                    className={`w-7 h-7 rounded-full bg-white/95 backdrop-blur-sm border border-slate-300 shadow-md flex items-center justify-center text-slate-700 hover:text-teal-700 hover:border-teal-500 hover:ring-4 hover:ring-teal-500/20 transition-all transform hover:scale-110 ${
                      isOtherHovered ? "opacity-0 pointer-events-none" : "opacity-90"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export function LoginAvatarPreview() {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] flex flex-col items-center justify-center relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100/70 via-teal-50/40 to-slate-200/50 border border-slate-200/80 shadow-inner">
      {/* Top Floating Helper Pill */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs">
          <RotateCw className="w-3.5 h-3.5 text-teal-600 animate-spin [animation-duration:9s]" />
          <span>Interactive Spatial Mannequin</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-semibold text-slate-600 shadow-xs">
          <MoveHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>Drag left/right to spin</span>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0, -0.2, 23.5], fov: 42 }}
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

      {/* Bottom Subtle Interaction Legend */}
      <div className="absolute bottom-2.5 inset-x-4 flex items-center justify-center pointer-events-none z-10">
        <span className="text-[11px] font-bold text-slate-700 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 shadow-xs text-center">
          Hover pins to inspect conditions • Drag left/right to spin 3D avatar
        </span>
      </div>
    </div>
  );
}
