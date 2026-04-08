/**
 * CountryHighlight — Three.js component that renders a glowing border
 * around the selected country on the globe.
 *
 * GLOW TECHNIQUE:
 *   Two overlapping LineSegments from the same geometry:
 *     1. INNER line — bright cyan, full opacity, at radius 1.006
 *     2. OUTER glow — same geometry scaled up 0.3%, lower opacity,
 *        additive blending creating a soft bloom effect
 *
 *   Both use THREE.AdditiveBlending, which naturally creates a glow
 *   against the dark globe surface (colors add up, exceeding 1.0
 *   in bright areas → white-hot edges).
 *
 * ANIMATION:
 *   - Fade-in via opacity lerp when a country is selected
 *   - Fade-out via opacity lerp when deselected (geometry kept alive
 *     until fully transparent to avoid pop)
 *   - Continuous "breathing" pulse: opacity modulates sinusoidally
 *
 * PERFORMANCE:
 *   - Geometries are cached in countryBorders.js (never rebuilt)
 *   - Only 2 draw calls total (inner + outer line)
 *   - No per-vertex computation in the render loop
 */
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loadCountryBorders, getCountryBorderGeometry } from '../utils/countryBorders';

const CountryHighlight = ({ countryKey }) => {
  const innerRef = useRef();
  const outerRef = useRef();
  const currentOpacity = useRef(0);
  const prevCountryRef = useRef(null);

  const [bordersLoaded, setBordersLoaded] = useState(false);
  const [displayGeometry, setDisplayGeometry] = useState(null);

  // Empty geometry placeholder (for fade-out period)
  const emptyGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    return g;
  }, []);

  // ── Load border data on mount ──
  useEffect(() => {
    loadCountryBorders()
      .then(() => setBordersLoaded(true))
      .catch(() => {}); // silently fail — globe works without borders
  }, []);

  // ── Update displayed border when country changes ──
  useEffect(() => {
    if (!bordersLoaded) return;

    if (countryKey) {
      const geo = getCountryBorderGeometry(countryKey);
      if (geo) {
        setDisplayGeometry(geo);
        prevCountryRef.current = countryKey;
      }
    }
    // When countryKey becomes null, DON'T clear displayGeometry yet —
    // let the fade-out animation play first. The useFrame handler
    // will clear it after opacity reaches ~0.
  }, [bordersLoaded, countryKey]);

  // ── Animate opacity (fade in/out + pulse) ──
  useFrame(({ clock }, delta) => {
    // Target: 1.0 when selected, 0.0 when deselected
    const target = countryKey ? 1 : 0;
    const speed = 4.0 * delta; // smooth transition ~250ms
    currentOpacity.current += (target - currentOpacity.current) * Math.min(speed, 0.15);

    // Clear geometry after full fade-out
    if (currentOpacity.current < 0.005 && target === 0 && displayGeometry) {
      setDisplayGeometry(null);
      currentOpacity.current = 0;
      return;
    }

    // Breathing pulse (2.5Hz, ±30% amplitude)
    const pulse = 0.7 + 0.3 * Math.sin(clock.getElapsedTime() * 2.5);
    const innerOpacity = currentOpacity.current * pulse;
    const outerOpacity = innerOpacity * 0.35;

    if (innerRef.current) {
      innerRef.current.material.opacity = innerOpacity;
    }
    if (outerRef.current) {
      outerRef.current.material.opacity = outerOpacity;
    }
  });

  const activeGeo = displayGeometry || emptyGeometry;

  return (
    <group>
      {/* Inner bright border line */}
      <lineSegments ref={innerRef} geometry={activeGeo}>
        <lineBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Outer glow (slightly scaled up for bloom effect) */}
      <lineSegments
        ref={outerRef}
        geometry={activeGeo}
        scale={[1.003, 1.003, 1.003]}
      >
        <lineBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};

export default CountryHighlight;
