import { Suspense, useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useNewsState, useNewsDispatch } from '../store/newsStore'
import { latLngToVector3, vertexToLatLng, angularDistance, findNearestCountry } from '../utils/countryCoordinates'

// ═══════════════════════════════════════════════════════════════
// ENHANCED EARTH SHADER
// Reads per-vertex displacement data to add emissive glow:
//   - Conflict peaks: orange/red fire glow
//   - Economic vortex: deep blue energy glow
//   - Disaster cracks: dark fissures with molten edge glow
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

      // ── CONFLICT: Fiery orange/red emissive ──
      // Peaks glow hot white-orange, base glows deep red
      if (vType > 0.5 && vType < 1.5 && absDisp > 0.005) {
        float intensity = smoothstep(0.005, 0.15, absDisp);
        // Gradient: dark red at base → orange → white-hot at tips
        vec3 baseColor = vec3(0.6, 0.08, 0.02);
        vec3 midColor  = vec3(1.0, 0.35, 0.05);
        vec3 tipColor  = vec3(1.0, 0.85, 0.4);
        vec3 fireColor = absDisp < 0.15
          ? mix(baseColor, midColor, absDisp / 0.15)
          : mix(midColor, tipColor, min(1.0, (absDisp - 0.15) / 0.3));

        // Darken base surface near spikes
        finalColor = mix(finalColor, finalColor * 0.3, intensity * 0.6);
        // Additive emissive glow
        finalColor += fireColor * intensity * 1.8;
        // Extra bright at extreme peaks
        float peakFlare = smoothstep(0.25, 0.6, absDisp);
        finalColor += tipColor * peakFlare * 2.0;
        // Subtle pulsing at edges
        float pulse = 0.9 + 0.1 * sin(uTime * 4.0 + vPosition.x * 20.0);
        finalColor *= pulse;
      }

      // ── ECONOMIC: Deep blue vortex energy ──
      // Center is bright electric blue, walls are dark indigo
      if (vType > 1.5 && vType < 2.5 && absDisp > 0.005) {
        float intensity = smoothstep(0.005, 0.12, absDisp);
        vec3 wallColor   = vec3(0.02, 0.04, 0.18);
        vec3 midBlue     = vec3(0.1, 0.25, 0.7);
        vec3 centerColor = vec3(0.4, 0.7, 1.0);
        vec3 vortexColor = absDisp < 0.1
          ? mix(wallColor, midBlue, absDisp / 0.1)
          : mix(midBlue, centerColor, min(1.0, (absDisp - 0.1) / 0.2));

        // Darken surface into the depression
        finalColor = mix(finalColor, vec3(0.01, 0.01, 0.05), intensity * 0.8);
        // Blue energy glow
        finalColor += vortexColor * intensity * 1.5;
        // Bright center flash
        float centerFlare = smoothstep(0.2, 0.4, absDisp);
        finalColor += centerColor * centerFlare * 2.5;
        // Animated concentric pulse
        float ring = 0.85 + 0.15 * sin(uTime * 3.0 - absDisp * 50.0);
        finalColor *= ring;
      }

      // ── DISASTER: Concentric shockwave rings ──
      // Seismic ripple rings with amber peaks and teal troughs
      if (vType > 2.5 && absDisp > 0.002) {
        float intensity = smoothstep(0.002, 0.06, absDisp);

        // Determine if this vertex is on a ring peak or trough
        // vDisp > 0 = elevated ring crest, vDisp < 0 = depressed trough
        float isRidge = smoothstep(0.0, 0.03, vDisp);   // positive = ridge
        float isTrough = smoothstep(0.0, 0.02, -vDisp);  // negative = trough

        // Ring crest: bright amber-yellow glow
        vec3 ridgeColor = vec3(1.0, 0.65, 0.1);
        vec3 ridgeHot = vec3(1.0, 0.9, 0.5);
        vec3 ridge = mix(ridgeColor, ridgeHot, smoothstep(0.02, 0.08, vDisp));
        finalColor += ridge * isRidge * intensity * 2.0;

        // Trough: dark teal-green void (like displaced earth)
        vec3 troughColor = vec3(0.02, 0.12, 0.1);
        finalColor = mix(finalColor, troughColor, isTrough * intensity * 0.7);
        // Subtle glow at trough edges
        float troughEdge = smoothstep(0.0, 0.01, -vDisp) * (1.0 - smoothstep(0.01, 0.03, -vDisp));
        finalColor += vec3(0.3, 0.7, 0.5) * troughEdge * 0.4;

        // Animated outward propagation pulse
        float wavePulse = 0.85 + 0.15 * sin(uTime * 2.5 + absDisp * 40.0);
        finalColor *= wavePulse;

        // Faint overall amber haze in disaster zone
        finalColor += vec3(0.15, 0.08, 0.0) * intensity * 0.3;
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ EarthMaterial })

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC HASH FUNCTIONS (for consistent spike/crack generation)
// ═══════════════════════════════════════════════════════════════
function fract(x) { return x - Math.floor(x) }
function hash1(x, y) { return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) }
function hash2(x, y) { return fract(Math.sin(x * 45.164 + y * 93.9891) * 28461.4619) }

/**
 * Generate a cluster of spike positions for a conflict zone.
 * Each spike has a lat/lng offset from the epicenter and a random height.
 * Results are deterministic (based on crisis lat/lng) so they don't change every render.
 */
function generateSpikeCluster(lat, lng, severity) {
  const count = 4 + Math.floor(severity * 10)  // 4–14 spikes per zone
  const spikes = []
  for (let s = 0; s < count; s++) {
    const h1 = hash1(lat + s * 7.31, lng + s * 3.17)
    const h2 = hash2(lat + s * 5.93, lng + s * 11.41)
    const angle = h1 * Math.PI * 2
    const dist = h2 * 10 * severity       // spread up to 10° from center
    const spikeLat = lat + Math.cos(angle) * dist
    const spikeLng = lng + Math.sin(angle) * dist
    const height = 0.25 + h1 * 0.75       // height factor 0.25–1.0
    const sharpness = 4 + Math.floor(h2 * 5) // exponent 4–8 (higher = sharper)
    spikes.push({ lat: spikeLat, lng: spikeLng, height, sharpness })
  }
  return spikes
}

/**
 * Generate wave ring parameters for a disaster zone.
 * Returns { frequency, ringCount, phaseOffset } — deterministic per crisis.
 */
function generateWaveRings(lat, lng, severity) {
  const frequency = 1.8 + hash1(lat * 2.1, lng * 4.3) * 1.2  // 1.8–3.0 rings per 10°
  const ringCount = 3 + Math.floor(severity * 5)               // 3–8 visible rings
  const phaseOffset = hash2(lat, lng) * Math.PI * 2             // unique phase per zone
  return { frequency, ringCount, phaseOffset }
}

// ─── Crisis Marker: Pulsing glow dot + beam at crisis epicenters (unchanged) ───
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

  const dir = useMemo(() => {
    const v = new THREE.Vector3(...position).normalize()
    return v
  }, [position])

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
// EARTH COMPONENT — Deformation + Raycasting
// ═══════════════════════════════════════════════════════════════
const Earth = ({ crisisData, onCountryClick, autoRotate }) => {
  const groupRef = useRef()
  const meshRef = useRef()
  const materialRef = useRef()
  const geometryRef = useRef()

  // Deformation state
  const originalPositions = useRef(null)
  const targetPositions = useRef(null)
  const currentPositions = useRef(null)
  // Per-vertex displacement metadata for shader emissive coloring
  const targetDispAmounts = useRef(null)   // signed displacement magnitude
  const targetDispTypes = useRef(null)     // 0=none, 1=conflict, 2=economic, 3=disaster
  const currentDispAmounts = useRef(null)
  const deformationReady = useRef(false)
  // Pre-computed spike/wave data (generated once per crisisData update)
  const spikeCache = useRef(null)
  const waveCache = useRef(null)

  const [colorMap] = useTexture([
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
  ])

  // ── Store original geometry + create shader attributes on mount ──
  useEffect(() => {
    if (!geometryRef.current) return

    const geo = geometryRef.current
    const positions = geo.attributes.position.array
    const vertexCount = geo.attributes.position.count

    // Clone original positions
    originalPositions.current = new Float32Array(positions)
    currentPositions.current = new Float32Array(positions)
    targetPositions.current = new Float32Array(positions)

    // Create per-vertex attribute arrays for the shader
    targetDispAmounts.current = new Float32Array(vertexCount)
    targetDispTypes.current = new Float32Array(vertexCount)
    currentDispAmounts.current = new Float32Array(vertexCount)

    // Attach custom attributes to geometry (shader reads these)
    geo.setAttribute('aDisplacement', new THREE.BufferAttribute(new Float32Array(vertexCount), 1))
    geo.setAttribute('aType', new THREE.BufferAttribute(new Float32Array(vertexCount), 1))

    deformationReady.current = true
  }, [])

  // ═══════════════════════════════════════════════════════════
  // ENHANCED DEFORMATION COMPUTATION
  //
  // Called once when crisisData changes. Pre-generates all spike
  // clusters and wave ring patterns, then computes per-vertex targets.
  //
  // CONFLICT → Sharp crystalline spikes
  //   Each zone spawns 4–14 spike sub-positions. Each spike uses
  //   a pow(1-d/r, exponent) falloff where exponent=4–8 creates
  //   very narrow, sharp cones (unlike Gaussian which is blobby).
  //
  // ECONOMIC → Deep funnel/vortex depression
  //   Uses pow(1-d/r, 3) for steep bowl walls. Concentric ripples
  //   created by a sin() term modulate the depth for visual detail.
  //
  // DISASTER → Concentric shockwave rings
  //   Sinusoidal displacement waves radiate outward from epicenter.
  //   Creates visible ring ridges and troughs like seismic waves.
  //   Amplitude fades with distance; frequency is per-zone unique.
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!deformationReady.current || !originalPositions.current) return
    if (!crisisData || crisisData.length === 0) {
      // Reset to undisturbed sphere
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

    // ── Pre-generate spike clusters and wave ring params ──
    const spikeData = []   // { crisis, spikes[] }
    const waveData = []    // { crisis, frequency, ringCount, phaseOffset }
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

    // ── Per-vertex deformation ──
    for (let vi = 0; vi < vertexCount; vi++) {
      const i3 = vi * 3
      const x = orig[i3], y = orig[i3 + 1], z = orig[i3 + 2]
      const r = Math.sqrt(x * x + y * y + z * z)
      const nx = x / r, ny = y / r, nz = z / r
      const { lat, lng } = vertexToLatLng(x, y, z)

      let totalDisplacement = 0
      let dominantType = 0    // 0=none
      let maxTypeWeight = 0   // track which type has strongest influence

      for (const crisis of crisisData) {
        const dist = angularDistance(lat, lng, crisis.lat, crisis.lng)
        const OUTER_LIMIT = 22 // maximum influence check radius

        if (dist >= OUTER_LIMIT) continue

        let displacement = 0
        let typeCode = 0

        switch (crisis.dominantType) {
          // ───────────────────────────────
          // CONFLICT: SHARP CRYSTALLINE SPIKES
          // ───────────────────────────────
          case 'conflict': {
            typeCode = 1
            // Find this crisis's spike cluster
            const entry = spikeData.find(s => s.crisis === crisis)
            if (entry) {
              for (const spike of entry.spikes) {
                const dSpike = angularDistance(lat, lng, spike.lat, spike.lng)
                const spikeRadius = 3.0 // very narrow, 3° radius
                if (dSpike < spikeRadius) {
                  // Sharp cone: pow(1-d/r, exponent) — high exponent = knife-sharp
                  const normalized = dSpike / spikeRadius
                  const sharp = Math.pow(1 - normalized, spike.sharpness)
                  displacement += crisis.severity * spike.height * 0.55 * sharp
                }
              }
            }
            // Broader base elevation (subtle, wide rise)
            if (dist < 15) {
              const baseFalloff = Math.pow(Math.max(0, 1 - dist / 15), 2)
              displacement += crisis.severity * 0.04 * baseFalloff
            }
            break
          }

          // ───────────────────────────────
          // ECONOMIC: DEEP VORTEX / FUNNEL
          // ───────────────────────────────
          case 'economic': {
            typeCode = 2
            const vortexRadius = 14
            if (dist < vortexRadius) {
              const normalized = dist / vortexRadius
              // Steep funnel shape: pow(1-x, 3) = steep walls, deep center
              const bowlShape = Math.pow(1 - normalized, 3)
              // Concentric ripples add visual detail
              const ripple = 1 + 0.12 * Math.sin(dist * 2.8)
              displacement -= crisis.severity * 0.42 * bowlShape * ripple
            }
            break
          }

          // ───────────────────────────────────────
          // DISASTER: CONCENTRIC SHOCKWAVE RINGS
          // Sinusoidal waves radiating from epicenter
          // ───────────────────────────────────────
          case 'disaster': {
            typeCode = 3
            const waveRadius = 18
            if (dist < waveRadius) {
              const entry = waveData.find(w => w.crisis === crisis)
              const freq = entry ? entry.frequency : 2.2
              const phase = entry ? entry.phaseOffset : 0

              // Amplitude envelope: strongest near center, fades outward
              const envelope = Math.pow(Math.max(0, 1 - dist / waveRadius), 1.8)

              // Sinusoidal wave creating concentric rings
              // sin(dist * freq) produces alternating ridges (+) and troughs (-)
              const wave = Math.sin(dist * freq + phase)

              // Scale the wave by severity and envelope
              const amplitude = crisis.severity * 0.12
              displacement += wave * amplitude * envelope

              // Add subtle surface roughening for realism
              const noise = (hash1(lat * 15 + phase, lng * 15) - 0.5) * 2
              const noiseFalloff = Math.pow(Math.max(0, 1 - dist / waveRadius), 2.5)
              displacement += noise * crisis.severity * 0.012 * noiseFalloff
            }
            break
          }
        }

        totalDisplacement += displacement

        // Track dominant type by weight of displacement
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

  // ── Animation loop: lerp positions + update shader attributes ──
  useFrame(({ clock }, delta) => {
    // Auto-rotation
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05
    }

    // Pass time to shader for animated glow
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

        // Update displacement attributes for shader coloring
        if (geo.attributes.aDisplacement && geo.attributes.aType) {
          const dispAttr = geo.attributes.aDisplacement.array
          const typeAttr = geo.attributes.aType.array
          const orig = originalPositions.current
          const targetTypes = targetDispTypes.current
          const vertexCount = dispAttr.length

          for (let vi = 0; vi < vertexCount; vi++) {
            const i3 = vi * 3
            // Compute current displacement magnitude from difference to original radius
            const ox = orig[i3], oy = orig[i3 + 1], oz = orig[i3 + 2]
            const cx = current[i3], cy = current[i3 + 1], cz = current[i3 + 2]
            const origR = Math.sqrt(ox * ox + oy * oy + oz * oz)
            const currR = Math.sqrt(cx * cx + cy * cy + cz * cz)
            dispAttr[vi] = currR - origR  // Signed: positive = ridge, negative = trough
            typeAttr[vi] = targetTypes[vi]
          }

          geo.attributes.aDisplacement.needsUpdate = true
          geo.attributes.aType.needsUpdate = true
        }
      }
    }
  })

  // ── Click handler: raycasting → find country → emit selection (unchanged) ──
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

  // ── Compute marker positions (unchanged) ──
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
        <earthMaterial ref={materialRef} uTexture={colorMap} uTime={0} />
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

// ─── Lights (unchanged) ───
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

// ─── GlobeScene (unchanged) ───
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
