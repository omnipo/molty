import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box, Sparkles, Text, Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useRhythmEngine } from './useAudio'
import { CatModel } from './CatModel'

// --- CONSTANTS ---
const BPM = 128
const BEAT_TIME = 60 / BPM 
const JUMP_DURATION = BEAT_TIME 
const TRAVEL_BEATS = 4
const TRAVEL_TIME = TRAVEL_BEATS * BEAT_TIME
const SPAWN_Z = -40
const SPEED = Math.abs(SPAWN_Z) / TRAVEL_TIME
const LANE_WIDTH = 6 
const HIT_WINDOW_Z = 1.0 // Z-distance tolerance for hit
const HIT_WINDOW_X = 1.2 // X-distance tolerance (lane width approx 2.5)

// --- FX COMPONENTS ---

const FloatingText = ({ text, position, color }: { text: string, position: [number, number, number], color: string }) => {
  const ref = useRef<THREE.Group>(null)
  
  useEffect(() => {
    if (ref.current) {
      // Pop up and fade out
      gsap.fromTo(ref.current.position, 
        { y: position[1], z: position[2] },
        { y: position[1] + 3, z: position[2] + 2, duration: 0.8, ease: "power1.out" }
      )
      gsap.to(ref.current.scale, {
        x: 1.5, y: 1.5, duration: 0.1, yoyo: true, repeat: 1
      })
      gsap.to(ref.current, {
        visible: false, delay: 0.8
      })
    }
  }, [])

  return (
    <group ref={ref} position={position}>
      <Text
        fontSize={1.2}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        {text}
      </Text>
    </group>
  )
}

const HitParticles = ({ position, color }: { position: [number, number, number], color: string }) => {
  // Burst of particles
  return (
    <Sparkles 
      position={position} 
      count={20} 
      scale={4} 
      size={6} 
      speed={2} 
      opacity={1} 
      color={color}
      noise={1}
    />
  )
}

// --- GAME COMPONENTS ---

const Tile = ({ position, color }: { position: [number, number, number], color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Visual only - logic handled in controller
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.z += SPEED * delta
    }
  })

  return (
    <group position={position}>
      {/* We need to reset the position in a ref because React render won't update it every frame once mounted
          unless we pass new props. But here props are static initialPos.
          Actually, the initial position is set on mount. Then useFrame moves it.
          This is correct for "Fire and Forget" tiles.
      */}
      <Box ref={meshRef} args={[2.5, 0.3, 2.5]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.8}
        />
      </Box>
    </group>
  )
}

const Player = ({ isPlaying, positionRef }: { isPlaying: boolean, positionRef: React.MutableRefObject<THREE.Vector3> }) => {
  const groupRef = useRef<THREE.Group>(null)
  const { viewport, pointer } = useThree()

  useEffect(() => {
    if (!groupRef.current || !isPlaying) return
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(groupRef.current.position, { y: 1.5, duration: JUMP_DURATION * 0.5, ease: "power2.out" })
      .to(groupRef.current.position, { y: 0.5, duration: JUMP_DURATION * 0.5, ease: "power2.in" })
    return () => tl.kill()
  }, [isPlaying])

  useFrame(() => {
    if (!groupRef.current) return
    const targetX = (pointer.x * viewport.width) / 2
    const clampedX = THREE.MathUtils.clamp(targetX, -LANE_WIDTH/2, LANE_WIDTH/2)
    
    // Update visual pos
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, clampedX, 0.2)
    groupRef.current.rotation.z = (groupRef.current.position.x - clampedX) * -0.5

    // Sync ref for logic
    positionRef.current.copy(groupRef.current.position)
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
       <CatModel />
    </group>
  )
}

const GameController = ({ startTrigger, onStartComplete, setScore }: { startTrigger: boolean, onStartComplete: () => void, setScore: (n: number) => void }) => {
  // LOGIC STATE (Refs) - High frequency updates
  const tilesRef = useRef<{id: number, lane: number, z: number, color: string, hit: boolean}[]>([])
  
  // RENDER STATE (React) - Low frequency updates (Mount/Unmount only)
  // We only store ID and Color for rendering. Position is handled by the Tile component or initial prop.
  const [renderTiles, setRenderTiles] = useState<{id: number, initialZ: number, lane: number, color: string}[]>([])
  const [fxs, setFxs] = useState<{id: number, type: 'text'|'particle', text?: string, pos: [number,number,number], color: string}[]>([])
  
  const playerPos = useRef(new THREE.Vector3())
  const [isPlaying, setIsPlaying] = useState(false)
  const tileIdCounter = useRef(0)
  const fxIdCounter = useRef(0)
  const scoreRef = useRef(0)

  // Audio Engine triggers spawns
  const { initAudio, play, update } = useRhythmEngine('/music/track.mp3', (beatIndex) => {
    const id = tileIdCounter.current++
    const lanes = [-2.5, 0, 2.5]
    const laneIdx = Math.floor(Math.random() * lanes.length)
    const lane = lanes[laneIdx]
    const color = ['#ff0080', '#00ffff', '#bd00ff', '#ffeb3b'][beatIndex % 4]
    
    // Add to Logic
    tilesRef.current.push({ id, lane, z: SPAWN_Z, color, hit: false })
    
    // Add to Render (Trigger Mount)
    setRenderTiles(prev => [...prev, { id, initialZ: SPAWN_Z, lane, color }])
  })

  useEffect(() => {
    if (startTrigger) {
      initAudio().then(() => {
        play(); setIsPlaying(true); onStartComplete()
      })
    }
  }, [startTrigger])

  // Game Logic Loop (60 FPS)
  useFrame((state, delta) => {
    update() // Pump audio engine

    // 1. Update Physics & Logic
    // We iterate backwards to allow safe removal if needed, though we sync with state later
    const activeTiles = tilesRef.current
    const tilesToRemove: number[] = []

    for (const t of activeTiles) {
      // Move logic Z
      t.z += SPEED * delta

      // Hit Check
      if (!t.hit && Math.abs(t.z - 0) < HIT_WINDOW_Z) {
        // Player X vs Tile Lane
        if (Math.abs(t.lane - playerPos.current.x) < HIT_WINDOW_X) {
           t.hit = true
           tilesToRemove.push(t.id)

           // Spawn FX
           const fxId = fxIdCounter.current++
           const fxPos: [number,number,number] = [t.lane, 0, 0] // Snap to hit point
           
           // We use a functional update to queue FX
           setFxs(prev => {
             // Clean up old FX to prevent memory leak if timer fails (safety cap)
             const clean = prev.length > 10 ? prev.slice(prev.length - 10) : prev
             return [...clean, 
               { id: fxId, type: 'text', text: 'PERFECT', pos: [fxPos[0], 2, 0], color: '#fff' },
               { id: fxId+1, type: 'particle', pos: fxPos, color: t.color }
             ]
           })
           
           // Schedule removal of these specific FX
           setTimeout(() => {
             setFxs(current => current.filter(x => x.id !== fxId && x.id !== fxId+1))
           }, 800) // 0.8s lifetime

           scoreRef.current += 100
           setScore(scoreRef.current)
        }
      }

      // Miss Check
      if (t.z > 2) {
        tilesToRemove.push(t.id)
      }
    }

    // 2. Sync Logic -> Render
    if (tilesToRemove.length > 0) {
      // Remove from logic
      tilesRef.current = tilesRef.current.filter(t => !tilesToRemove.includes(t.id))
      // Remove from render
      setRenderTiles(prev => prev.filter(t => !tilesToRemove.includes(t.id)))
    }
  })

  return (
    <>
      <Player isPlaying={isPlaying} positionRef={playerPos} />
      
      {renderTiles.map(tile => (
        <Tile key={tile.id} position={[tile.lane, 0, tile.initialZ]} color={tile.color} />
      ))}

      {fxs.map(fx => (
        fx.type === 'text' ? 
          <FloatingText key={fx.id} text={fx.text!} position={fx.pos} color={fx.color} /> :
          <HitParticles key={fx.id} position={fx.pos} color={fx.color} />
      ))}
    </>
  )
}

export default function GameScene({ startTrigger, setScore }: { startTrigger: boolean, setScore: (n: number) => void }) {
  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 5, 50]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 10, 5]} intensity={1} />

      <GameController startTrigger={startTrigger} onStartComplete={() => {}} setScore={setScore} />

      <gridHelper args={[100, 50, '#ff0080', '#220033']} position={[0, 0, -20]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050510" roughness={0.1} metalness={0.9} />
      </mesh>
      
      <Sparkles count={50} scale={12} size={4} speed={0.4} opacity={0.5} color="#00ffff" position={[0, 5, -10]} />
    </>
  )
}