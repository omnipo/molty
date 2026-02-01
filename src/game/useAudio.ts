import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

export const useAudioAnalyzer = (url: string, onBeat: () => void) => {
  const { camera } = useThree()
  const listener = useRef<THREE.AudioListener>()
  const sound = useRef<THREE.Audio>()
  const analyzer = useRef<THREE.AudioAnalyser>()
  const isPlaying = useRef(false)
  
  // Beat detection state
  const lastBeatTime = useRef(0)
  const threshold = 0.6 // Energy threshold (0-1) - Dynamic adjustment is better but this is simple

  useEffect(() => {
    // Setup listener
    listener.current = new THREE.AudioListener()
    camera.add(listener.current)

    // Setup sound
    sound.current = new THREE.Audio(listener.current)
    
    // Load audio
    const loader = new THREE.AudioLoader()
    loader.load(url, (buffer) => {
      if (sound.current) {
        sound.current.setBuffer(buffer)
        sound.current.setLoop(true)
        sound.current.setVolume(0.5)
        
        // Setup Analyzer after buffer load
        analyzer.current = new THREE.AudioAnalyser(sound.current, 256)
      }
    })

    return () => {
      if (sound.current && sound.current.isPlaying) sound.current.stop()
      if (listener.current) camera.remove(listener.current)
    }
  }, [url, camera])

  const play = () => {
    if (sound.current && !sound.current.isPlaying) {
      sound.current.play()
      isPlaying.current = true
    }
  }

  const update = (delta: number) => {
    if (!analyzer.current || !isPlaying.current) return

    // Get average frequency of lower range (Bass)
    const data = analyzer.current.getFrequencyData()
    let bassTotal = 0
    // Check first 4 bins (very low freq)
    for (let i = 0; i < 4; i++) {
      bassTotal += data[i]
    }
    const bassAvg = bassTotal / 4 / 255 // Normalize 0-1

    // Beat detection logic
    const now = performance.now()
    if (bassAvg > 0.5 && now - lastBeatTime.current > 300) { // Min 300ms between beats (~200 BPM limit)
       onBeat()
       lastBeatTime.current = now
    }
  }

  return { play, update, isPlaying }
}