/**
 * Country Borders Utility
 * Fetches world-atlas TopoJSON, converts to GeoJSON, and creates
 * Three.js line segment geometries for country border highlighting.
 *
 * DATA FLOW:
 *   1. Fetch countries-110m.json (TopoJSON, ~292KB) from CDN once
 *   2. Convert TopoJSON → GeoJSON features via topojson-client
 *   3. Match each GeoJSON feature to our internal country keys
 *      using ISO 3166-1 numeric codes (feature.id)
 *   4. On demand: convert a country's polygon rings to LineSegments
 *      geometry on a unit sphere (radius=1), cached for reuse
 *
 * WHY LINE SEGMENTS:
 *   Three.js Line can't handle breaks between disconnected polygons
 *   (e.g., archipelagos like Indonesia, Philippines). LineSegments
 *   draws vertex pairs independently: [v0→v1, v2→v3, ...], so we
 *   can pack all polygon edges into one BufferGeometry / one draw call.
 */
import * as THREE from 'three';
import * as topojson from 'topojson-client';
import { latLngToVector3 } from './countryCoordinates';

// CDN URL for world-atlas TopoJSON (Natural Earth 110m resolution)
const TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ═══════════════════════════════════════════════════════════════
// ISO 3166-1 NUMERIC → Internal country key mapping
// The TopoJSON feature.id is the ISO numeric code (as a number).
// ═══════════════════════════════════════════════════════════════
const ISO_TO_KEY = {
  4: 'afghanistan', 8: 'albania', 12: 'algeria', 24: 'angola',
  32: 'argentina', 51: 'armenia', 36: 'australia', 40: 'austria',
  31: 'azerbaijan', 48: 'bahrain', 50: 'bangladesh', 112: 'belarus',
  56: 'belgium', 68: 'bolivia', 70: 'bosnia', 76: 'brazil',
  100: 'bulgaria', 116: 'cambodia', 120: 'cameroon', 124: 'canada',
  148: 'chad', 152: 'chile', 156: 'china', 170: 'colombia',
  180: 'congo', 191: 'croatia', 192: 'cuba', 196: 'cyprus',
  203: 'czech republic', 208: 'denmark', 214: 'dominican republic',
  218: 'ecuador', 818: 'egypt', 222: 'el salvador', 233: 'estonia',
  231: 'ethiopia', 246: 'finland', 250: 'france', 268: 'georgia',
  276: 'germany', 288: 'ghana', 300: 'greece', 320: 'guatemala',
  324: 'guinea', 332: 'haiti', 340: 'honduras', 348: 'hungary',
  352: 'iceland', 356: 'india', 360: 'indonesia', 364: 'iran',
  368: 'iraq', 372: 'ireland', 376: 'israel', 380: 'italy',
  388: 'jamaica', 392: 'japan', 400: 'jordan', 398: 'kazakhstan',
  404: 'kenya', 414: 'kuwait', 417: 'kyrgyzstan',
  428: 'latvia', 422: 'lebanon', 434: 'libya', 440: 'lithuania',
  450: 'madagascar', 458: 'malaysia', 466: 'mali', 484: 'mexico',
  498: 'moldova', 496: 'mongolia', 499: 'montenegro', 504: 'morocco',
  508: 'mozambique', 104: 'myanmar', 516: 'namibia', 524: 'nepal',
  528: 'netherlands', 554: 'new zealand', 558: 'nicaragua', 562: 'niger',
  566: 'nigeria', 408: 'north korea', 807: 'north macedonia',
  578: 'norway', 512: 'oman', 586: 'pakistan', 275: 'palestine',
  591: 'panama', 600: 'paraguay', 604: 'peru', 608: 'philippines',
  616: 'poland', 620: 'portugal', 634: 'qatar', 642: 'romania',
  643: 'russia', 646: 'rwanda', 682: 'saudi arabia', 686: 'senegal',
  688: 'serbia', 694: 'sierra leone', 702: 'singapore', 703: 'slovakia',
  705: 'slovenia', 706: 'somalia', 710: 'south africa', 410: 'south korea',
  728: 'south sudan', 724: 'spain', 144: 'sri lanka', 729: 'sudan',
  752: 'sweden', 756: 'switzerland', 760: 'syria', 158: 'taiwan',
  762: 'tajikistan', 834: 'tanzania', 764: 'thailand', 788: 'tunisia',
  792: 'turkey', 795: 'turkmenistan', 800: 'uganda', 804: 'ukraine',
  784: 'united arab emirates', 826: 'united kingdom', 840: 'united states',
  858: 'uruguay', 860: 'uzbekistan', 862: 'venezuela', 704: 'vietnam',
  887: 'yemen', 894: 'zambia', 716: 'zimbabwe',
};

// ─── Module-level cache ───
let _geoData = null;          // { featuresByKey: Map<string, GeoJSON.Feature> }
let _loadPromise = null;      // Singleton fetch promise
const _geometryCache = {};    // { [countryKey]: THREE.BufferGeometry }

/**
 * Load and parse country border data. Returns a promise.
 * Subsequent calls return the same cached promise.
 */
export function loadCountryBorders() {
  if (_loadPromise) return _loadPromise;

  _loadPromise = fetch(TOPOJSON_URL)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load borders: ${res.status}`);
      return res.json();
    })
    .then(topology => {
      // Convert TopoJSON → GeoJSON FeatureCollection
      const geojson = topojson.feature(topology, topology.objects.countries);

      // Build lookup: countryKey → GeoJSON Feature
      const featuresByKey = new Map();
      for (const feature of geojson.features) {
        const isoId = typeof feature.id === 'string' ? parseInt(feature.id, 10) : feature.id;
        const key = ISO_TO_KEY[isoId];
        if (key) {
          featuresByKey.set(key, feature);
        }
      }

      _geoData = { featuresByKey };
      console.log(`[countryBorders] Loaded ${featuresByKey.size} country borders`);
      return _geoData;
    })
    .catch(err => {
      console.error('[countryBorders] Load error:', err);
      _loadPromise = null; // allow retry
      throw err;
    });

  return _loadPromise;
}

/**
 * Convert a GeoJSON Feature (Polygon / MultiPolygon) into a
 * THREE.BufferGeometry of line segments on a unit sphere.
 *
 * Each polygon ring [A, B, C, D, A] becomes segments:
 *   A→B, B→C, C→D, D→A
 * packed as consecutive vertex pairs into one geometry.
 *
 * @param {GeoJSON.Feature} feature
 * @param {number} radius - Sphere radius (slightly > 1 to float above surface)
 * @returns {THREE.BufferGeometry}
 */
function featureToLineGeometry(feature, radius = 1.006) {
  const positions = [];

  const processRing = (ring) => {
    for (let i = 0; i < ring.length - 1; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[i + 1];

      // Skip degenerate segments (anti-meridian artifacts)
      if (Math.abs(lng2 - lng1) > 170) continue;

      const p1 = latLngToVector3(lat1, lng1, radius);
      const p2 = latLngToVector3(lat2, lng2, radius);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  };

  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') {
    // coordinates = [outerRing, ...holes] — only use outer ring
    processRing(coordinates[0]);
  } else if (type === 'MultiPolygon') {
    for (const polygon of coordinates) {
      processRing(polygon[0]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  return geometry;
}

/**
 * Get the border line geometry for a country.
 * Returns null if borders haven't loaded or the country isn't found.
 * Geometries are cached — no redundant computation.
 *
 * @param {string} countryKey - Lowercase country key (e.g., 'india')
 * @returns {THREE.BufferGeometry | null}
 */
export function getCountryBorderGeometry(countryKey) {
  if (!_geoData) return null;

  const key = countryKey.toLowerCase();

  // Return cached geometry
  if (_geometryCache[key]) return _geometryCache[key];

  // Look up the GeoJSON feature
  const feature = _geoData.featuresByKey.get(key);
  if (!feature) return null;

  // Build and cache
  const geometry = featureToLineGeometry(feature);
  _geometryCache[key] = geometry;
  return geometry;
}
