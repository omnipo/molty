import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useAudioAnalyzer } from './useAudio'

// Configuration
const SPEED = 20 // World movement speed
const SPAWN_Z = -50 // Where tiles appear
const PLAYER_Z = 0 // Where player is
const JUMP_HEIGHT = 2
const JUMP_DURATION = 0.5

// Tile Component
const Tile = ({ position, color, onMiss }: { position: [number, number, number], color: string, onMiss: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.z += SPEED * delta
      
      // Cleanup / Miss detection
      if (meshRef.current.position.z > 5) {
        onMiss() // Notify parent to remove
      }
    }
  })

  return (
    <Box ref={meshRef} args={[3, 0.2, 3]} position={position}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} />
    </Box>
  )
}

const Player = () => {
  const ref = useRef<THREE.Mesh>(null)
  const isJumping = useRef(false)

  useEffect(() => {
    const handleJump = () => {
      if (isJumping.current || !ref.current) return
      isJumping.current = true
      
      gsap.to(ref.current.position, {
        y: JUMP_HEIGHT,
        duration: JUMP_DURATION / 2,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
        onComplete: () => {
          isJumping.current = false
        }
      })
      
      gsap.to(ref.current.rotation, {
        x: ref.current.rotation.x - Math.PI,
        duration: JUMP_DURATION,
        ease: "power1.inOut"
      })
    }

    window.addEventListener('mousedown', handleJump)
    window.addEventListener('touchstart', handleJump)
    return () => {
      window.removeEventListener('mousedown', handleJump)
      window.removeEventListener('touchstart', handleJump)
    }
  }, [])

  return (
    <Box ref={ref} args={[1, 1, 1]} position={[0, 0.5, PLAYER_Z]}>
      <meshStandardMaterial color="white" />
    </Box>
  )
}

export default function GameScene({ onStart, isPlaying }: { onStart: () => void, isPlaying: boolean }) {
  // Tile State
  const [tiles, setTiles] = useState<{id: number, pos: [number,number,number], color: string}[]>([])
  const tileIdCounter = useRef(0)

  // Audio Hook
  const { play, update } = useAudioAnalyzer('/music/track.mp3', () => {
    // On Beat Detected: Spawn Tile
    const id = tileIdCounter.current++
    const x = (Math.random() - 0.5) * 6 // Random lane width
    const color = Math.random() > 0.5 ? '#ff0080' : '#00ffff' // Pink or Cyan
    
    setTiles(prev => [...prev, { id, pos: [x, 0, SPAWN_Z], color }])
  })

  // Start logic
  useEffect(() => {
    if (isPlaying) {
      play()
    }
  }, [isPlaying])

  useFrame((state, delta) => {
    update(delta)
    
    // Cleanup tiles locally to avoid react render thrashing for every frame move? 
    // Actually we move tiles in their own component ref, but we need to remove them from React state eventually
    // Use a cleanup interval or logic inside Tile onMiss
  })

  const removeTile = (id: number) => {
    setTiles(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 10, 60]} />
      
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[0, 10, -5]} intensity={0.8} />

      <Player />
      
      {tiles.map(tile => (
        <Tile 
          key={tile.id} 
          position={tile.pos} 
          color={tile.color} 
          onMiss={() => removeTile(tile.id)} 
        />
      ))}
      
      {/* Floor reflection hack */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} />
      </mesh>
    </>
  )
}