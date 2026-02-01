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
const HIT_WINDOW_Z = 1.0 
const HIT_WINDOW_X = 1.2 

// --- FX COMPONENTS ---
// (Same as before)
const FloatingText = ({ text, position, color }: { text: string, position: [number, number, number], color: string }) => {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current.position, 
        { y: position[1], z: position[2] },
        { y: position[1] + 3, z: position[2] + 2, duration: 0.8, ease: "power1.out" }
      )
      gsap.to(ref.current.scale, { x: 1.5, y: 1.5, duration: 0.1, yoyo: true, repeat: 1 })
      gsap.to(ref.current, { visible: false, delay: 0.8 })
    }
  }, [])
  return (
    <group ref={ref} position={position}>
      <Text fontSize={1.2} color={color} anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000">{text}</Text>
    </group>
  )
}

const HitParticles = ({ position, color }: { position: [number, number, number], color: string }) => {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    if (ref.current) {
      gsap.to(ref.current.position, { y: position[1] + 3, z: position[2] + 2, duration: 0.8, ease: "power1.out" })
      gsap.to(ref.current.scale, { x: 0, y: 0, z: 0, duration: 0.3, delay: 0.5 })
    }
  }, [])
  return (
    <group ref={ref} position={position}>
      <Sparkles count={20} scale={3} size={6} speed={0.4} opacity={1} color={color} noise={0.5} />
    </group>
  )
}

const Tile = ({ position, color }: { position: [number, number, number], color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.position.z += SPEED * delta
  })
  return (
    <group position={position}>
      <Box ref={meshRef} args={[2.5, 0.3, 2.5]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
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
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, clampedX, 0.2)
    groupRef.current.rotation.z = (groupRef.current.position.x - clampedX) * -0.5
    positionRef.current.copy(groupRef.current.position)
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
       <CatModel />
    </group>
  )
}

const GameController = ({ startTrigger, onStartComplete, setScore, onGameOver }: { startTrigger: boolean, onStartComplete: () => void, setScore: (n: number) => void, onGameOver: () => void }) => {
  const tilesRef = useRef<{id: number, lane: number, z: number, color: string, hit: boolean}[]>([])
  const [renderTiles, setRenderTiles] = useState<{id: number, initialZ: number, lane: number, color: string}[]>([])
  const [fxs, setFxs] = useState<{id: number, type: 'text'|'particle', text?: string, pos: [number,number,number], color: string, startTime: number}[]>([])
  
  const playerPos = useRef(new THREE.Vector3())
  const [isPlaying, setIsPlaying] = useState(false)
  const tileIdCounter = useRef(0)
  const fxIdCounter = useRef(0)
  const scoreRef = useRef(0)

  // Audio Engine triggers spawns
  const { initAudio, play, stop, update } = useRhythmEngine('/music/track.mp3', (beatIndex) => {
    const id = tileIdCounter.current++
    const lanes = [-2.5, 0, 2.5]
    const laneIdx = Math.floor(Math.random() * lanes.length)
    const lane = lanes[laneIdx]
    const color = ['#ff0080', '#00ffff', '#bd00ff', '#ffeb3b'][beatIndex % 4]
    
    tilesRef.current.push({ id, lane, z: SPAWN_Z, color, hit: false })
    setRenderTiles(prev => [...prev, { id, initialZ: SPAWN_Z, lane, color }])
  })

  useEffect(() => {
    if (startTrigger) {
      // Reset State on Start
      tilesRef.current = []
      setRenderTiles([])
      setFxs([])
      scoreRef.current = 0
      setScore(0)
      
      initAudio().then(() => {
        play(); setIsPlaying(true); onStartComplete()
      })
    } else {
       // If startTrigger goes false (restart), ensure stop
       stop()
       setIsPlaying(false)
    }
  }, [startTrigger])

  useFrame((state, delta) => {
    if (!isPlaying) return

    update() 

    const activeTiles = tilesRef.current
    const tilesToRemove: number[] = []
    let newFxsToAdd: any[] = []

    for (const t of activeTiles) {
      t.z += SPEED * delta
      
      // Miss Detection (Game Over)
      // If tile passes player (Z > 0.5) and wasn't hit
      if (!t.hit && t.z > 0.5) {
         setIsPlaying(false)
         stop()
         onGameOver()
         return // Stop loop immediately
      }

      // Hit Check
      if (!t.hit && Math.abs(t.z - 0) < HIT_WINDOW_Z) {
        const diffX = Math.abs(t.lane - playerPos.current.x)
        
        if (diffX < HIT_WINDOW_X) {
           t.hit = true
           tilesToRemove.push(t.id)
           const fxId = fxIdCounter.current++
           const fxPos: [number,number,number] = [t.lane, 0, 0] 
           
           // JUDGMENT LOGIC
           let hitText = 'GREAT'
           let points = 50
           let textColor = '#aaaaff' // Blueish for Great
           
           // Strict window for Perfect (Center +/- 0.5)
           if (diffX < 0.5) {
             hitText = 'PERFECT'
             points = 100
             textColor = '#fff' // White for Perfect
           }

           newFxsToAdd.push(
               { id: fxId, type: 'text', text: hitText, pos: [fxPos[0], 2, 0], color: textColor, startTime: Date.now() },
               { id: fxId+1, type: 'particle', pos: fxPos, color: t.color, startTime: Date.now() }
           )

           scoreRef.current += points
           setScore(scoreRef.current)
        }
      }
    }

    if (tilesToRemove.length > 0) {
      tilesRef.current = tilesRef.current.filter(t => !tilesToRemove.includes(t.id))
      setRenderTiles(prev => prev.filter(t => !tilesToRemove.includes(t.id)))
    }

    if (newFxsToAdd.length > 0 || fxs.length > 0) { 
        setFxs(prev => {
            const now = Date.now()
            const keep = prev.filter(fx => now - fx.startTime < 800)
            if (keep.length === prev.length && newFxsToAdd.length === 0) return prev
            return [...keep, ...newFxsToAdd]
        })
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

export default function GameScene({ startTrigger, setScore, onGameOver }: { startTrigger: boolean, setScore: (n: number) => void, onGameOver: () => void }) {
  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 5, 50]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 10, 5]} intensity={1} />

      <GameController startTrigger={startTrigger} onStartComplete={() => {}} setScore={setScore} onGameOver={onGameOver} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050510" roughness={0.1} metalness={0.9} />
      </mesh>
      
      <Sparkles count={50} scale={12} size={4} speed={0.4} opacity={0.5} color="#00ffff" position={[0, 5, -10]} />
    </>
  )
}