import { Suspense, useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useNewsState, useNewsDispatch } from '../store/newsStore'
import { latLngToVector3, vertexToLatLng, angularDistance, findNearestCountry } from '../utils/countryCoordinates'

// ─── Custom Shader Material (existing — untouched) ───
const EarthMaterial = shaderMaterial(
  { uTexture: null },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform sampler2D uTexture;
    varying vec2 vUv;
    
    void main() {
      vec4 texColor = texture2D(uTexture, vUv);
      float isOcean = step(texColor.r + 0.05, texColor.b) * step(texColor.g, texColor.b + 0.1);
      vec3 oceanCyan = vec3(0.18, 0.52, 0.62);
      vec3 brightenedOcean = mix(texColor.rgb * 1.15, oceanCyan, 0.45);
      vec3 brightenedLand = texColor.rgb * 1.4;
      vec3 finalColor = mix(brightenedLand, brightenedOcean, isOcean);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ EarthMaterial })

// ─── Crisis Marker: Pulsing glow dot + beam at crisis epicenters ───
const CrisisMarker = ({ position, type, severity }) => {
  const dotRef = useRef()
  const beamRef = useRef()

  const color = useMemo(() => {
    switch (type) {
      case 'conflict': return '#ff4444'
      case 'economic': return '#4488ff'
      case 'disaster': return '#ffaa00'
      default: return '#ffffff'
    }
  }, [type])

  const beamHeight = severity * 0.25

  useFrame(({ clock }) => {
    if (dotRef.current) {
      const pulse = 0.7 + Math.sin(clock.getElapsedTime() * 3 + severity * 10) * 0.3
      const s = 0.02 + severity * 0.025
      dotRef.current.scale.setScalar(s * pulse)
    }
  })

  // Compute beam direction (outward from center)
  const dir = useMemo(() => {
    const v = new THREE.Vector3(...position).normalize()
    return v
  }, [position])

  const beamPos = useMemo(() => {
    const p = new THREE.Vector3(...position)
    const d = dir.clone().multiplyScalar(beamHeight / 2)
    return p.add(d).toArray()
  }, [position, dir, beamHeight])

  // Quaternion to align beam with surface normal
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return q
  }, [dir])

  return (
    <group>
      {/* Glow dot */}
      <mesh ref={dotRef} position={position}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Beam / pillar */}
      {severity > 0.2 && (
        <mesh ref={beamRef} position={beamPos} quaternion={quaternion}>
          <cylinderGeometry args={[0.003, 0.003, beamHeight, 6]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

// ─── Earth Component with Deformation + Raycasting ───
const Earth = ({ crisisData, onCountryClick, autoRotate }) => {
  const groupRef = useRef()
  const meshRef = useRef()
  const materialRef = useRef()
  const geometryRef = useRef()
  const controlsRef = useRef()

  // Deformation state
  const originalPositions = useRef(null)
  const targetPositions = useRef(null)
  const currentPositions = useRef(null)
  const deformationReady = useRef(false)

  const [colorMap] = useTexture([
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
  ])

  // ── Store original geometry positions on mount ──
  useEffect(() => {
    if (!geometryRef.current) return

    const geo = geometryRef.current
    const positions = geo.attributes.position.array

    // Clone original positions
    originalPositions.current = new Float32Array(positions)
    currentPositions.current = new Float32Array(positions)
    targetPositions.current = new Float32Array(positions)
    deformationReady.current = true
  }, [])

  // ── Compute target deformation when crisis data changes ──
  // This is the heavy computation, done only on data change.
  //
  // DEFORMATION LOGIC:
  //   For each vertex on the unit sphere, we check all crisis points.
  //   If the vertex is within the influence radius of a crisis:
  //
  //   - CONFLICT → push vertex OUTWARD (creates mountains/ridges)
  //   - ECONOMIC → push vertex INWARD (creates craters/depressions)
  //   - DISASTER → alternating in/out with noise (jagged cracks)
  //
  //   Gaussian falloff ensures smooth transitions at the edges.
  //   Multiple crises can overlap, their displacements are additive.
  useEffect(() => {
    if (!deformationReady.current || !originalPositions.current) return
    if (!crisisData || crisisData.length === 0) {
      // No crisis data → reset to original
      targetPositions.current = new Float32Array(originalPositions.current)
      return
    }

    const orig = originalPositions.current
    const target = new Float32Array(orig.length)
    const INFLUENCE_RADIUS = 18 // degrees — how far each crisis point affects
    const SIGMA = INFLUENCE_RADIUS / 2.5 // Gaussian sigma

    for (let i = 0; i < orig.length; i += 3) {
      const x = orig[i], y = orig[i + 1], z = orig[i + 2]
      const r = Math.sqrt(x * x + y * y + z * z)
      const nx = x / r, ny = y / r, nz = z / r

      // Convert vertex to lat/lng
      const { lat, lng } = vertexToLatLng(x, y, z)

      let totalDisplacement = 0

      for (const crisis of crisisData) {
        const dist = angularDistance(lat, lng, crisis.lat, crisis.lng)

        if (dist < INFLUENCE_RADIUS) {
          // Gaussian falloff: 1.0 at center, drops to ~0 at edge
          const falloff = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA))

          let displacement = 0
          switch (crisis.dominantType) {
            case 'conflict':
              // DRAMATIC outward push → mountain/ridge
              displacement = crisis.severity * 0.22 * falloff
              break
            case 'economic':
              // DRAMATIC inward push → crater/depression
              displacement = -crisis.severity * 0.18 * falloff
              break
            case 'disaster':
              // Jagged noise pattern → crack/fracture effect
              // Use a pseudo-random hash based on position for consistency
              const hash = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453
              const noise = (hash - Math.floor(hash)) * 2 - 1 // -1 to 1
              displacement = noise * crisis.severity * 0.2 * falloff
              break
          }

          totalDisplacement += displacement
        }
      }

      const newR = r + totalDisplacement
      target[i] = nx * newR
      target[i + 1] = ny * newR
      target[i + 2] = nz * newR
    }

    targetPositions.current = target
  }, [crisisData])

  // ── Animation loop: lerp positions + rotation ──
  useFrame((_, delta) => {
    // Auto-rotation
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05
    }

    // Smooth vertex deformation lerp
    if (
      geometryRef.current &&
      deformationReady.current &&
      targetPositions.current &&
      currentPositions.current
    ) {
      const positions = geometryRef.current.attributes.position.array
      const target = targetPositions.current
      const current = currentPositions.current
      const speed = Math.min(2 * delta, 0.08) // Smooth but responsive

      let needsUpdate = false
      for (let i = 0; i < positions.length; i++) {
        const diff = target[i] - current[i]
        if (Math.abs(diff) > 0.00005) {
          current[i] += diff * speed
          positions[i] = current[i]
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        geometryRef.current.attributes.position.needsUpdate = true
        geometryRef.current.computeVertexNormals()
      }
    }
  })

  // ── Click handler: raycasting → find country → emit selection ──
  const handleClick = useCallback((event) => {
    event.stopPropagation()

    // Get click point in the mesh's local coordinate system
    // This accounts for group rotation and mesh scale
    const localPoint = meshRef.current.worldToLocal(event.point.clone())
    const dir = localPoint.normalize()

    const lat = Math.asin(dir.y) * (180 / Math.PI)
    let phi = Math.atan2(dir.z, -dir.x)
    if (phi < 0) phi += 2 * Math.PI
    const lng = phi * (180 / Math.PI) - 180

    // Find nearest country with crisis data
    if (crisisData && crisisData.length > 0) {
      let nearestCrisis = null
      let minDist = Infinity

      for (const crisis of crisisData) {
        const dist = angularDistance(lat, lng, crisis.lat, crisis.lng)
        if (dist < minDist) {
          minDist = dist
          nearestCrisis = crisis
        }
      }

      // Only select if within 25° of a crisis point
      if (nearestCrisis && minDist < 25) {
        onCountryClick(nearestCrisis)
        return
      }
    }

    // No crisis nearby — find the nearest country in general
    const nearest = findNearestCountry(lat, lng)
    if (nearest && nearest.distance < 20) {
      onCountryClick({
        country: nearest.country,
        lat: nearest.lat,
        lng: nearest.lng,
        severity: 0,
        dominantType: null,
        articles: [],
        articleCount: 0,
      })
    }
  }, [crisisData, onCountryClick])

  // ── Compute marker positions ──
  const markers = useMemo(() => {
    if (!crisisData) return []
    return crisisData.map(crisis => ({
      ...crisis,
      position: latLngToVector3(crisis.lat, crisis.lng, 1.02).toArray(),
    }))
  }, [crisisData])

  return (
    <group ref={groupRef}>
      {/* Earth Sphere */}
      <mesh ref={meshRef} scale={[2.5, 2.5, 2.5]} onClick={handleClick}>
        <sphereGeometry ref={geometryRef} args={[1, 128, 128]} />
        <earthMaterial ref={materialRef} uTexture={colorMap} />
      </mesh>

      {/* Crisis markers (inherit group rotation) */}
      <group scale={[2.5, 2.5, 2.5]}>
        {markers.map((marker, i) => (
          <CrisisMarker
            key={`${marker.country}-${i}`}
            position={marker.position}
            type={marker.dominantType}
            severity={marker.severity}
          />
        ))}
      </group>

      {/* Outer Halo */}
      <mesh scale={[2.7, 2.7, 2.7]}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshBasicMaterial
          color="#40c8dc"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// ─── Lights (existing — untouched) ───
const Lights = () => {
  return (
    <>
      <ambientLight intensity={3.5} />
      <directionalLight position={[15, 5, 5]} intensity={12} color="#fffbeb" />
      <directionalLight position={[-10, 5, -5]} intensity={2} color="#b3d9ff" />
      <pointLight position={[-20, 0, -20]} intensity={8} color="#05dcf9" distance={100} />
    </>
  )
}

// ─── GlobeScene: Canvas wrapper reading from context ───
export default function GlobeScene() {
  const { processedData, autoRotate } = useNewsState()
  const dispatch = useNewsDispatch()

  const handleCountryClick = useCallback((countryData) => {
    dispatch({ type: 'SET_SELECTED_COUNTRY', payload: countryData })
  }, [dispatch])

  return (
    <div className="w-full h-full relative block bg-black">
      <Canvas camera={{ position: [0, 0, 7], fov: 40 }} gl={{ antialias: true }} style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={['#000005']} />
        <Suspense fallback={null}>
          <Lights />
          <Stars radius={100} depth={50} count={8000} factor={3} saturation={0} fade speed={0.5} />
          <Stars radius={200} depth={80} count={6000} factor={5} saturation={0.1} fade speed={0.3} />
          <Stars radius={300} depth={100} count={4000} factor={7} saturation={0} fade speed={0.2} />
          <Earth
            crisisData={processedData}
            onCountryClick={handleCountryClick}
            autoRotate={autoRotate}
          />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={4}
            maxDistance={12}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
