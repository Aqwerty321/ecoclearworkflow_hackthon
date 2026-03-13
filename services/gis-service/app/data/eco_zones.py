"""
Chhattisgarh Eco-Sensitive Zone geometries using Shapely.

Mirrors the eco-zone data from the Next.js frontend (src/lib/gis-data.ts)
but uses proper Shapely geometries for server-side spatial operations
(ST_Buffer, ST_Intersects equivalents).

In production, these would be loaded from PostGIS. For the hackathon,
we use in-memory Shapely objects derived from approximate center points
with circular buffer approximations.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple

from shapely.geometry import Point, Polygon, mapping
from shapely.ops import transform
import pyproj
from functools import partial


@dataclass
class EcoZone:
    """Eco-sensitive zone with Shapely geometry."""
    id: str
    name: str
    zone_type: str  # national_park, tiger_reserve, wildlife_sanctuary, reserve_forest, river
    center_lat: float
    center_lng: float
    radius_km: float
    buffer_km: float
    description: str
    geometry: Optional[Polygon] = None  # Populated at load time

    @property
    def center_point(self) -> Point:
        return Point(self.center_lng, self.center_lat)

    @property
    def buffered_geometry(self) -> Optional[Polygon]:
        """Zone + regulatory buffer."""
        if self.geometry is None:
            return None
        extra_buffer_m = self.buffer_km * 1000
        # Project to meters, buffer, project back
        projected = _project_to_meters(self.geometry)
        buffered = projected.buffer(extra_buffer_m)
        return _project_to_wgs84(buffered)


# ─────────────── Projection Helpers ────────────────────────────────────

# WGS84 (degrees) ↔ Web Mercator (meters) for accurate distance calculations
_wgs84 = pyproj.CRS("EPSG:4326")
_mercator = pyproj.CRS("EPSG:32644")  # UTM Zone 44N (covers Chhattisgarh)

_to_meters = pyproj.Transformer.from_crs(_wgs84, _mercator, always_xy=True).transform
_to_wgs84 = pyproj.Transformer.from_crs(_mercator, _wgs84, always_xy=True).transform


def _project_to_meters(geom):
    """Project a WGS84 geometry to UTM meters."""
    return transform(_to_meters, geom)


def _project_to_wgs84(geom):
    """Project a UTM geometry back to WGS84."""
    return transform(_to_wgs84, geom)


def _create_circle_polygon(lat: float, lng: float, radius_km: float, n_points: int = 64) -> Polygon:
    """Create a circular polygon in WGS84 from a center point and radius in km."""
    center = Point(lng, lat)
    center_m = transform(_to_meters, center)
    circle_m = center_m.buffer(radius_km * 1000, resolution=n_points)
    return transform(_to_wgs84, circle_m)


# ─────────────── Zone Data (mirrors gis-data.ts) ──────────────────────

def _build_zones() -> List[EcoZone]:
    """Build eco-zone objects with Shapely geometries."""
    raw_zones = [
        {
            "id": "indravati-np",
            "name": "Indravati National Park",
            "zone_type": "national_park",
            "center_lat": 19.15,
            "center_lng": 80.85,
            "radius_km": 15,
            "buffer_km": 10,
            "description": "Critical tiger habitat, part of Indravati Tiger Reserve. No industrial activity within 10km buffer.",
        },
        {
            "id": "kanger-ghati-np",
            "name": "Kanger Ghati National Park",
            "zone_type": "national_park",
            "center_lat": 18.87,
            "center_lng": 81.90,
            "radius_km": 8,
            "buffer_km": 10,
            "description": "Biodiversity hotspot near Jagdalpur. Contains limestone caves and Kanger Valley.",
        },
        {
            "id": "achanakmar-tr",
            "name": "Achanakmar Tiger Reserve",
            "zone_type": "tiger_reserve",
            "center_lat": 22.46,
            "center_lng": 81.73,
            "radius_km": 20,
            "buffer_km": 10,
            "description": "Part of Achanakmar-Amarkantak Biosphere Reserve. Critical corridor for Bengal Tiger.",
        },
        {
            "id": "udanti-sitanadi-tr",
            "name": "Udanti-Sitanadi Tiger Reserve",
            "zone_type": "tiger_reserve",
            "center_lat": 20.58,
            "center_lng": 82.35,
            "radius_km": 15,
            "buffer_km": 10,
            "description": "Wild Buffalo habitat. Important for conservation of Bos arnee.",
        },
        {
            "id": "barnawapara-ws",
            "name": "Barnawapara Wildlife Sanctuary",
            "zone_type": "wildlife_sanctuary",
            "center_lat": 21.40,
            "center_lng": 82.40,
            "radius_km": 10,
            "buffer_km": 5,
            "description": "Tropical Moist Deciduous Forest. Diverse fauna including leopards and sloth bears.",
        },
        {
            "id": "tamor-pingla-ws",
            "name": "Tamor Pingla Wildlife Sanctuary",
            "zone_type": "wildlife_sanctuary",
            "center_lat": 23.25,
            "center_lng": 83.50,
            "radius_km": 12,
            "buffer_km": 5,
            "description": "Northern Chhattisgarh forest corridor. Rich in Sal and Teak forests.",
        },
        {
            "id": "mahanadi-river",
            "name": "Mahanadi River Corridor",
            "zone_type": "river",
            "center_lat": 21.62,
            "center_lng": 81.63,
            "radius_km": 2,
            "buffer_km": 1,
            "description": "Major river system. No industrial discharge within 1km of riverbank.",
        },
        {
            "id": "hasdeo-arand",
            "name": "Hasdeo Arand Forest",
            "zone_type": "reserve_forest",
            "center_lat": 22.80,
            "center_lng": 82.60,
            "radius_km": 30,
            "buffer_km": 5,
            "description": "Largest contiguous forest in central India. Dense Sal forests critical for elephant corridor.",
        },
    ]

    zones = []
    for z in raw_zones:
        zone = EcoZone(**z)
        zone.geometry = _create_circle_polygon(z["center_lat"], z["center_lng"], z["radius_km"])
        zones.append(zone)

    return zones


# Singleton zone list — loaded once at import time
CG_ECO_ZONES: List[EcoZone] = _build_zones()


def get_zone_by_id(zone_id: str) -> Optional[EcoZone]:
    """Look up a zone by ID."""
    for z in CG_ECO_ZONES:
        if z.id == zone_id:
            return z
    return None


def get_all_zone_ids() -> List[str]:
    """Get all zone IDs."""
    return [z.id for z in CG_ECO_ZONES]
