import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * High-Fidelity 3D Anatomical Organs & Orthopedic Prostheses
 * Features:
 * - Heart: Physiological dual-beat lub-dub cycle with coronary vessels and aortic branches
 * - Pancreas: Duodenal C-loop, pancreatic duct, and tortuous splenic artery
 * - TKA Prosthesis: Cobalt-chrome femoral bicondylar shield, UHMWPE insert, titanium baseplate
 * - THA Prosthesis: Titanium acetabular shell, ceramic femoral head, modular stem
 */
export function OrganHighlight({ activeSystem, isFocused = false }) {
  const heartGroupRef = useRef();
  const ductMeshRef = useRef();

  // Physiological dual-beat heart rhythm
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 4.2; // ~72 BPM
    if (heartGroupRef.current) {
      // Lub-dub double pulse
      const pulse1 = Math.sin(t);
      const pulse2 = Math.sin(t + 0.55);
      const beat = Math.max(0, pulse1 * 0.07) + Math.max(0, pulse2 * 0.04);
      const s = 1.0 + beat;
      heartGroupRef.current.scale.set(s, s * 1.02, s);
    }

    if (ductMeshRef.current) {
      const glow = (Math.sin(clock.getElapsedTime() * 3.0) + 1.0) * 0.5;
      ductMeshRef.current.material.opacity = 0.6 + glow * 0.4;
    }
  });

  if (!activeSystem) return null;

  return (
    <group>
      {/* ================================================================= */}
      {/* 1. ANATOMICAL HEART (Left anterior thorax, x = 0.35, y = 4.2, z = 0.8) */}
      {/* ================================================================= */}
      {activeSystem === "cardiac" && (
        <group ref={heartGroupRef} position={[0.35, 4.2, 0.75]} rotation={[0.08, 0.15, -0.22]}>
          {/* Ventricular myocardium */}
          <mesh position={[0, -0.15, 0.05]} scale={[0.55, 0.68, 0.5]}>
            <sphereGeometry args={[0.95, 24, 24]} />
            <meshStandardMaterial
              color="#b91c1c"
              roughness={0.35}
              metalness={0.15}
              emissive="#7f1d1d"
              emissiveIntensity={0.25}
            />
          </mesh>

          {/* Right & Left Atria */}
          <mesh position={[-0.22, 0.5, -0.05]} scale={[0.42, 0.38, 0.35]}>
            <sphereGeometry args={[0.85, 20, 20]} />
            <meshStandardMaterial color="#991b1b" roughness={0.4} />
          </mesh>
          <mesh position={[0.24, 0.55, -0.08]} scale={[0.4, 0.36, 0.34]}>
            <sphereGeometry args={[0.85, 20, 20]} />
            <meshStandardMaterial color="#991b1b" roughness={0.4} />
          </mesh>

          {/* Ascending Aorta with anatomical arch */}
          <mesh position={[0.08, 0.85, -0.05]} rotation={[0, 0, -0.15]}>
            <cylinderGeometry args={[0.18, 0.2, 0.7, 20]} />
            <meshStandardMaterial color="#dc2626" roughness={0.35} />
          </mesh>

          {/* Aortic Arch & Brachiocephalic branches */}
          <mesh position={[0.02, 1.25, -0.1]} rotation={[Math.PI / 2, 0, -0.2]}>
            <torusGeometry args={[0.28, 0.14, 16, 24, Math.PI * 0.95]} />
            <meshStandardMaterial color="#dc2626" roughness={0.35} />
          </mesh>

          {/* 3 Supra-aortic Branches (Brachiocephalic, Carotid, Subclavian) */}
          {[-0.12, 0.02, 0.16].map((bx, i) => (
            <mesh key={i} position={[bx, 1.55, -0.1]} rotation={[0, 0, (i - 1) * 0.1]}>
              <cylinderGeometry args={[0.055, 0.06, 0.45, 12]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} />
            </mesh>
          ))}

          {/* Pulmonary Trunk & Bifurcation */}
          <mesh position={[-0.14, 0.75, 0.2]} rotation={[0.25, 0, -0.2]}>
            <cylinderGeometry args={[0.16, 0.18, 0.6, 16]} />
            <meshStandardMaterial color="#2563eb" roughness={0.35} />
          </mesh>

          {/* Left Anterior Descending (LAD) Coronary Artery */}
          <mesh position={[0.06, -0.05, 0.52]} rotation={[0, 0, -0.32]}>
            <cylinderGeometry args={[0.035, 0.02, 0.95, 12]} />
            <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={0.6} />
          </mesh>

          {/* Right Coronary Artery (RCA) */}
          <mesh position={[-0.24, 0.1, 0.42]} rotation={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.032, 0.02, 0.75, 12]} />
            <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={0.6} />
          </mesh>
        </group>
      )}

      {/* ================================================================= */}
      {/* 2. PANCREAS & DUODENAL C-LOOP (Epigastrium, x = 0.1, y = 2.7, z = 0.7) */}
      {/* ================================================================= */}
      {activeSystem === "endocrine" && (
        <group position={[0.1, 2.7, 0.7]}>
          {/* C-Loop Duodenum on Patient's Right (Negative X, x = -0.45) */}
          <mesh position={[-0.45, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.42, 0.14, 16, 24, Math.PI * 1.35]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.45} />
          </mesh>

          {/* Pancreatic Head (cradled in C-loop) */}
          <mesh position={[-0.25, -0.02, 0.05]} scale={[0.35, 0.42, 0.28]}>
            <sphereGeometry args={[0.8, 20, 20]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.4} />
          </mesh>

          {/* Pancreatic Body (crossing midline to Left, Positive X) */}
          <mesh position={[0.18, 0.08, 0.02]} rotation={[0, 0, -0.15]} scale={[1.1, 0.32, 0.25]}>
            <cylinderGeometry args={[0.35, 0.28, 1.4, 20]} />
            <meshStandardMaterial color="#d97706" roughness={0.4} />
          </mesh>

          {/* Pancreatic Tail (reaching toward spleen) */}
          <mesh position={[0.75, 0.25, -0.02]} scale={[0.3, 0.22, 0.2]}>
            <sphereGeometry args={[0.75, 16, 16]} />
            <meshStandardMaterial color="#b45309" roughness={0.45} />
          </mesh>

          {/* Main Pancreatic Duct (Wirsung) with luminescence */}
          <mesh ref={ductMeshRef} position={[0.12, 0.08, 0.14]} rotation={[0, 0, -0.14]}>
            <cylinderGeometry args={[0.022, 0.016, 1.35, 12]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.8}
              transparent={true}
              opacity={0.85}
            />
          </mesh>

          {/* Tortuous Splenic Artery along superior border */}
          <mesh position={[0.22, 0.28, -0.05]} rotation={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.028, 0.025, 1.45, 12]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* ================================================================= */}
      {/* 3. TOTAL KNEE ARTHROPLASTY (Right Knee, x = -0.95, y = -4.4, z = 0.5) */}
      {/* ================================================================= */}
      {(activeSystem === "orthopedic_knee" || activeSystem === "musculoskeletal") && (
        <group position={[-0.95, -4.4, 0.5]}>
          {/* Cobalt-Chrome Femoral Component (Mirror Polish Shield) */}
          <mesh position={[0, 0.22, 0.08]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.38, 0.42, 0.45, 24, 1, false, 0, Math.PI]} />
            <meshStandardMaterial
              color="#e2e8f0"
              metalness={0.95}
              roughness={0.08}
              envMapIntensity={1.8}
            />
          </mesh>

          {/* Femoral condylar rails */}
          {[-0.18, 0.18].map((cx, i) => (
            <mesh key={i} position={[cx, 0.15, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.35, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.12} />
            </mesh>
          ))}

          {/* UHMWPE Polyethylene Articular Spacer (Medical White Insert) */}
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.14, 24]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.25}
              metalness={0.05}
              transparent={true}
              opacity={0.92}
            />
          </mesh>

          {/* Titanium Tibial Baseplate Tray */}
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.44, 0.44, 0.08, 24]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.22} />
          </mesh>

          {/* Titanium Tibial Fixation Stem */}
          <mesh position={[0, -0.52, 0]}>
            <cylinderGeometry args={[0.1, 0.06, 0.55, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.28} />
          </mesh>
        </group>
      )}

      {/* ================================================================= */}
      {/* 4. TOTAL HIP ARTHROPLASTY (Left Hip, x = 1.35, y = 0.5, z = 0.3) */}
      {/* ================================================================= */}
      {activeSystem === "orthopedic_hip" && (
        <group position={[1.35, 0.5, 0.3]} rotation={[0, 0, 0.25]}>
          {/* Porous Titanium Acetabular Cup Shell */}
          <mesh position={[-0.1, 0.15, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <sphereGeometry args={[0.45, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.35} />
          </mesh>

          {/* Biolox Delta Ceramic Femoral Head (Pinkish Ceramic Ball) */}
          <mesh position={[-0.04, 0.08, 0]}>
            <sphereGeometry args={[0.3, 24, 24]} />
            <meshStandardMaterial
              color="#fbcfe8"
              roughness={0.08}
              metalness={0.15}
              clearcoat={1.0}
            />
          </mesh>

          {/* Modular Neck & Collar */}
          <mesh position={[0.12, -0.06, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.12, 0.16, 0.35, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
          </mesh>

          {/* Anatomical Press-Fit Titanium Femoral Stem */}
          <mesh position={[0.28, -0.65, 0]} rotation={[0, 0, 0.15]}>
            <cylinderGeometry args={[0.18, 0.08, 1.2, 20]} />
            <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      )}

      {/* ================================================================= */}
      {/* 5. POSTERIOR LUMBAR SPINE & TITANIUM HARDWARE (x = 0, y = 2.2, z = -0.7) */}
      {/* ================================================================= */}
      {(activeSystem === "spine" || activeSystem === "orthopedic_spine") && (
        <group position={[0.0, 2.2, -0.65]}>
          {/* Lumbar Vertebrae Stack (L3, L4, L5, S1) */}
          {[0.8, 0.25, -0.3, -0.85].map((vy, i) => (
            <group key={`vert-${i}`} position={[0, vy, 0]}>
              {/* Vertebral Body */}
              <mesh>
                <cylinderGeometry args={[0.55, 0.58, 0.42, 24]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.65} metalness={0.05} />
              </mesh>
              {/* Posterior Spinous Process */}
              <mesh position={[0, 0, -0.38]} rotation={[-0.3, 0, 0]}>
                <coneGeometry args={[0.22, 0.45, 16]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.65} />
              </mesh>
              {/* Transverse Processes */}
              <mesh position={[-0.52, 0.05, -0.1]} rotation={[0, 0, 0.2]}>
                <cylinderGeometry args={[0.1, 0.14, 0.4, 12]} />
                <meshStandardMaterial color="#fde68a" roughness={0.65} />
              </mesh>
              <mesh position={[0.52, 0.05, -0.1]} rotation={[0, 0, -0.2]}>
                <cylinderGeometry args={[0.1, 0.14, 0.4, 12]} />
                <meshStandardMaterial color="#fde68a" roughness={0.65} />
              </mesh>
              {/* Intervertebral Disc */}
              {i < 3 && (
                <mesh position={[0, -0.28, 0]}>
                  <cylinderGeometry args={[0.52, 0.52, 0.14, 24]} />
                  <meshStandardMaterial color="#94a3b8" roughness={0.4} transparent opacity={0.85} />
                </mesh>
              )}
            </group>
          ))}

          {/* Titanium Posterior Pedicle Screws & Fixation Rods (L4-S1 Fusion) */}
          {/* Bilateral Titanium Connecting Rods */}
          <mesh position={[-0.32, -0.05, -0.28]}>
            <cylinderGeometry args={[0.045, 0.045, 1.45, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.15} />
          </mesh>
          <mesh position={[0.32, -0.05, -0.28]}>
            <cylinderGeometry args={[0.045, 0.045, 1.45, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.15} />
          </mesh>

          {/* 6 Titanium Pedicle Screws (Bilateral L4, L5, S1) */}
          {[-0.32, 0.32].map((sx, si) =>
            [0.25, -0.3, -0.85].map((sy, yi) => (
              <group key={`screw-${si}-${yi}`} position={[sx, sy, -0.28]}>
                {/* Screw Tulip Head on Rod */}
                <mesh>
                  <sphereGeometry args={[0.08, 16, 16]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
                </mesh>
                {/* Screw Shank Entering Pedicle */}
                <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.04, 0.03, 0.45, 12]} />
                  <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
                </mesh>
              </group>
            ))
          )}
        </group>
      )}
    </group>
  );
}
