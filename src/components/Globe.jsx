import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'

const Earth = () => {
    const earthRef = useRef()
    
    // Load textures
    const [colorMap, normalMap, specularMap] = useTexture([
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      'https://unpkg.com/three-globe/example/img/earth-topology.png',
      'https://unpkg.com/three-globe/example/img/earth-water.png'
    ])
  
    useFrame(({ clock }) => {
      if (earthRef.current) {
        earthRef.current.rotation.y = clock.getElapsedTime() * 0.05
      }
    })
  
    return (
      <group>
        {/* Earth Sphere */}
        <mesh ref={earthRef} scale={[2.5, 2.5, 2.5]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial 
            map={colorMap}
            normalMap={normalMap}
            roughnessMap={specularMap}
            roughness={0.5} // More reflected light
            metalness={0.1}
          />
        </mesh>
        
        {/* Atmosphere Glow - Brighter for day look */}
        <mesh scale={[2.6, 2.6, 2.6]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            color="#4db2ff"
            transparent
            opacity={0.2}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    )
  }
  
  const Lights = () => {
      return (
          <>
              {/* Strong ambient light for day effect */}
              <ambientLight intensity={1.2} />
              {/* Main Sun light */}
              <directionalLight position={[10, 10, 5]} intensity={4} castShadow color="#ffffff" />
              {/* Fill light */}
              <pointLight position={[-10, -10, -10]} intensity={1} color="#4444ff" />
          </>
      )
  }
  
  export default function GlobeScene() {
      return (
        <div className="w-full h-full relative block">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }} style={{ width: '100%', height: '100%' }}>
              <Suspense fallback={null}>
                  <Lights />
                  <Stars radius={300} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
                  <Earth />
                  <OrbitControls 
                      enablePan={false} 
                      enableZoom={true} 
                      minDistance={4} 
                      maxDistance={20}
                      autoRotate
                      autoRotateSpeed={0.5}
                  />
              </Suspense>
          </Canvas>
        </div>
      )
  }
