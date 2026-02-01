import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import GameScene from './game/GameScene'

function App() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* UI Overlay */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <h1>Molty Run</h1>
        <p>Click to Jump</p>
      </div>

      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App