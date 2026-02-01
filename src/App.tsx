import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'
import GameScene from './game/GameScene'

function App() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      
      {/* UI Overlay */}
      {!isPlaying && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 20, color: 'white'
        }}>
          <h1 style={{ fontSize: '3rem', margin: '0 0 20px 0', textShadow: '0 0 10px #ff0080' }}>NEON HOP</h1>
          <button 
            onClick={() => setIsPlaying(true)}
            style={{
              padding: '15px 40px', fontSize: '1.5rem', background: 'linear-gradient(45deg, #ff0080, #00ffff)',
              border: 'none', borderRadius: '30px', color: 'white', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 0 20px rgba(255, 0, 128, 0.5)'
            }}
          >
            START GAME
          </button>
          <p style={{ marginTop: 20, opacity: 0.7 }}>Headphones Recommended 🎧</p>
        </div>
      )}

      {/* HUD */}
      {isPlaying && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white' }}>
          <h2 style={{ margin: 0 }}>SCORE: 0</h2>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 4, 8], fov: 60 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <GameScene isPlaying={isPlaying} onStart={() => {}} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App