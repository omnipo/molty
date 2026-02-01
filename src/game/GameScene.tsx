import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

// Configuration
const SPEED = 10
const JUMP_HEIGHT = 2
const JUMP_DURATION = 0.5

const Tile = ({ position, color = "hotpink" }: { position: [number, number, number], color?: string }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Move tile towards camera (Z axis)
      meshRef.current.position.z += SPEED * delta
      
      // Reset if too close (infinite loop for demo)
      if (meshRef.current.position.z > 5) {
        meshRef.current.position.z = -20
        meshRef.current.position.x = (Math.random() - 0.5) * 4 // Random X
      }
    }
  })

  return (
    <Box ref={meshRef} args={[2, 0.2, 2]} position={position}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
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
      
      // Jump animation
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
      
      // Rotation animation
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
    <Box ref={ref} args={[1, 1, 1]} position={[0, 0.5, 0]}>
      <meshStandardMaterial color="white" />
    </Box>
  )
}

export default function GameScene() {
  return (
    <>
      <color attach="background" args={['#101015']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {/* Grid helper for reference */}
      <gridHelper args={[50, 50, 0x444444, 0x222222]} />

      <Player />
      
      {/* Initial Tiles */}
      <Tile position={[0, 0, -5]} />
      <Tile position={[1, 0, -10]} color="cyan" />
      <Tile position={[-1, 0, -15]} />
      <Tile position={[0, 0, -20]} color="cyan" />
    </>
  )
}