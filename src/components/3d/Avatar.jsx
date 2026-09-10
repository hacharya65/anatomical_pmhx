import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Professional Anatomical Humanoid Avatar
 * Faithful to Epic's clean, continuous anatomical mannequin figure:
 * - Eliminates disjointed balls and stick-like primitives in favor of continuous, overlapping anatomical contouring
 * - Graceful classical standing posture with arms abducted ~14° and palms facing forward
 * - Elegant torso with natural chest contours, tapered waist, pelvic curve, and contoured extremities
 * - Porcelain-white clinical medical shader with subtle ambient occlusion
 */
export function Avatar({
  profile = {},
  isDeepDive = false,
  activeSystem = null
}) {
  const {
    sex = "female",
    age = 58,
    build = "medium",
    skinTone = "#f8fafc"
  } = profile;

  // Proportions
  const morph = useMemo(() => {
    let shoulderW = 0.96;
    let waistW = 0.88;
    let hipW = 1.12;

    if (sex === "male") {
      shoulderW = 1.15;
      waistW = 1.0;
      hipW = 0.98;
    } else if (sex === "neutral") {
      shoulderW = 1.0;
      waistW = 0.94;
      hipW = 1.04;
    }

    let buildMult = 1.0;
    if (build === "lean") buildMult = 0.92;
    if (build === "heavy") buildMult = 1.18;

    return {
      shoulderW: shoulderW * buildMult,
      waistW: waistW * buildMult,
      hipW: hipW * buildMult,
      depth: buildMult
    };
  }, [sex, build]);

  // Unified Porcelain Medical Shader (smooth, elegant, seamless)
  const skinMaterial = useMemo(() => {
    const baseColor = skinTone === "#d4a373" || !skinTone ? "#f8fafc" : skinTone;
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor),
      roughness: 0.36,
      metalness: 0.05,
      transparent: isDeepDive,
      opacity: isDeepDive ? 0.22 : 1.0,
      depthWrite: !isDeepDive,
      side: THREE.DoubleSide
    });
  }, [skinTone, isDeepDive]);

  return (
    <group position={[0, 0, 0]}>
      {/* ================================================================= */}
      {/* 1. CRANIUM, FACE & JAW */}
      {/* ================================================================= */}
      <group position={[0, 7.6, 0]}>
        {/* Cranial vault */}
        <mesh position={[0, 0.22, -0.05]} material={skinMaterial}>
          <sphereGeometry args={[1.05, 36, 36]} />
        </mesh>
        {/* Mid-face and cheeks (continuous blend) */}
        <mesh position={[0, -0.15, 0.12]} scale={[0.88, 0.85, 0.85]} material={skinMaterial}>
          <sphereGeometry args={[0.92, 32, 32]} />
        </mesh>
        {/* Lower jaw & chin */}
        <mesh position={[0, -0.55, 0.22]} scale={[0.68, 0.65, 0.72]} material={skinMaterial}>
          <sphereGeometry args={[0.78, 28, 28]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 2. CERVICAL NECK & CLAVICLES */}
      {/* ================================================================= */}
      <group position={[0, 6.25, 0]}>
        {/* Tapered cervical column */}
        <mesh position={[0, 0.1, 0]} material={skinMaterial}>
          <cylinderGeometry args={[0.54 * morph.shoulderW, 0.68 * morph.shoulderW, 1.45, 32]} />
        </mesh>
        {/* Clavicle base flare */}
        <mesh position={[0, -0.45, 0.02]} scale={[1.45 * morph.shoulderW, 0.45, 0.85]} material={skinMaterial}>
          <sphereGeometry args={[0.85, 32, 32]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 3. CONTINUOUS SCULPTED TORSO & PELVIS */}
      {/* ================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Upper Thorax / Chest */}
        <mesh
          position={[0, 4.85, 0.04]}
          scale={[1.68 * morph.shoulderW, 1.15, 1.02 * morph.depth]}
          material={skinMaterial}
        >
          <sphereGeometry args={[1.2, 36, 36]} />
        </mesh>

        {/* Anatomical Breast Contours (Matching Epic reference screenshot) */}
        {sex !== "male" && (
          <group position={[0, 4.65, 0.72 * morph.depth]}>
            {/* Left Breast (Viewer's Right, X > 0) */}
            <mesh position={[0.58 * morph.shoulderW, 0, 0]} scale={[0.54, 0.5, 0.52]} material={skinMaterial}>
              <sphereGeometry args={[0.76, 28, 28]} />
            </mesh>
            {/* Right Breast (Viewer's Left, X < 0) */}
            <mesh position={[-0.58 * morph.shoulderW, 0, 0]} scale={[0.54, 0.5, 0.52]} material={skinMaterial}>
              <sphereGeometry args={[0.76, 28, 28]} />
            </mesh>
          </group>
        )}

        {/* Mid Thorax / Ribcage (smooth seamless transition) */}
        <mesh
          position={[0, 3.8, 0]}
          scale={[1.5 * morph.waistW, 1.25, 0.95 * morph.depth]}
          material={skinMaterial}
        >
          <cylinderGeometry args={[1.15, 1.02, 1.6, 36]} />
        </mesh>

        {/* Waist & Epigastrium (natural indentation) */}
        <mesh
          position={[0, 2.7, 0]}
          scale={[1.36 * morph.waistW, 1.25, 0.92 * morph.depth]}
          material={skinMaterial}
        >
          <cylinderGeometry args={[1.02, 1.18, 1.5, 36]} />
        </mesh>

        {/* Pelvic Bowl & Hips (smooth flare) */}
        <mesh
          position={[0, 1.35, -0.02]}
          scale={[1.68 * morph.hipW, 1.2, 1.06 * morph.depth]}
          material={skinMaterial}
        >
          <sphereGeometry args={[1.22, 36, 36]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 4. UPPER EXTREMITIES (Neutral anatomical stance on outside of hips) */}
      {/* ================================================================= */}
      {/* LEFT ARM (Viewer's Right, X > 0) */}
      <group position={[1.88 * morph.shoulderW, 4.95, 0]}>
        {/* Shoulder Deltoid Contour */}
        <mesh position={[0.15, -0.15, 0]} scale={[0.9, 1.1, 0.9]} material={skinMaterial}>
          <sphereGeometry args={[0.62 * morph.shoulderW, 32, 32]} />
        </mesh>

        {/* Upper Arm: Angled outward away from midline to clear the torso and hips */}
        <group position={[0.22, -0.95, 0]} rotation={[0, 0, 0.16]}>
          {/* Brachium (seamless tapered cylinder) */}
          <mesh position={[0, -0.65, 0]} material={skinMaterial}>
            <cylinderGeometry args={[0.42 * morph.depth, 0.35 * morph.depth, 1.85, 28]} />
          </mesh>

          {/* Elbow (smooth blended contour) */}
          <mesh position={[0, -1.55, 0]} scale={[0.92, 1.05, 0.9]} material={skinMaterial}>
            <sphereGeometry args={[0.36 * morph.depth, 24, 24]} />
          </mesh>

          {/* Forearm: Positioned on the outside of the hips in neutral stance */}
          <group position={[0, -1.6, 0]} rotation={[0, 0, 0.05]}>
            <mesh position={[0, -0.9, 0]} material={skinMaterial}>
              <cylinderGeometry args={[0.35 * morph.depth, 0.28 * morph.depth, 1.95, 28]} />
            </mesh>

            {/* Wrist */}
            <mesh position={[0, -1.9, 0]} scale={[1.0, 0.85, 0.8]} material={skinMaterial}>
              <sphereGeometry args={[0.28 * morph.depth, 20, 20]} />
            </mesh>

            {/* Anatomical Hand & Fingers (Outside hips, palms facing anteriorly Z+) */}
            <group position={[0, -2.45, 0.02]}>
              {/* Hand Palm Contour */}
              <mesh position={[0, 0, 0]} scale={[0.42, 0.65, 0.16]} material={skinMaterial}>
                <sphereGeometry args={[0.65, 24, 24]} />
              </mesh>
              {/* Lateral Thumb extending outward away from hip */}
              <mesh position={[0.28, 0.05, 0.02]} rotation={[0, 0, -0.65]} scale={[0.1, 0.35, 0.1]} material={skinMaterial}>
                <capsuleGeometry args={[0.5, 0.6, 12, 16]} />
              </mesh>
              {/* 4 Continuous Fingers pointing downward */}
              {[-0.14, -0.05, 0.05, 0.14].map((fx, i) => (
                <mesh
                  key={i}
                  position={[fx * 1.1, -0.55 - (i === 1 || i === 2 ? 0.08 : 0), 0]}
                  rotation={[0, 0, (i - 1.5) * -0.04]}
                  scale={[0.075, 0.45, 0.075]}
                  material={skinMaterial}
                >
                  <capsuleGeometry args={[0.5, 0.8, 12, 16]} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      </group>

      {/* RIGHT ARM (Viewer's Left, X < 0) */}
      <group position={[-1.88 * morph.shoulderW, 4.95, 0]}>
        {/* Shoulder Deltoid Contour */}
        <mesh position={[-0.15, -0.15, 0]} scale={[0.9, 1.1, 0.9]} material={skinMaterial}>
          <sphereGeometry args={[0.62 * morph.shoulderW, 32, 32]} />
        </mesh>

        {/* Upper Arm: Angled outward away from midline to clear the torso and hips */}
        <group position={[-0.22, -0.95, 0]} rotation={[0, 0, -0.16]}>
          {/* Brachium (seamless tapered cylinder) */}
          <mesh position={[0, -0.65, 0]} material={skinMaterial}>
            <cylinderGeometry args={[0.42 * morph.depth, 0.35 * morph.depth, 1.85, 28]} />
          </mesh>

          {/* Elbow (smooth blended contour) */}
          <mesh position={[0, -1.55, 0]} scale={[0.92, 1.05, 0.9]} material={skinMaterial}>
            <sphereGeometry args={[0.36 * morph.depth, 24, 24]} />
          </mesh>

          {/* Forearm: Positioned on the outside of the hips in neutral stance */}
          <group position={[0, -1.6, 0]} rotation={[0, 0, -0.05]}>
            <mesh position={[0, -0.9, 0]} material={skinMaterial}>
              <cylinderGeometry args={[0.35 * morph.depth, 0.28 * morph.depth, 1.95, 28]} />
            </mesh>

            {/* Wrist */}
            <mesh position={[0, -1.9, 0]} scale={[1.0, 0.85, 0.8]} material={skinMaterial}>
              <sphereGeometry args={[0.28 * morph.depth, 20, 20]} />
            </mesh>

            {/* Anatomical Hand & Fingers (Outside hips, palms facing anteriorly Z+) */}
            <group position={[0, -2.45, 0.02]}>
              {/* Hand Palm Contour */}
              <mesh position={[0, 0, 0]} scale={[0.42, 0.65, 0.16]} material={skinMaterial}>
                <sphereGeometry args={[0.65, 24, 24]} />
              </mesh>
              {/* Lateral Thumb extending outward away from hip */}
              <mesh position={[-0.28, 0.05, 0.02]} rotation={[0, 0, 0.65]} scale={[0.1, 0.35, 0.1]} material={skinMaterial}>
                <capsuleGeometry args={[0.5, 0.6, 12, 16]} />
              </mesh>
              {/* 4 Continuous Fingers pointing downward */}
              {[-0.14, -0.05, 0.05, 0.14].map((fx, i) => (
                <mesh
                  key={i}
                  position={[fx * 1.1, -0.55 - (i === 1 || i === 2 ? 0.08 : 0), 0]}
                  rotation={[0, 0, (i - 1.5) * 0.04]}
                  scale={[0.075, 0.45, 0.075]}
                  material={skinMaterial}
                >
                  <capsuleGeometry args={[0.5, 0.8, 12, 16]} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      </group>

      {/* ================================================================= */}
      {/* 5. LOWER EXTREMITIES (Seamless continuous legs, knees, and feet) */}
      {/* ================================================================= */}
      {/* LEFT LEG (Viewer's Right, X > 0) */}
      <group position={[0.92 * morph.hipW, 0.45, 0]}>
        {/* Thigh (Anatomical taper from trochanter to distal femur) */}
        <mesh position={[0, -1.9, 0]} material={skinMaterial}>
          <cylinderGeometry args={[0.65 * morph.depth, 0.5 * morph.depth, 3.8, 32]} />
        </mesh>

        {/* Knee & Patellar Contour (Smooth anatomical blend, not a ball!) */}
        <group position={[0, -3.95, 0]}>
          <mesh position={[0, 0, 0]} scale={[1.0, 1.1, 0.95]} material={skinMaterial}>
            <sphereGeometry args={[0.48 * morph.depth, 28, 28]} />
          </mesh>
          <mesh position={[0, 0.06, 0.28]} scale={[0.65, 0.8, 0.3]} material={skinMaterial}>
            <sphereGeometry args={[0.42, 20, 20]} />
          </mesh>
        </group>

        {/* Lower Leg (Gastrocnemius calf curve tapering to ankle) */}
        <mesh position={[0, -6.05, 0]} material={skinMaterial}>
          <cylinderGeometry args={[0.48 * morph.depth, 0.34 * morph.depth, 3.9, 32]} />
        </mesh>

        {/* Ankle malleoli */}
        <mesh position={[0, -8.15, 0]} scale={[1.05, 0.85, 0.9]} material={skinMaterial}>
          <sphereGeometry args={[0.34 * morph.depth, 24, 24]} />
        </mesh>

        {/* Foot (Anatomical arch & toes pointing anteriorly) */}
        <mesh position={[0, -8.65, 0.42]} scale={[0.42 * morph.depth, 0.32, 1.1]} material={skinMaterial}>
          <sphereGeometry args={[0.62, 24, 24]} />
        </mesh>
      </group>

      {/* RIGHT LEG (Viewer's Left, X < 0) */}
      <group position={[-0.92 * morph.hipW, 0.45, 0]}>
        {/* Thigh (Anatomical taper from trochanter to distal femur) */}
        <mesh position={[0, -1.9, 0]} material={skinMaterial}>
          <cylinderGeometry args={[0.65 * morph.depth, 0.5 * morph.depth, 3.8, 32]} />
        </mesh>

        {/* Knee & Patellar Contour (Smooth anatomical blend, not a ball!) */}
        <group position={[0, -3.95, 0]}>
          <mesh position={[0, 0, 0]} scale={[1.0, 1.1, 0.95]} material={skinMaterial}>
            <sphereGeometry args={[0.48 * morph.depth, 28, 28]} />
          </mesh>
          <mesh position={[0, 0.06, 0.28]} scale={[0.65, 0.8, 0.3]} material={skinMaterial}>
            <sphereGeometry args={[0.42, 20, 20]} />
          </mesh>
        </group>

        {/* Lower Leg (Gastrocnemius calf curve tapering to ankle) */}
        <mesh position={[0, -6.05, 0]} material={skinMaterial}>
          <cylinderGeometry args={[0.48 * morph.depth, 0.34 * morph.depth, 3.9, 32]} />
        </mesh>

        {/* Ankle malleoli */}
        <mesh position={[0, -8.15, 0]} scale={[1.05, 0.85, 0.9]} material={skinMaterial}>
          <sphereGeometry args={[0.34 * morph.depth, 24, 24]} />
        </mesh>

        {/* Foot (Anatomical arch & toes pointing anteriorly) */}
        <mesh position={[0, -8.65, 0.42]} scale={[0.42 * morph.depth, 0.32, 1.1]} material={skinMaterial}>
          <sphereGeometry args={[0.62, 24, 24]} />
        </mesh>
      </group>
    </group>
  );
}
