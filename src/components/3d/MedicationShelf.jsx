import React, { useState, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MarkerPin } from "./MarkerPin";

export const TIER_CAPACITY = 3;
export const TIER_HEIGHT = 1.7;
export const SHELF_BASE_X = -5.0;
export const SHELF_BASE_Y = -6.5;
export const SHELF_BASE_Z = 0.5;

/**
 * Calculates world coordinates for each medication bottle on the shelf.
 * Arranged in vertical tiers: maximum of 3 medications per horizontal shelf level.
 * Additional shelves stack upward vertically as medications increase.
 * All bottles remain on the front Z-plane (Z = 0.5) for 100% visibility and easy clicking.
 */
export function getMedicationBottleCoords(index, total) {
  const tierIndex = Math.floor(index / TIER_CAPACITY);
  const colIndex = index % TIER_CAPACITY;

  // Number of bottles on this specific tier
  const remainingMeds = total - tierIndex * TIER_CAPACITY;
  const countOnThisTier = Math.min(TIER_CAPACITY, Math.max(1, remainingMeds));

  const bottleSpacing = 1.35;
  const startX = SHELF_BASE_X - ((countOnThisTier - 1) * bottleSpacing) / 2;
  const bottleX = startX + colIndex * bottleSpacing;
  const bottleY = SHELF_BASE_Y + tierIndex * TIER_HEIGHT + 0.56;

  return {
    x: Number(bottleX.toFixed(3)),
    y: Number(bottleY.toFixed(3)),
    z: SHELF_BASE_Z
  };
}

/**
 * Generates an authentic high-resolution prescription vial label texture
 */
function createPrescriptionLabelTexture(drugName, dosage) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // Clean white label background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 256);

  // Top clinical teal header banner
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(0, 0, 512, 38);

  // Pharmacy / Rx Header text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText("PHARMACY DISPENSARY • RX ONLY", 16, 26);

  // Large Rx Symbol
  ctx.fillStyle = "#0f766e";
  ctx.font = "bold 44px serif";
  ctx.fillText("℞", 20, 88);

  // Drug Name in bold capital letters
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 26px system-ui, sans-serif";
  const displayDrug = drugName.length > 18 ? drugName.substring(0, 17) + "…" : drugName;
  ctx.fillText(displayDrug.toUpperCase(), 75, 78);

  // Dosage & Route line
  ctx.fillStyle = "#334155";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText(dosage || "Standard Dose", 75, 108);

  // Dividing rule
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 124);
  ctx.lineTo(492, 124);
  ctx.stroke();

  // Simulated prescription instructions lines
  ctx.fillStyle = "#64748b";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("TAKE AS DIRECTED BY PRESCRIBING PHYSICIAN", 20, 148);
  ctx.fillText("KEEP OUT OF REACH OF CHILDREN • STORE AT 20-25°C", 20, 168);

  // Simulated barcode stripes on bottom
  ctx.fillStyle = "#1e293b";
  let barX = 20;
  while (barX < 490) {
    const barWidth = ((barX * 7) % 3) + 2;
    ctx.fillRect(barX, 185, barWidth, 52);
    barX += barWidth + ((barX % 5) + 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/**
 * 3D Pharmacy Bottle (Enlarged by 50% with animated hover/focus lift)
 */
function PharmacyBottle({
  medication,
  coords,
  isFocused = false,
  onSelect,
  onClose,
  onEdit,
  onHover
}) {
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef();

  // Generate dynamic canvas label texture once
  const labelTexture = useMemo(() => {
    return createPrescriptionLabelTexture(medication.name, medication.dosage);
  }, [medication.name, medication.dosage]);

  // Enhanced pulsing animation for selected bottle's base halo (+50% scale amplitude)
  useFrame(({ clock }) => {
    if (isFocused && ringRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 4.2) * 0.12;
      ringRef.current.scale.set(1 + pulse, 1 + pulse, 1);
    }
  });

  return (
    <group position={[coords.x, coords.y, coords.z]}>
      {/* Interactive Bottle Mesh Group: 50% larger with 50% larger animation lift & scale */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect && onSelect({ ...medication, itemType: "medication", coords });
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
          onHover && onHover({ ...medication, badgeColor: "#0f766e", category: "medication", coords });
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "default";
          onHover && onHover(null);
        }}
        scale={hovered || isFocused ? 1.15 : 1.0}
        position={[0, hovered || isFocused ? 0.10 : 0, 0]}
      >
        {/* 1. Translucent Amber Prescription Vial Cylinder (50% larger: r=0.33, h=0.98) */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.33, 0.33, 0.98, 32]} />
          <meshStandardMaterial
            color="#b45309"
            roughness={0.15}
            metalness={0.05}
            transparent={true}
            opacity={0.88}
            emissive={isFocused ? "#b45309" : "#000000"}
            emissiveIntensity={isFocused ? 0.3 : 0}
          />
        </mesh>

        {/* 2. Interior Pills/Capsules (50% larger) visible through translucent amber glass */}
        <mesh position={[0.075, -0.22, 0.06]} rotation={[0.4, 0.2, 0.5]}>
          <cylinderGeometry args={[0.06, 0.06, 0.18, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[-0.075, -0.27, -0.045]} rotation={[-0.3, 0.6, 0.2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.18, 12]} />
          <meshStandardMaterial color="#0d9488" roughness={0.3} />
        </mesh>
        <mesh position={[0.03, -0.33, -0.075]} rotation={[0.6, -0.4, 0.3]}>
          <sphereGeometry args={[0.075, 14, 14]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.3} />
        </mesh>

        {/* 3. White Prescription Label wrapped around front (~270 deg) (50% larger) */}
        <mesh position={[0, -0.03, 0]} rotation={[0, Math.PI * 0.75, 0]}>
          <cylinderGeometry args={[0.338, 0.338, 0.66, 32, 1, true, 0, Math.PI * 1.55]} />
          <meshStandardMaterial
            map={labelTexture}
            roughness={0.4}
            metalness={0.02}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 4. White Child-Resistant Safety Cap with grip ring (50% larger) */}
        <group position={[0, 0.57, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.225, 32]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.3}
              metalness={0.05}
            />
          </mesh>
          {/* Cap top rim ridge */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.368, 0.368, 0.03, 32]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* 5. Focused Base Halo Ring on the shelf (Scaled 50% larger) */}
      {isFocused && (
        <group position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh ref={ringRef}>
            <ringGeometry args={[0.39, 0.53, 32]} />
            <meshBasicMaterial color="#0d9488" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <circleGeometry args={[0.53, 32]} />
            <meshBasicMaterial color="#0d9488" transparent opacity={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Modern Clinical Pharmacy Shelf mounted on bottom-left near avatar
 * Scaled 50% larger with clean clinical appearance (active prescriptions label removed)
 */
export function MedicationShelf({
  medications = [],
  focusedItem = null,
  onSelectMedication,
  onClose,
  onEdit,
  onHover
}) {
  const count = medications.length;
  if (count === 0) return null;

  const numTiers = Math.max(1, Math.ceil(count / TIER_CAPACITY));
  const shelfCenter = { x: SHELF_BASE_X, y: SHELF_BASE_Y, z: SHELF_BASE_Z };
  const shelfWidth = 4.8;
  const shelfDepth = 1.1;

  // Pre-calculate world coords for each medication
  const medsWithCoords = useMemo(() => {
    return medications.map((med, idx) => ({
      ...med,
      coords: getMedicationBottleCoords(idx, count)
    }));
  }, [medications, count]);

  // Support pillar geometry calculated dynamically from total tiers
  const totalPillarHeight = (numTiers - 1) * TIER_HEIGHT + 1.25;
  const pillarCenterY = ((numTiers - 1) * TIER_HEIGHT) / 2 - 0.05;

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Tour Anchor Element covering the Pharmacy Shelf & Prescription Bottles */}
      <Html
        position={[shelfCenter.x, shelfCenter.y + ((numTiers - 1) * TIER_HEIGHT) / 2 + 0.55, shelfCenter.z]}
        center
        distanceFactor={28}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          id="tour-pharmacy-shelf"
          className="rounded-2xl pointer-events-none"
          style={{
            width: "340px",
            height: `${140 + (numTiers - 1) * 70}px`
          }}
        />
      </Html>

      {/* ======================================================== */}
      {/* 1. PHYSICAL SHELF STRUCTURE (Multi-Tier Frosted Glass)   */}
      {/* ======================================================== */}
      <group position={[shelfCenter.x, shelfCenter.y, shelfCenter.z]}>
        {Array.from({ length: numTiers }).map((_, tierIdx) => {
          const tierY = tierIdx * TIER_HEIGHT;
          return (
            <group key={`shelf-tier-${tierIdx}`} position={[0, tierY, 0]}>
              {/* White Frosted Glass / Porcelain Shelf Slab */}
              <mesh position={[0, 0.08, 0]} receiveShadow>
                <boxGeometry args={[shelfWidth, 0.12, shelfDepth]} />
                <meshStandardMaterial
                  color="#ffffff"
                  roughness={0.15}
                  metalness={0.1}
                />
              </mesh>
              {/* Teal Clinical Accent Edge Trim */}
              <mesh position={[0, 0.13, 0.54]}>
                <boxGeometry args={[shelfWidth + 0.02, 0.025, 0.025]} />
                <meshStandardMaterial color="#0f766e" metalness={0.4} roughness={0.3} />
              </mesh>
            </group>
          );
        })}

        {/* Polished Stainless Steel Vertical Support Pillars */}
        <mesh position={[-2.1, pillarCenterY, 0]}>
          <cylinderGeometry args={[0.045, 0.045, totalPillarHeight, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[2.1, pillarCenterY, 0]}>
          <cylinderGeometry args={[0.045, 0.045, totalPillarHeight, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Base Floor Mount Brackets */}
        <mesh position={[-2.1, -0.58, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.1, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[2.1, -0.58, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.1, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 2. PHARMACY MEDICATION BOTTLES                           */}
      {/* ======================================================== */}
      {medsWithCoords.map((med) => (
        <PharmacyBottle
          key={med.id}
          medication={med}
          coords={med.coords}
          isFocused={focusedItem?.id === med.id}
          onSelect={onSelectMedication}
          onClose={onClose}
          onEdit={onEdit}
          onHover={onHover}
        />
      ))}

      {/* ======================================================== */}
      {/* 3. FOCUSED MEDICATION FLANK CALLOUT & DIRECT VECTOR LINE  */}
      {/* ======================================================== */}
      {(() => {
        if (!focusedItem) return null;
        const focusedMed = medsWithCoords.find((m) => m.id === focusedItem.id) || (focusedItem.itemType === "medication" ? focusedItem : null);
        if (!focusedMed) return null;

        const bottleCoords = focusedMed.coords || { x: -5.0, y: -6.5, z: 0.5 };
        return (
          <MarkerPin
            key={`focused-med-${focusedMed.id}`}
            item={{
              ...focusedMed,
              itemType: "medication",
              // Vector starts precisely from the top white safety cap of this bottle
              coords: {
                x: bottleCoords.x,
                y: Number((bottleCoords.y + 0.65).toFixed(3)),
                z: bottleCoords.z
              }
            }}
            type="medication"
            isFocused={true}
            hideUnfocusedBadge={true}
            turntableAngle={0}
            onSelect={onSelectMedication}
            onClose={onClose}
            onEdit={onEdit}
            onHover={onHover}
          />
        );
      })()}
    </group>
  );
}
