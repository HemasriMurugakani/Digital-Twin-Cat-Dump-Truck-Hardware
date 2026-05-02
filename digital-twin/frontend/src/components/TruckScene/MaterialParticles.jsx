import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MathUtils, MeshStandardMaterial, Object3D } from 'three';
import { useSimulationStore } from '../../store/simulationStore';

const PARTICLE_COUNT = 800;
const GRID_SIZE = 20;
const BED_LENGTH = 7.5;
const BED_HEIGHT = 2.5;
const BED_WIDTH = 8.5;
const GROUND_LEVEL = 0.35;
const STICK_ANGLE = 55;
const DUMP_FACTOR = 0.08;
const GRAVITY = 0.012;
const CORRECTION_IMPULSE_INTERVAL = 0.04;
const CORRECTION_IMPULSE_MAGNITUDE = 0.3;

// Per-truck particle bed config
const PARTICLE_BED = {
  // 793F/797F were scaled up, so their residue anchors must sit lower and tighter inside the bed.
  cat793f: { position: [0.05, 1.62, 0], bedLength: 3.2, bedHeight: 0.62, bedWidth: 3.25, wallInset: 0.2 },
  cat797b: { position: [0.08, 1.72, 0], bedLength: 3.45, bedHeight: 0.68, bedWidth: 3.45, wallInset: 0.22 },
  cat789c: { position: [-0.25, 0.78, 0], bedLength: 2.1, bedHeight: 0.36, bedWidth: 2.15, wallInset: 0.12 },
};

const MATERIAL_COLOR_MAP = {
  mixed: ['#5b4633', '#6a4f37', '#7a5938', '#8b5e34', '#4c3a2b'],
  wet: ['#3d2b1a', '#3d2b1a', '#3d2b1a', '#2a2420', '#2a2420'],
  dry: ['#c4a35a', '#c4a35a', '#888888', '#888888'],
  sticky: ['#1a1208', '#1a1208', '#1a1208', '#8b4513']
};

const scenarioStickiness = {
  empty_truck: 0.06,
  partial_residue: 0.22,
  full_residue: 0.42,
  normal: 0.22,
  wet_ore: 0.28,
  sticky_clay: 0.44,
  cold_shift: 0.18
};

const materialStickiness = {
  wet_clay: 0.36,
  fine_ore: 0.18,
  dry_rock: 0.06,
  mixed: 0.22
};

function materialColor(materialProfile, index) {
  const key =
    materialProfile === 'wet_clay'
      ? 'wet'
      : materialProfile === 'dry_rock'
        ? 'dry'
        : materialProfile === 'sticky_clay'
          ? 'sticky'
          : 'mixed';
  const palette = MATERIAL_COLOR_MAP[key] ?? MATERIAL_COLOR_MAP.mixed;
  return new Color(palette[index % palette.length]);
}

function makeParticle(index, stickyChance, materialProfile, bedL = BED_LENGTH, bedH = BED_HEIGHT, bedW = BED_WIDTH) {
  const sticky = Math.random() < stickyChance;
  const baseColor = materialColor(materialProfile, index);
  const color = sticky ? baseColor.clone().multiplyScalar(0.82) : baseColor;

  // Spawn as a settled residue mound rather than a floating rectangular block.
  const angle = Math.random() * Math.PI * 2;
  const radial = Math.sqrt(Math.random());
  const x = Math.cos(angle) * radial * bedL * 0.38 + (Math.random() - 0.5) * bedL * 0.08;
  const z = Math.sin(angle) * radial * bedW * 0.38 + (Math.random() - 0.5) * bedW * 0.08;
  const xNorm = x / Math.max(0.001, bedL * 0.5);
  const zNorm = z / Math.max(0.001, bedW * 0.5);
  const centerFalloff = Math.max(0, 1 - (xNorm * xNorm + zNorm * zNorm));
  const y = 0.03 + Math.random() * 0.04 + centerFalloff * bedH * (0.18 + Math.random() * 0.22);

  return {
    position: [
      x,
      y,
      z
    ],
    velocity: [
      (Math.random() - 0.5) * 0.015,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.015
    ],
    size: 0.08 + Math.random() * 0.1,
    color,
    sticky,
    attached: true,
    fallen: false,
    settled: false,
    cellIndex: -1,
    pileHeight: 0,
    driftSeed: Math.random() * Math.PI * 2
  };
}

function getCellIndex(value, min, size) {
  const normalized = MathUtils.clamp((value - min) / size, 0, 0.9999);
  return Math.floor(normalized * GRID_SIZE);
}

function createParticleState(stickyChance, materialProfile, bedL, bedH, bedW) {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => makeParticle(index, stickyChance, materialProfile, bedL, bedH, bedW));
}

function createHeightGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0));
}

const sharedMaterial = new MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.02
});

export default function MaterialParticles() {
  const meshRef = useRef(null);
  const particles = useRef(createParticleState(0.22, 'mixed'));
  const heightGrid = useRef(createHeightGrid());
  const correctionTimer = useRef(0);
  const impactFlashRef = useRef([]);
  const impactOriginRef = useRef([0, GROUND_LEVEL + 0.01, 0]);
  const impactLifeRef = useRef(0);

  const bedAngle = useSimulationStore((s) => s.bedAngle ?? s.state.bed_angle_deg ?? 0);
  const hydraulicExtension = useSimulationStore((s) => s.hydraulicExtension ?? 0);
  const phase = useSimulationStore((s) => s.dumpState ?? s.state.phase);
  const alert = useSimulationStore((s) => s.alert);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const scenario = useSimulationStore((s) => s.scenario);
  const materialProfile = useSimulationStore((s) => s.materialProfile);
  const selectedTruck = useSimulationStore((s) => s.selectedTruck ?? 'cat793f');
  const bedCfg = PARTICLE_BED[selectedTruck] ?? PARTICLE_BED.cat793f;

  // temp object used to build instance matrices
  const tempObj = useRef(new Object3D());

  const stickyChance = MathUtils.clamp(
    (scenarioStickiness[scenario] ?? scenarioStickiness.partial_residue) +
      (materialStickiness[materialProfile] ?? materialStickiness.mixed),
    0.02,
    0.7
  );
  const materialGravityScale =
    materialProfile === 'wet_clay' ? 0.84 : materialProfile === 'dry_rock' ? 1.16 : 1.0;
  const materialDumpFactor =
    materialProfile === 'wet_clay' ? 0.72 : materialProfile === 'dry_rock' ? 1.12 : 1.0;

  useEffect(() => {
    particles.current = createParticleState(stickyChance, materialProfile, bedCfg.bedLength, bedCfg.bedHeight, bedCfg.bedWidth);
    heightGrid.current = createHeightGrid();
    correctionTimer.current = 0;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [stickyChance, scenario, materialProfile, selectedTruck]);

  const isDumping = phase === 'DUMPING' || phase === 'DETECTING';
  const isHeld = phase === 'DETECTING' || phase === 'VERIFYING';
  const isLowering = phase === 'CLEAR';
  const isCorrection = dumpCycle?.warningLights || alert || phase === 'CARRY_BACK_DETECTED' || phase === 'CORRECTING';
  const effectiveAngle = MathUtils.clamp(bedAngle, 0, 52);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    correctionTimer.current += delta;
    let impactTriggered = false;

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const particle = particles.current[i];
      const px = particle.position[0];
      const py = particle.position[1];
      const pz = particle.position[2];

      if (particle.fallen) {
        const cellX = getCellIndex(px, -bedCfg.bedLength / 2, bedCfg.bedLength / GRID_SIZE);
        const cellZ = getCellIndex(pz, -bedCfg.bedWidth / 2, bedCfg.bedWidth / GRID_SIZE);
        const stackedHeight = heightGrid.current[cellX][cellZ];
        particle.position[1] = GROUND_LEVEL + stackedHeight + particle.size * 0.5;
        particle.velocity[1] = 0;
        particle.velocity[0] = 0;
        particle.velocity[2] = 0;
        const obj = tempObj.current;
        obj.position.set(particle.position[0], particle.position[1], particle.position[2]);
        obj.scale.setScalar(particle.size);
        obj.updateMatrix();
        mesh.setMatrixAt(i, obj.matrix);
        if (mesh.setColorAt) {
          mesh.setColorAt(i, particle.color);
        }
        continue;
      }

      if (isDumping || isLowering || isHeld || isCorrection) {
        const slideSpeed = (effectiveAngle / 52) * DUMP_FACTOR * materialDumpFactor;
        particle.velocity[2] += slideSpeed * delta * 60;

        if (particle.sticky && effectiveAngle < STICK_ANGLE) {
          particle.velocity[0] *= 0.9;
          particle.velocity[1] *= 0.92;
          particle.velocity[2] *= 0.9;
          if (isCorrection && correctionTimer.current >= CORRECTION_IMPULSE_INTERVAL) {
            const angle = particle.driftSeed + i * 0.37;
            particle.velocity[0] += Math.cos(angle) * CORRECTION_IMPULSE_MAGNITUDE * 0.01;
            particle.velocity[1] += CORRECTION_IMPULSE_MAGNITUDE * 0.04;
            particle.velocity[2] += Math.sin(angle) * CORRECTION_IMPULSE_MAGNITUDE * 0.01;
          }
        }

        if (isHeld) {
          particle.velocity[0] *= 0.92;
          particle.velocity[1] *= 0.92;
          particle.velocity[2] *= 0.92;
        }
      }

      particle.velocity[1] -= GRAVITY * materialGravityScale;
      particle.velocity[0] += (Math.random() - 0.5) * 0.002;
      particle.velocity[2] += (Math.random() - 0.5) * 0.002;

      particle.position[0] += particle.velocity[0] * delta * 60;
      particle.position[1] += particle.velocity[1] * delta * 60;
      particle.position[2] += particle.velocity[2] * delta * 60;

      // Clamp particles inside the bed while still attached
      const halfL = bedCfg.bedLength / 2;
      const halfW = bedCfg.bedWidth / 2;
      const wallInset = bedCfg.wallInset ?? 0.1;
      const innerHalfL = Math.max(0.2, halfL - wallInset);
      const innerHalfW = Math.max(0.2, halfW - wallInset);
      if (particle.attached) {
        particle.position[0] = MathUtils.clamp(particle.position[0], -innerHalfL, innerHalfL);
        particle.position[2] = MathUtils.clamp(particle.position[2], -innerHalfW, innerHalfW);
        if (particle.position[1] < 0.02) particle.position[1] = 0.02;
        if (particle.position[1] > bedCfg.bedHeight) particle.position[1] = bedCfg.bedHeight;
      }

      const tailgateCrossed = particle.position[2] > halfW * 0.85 || particle.position[0] > halfL * 0.9;
      const tailgateVisible = dumpCycle?.tailgateOpen || isDumping || isLowering || isCorrection;
      if (tailgateVisible && tailgateCrossed) {
        particle.fallen = true;
        particle.attached = false;
      }

      if (particle.position[1] < GROUND_LEVEL) {
        if (!impactTriggered) {
          impactTriggered = true;
          impactOriginRef.current = [particle.position[0], GROUND_LEVEL + 0.01, particle.position[2]];
          impactLifeRef.current = 0.8;
        }
        particle.position[1] = GROUND_LEVEL;
        particle.velocity[1] = -particle.velocity[1] * 0.3;
        particle.velocity[0] *= 0.8;
        particle.velocity[2] *= 0.8;

        if (!particle.settled) {
          const cellX = getCellIndex(particle.position[0], -bedCfg.bedLength / 2, bedCfg.bedLength / GRID_SIZE);
          const cellZ = getCellIndex(particle.position[2], -bedCfg.bedWidth / 2, bedCfg.bedWidth / GRID_SIZE);
          const pileHeight = heightGrid.current[cellX][cellZ];
          particle.pileHeight = pileHeight;
          heightGrid.current[cellX][cellZ] = pileHeight + particle.size * 0.42;
          particle.position[1] = GROUND_LEVEL + heightGrid.current[cellX][cellZ];
        }

        if (Math.abs(particle.velocity[1]) < 0.04) {
          particle.settled = true;
          particle.velocity[0] = 0;
          particle.velocity[1] = 0;
          particle.velocity[2] = 0;
        }
      }

      if (!particle.attached && !particle.fallen && particle.position[1] <= GROUND_LEVEL + 0.01) {
        particle.settled = true;
      }

      // update instance transform
      const obj = tempObj.current;
      obj.position.set(particle.position[0], particle.position[1], particle.position[2]);
      obj.scale.setScalar(particle.size);
      obj.updateMatrix();
      mesh.setMatrixAt(i, obj.matrix);
      if (mesh.setColorAt) {
        mesh.setColorAt(i, particle.color);
      }
    }

    if (isCorrection && correctionTimer.current >= CORRECTION_IMPULSE_INTERVAL) {
      correctionTimer.current = 0;
    }

    if (impactLifeRef.current > 0) {
      impactLifeRef.current = Math.max(0, impactLifeRef.current - delta);
      const lifeRatio = 1 - impactLifeRef.current / 0.8;
      for (let i = 0; i < impactFlashRef.current.length; i += 1) {
        const flash = impactFlashRef.current[i];
        if (!flash) continue;
        flash.visible = true;
        flash.position.set(
          impactOriginRef.current[0] + (i % 2 === 0 ? -0.15 : 0.15),
          impactOriginRef.current[1] + i * 0.002,
          impactOriginRef.current[2] + (i % 3 === 0 ? -0.12 : 0.12)
        );
        const scale = 0.25 + lifeRatio * (0.8 + i * 0.05);
        flash.scale.set(scale, scale, scale);
        flash.material.opacity = Math.max(0, 0.45 - lifeRatio * 0.45);
      }
    } else {
      for (let i = 0; i < impactFlashRef.current.length; i += 1) {
        if (impactFlashRef.current[i]) impactFlashRef.current[i].visible = false;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group position={bedCfg.position} visible>
      <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <primitive attach="material" object={sharedMaterial} />
      </instancedMesh>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={`impact-flash-${index}`}
          ref={(el) => {
            impactFlashRef.current[index] = el;
          }}
          rotation={[-Math.PI / 2, 0, (index / 5) * Math.PI]}
          visible={false}
        >
          <circleGeometry args={[0.4, 20]} />
          <meshBasicMaterial color="#c4a35a" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
