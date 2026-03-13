/**
 * GIS reference data for Chhattisgarh eco-sensitive zones.
 * 
 * This contains simplified GeoJSON polygons for Protected Areas,
 * Tiger Reserves, and National Parks in Chhattisgarh used for
 * automated spatial intersection and buffer analysis.
 * 
 * In production, these would come from authoritative GIS layers
 * via PostGIS or the GIS microservice.
 */

export interface EcoZone {
  id: string;
  name: string;
  type: 'national_park' | 'tiger_reserve' | 'wildlife_sanctuary' | 'reserve_forest' | 'river';
  center: [number, number]; // [lat, lng]
  radiusKm: number;         // Approximate radius for buffer zone
  bufferKm: number;          // Regulatory buffer distance
  description: string;
}

// Key protected areas in Chhattisgarh with approximate centers
export const CG_ECO_ZONES: EcoZone[] = [
  {
    id: 'indravati-np',
    name: 'Indravati National Park',
    type: 'national_park',
    center: [19.15, 80.85],
    radiusKm: 15,
    bufferKm: 10,
    description: 'Critical tiger habitat, part of Indravati Tiger Reserve. No industrial activity within 10km buffer.',
  },
  {
    id: 'kanger-ghati-np',
    name: 'Kanger Ghati National Park',
    type: 'national_park',
    center: [18.87, 81.90],
    radiusKm: 8,
    bufferKm: 10,
    description: 'Biodiversity hotspot near Jagdalpur. Contains limestone caves and Kanger Valley.',
  },
  {
    id: 'achanakmar-tr',
    name: 'Achanakmar Tiger Reserve',
    type: 'tiger_reserve',
    center: [22.46, 81.73],
    radiusKm: 20,
    bufferKm: 10,
    description: 'Part of Achanakmar-Amarkantak Biosphere Reserve. Critical corridor for Bengal Tiger.',
  },
  {
    id: 'udanti-sitanadi-tr',
    name: 'Udanti-Sitanadi Tiger Reserve',
    type: 'tiger_reserve',
    center: [20.58, 82.35],
    radiusKm: 15,
    bufferKm: 10,
    description: 'Wild Buffalo habitat. Important for conservation of Bos arnee.',
  },
  {
    id: 'barnawapara-ws',
    name: 'Barnawapara Wildlife Sanctuary',
    type: 'wildlife_sanctuary',
    center: [21.40, 82.40],
    radiusKm: 10,
    bufferKm: 5,
    description: 'Tropical Moist Deciduous Forest. Diverse fauna including leopards and sloth bears.',
  },
  {
    id: 'tamor-pingla-ws',
    name: 'Tamor Pingla Wildlife Sanctuary',
    type: 'wildlife_sanctuary',
    center: [23.25, 83.50],
    radiusKm: 12,
    bufferKm: 5,
    description: 'Northern Chhattisgarh forest corridor. Rich in Sal and Teak forests.',
  },
  {
    id: 'mahanadi-river',
    name: 'Mahanadi River Corridor',
    type: 'river',
    center: [21.62, 81.63],
    radiusKm: 2,
    bufferKm: 1,
    description: 'Major river system. No industrial discharge within 1km of riverbank.',
  },
  {
    id: 'hasdeo-arand',
    name: 'Hasdeo Arand Forest',
    type: 'reserve_forest',
    center: [22.80, 82.60],
    radiusKm: 30,
    bufferKm: 5,
    description: 'Largest contiguous forest in central India. Dense Sal forests critical for elephant corridor.',
  },
];

/**
 * Computes the Haversine distance between two points in kilometers.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface ProximityResult {
  zone: EcoZone;
  distanceKm: number;
  withinBuffer: boolean;
  withinZone: boolean;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Checks the proximity of a given coordinate to all eco-sensitive zones.
 * Returns sorted results (closest first) with risk assessment.
 */
export function checkProximity(lat: number, lng: number): ProximityResult[] {
  return CG_ECO_ZONES
    .map(zone => {
      const distance = haversineDistance(lat, lng, zone.center[0], zone.center[1]);
      const withinZone = distance <= zone.radiusKm;
      const withinBuffer = distance <= (zone.radiusKm + zone.bufferKm);

      let riskLevel: ProximityResult['riskLevel'];
      if (withinZone) riskLevel = 'critical';
      else if (withinBuffer) riskLevel = 'high';
      else if (distance <= zone.radiusKm + zone.bufferKm * 2) riskLevel = 'medium';
      else riskLevel = 'low';

      return {
        zone,
        distanceKm: Math.round(distance * 10) / 10,
        withinBuffer,
        withinZone,
        riskLevel,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Category-specific buffer requirements (km)
export const CATEGORY_BUFFER: Record<string, number> = {
  'A': 10,   // Red category — highly polluting
  'B1': 5,   // Orange category — moderately polluting
  'B2': 2,   // Green category — low pollution
};
