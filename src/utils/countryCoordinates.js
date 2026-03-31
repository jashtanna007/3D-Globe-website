/**
 * Country Coordinates Utility
 * Maps country/city names to lat/lng, detects locations in text,
 * and converts between geographic and Three.js coordinate systems.
 */
import * as THREE from 'three';

// Comprehensive country coordinates (centroid lat/lng)
const COUNTRIES = {
  'afghanistan': { lat: 33.9, lng: 67.7 },
  'albania': { lat: 41.1, lng: 20.2 },
  'algeria': { lat: 28.0, lng: 1.7 },
  'angola': { lat: -11.2, lng: 17.9 },
  'argentina': { lat: -38.4, lng: -63.6 },
  'armenia': { lat: 40.1, lng: 45.0 },
  'australia': { lat: -25.3, lng: 133.8 },
  'austria': { lat: 47.5, lng: 14.6 },
  'azerbaijan': { lat: 40.1, lng: 47.6 },
  'bahrain': { lat: 26.0, lng: 50.6 },
  'bangladesh': { lat: 23.7, lng: 90.4 },
  'belarus': { lat: 53.7, lng: 27.9 },
  'belgium': { lat: 50.5, lng: 4.5 },
  'bolivia': { lat: -16.3, lng: -63.6 },
  'bosnia': { lat: 43.9, lng: 17.7 },
  'brazil': { lat: -14.2, lng: -51.9 },
  'bulgaria': { lat: 42.7, lng: 25.5 },
  'cambodia': { lat: 12.6, lng: 104.9 },
  'cameroon': { lat: 7.4, lng: 12.3 },
  'canada': { lat: 56.1, lng: -106.3 },
  'chad': { lat: 15.5, lng: 18.7 },
  'chile': { lat: -35.7, lng: -71.5 },
  'china': { lat: 35.9, lng: 104.2 },
  'colombia': { lat: 4.6, lng: -74.3 },
  'congo': { lat: -4.0, lng: 21.8 },
  'croatia': { lat: 45.1, lng: 15.2 },
  'cuba': { lat: 21.5, lng: -77.8 },
  'cyprus': { lat: 35.1, lng: 33.4 },
  'czech republic': { lat: 49.8, lng: 15.5 },
  'denmark': { lat: 56.3, lng: 9.5 },
  'dominican republic': { lat: 18.7, lng: -70.2 },
  'ecuador': { lat: -1.8, lng: -78.2 },
  'egypt': { lat: 26.8, lng: 30.8 },
  'el salvador': { lat: 13.8, lng: -88.9 },
  'estonia': { lat: 58.6, lng: 25.0 },
  'ethiopia': { lat: 9.1, lng: 40.5 },
  'finland': { lat: 61.9, lng: 25.7 },
  'france': { lat: 46.2, lng: 2.2 },
  'georgia': { lat: 42.3, lng: 43.4 },
  'germany': { lat: 51.2, lng: 10.5 },
  'ghana': { lat: 7.9, lng: -1.0 },
  'greece': { lat: 39.1, lng: 21.8 },
  'guatemala': { lat: 15.8, lng: -90.2 },
  'guinea': { lat: 9.9, lng: -11.8 },
  'haiti': { lat: 19.0, lng: -72.3 },
  'honduras': { lat: 15.2, lng: -86.2 },
  'hungary': { lat: 47.2, lng: 19.5 },
  'iceland': { lat: 65.0, lng: -19.0 },
  'india': { lat: 20.6, lng: 79.0 },
  'indonesia': { lat: -0.8, lng: 113.9 },
  'iran': { lat: 32.4, lng: 53.7 },
  'iraq': { lat: 33.2, lng: 43.7 },
  'ireland': { lat: 53.4, lng: -8.2 },
  'israel': { lat: 31.0, lng: 34.9 },
  'italy': { lat: 41.9, lng: 12.6 },
  'jamaica': { lat: 18.1, lng: -77.3 },
  'japan': { lat: 36.2, lng: 138.3 },
  'jordan': { lat: 30.6, lng: 36.2 },
  'kazakhstan': { lat: 48.0, lng: 67.0 },
  'kenya': { lat: -0.2, lng: 37.9 },
  'kosovo': { lat: 42.6, lng: 21.0 },
  'kuwait': { lat: 29.3, lng: 47.5 },
  'kyrgyzstan': { lat: 41.2, lng: 74.8 },
  'latvia': { lat: 56.9, lng: 24.1 },
  'lebanon': { lat: 33.9, lng: 35.9 },
  'libya': { lat: 26.3, lng: 17.2 },
  'lithuania': { lat: 55.2, lng: 23.9 },
  'madagascar': { lat: -18.8, lng: 46.9 },
  'malaysia': { lat: 4.2, lng: 101.9 },
  'mali': { lat: 17.6, lng: -4.0 },
  'mexico': { lat: 23.6, lng: -102.6 },
  'moldova': { lat: 47.4, lng: 28.4 },
  'mongolia': { lat: 46.9, lng: 103.8 },
  'montenegro': { lat: 42.7, lng: 19.4 },
  'morocco': { lat: 31.8, lng: -7.1 },
  'mozambique': { lat: -18.7, lng: 35.5 },
  'myanmar': { lat: 21.9, lng: 95.9 },
  'namibia': { lat: -22.6, lng: 17.1 },
  'nepal': { lat: 28.4, lng: 84.1 },
  'netherlands': { lat: 52.1, lng: 5.3 },
  'new zealand': { lat: -40.9, lng: 174.9 },
  'nicaragua': { lat: 12.9, lng: -85.2 },
  'niger': { lat: 17.6, lng: 8.1 },
  'nigeria': { lat: 9.1, lng: 8.7 },
  'north korea': { lat: 40.3, lng: 127.5 },
  'north macedonia': { lat: 41.5, lng: 21.7 },
  'norway': { lat: 60.5, lng: 8.5 },
  'oman': { lat: 21.5, lng: 55.9 },
  'pakistan': { lat: 30.4, lng: 69.3 },
  'palestine': { lat: 31.9, lng: 35.2 },
  'panama': { lat: 8.5, lng: -80.8 },
  'paraguay': { lat: -23.4, lng: -58.4 },
  'peru': { lat: -9.2, lng: -75.0 },
  'philippines': { lat: 12.9, lng: 121.8 },
  'poland': { lat: 51.9, lng: 19.1 },
  'portugal': { lat: 39.4, lng: -8.2 },
  'qatar': { lat: 25.4, lng: 51.2 },
  'romania': { lat: 45.9, lng: 25.0 },
  'russia': { lat: 61.5, lng: 105.3 },
  'rwanda': { lat: -1.9, lng: 29.9 },
  'saudi arabia': { lat: 23.9, lng: 45.1 },
  'senegal': { lat: 14.5, lng: -14.5 },
  'serbia': { lat: 44.0, lng: 21.0 },
  'sierra leone': { lat: 8.5, lng: -11.8 },
  'singapore': { lat: 1.4, lng: 103.8 },
  'slovakia': { lat: 48.7, lng: 19.7 },
  'slovenia': { lat: 46.2, lng: 14.8 },
  'somalia': { lat: 5.2, lng: 46.2 },
  'south africa': { lat: -30.6, lng: 22.9 },
  'south korea': { lat: 35.9, lng: 127.8 },
  'south sudan': { lat: 6.9, lng: 31.3 },
  'spain': { lat: 40.5, lng: -3.7 },
  'sri lanka': { lat: 7.9, lng: 80.8 },
  'sudan': { lat: 12.9, lng: 30.2 },
  'sweden': { lat: 60.1, lng: 18.6 },
  'switzerland': { lat: 46.8, lng: 8.2 },
  'syria': { lat: 35.0, lng: 38.5 },
  'taiwan': { lat: 23.7, lng: 121.0 },
  'tajikistan': { lat: 38.9, lng: 71.3 },
  'tanzania': { lat: -6.4, lng: 34.9 },
  'thailand': { lat: 15.9, lng: 100.9 },
  'tunisia': { lat: 34.0, lng: 9.5 },
  'turkey': { lat: 39.0, lng: 35.2 },
  'turkmenistan': { lat: 39.0, lng: 59.6 },
  'uganda': { lat: 1.4, lng: 32.3 },
  'ukraine': { lat: 48.4, lng: 31.2 },
  'united arab emirates': { lat: 23.4, lng: 53.8 },
  'united kingdom': { lat: 55.4, lng: -3.4 },
  'united states': { lat: 37.1, lng: -95.7 },
  'uruguay': { lat: -32.5, lng: -55.8 },
  'uzbekistan': { lat: 41.4, lng: 64.6 },
  'venezuela': { lat: 6.4, lng: -66.6 },
  'vietnam': { lat: 14.1, lng: 108.3 },
  'yemen': { lat: 15.6, lng: 48.5 },
  'zambia': { lat: -13.1, lng: 28.3 },
  'zimbabwe': { lat: -19.0, lng: 29.2 },
};

// Aliases: alternative names / abbreviations → canonical country key
const ALIASES = {
  'us': 'united states', 'usa': 'united states', 'america': 'united states', 'u.s.': 'united states', 'u.s': 'united states',
  'uk': 'united kingdom', 'britain': 'united kingdom', 'england': 'united kingdom',
  'uae': 'united arab emirates', 'emirates': 'united arab emirates',
  'drc': 'congo', 'democratic republic of congo': 'congo',
  'dprk': 'north korea', 'pyongyang': 'north korea',
  'rok': 'south korea', 'seoul': 'south korea',
  'prc': 'china', 'beijing': 'china', 'shanghai': 'china',
  'moscow': 'russia', 'kremlin': 'russia',
  'kyiv': 'ukraine', 'kiev': 'ukraine',
  'tehran': 'iran', 'persian': 'iran',
  'kabul': 'afghanistan', 'afghan': 'afghanistan',
  'baghdad': 'iraq', 'iraqi': 'iraq',
  'damascus': 'syria', 'syrian': 'syria',
  'jerusalem': 'israel', 'israeli': 'israel', 'gaza': 'palestine', 'palestinian': 'palestine', 'west bank': 'palestine',
  'beirut': 'lebanon', 'lebanese': 'lebanon',
  'cairo': 'egypt', 'egyptian': 'egypt',
  'lagos': 'nigeria', 'nigerian': 'nigeria', 'abuja': 'nigeria',
  'nairobi': 'kenya',
  'mumbai': 'india', 'delhi': 'india', 'new delhi': 'india', 'indian': 'india',
  'tokyo': 'japan', 'japanese': 'japan',
  'london': 'united kingdom', 'british': 'united kingdom',
  'paris': 'france', 'french': 'france',
  'berlin': 'germany', 'german': 'germany',
  'rome': 'italy', 'italian': 'italy',
  'madrid': 'spain', 'spanish': 'spain',
  'ankara': 'turkey', 'istanbul': 'turkey', 'turkish': 'turkey',
  'riyadh': 'saudi arabia', 'saudi': 'saudi arabia',
  'islamabad': 'pakistan', 'pakistani': 'pakistan', 'karachi': 'pakistan',
  'dhaka': 'bangladesh', 'bangladeshi': 'bangladesh',
  'colombian': 'colombia', 'bogota': 'colombia',
  'brazilian': 'brazil', 'sao paulo': 'brazil', 'rio': 'brazil',
  'mexican': 'mexico', 'mexico city': 'mexico',
  'mogadishu': 'somalia', 'somali': 'somalia',
  'khartoum': 'sudan', 'sudanese': 'sudan',
  'manila': 'philippines', 'filipino': 'philippines', 'philippine': 'philippines',
  'hanoi': 'vietnam', 'vietnamese': 'vietnam',
  'rangoon': 'myanmar', 'yangon': 'myanmar', 'burmese': 'myanmar', 'burma': 'myanmar',
  'caribbean': 'haiti',
  'european union': 'germany', 'eu': 'germany',
  'taiwan': 'taiwan', 'taipei': 'taiwan',
};

// Build a sorted list (longest first) for greedy matching
const ALL_NAMES = [
  ...Object.keys(COUNTRIES),
  ...Object.keys(ALIASES),
].sort((a, b) => b.length - a.length);

/**
 * Detect country mentions in article text.
 * Returns the first (most prominent) country detected.
 * @param {Object} article - { title, description }
 * @returns {string|null} Canonical country key or null
 */
export function detectCountry(article) {
  const text = `${article.title} ${article.description}`.toLowerCase();

  for (const name of ALL_NAMES) {
    // Word boundary match to avoid partial matches
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      return ALIASES[name] || name;
    }
  }

  return null;
}

/**
 * Get coordinates for a country.
 * @param {string} countryName - canonical country key (lowercase)
 * @returns {{ lat: number, lng: number }|null}
 */
export function getCountryCoordinates(countryName) {
  const key = countryName.toLowerCase();
  return COUNTRIES[key] || COUNTRIES[ALIASES[key]] || null;
}

/**
 * Convert lat/lng to a Three.js Vector3 on a sphere.
 * Matches Three.js SphereGeometry's coordinate convention.
 * @param {number} lat - Latitude in degrees (-90 to 90)
 * @param {number} lng - Longitude in degrees (-180 to 180)
 * @param {number} radius - Sphere radius
 * @returns {THREE.Vector3}
 */
export function latLngToVector3(lat, lng, radius) {
  const phi = (lng + 180) * (Math.PI / 180);
  const theta = (90 - lat) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Convert a Three.js vertex position to lat/lng.
 * Inverse of latLngToVector3, matching Three.js SphereGeometry convention.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{ lat: number, lng: number }}
 */
export function vertexToLatLng(x, y, z) {
  const r = Math.sqrt(x * x + y * y + z * z);
  const lat = Math.asin(y / r) * (180 / Math.PI);
  let phi = Math.atan2(z, -x);
  if (phi < 0) phi += 2 * Math.PI;
  const lng = phi * (180 / Math.PI) - 180;
  return { lat, lng };
}

/**
 * Compute angular distance between two lat/lng points (in degrees).
 * Uses the Haversine formula.
 */
export function angularDistance(lat1, lng1, lat2, lng2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * (180 / Math.PI);
}

/**
 * Find the nearest country to a given lat/lng.
 * @returns {{ country: string, lat: number, lng: number, distance: number }|null}
 */
export function findNearestCountry(lat, lng) {
  let nearest = null;
  let minDist = Infinity;

  for (const [name, coords] of Object.entries(COUNTRIES)) {
    const dist = angularDistance(lat, lng, coords.lat, coords.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { country: name, lat: coords.lat, lng: coords.lng, distance: dist };
    }
  }

  return nearest;
}
