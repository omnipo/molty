import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

export function CatModel() {
  const groupRef = useRef<Group>(null)
  
  // Subtle idle animation or reactive ear wiggle could go here

  return (
    <group ref={groupRef} dispose={null}>
      {/* Head - Main white box */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 0.8, 0.9]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.35, 0.5, 0]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.15, 0.4, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.35, 0.5, 0]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.15, 0.4, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Inner Ears (Pink) */}
      <mesh position={[-0.35, 0.45, 0.05]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.08, 0.25, 4]} />
        <meshStandardMaterial color="#ffadd6" />
      </mesh>
      <mesh position={[0.35, 0.45, 0.05]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.08, 0.25, 4]} />
        <meshStandardMaterial color="#ffadd6" />
      </mesh>

      {/* Eyes (Black) - Kawaii style wide set */}
      <mesh position={[-0.25, 0, 0.46]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#000000" roughness={0.2} />
      </mesh>
      <mesh position={[0.25, 0, 0.46]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#000000" roughness={0.2} />
      </mesh>
      
      {/* Cheeks (Blush) */}
      <mesh position={[-0.35, -0.15, 0.46]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#ffadd6" opacity={0.6} transparent />
      </mesh>
      <mesh position={[0.35, -0.15, 0.46]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#ffadd6" opacity={0.6} transparent />
      </mesh>

      {/* Nose/Mouth */}
      <mesh position={[0, -0.1, 0.46]}>
        <circleGeometry args={[0.05, 3]} />
        <meshBasicMaterial color="#ffadd6" />
      </mesh>

    </group>
  )
}