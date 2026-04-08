import { Suspense, useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useNewsState, useNewsDispatch } from '../store/newsStore'
import { latLngToVector3, vertexToLatLng, angularDistance, findNearestCountry } from '../utils/countryCoordinates'
import CountryHighlight from './CountryHighlight'

// ═══════════════════════════════════════════════════════════════
// ENHANCED EARTH SHADER
// Reads per-vertex displacement data to add emissive glow:
//   - Conflict peaks: orange/red fire glow       (type 1)
//   - Economic vortex: deep blue energy glow      (type 2)
//   - Disaster rings: amber shockwave glow        (type 3)
//   - Health blisters: toxic green pulsing glow   (type 4)
// ═══════════════════════════════════════════════════════════════
const EarthMaterial = shaderMaterial(
  { uTexture: null, uTime: 0 },
  // ─── VERTEX SHADER ───
  `
    attribute float aDisplacement;
    attribute float aType;

    varying vec2 vUv;
    varying float vDisp;
    varying float vType;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vDisp = aDisplacement;
      vType = aType;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // ─── FRAGMENT SHADER ───
  `
    uniform sampler2D uTexture;
    uniform float uTime;

    varying vec2 vUv;
    varying float vDisp;
    varying float vType;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec4 texColor = texture2D(uTexture, vUv);

      // ── Base earth coloring (preserved from original) ──
      float isOcean = step(texColor.r + 0.05, texColor.b) * step(texColor.g, texColor.b + 0.1);
      vec3 oceanCyan = vec3(0.18, 0.52, 0.62);
      vec3 brightenedOcean = mix(texColor.rgb * 1.15, oceanCyan, 0.45);
      vec3 brightenedLand = texColor.rgb * 1.4;
      vec3 finalColor = mix(brightenedLand, brightenedOcean, isOcean);

      float absDisp = abs(vDisp);

      // ── CONFLICT (type 1): Fiery orange/red emissive ──
      if (vType > 0.5 && vType < 1.5 && absDisp > 0.005) {
        float intensity = smoothstep(0.005, 0.15, absDisp);
        vec3 baseColor = vec3(0.6, 0.08, 0.02);
        vec3 midColor  = vec3(1.0, 0.35, 0.05);
        vec3 tipColor  = vec3(1.0, 0.85, 0.4);
        vec3 fireColor = absDisp < 0.15
          ? mix(baseColor, midColor, absDisp / 0.15)
          : mix(midColor, tipColor, min(1.0, (absDisp - 0.15) / 0.3));
        finalColor = mix(finalColor, finalColor * 0.3, intensity * 0.6);
        finalColor += fireColor * intensity * 1.8;
        float peakFlare = smoothstep(0.25, 0.6, absDisp);
        finalColor += tipColor * peakFlare * 2.0;
        float pulse = 0.9 + 0.1 * sin(uTime * 4.0 + vPosition.x * 20.0);
        finalColor *= pulse;
      }

      // ── ECONOMIC (type 2): Deep blue vortex energy ──
      if (vType > 1.5 && vType < 2.5 && absDisp > 0.005) {
        float intensity = smoothstep(0.005, 0.12, absDisp);
        vec3 wallColor   = vec3(0.02, 0.04, 0.18);
        vec3 midBlue     = vec3(0.1, 0.25, 0.7);
        vec3 centerColor = vec3(0.4, 0.7, 1.0);
        vec3 vortexColor = absDisp < 0.1
          ? mix(wallColor, midBlue, absDisp / 0.1)
          : mix(midBlue, centerColor, min(1.0, (absDisp - 0.1) / 0.2));
        finalColor = mix(finalColor, vec3(0.01, 0.01, 0.05), intensity * 0.8);
        finalColor += vortexColor * intensity * 1.5;
        float centerFlare = smoothstep(0.2, 0.4, absDisp);
        finalColor += centerColor * centerFlare * 2.5;
        float ring = 0.85 + 0.15 * sin(uTime * 3.0 - absDisp * 50.0);
        finalColor *= ring;
      }

      // ── DISASTER (type 3): Concentric shockwave rings ──
      if (vType > 2.5 && vType < 3.5 && absDisp > 0.002) {
        float intensity = smoothstep(0.002, 0.06, absDisp);
        float isRidge = smoothstep(0.0, 0.03, vDisp);
        float isTrough = smoothstep(0.0, 0.02, -vDisp);
        vec3 ridgeColor = vec3(1.0, 0.65, 0.1);
        vec3 ridgeHot = vec3(1.0, 0.9, 0.5);
        vec3 ridge = mix(ridgeColor, ridgeHot, smoothstep(0.02, 0.08, vDisp));
        finalColor += ridge * isRidge * intensity * 2.0;
        vec3 troughColor = vec3(0.02, 0.12, 0.1);
        finalColor = mix(finalColor, troughColor, isTrough * intensity * 0.7);
        float troughEdge = smoothstep(0.0, 0.01, -vDisp) * (1.0 - smoothstep(0.01, 0.03, -vDisp));
        finalColor += vec3(0.3, 0.7, 0.5) * troughEdge * 0.4;
        float wavePulse = 0.85 + 0.15 * sin(uTime * 2.5 + absDisp * 40.0);
        finalColor *= wavePulse;
        finalColor += vec3(0.15, 0.08, 0.0) * intensity * 0.3;
      }

      // ── HEALTH (type 4): Toxic green pulsating blister glow ──
      if (vType > 3.5 && vType < 4.5 && absDisp > 0.003) {
        float intensity = smoothstep(0.003, 0.1, absDisp);
        // Gradient: dark green base → bright toxic green → white-green tips
        vec3 baseGreen = vec3(0.02, 0.2, 0.08);
        vec3 midGreen  = vec3(0.1, 0.8, 0.3);
        vec3 tipGreen  = vec3(0.5, 1.0, 0.6);
        vec3 healthColor = absDisp < 0.08
          ? mix(baseGreen, midGreen, absDisp / 0.08)
          : mix(midGreen, tipGreen, min(1.0, (absDisp - 0.08) / 0.15));
        // Darken surrounding surface
        finalColor = mix(finalColor, finalColor * 0.4, intensity * 0.5);
        // Green emissive glow
        finalColor += healthColor * intensity * 1.6;
        // Pulsating organic animation (slower, rhythmic breathing)
        float breathe = 0.8 + 0.2 * sin(uTime * 2.0 + vPosition.y * 15.0);
        finalColor *= breathe;
        // Bright dome highlight
        float domeFlare = smoothstep(0.1, 0.2, absDisp);
        finalColor += tipGreen * domeFlare * 1.0;
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ EarthMaterial })

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC HASH FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function fract(x) { return x - Math.floor(x) }
function hash1(x, y) { return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) }
function hash2(x, y) { return fract(Math.sin(x * 45.164 + y * 93.9891) * 28461.4619) }

function generateSpikeCluster(lat, lng, severity) {
  const count = 4 + Math.floor(severity * 10)
  const spikes = []
  for (let s = 0; s < count; s++) {
    const h1 = hash1(lat + s * 7.31, lng + s * 3.17)
    const h2 = hash2(lat + s * 5.93, lng + s * 11.41)
    const angle = h1 * Math.PI * 2
    const dist = h2 * 10 * severity
    const spikeLat = lat + Math.cos(angle) * dist
    const spikeLng = lng + Math.sin(angle) * dist
    const height = 0.25 + h1 * 0.75
    const sharpness = 4 + Math.floor(h2 * 5)
    spikes.push({ lat: spikeLat, lng: spikeLng, height, sharpness })
  }
  return spikes
}

function generateWaveRings(lat, lng, severity) {
  const frequency = 1.8 + hash1(lat * 2.1, lng * 4.3) * 1.2
  const ringCount = 3 + Math.floor(severity * 5)
  const phaseOffset = hash2(lat, lng) * Math.PI * 2
  return { frequency, ringCount, phaseOffset }
}

// ─── Crisis Marker ───
const CrisisMarker = ({ position, type, severity }) => {
  const dotRef = useRef()
  const beamRef = useRef()

  const color = useMemo(() => {
    switch (type) {
      case 'conflict': return '#ff4444'
      case 'economic': return '#4488ff'
      case 'disaster': return '#ffaa00'
      case 'health': return '#22c55e'
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

  const dir = useMemo(() => new THREE.Vector3(...position).normalize(), [position])

  const beamPos = useMemo(() => {
    const p = new THREE.Vector3(...position)
    const d = dir.clone().multiplyScalar(beamHeight / 2)
    return p.add(d).toArray()
  }, [position, dir, beamHeight])

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return q
  }, [dir])

  return (
    <group>
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

// ═══════════════════════════════════════════════════════════════
// EARTH COMPONENT — Deformation + Raycasting + Navigation
// ═══════════════════════════════════════════════════════════════
const Earth = ({ crisisData, onCountryClick, autoRotate, navigateTarget, onNavigateComplete, selectedCountryKey }) => {
  const groupRef = useRef()
  const meshRef = useRef()
  const materialRef = useRef()
  const geometryRef = useRef()

  // Deformation state
  const originalPositions = useRef(null)
  const targetPositions = useRef(null)
  const currentPositions = useRef(null)
  const targetDispAmounts = useRef(null)
  const targetDispTypes = useRef(null)
  const currentDispAmounts = useRef(null)
  const deformationReady = useRef(false)
  const spikeCache = useRef(null)
  const waveCache = useRef(null)

  // Navigation animation state
  const navAnimating = useRef(false)
  const navStartRotation = useRef(new THREE.Euler())
  const navTargetRotation = useRef(new THREE.Euler())
  const navProgress = useRef(0)

  const [colorMap] = useTexture([
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
  ])

  // ── Store original geometry + create shader attributes on mount ──
  useEffect(() => {
    if (!geometryRef.current) return

    const geo = geometryRef.current
    const positions = geo.attributes.position.array
    const vertexCount = geo.attributes.position.count

    originalPositions.current = new Float32Array(positions)
    currentPositions.current = new Float32Array(positions)
    targetPositions.current = new Float32Array(positions)

    targetDispAmounts.current = new Float32Array(vertexCount)
    targetDispTypes.current = new Float32Array(vertexCount)
    currentDispAmounts.current = new Float32Array(vertexCount)

    geo.setAttribute('aDisplacement', new THREE.BufferAttribute(new Float32Array(vertexCount), 1))
    geo.setAttribute('aType', new THREE.BufferAttribute(new Float32Array(vertexCount), 1))

    deformationReady.current = true
  }, [])

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION — Smooth rotation to face a country
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!navigateTarget || !groupRef.current) return

    // Compute the Y rotation needed so the country faces the camera.
    // The camera looks at the globe from the +Z direction.
    // For a country at longitude L, we need to rotate the globe
    // by -(L + 90) degrees around Y (adjusting for SphereGeometry convention).
    const targetLng = navigateTarget.lng
    const targetYRotation = -((targetLng + 90) * Math.PI / 180)

    navStartRotation.current = groupRef.current.rotation.clone()
    navTargetRotation.current = new THREE.Euler(
      0, // keep X flat
      targetYRotation,
      0,
    )
    navProgress.current = 0
    navAnimating.current = true
  }, [navigateTarget])

  // ═══════════════════════════════════════════════════════════
  // DEFORMATION COMPUTATION
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!deformationReady.current || !originalPositions.current) return
    if (!crisisData || crisisData.length === 0) {
      targetPositions.current = new Float32Array(originalPositions.current)
      targetDispAmounts.current.fill(0)
      targetDispTypes.current.fill(0)
      return
    }

    const orig = originalPositions.current
    const target = new Float32Array(orig.length)
    const vertexCount = orig.length / 3
    const dispAmounts = new Float32Array(vertexCount)
    const dispTypes = new Float32Array(vertexCount)

    // Pre-generate spike clusters and wave ring params
    const spikeData = []
    const waveData = []
    for (const crisis of crisisData) {
      if (crisis.dominantType === 'conflict') {
        spikeData.push({
          crisis,
          spikes: generateSpikeCluster(crisis.lat, crisis.lng, crisis.severity),
        })
      } else if (crisis.dominantType === 'disaster') {
        waveData.push({
          crisis,
          ...generateWaveRings(crisis.lat, crisis.lng, crisis.severity),
        })
      }
    }
    spikeCache.current = spikeData
    waveCache.current = waveData

    // Per-vertex deformation
    for (let vi = 0; vi < vertexCount; vi++) {
      const i3 = vi * 3
      const x = orig[i3], y = orig[i3 + 1], z = orig[i3 + 2]
      const r = Math.sqrt(x * x + y * y + z * z)
      const nx = x / r, ny = y / r, nz = z / r
      const { lat, lng } = vertexToLatLng(x, y, z)

      let totalDisplacement = 0
      let dominantType = 0
      let maxTypeWeight = 0

      for (const crisis of crisisData) {
        const dist = angularDistance(lat, lng, crisis.lat, crisis.lng)
        const OUTER_LIMIT = 22

        if (dist >= OUTER_LIMIT) continue

        let displacement = 0
        let typeCode = 0

        switch (crisis.dominantType) {
          // CONFLICT: SHARP CRYSTALLINE SPIKES
          case 'conflict': {
            typeCode = 1
            const entry = spikeData.find(s => s.crisis === crisis)
            if (entry) {
              for (const spike of entry.spikes) {
                const dSpike = angularDistance(lat, lng, spike.lat, spike.lng)
                const spikeRadius = 3.0
                if (dSpike < spikeRadius) {
                  const normalized = dSpike / spikeRadius
                  const sharp = Math.pow(1 - normalized, spike.sharpness)
                  displacement += crisis.severity * spike.height * 0.55 * sharp
                }
              }
            }
            if (dist < 15) {
              const baseFalloff = Math.pow(Math.max(0, 1 - dist / 15), 2)
              displacement += crisis.severity * 0.04 * baseFalloff
            }
            break
          }

          // ECONOMIC: DEEP VORTEX / FUNNEL
          case 'economic': {
            typeCode = 2
            const vortexRadius = 14
            if (dist < vortexRadius) {
              const normalized = dist / vortexRadius
              const bowlShape = Math.pow(1 - normalized, 3)
              const ripple = 1 + 0.12 * Math.sin(dist * 2.8)
              displacement -= crisis.severity * 0.42 * bowlShape * ripple
            }
            break
          }

          // DISASTER: CONCENTRIC SHOCKWAVE RINGS
          case 'disaster': {
            typeCode = 3
            const waveRadius = 18
            if (dist < waveRadius) {
              const entry = waveData.find(w => w.crisis === crisis)
              const freq = entry ? entry.frequency : 2.2
              const phase = entry ? entry.phaseOffset : 0
              const envelope = Math.pow(Math.max(0, 1 - dist / waveRadius), 1.8)
              const wave = Math.sin(dist * freq + phase)
              const amplitude = crisis.severity * 0.12
              displacement += wave * amplitude * envelope
              const noise = (hash1(lat * 15 + phase, lng * 15) - 0.5) * 2
              const noiseFalloff = Math.pow(Math.max(0, 1 - dist / waveRadius), 2.5)
              displacement += noise * crisis.severity * 0.012 * noiseFalloff
            }
            break
          }

          // HEALTH: PULSATING BUBBLE / BLISTER
          // Smooth dome pushed outward — organic, rounded, distinct from spikes
          case 'health': {
            typeCode = 4
            const bubbleRadius = 12
            if (dist < bubbleRadius) {
              const normalized = dist / bubbleRadius
              // Smooth dome: cos^2 falloff → rounded, not sharp
              const dome = Math.pow(Math.cos(normalized * Math.PI / 2), 2)
              // Add subtle blistered bumps using noise
              const bumpNoise = 1 + 0.15 * Math.sin(lat * 8 + lng * 6) * Math.cos(lat * 5 - lng * 9)
              displacement += crisis.severity * 0.25 * dome * bumpNoise
            }
            break
          }
        }

        totalDisplacement += displacement

        const weight = Math.abs(displacement)
        if (weight > maxTypeWeight) {
          maxTypeWeight = weight
          dominantType = typeCode
        }
      }

      const newR = r + totalDisplacement
      target[i3]     = nx * newR
      target[i3 + 1] = ny * newR
      target[i3 + 2] = nz * newR

      dispAmounts[vi] = totalDisplacement
      dispTypes[vi] = dominantType
    }

    targetPositions.current = target
    targetDispAmounts.current = dispAmounts
    targetDispTypes.current = dispTypes
  }, [crisisData])

  // ── Animation loop ──
  useFrame(({ clock }, delta) => {
    // ── Navigation animation (smooth rotation to target country) ──
    if (navAnimating.current && groupRef.current) {
      navProgress.current += delta * 1.2 // ~0.8s for full rotation
      const t = Math.min(navProgress.current, 1)
      // Ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

      const startY = navStartRotation.current.y
      const endY = navTargetRotation.current.y

      // Handle wraparound: find shortest rotation path
      let diff = endY - startY
      if (diff > Math.PI) diff -= 2 * Math.PI
      if (diff < -Math.PI) diff += 2 * Math.PI

      groupRef.current.rotation.y = startY + diff * eased
      groupRef.current.rotation.x = navStartRotation.current.x * (1 - eased)

      if (t >= 1) {
        navAnimating.current = false
        if (onNavigateComplete) onNavigateComplete()
      }
    }
    // Auto-rotation (only if not navigating)
    else if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05
    }

    // Pass time to shader
    if (materialRef.current) {
      materialRef.current.uTime = clock.getElapsedTime()
    }

    // Smooth vertex deformation lerp
    if (
      geometryRef.current &&
      deformationReady.current &&
      targetPositions.current &&
      currentPositions.current
    ) {
      const geo = geometryRef.current
      const positions = geo.attributes.position.array
      const target = targetPositions.current
      const current = currentPositions.current
      const speed = Math.min(2.5 * delta, 0.06)

      let needsUpdate = false
      for (let i = 0; i < positions.length; i++) {
        const diff = target[i] - current[i]
        if (Math.abs(diff) > 0.00003) {
          current[i] += diff * speed
          positions[i] = current[i]
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        geo.attributes.position.needsUpdate = true
        geo.computeVertexNormals()

        if (geo.attributes.aDisplacement && geo.attributes.aType) {
          const dispAttr = geo.attributes.aDisplacement.array
          const typeAttr = geo.attributes.aType.array
          const orig = originalPositions.current
          const targetTypes = targetDispTypes.current
          const vertexCount = dispAttr.length

          for (let vi = 0; vi < vertexCount; vi++) {
            const i3 = vi * 3
            const ox = orig[i3], oy = orig[i3 + 1], oz = orig[i3 + 2]
            const cx = current[i3], cy = current[i3 + 1], cz = current[i3 + 2]
            const origR = Math.sqrt(ox * ox + oy * oy + oz * oz)
            const currR = Math.sqrt(cx * cx + cy * cy + cz * cz)
            dispAttr[vi] = currR - origR
            typeAttr[vi] = targetTypes[vi]
          }

          geo.attributes.aDisplacement.needsUpdate = true
          geo.attributes.aType.needsUpdate = true
        }
      }
    }
  })

  // ── Click handler ──
  const handleClick = useCallback((event) => {
    event.stopPropagation()

    const localPoint = meshRef.current.worldToLocal(event.point.clone())
    const dir = localPoint.normalize()

    const lat = Math.asin(dir.y) * (180 / Math.PI)
    let phi = Math.atan2(dir.z, -dir.x)
    if (phi < 0) phi += 2 * Math.PI
    const lng = phi * (180 / Math.PI) - 180

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

      if (nearestCrisis && minDist < 25) {
        onCountryClick(nearestCrisis)
        return
      }
    }

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
      <mesh ref={meshRef} scale={[2.5, 2.5, 2.5]} onClick={handleClick}>
        <sphereGeometry ref={geometryRef} args={[1, 128, 128]} />
        <earthMaterial ref={materialRef} uTexture={colorMap} uTime={0} />
      </mesh>

      {/* Country border highlight */}
      <group scale={[2.5, 2.5, 2.5]}>
        <CountryHighlight countryKey={selectedCountryKey} />
      </group>

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

// ─── Lights ───
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

// ─── GlobeScene — Now reads filteredData + navigateTarget from store ───
export default function GlobeScene() {
  const { filteredData, autoRotate, navigateTarget, selectedCountry } = useNewsState()
  const dispatch = useNewsDispatch()

  const selectedCountryKey = selectedCountry?.country || null

  const handleCountryClick = useCallback((countryData) => {
    dispatch({ type: 'SET_SELECTED_COUNTRY', payload: countryData })
  }, [dispatch])

  const handleNavigateComplete = useCallback(() => {
    dispatch({ type: 'CLEAR_NAVIGATE' })
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
            crisisData={filteredData}
            onCountryClick={handleCountryClick}
            autoRotate={autoRotate}
            navigateTarget={navigateTarget}
            onNavigateComplete={handleNavigateComplete}
            selectedCountryKey={selectedCountryKey}
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
