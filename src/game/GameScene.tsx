import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useRhythmEngine } from './useAudio'

// --- RHYTHM CALIBRATION ---
// Music: ~128 BPM
// 1 Beat = 60 / 128 = 0.46875 seconds
const BPM = 128
const BEAT_TIME = 60 / BPM 

// Player Physics
// Jump Duration must match Beat Time EXACTLY for sync
const JUMP_DURATION = BEAT_TIME 

// World Physics
// Tile Travel Time: How long from Spawn to Player?
// We want this to be an integer multiple of beats so it lands on a beat.
// Let's say 4 beats (4 * 0.46875 = 1.875s).
const TRAVEL_BEATS = 4
const TRAVEL_TIME = TRAVEL_BEATS * BEAT_TIME

// Spawn Distance
// Speed = Distance / Time
const SPAWN_Z = -40
const SPEED = Math.abs(SPAWN_Z) / TRAVEL_TIME // Auto-calculate speed needed

const LANE_WIDTH = 6 

const Tile = ({ position, color, onMiss }: { position: [number, number, number], color: string, onMiss: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.z += SPEED * delta
      if (meshRef.current.position.z > 5) {
        onMiss() 
      }
    }
  })

  return (
    <Box ref={meshRef} args={[3, 0.2, 3]} position={position}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} />
    </Box>
  )
}

const Player = ({ isPlaying }: { isPlaying: boolean }) => {
  const ref = useRef<THREE.Mesh>(null)
  const { viewport, pointer } = useThree()

  // SYNCED JUMP LOOP
  useEffect(() => {
    if (!ref.current || !isPlaying) return

    // Jump exactly on beat duration
    const tl = gsap.timeline({ repeat: -1 })
    
    tl.to(ref.current.position, {
      y: 1.5,
      duration: JUMP_DURATION * 0.5, 
      ease: "power2.out"
    })
    .to(ref.current.position, {
      y: 0.5,
      duration: JUMP_DURATION * 0.5,
      ease: "power2.in"
    })

    return () => {
      tl.kill()
    }
  }, [isPlaying])

  useFrame((state) => {
    if (!ref.current) return
    const targetX = (pointer.x * viewport.width) / 2
    const clampedX = THREE.MathUtils.clamp(targetX, -LANE_WIDTH/2, LANE_WIDTH/2)
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, clampedX, 0.2)
  })

  return (
    <Box ref={ref} args={[1, 1, 1]} position={[0, 0.5, 0]}>
      <meshStandardMaterial color="white" />
    </Box>
  )
}

const GameController = ({ startTrigger, onStartComplete }: { startTrigger: boolean, onStartComplete: () => void }) => {
  const [tiles, setTiles] = useState<{id: number, pos: [number,number,number], color: string}[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const tileIdCounter = useRef(0)

  const { initAudio, play, update } = useRhythmEngine('/music/track.mp3', (beatIndex) => {
    // Spawn a tile on every beat
    const id = tileIdCounter.current++
    const lanes = [-2.5, 0, 2.5]
    // Simple pattern generation: 
    // Just random for now, but synced to beat
    const x = lanes[Math.floor(Math.random() * lanes.length)]
    const color = Math.random() > 0.5 ? '#ff0080' : '#00ffff'
    
    setTiles(prev => [...prev, { id, pos: [x, 0, SPAWN_Z], color }])
  })

  useEffect(() => {
    if (startTrigger) {
      initAudio().then(() => {
        play() // Start music
        setIsPlaying(true) // Start animations
        onStartComplete()
      })
    }
  }, [startTrigger])

  useFrame(() => {
    update()
  })

  const removeTile = (id: number) => {
    setTiles(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      <Player isPlaying={isPlaying} />
      {tiles.map(tile => (
        <Tile key={tile.id} position={tile.pos} color={tile.color} onMiss={() => removeTile(tile.id)} />
      ))}
    </>
  )
}

export default function GameScene({ startTrigger }: { startTrigger: boolean }) {
  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 10, 60]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[0, 10, -5]} intensity={0.8} />

      <GameController startTrigger={startTrigger} onStartComplete={() => {}} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} />
      </mesh>
    </>
  )
}