export default function TruckBody() {
  const wheelOffsets = [
    [-3.1, 0.65, 2.25],
    [3.1, 0.65, 2.25],
    [-3.1, 0.65, -2.25],
    [3.1, 0.65, -2.25]
  ];

  return (
    <group>
      <mesh castShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[6.8, 1.6, 4.6]} />
        <meshStandardMaterial color="#f3a91c" metalness={0.2} roughness={0.72} />
      </mesh>

      <mesh castShadow position={[-2.0, 2.0, 0]}>
        <boxGeometry args={[2.2, 1.2, 3.0]} />
        <meshStandardMaterial color="#d99318" metalness={0.15} roughness={0.76} />
      </mesh>

      <mesh castShadow position={[2.7, 1.55, 0]}>
        <boxGeometry args={[1.35, 1.1, 2.2]} />
        <meshStandardMaterial color="#1d2027" metalness={0.3} roughness={0.66} />
      </mesh>

      {wheelOffsets.map((position, index) => (
        <mesh key={index} castShadow position={position} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.72, 0.72, 0.75, 24]} />
          <meshStandardMaterial color="#121212" roughness={0.9} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}
