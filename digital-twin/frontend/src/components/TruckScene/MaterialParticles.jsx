import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MathUtils, MeshStandardMaterial } from 'three';
import { useSimulationStore } from '../../store/simulationStore';

const PARTICLE_COUNT = 800;
const GRID_SIZE = 20;
const BED_LENGTH = 7.5;
const BED_HEIGHT = 2.5;
const BED_WIDTH = 8.5;
const GROUND_LEVEL = 0.35;
const STICK_ANGLE = 55;
const COLOR_SET = ['#8B6914', '#5C4A1A', '#A07832', '#3D2E0D'];
const BASE_COLORS = COLOR_SET.map((hex) => new Color(hex));
const DUMP_FACTOR = 0.08;
const GRAVITY = 0.012;
const CORRECTION_IMPULSE_INTERVAL = 0.04;
const CORRECTION_IMPULSE_MAGNITUDE = 0.3;

function makeParticle(index) {
  const sticky = Math.random() < 0.15;
  const baseColor = BASE_COLORS[index % BASE_COLORS.length].clone();
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

function cellKey(x, z) {
  return `${x}:${z}`;
}

function getCellIndex(value, min, size) {
  const normalized = MathUtils.clamp((value - min) / size, 0, 0.9999);
  return Math.floor(normalized * GRID_SIZE);
}

function createParticleState() {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => makeParticle(index));
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
  const particles = useRef(createParticleState());
  const heightGrid = useRef(createHeightGrid());
  const correctionTimer = useRef(0);

  const bedAngle = useSimulationStore((s) => s.bedAngle ?? s.state.bed_angle_deg ?? 0);
  const hydraulicExtension = useSimulationStore((s) => s.hydraulicExtension ?? 0);
  const phase = useSimulationStore((s) => s.state.phase);
  const alert = useSimulationStore((s) => s.alert);

  const colors = useMemo(() => {
    const buffer = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const c = particles.current[i].color;
      buffer[i * 3 + 0] = c.r;
      buffer[i * 3 + 1] = c.g;
      buffer[i * 3 + 2] = c.b;
    }
    return buffer;
  }, []);

  const transforms = useMemo(() => {
    const data = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const particle = particles.current[i];
      data[i * 3 + 0] = particle.position[0];
      data[i * 3 + 1] = particle.position[1];
      data[i * 3 + 2] = particle.position[2];
    }
    return data;
  }, []);

  const isDumping = phase === 'DUMP_RAISE';
  const isHeld = phase === 'DUMP_HOLD';
  const isLowering = phase === 'DUMP_LOWER';
  const isCorrection = alert && (phase === 'DUMP_RAISE' || phase === 'DUMP_HOLD');
  const effectiveAngle = MathUtils.clamp(bedAngle, 0, 52);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const positionAttribute = mesh.geometry.getAttribute('position');
    const colorAttribute = mesh.geometry.getAttribute('color');
    correctionTimer.current += delta;

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const particle = particles.current[i];
      const baseIndex = i * 3;
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
        positionAttribute.array[baseIndex + 0] = particle.position[0];
        positionAttribute.array[baseIndex + 1] = particle.position[1];
        positionAttribute.array[baseIndex + 2] = particle.position[2];
        continue;
      }

      if (isDumping || isLowering || isHeld || isCorrection) {
        const slideSpeed = (effectiveAngle / 52) * DUMP_FACTOR;
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

      particle.velocity[1] -= GRAVITY;
      particle.velocity[0] += (Math.random() - 0.5) * 0.002;
      particle.velocity[2] += (Math.random() - 0.5) * 0.002;

      particle.position[0] += particle.velocity[0] * delta * 60;
      particle.position[1] += particle.velocity[1] * delta * 60;
      particle.position[2] += particle.velocity[2] * delta * 60;

      const tailgateCrossed = particle.position[2] > BED_WIDTH * 0.42 || particle.position[0] > BED_LENGTH * 0.45;
      if ((isDumping || isLowering || isCorrection) && tailgateCrossed) {
        particle.fallen = true;
        particle.attached = false;
      }

      if (particle.position[1] < GROUND_LEVEL) {
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

      positionAttribute.array[baseIndex + 0] = particle.position[0];
      positionAttribute.array[baseIndex + 1] = particle.position[1];
      positionAttribute.array[baseIndex + 2] = particle.position[2];
    }

    if (isCorrection && correctionTimer.current >= CORRECTION_IMPULSE_INTERVAL) {
      correctionTimer.current = 0;
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  });

  return (
    <group position={[1.65, 2.55, 0]} visible>
      <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <primitive attach="material" object={sharedMaterial} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-position" args={[transforms, 3]} />
      </instancedMesh>
    </group>
  );
}
