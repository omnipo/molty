import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

// Standard Future Bass/House BPM usually around 128
const BPM = 128 
const BEAT_DURATION = 60 / BPM // seconds per beat

export const useRhythmEngine = (url: string, onBeat: (beatIndex: number) => void) => {
  const { camera } = useThree()
  const listener = useRef<THREE.AudioListener | null>(null)
  const sound = useRef<THREE.Audio | null>(null)
  
  // Rhythm State
  const isPlaying = useRef(false)
  const startTime = useRef(0)
  const nextBeatIndex = useRef(0)

  // Look-ahead time (schedule events before they are audible)
  // We want to spawn tiles so they arrive exactly on beat.
  // If travel time is 2.0s, we need to spawn them 2.0s AHEAD of the music time.
  // But since we can't play music in the future, we just spawn them based on elapsed time.

  useEffect(() => {
    return () => {
      if (sound.current && sound.current.isPlaying) sound.current.stop()
      if (listener.current) {
        try { camera.remove(listener.current) } catch(e) {}
      }
    }
  }, [camera])

  const initAudio = async () => {
    if (listener.current) return;

    listener.current = new THREE.AudioListener()
    camera.add(listener.current)

    if (listener.current.context.state === 'suspended') {
      await listener.current.context.resume()
    }

    sound.current = new THREE.Audio(listener.current)
    
    return new Promise<void>((resolve) => {
      const loader = new THREE.AudioLoader()
      loader.load(url, (buffer) => {
        if (sound.current) {
          sound.current.setBuffer(buffer)
          sound.current.setLoop(true)
          sound.current.setVolume(0.5)
          resolve()
        }
      })
    })
  }

  const play = () => {
    if (sound.current && !sound.current.isPlaying) {
      sound.current.play()
      isPlaying.current = true
      startTime.current = performance.now() // Record valid start time
    }
  }

  const update = () => {
    if (!isPlaying.current || !sound.current || !sound.current.context) return

    // Get precise audio time
    const time = sound.current.context.currentTime
    // If context time is global, we might need offset. 
    // For simple Audio object, let's rely on internal clock estimation if needed, 
    // but context.currentTime is best for rhythm.
    
    // Actually, simplest way for a loop:
    // Calculate how many beats *should* have passed since start
    // Note: This assumes we started at 0. Simple demo.
    
    // We want to fire events.
    // We use a "lookahead" based on system time since we started playing.
    const elapsed = (performance.now() - startTime.current) / 1000
    
    // Calculate current beat index
    const currentBeat = Math.floor(elapsed / BEAT_DURATION)

    // If we moved to a new beat
    if (currentBeat >= nextBeatIndex.current) {
      onBeat(nextBeatIndex.current)
      nextBeatIndex.current = currentBeat + 1
    }
  }

  return { initAudio, play, update, BPM, BEAT_DURATION }
}