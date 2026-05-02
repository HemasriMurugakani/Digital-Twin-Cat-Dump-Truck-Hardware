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

const MATERIAL_COLOR_MAP = {
  mixed: ['#2a2420', '#2a2420', '#2a2420', '#8b4513', '#8b4513'],
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
  const key = materialProfile === 'wet_clay' ? 'wet' : materialProfile === 'dry_rock' ? 'dry' : materialProfile === 'fine_ore' ? 'mixed' : 'sticky';
  const palette = MATERIAL_COLOR_MAP[key] ?? MATERIAL_COLOR_MAP.mixed;
  return new Color(palette[index % palette.length]);
}

function makeParticle(index, stickyChance, materialProfile) {
  const sticky = Math.random() < stickyChance;
  const baseColor = materialColor(materialProfile, index);
  const color = sticky ? baseColor.clone().multiplyScalar(0.82) : baseColor;

  return {
    position: [
      (Math.random() - 0.5) * BED_LENGTH,
      Math.random() * BED_HEIGHT + 0.2,
      (Math.random() - 0.5) * BED_WIDTH
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

function createParticleState(stickyChance, materialProfile) {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => makeParticle(index, stickyChance, materialProfile));
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
    particles.current = createParticleState(stickyChance, materialProfile);
    heightGrid.current = createHeightGrid();
    correctionTimer.current = 0;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [stickyChance, scenario, materialProfile]);

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
        const cellX = getCellIndex(px, -BED_LENGTH / 2, BED_LENGTH / GRID_SIZE);
        const cellZ = getCellIndex(pz, -BED_WIDTH / 2, BED_WIDTH / GRID_SIZE);
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

      const tailgateCrossed = particle.position[2] > BED_WIDTH * 0.42 || particle.position[0] > BED_LENGTH * 0.45;
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
          const cellX = getCellIndex(particle.position[0], -BED_LENGTH / 2, BED_LENGTH / GRID_SIZE);
          const cellZ = getCellIndex(particle.position[2], -BED_WIDTH / 2, BED_WIDTH / GRID_SIZE);
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
    <group position={[1.65, 2.55, 0]} visible>
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
