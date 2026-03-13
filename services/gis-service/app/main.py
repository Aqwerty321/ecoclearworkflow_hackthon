"""
EcoClear GIS Service — FastAPI application.

Spatial analysis service for eco-sensitive zone proximity, buffer computation,
and intersection checks using Shapely + GeoPandas.

Port: 8002
"""

import logging
import math
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from shapely.geometry import Point, shape, mapping
from shapely.ops import transform

from app.models.schemas import (
    ProximityRequest,
    ProximityResponse,
    ZoneProximity,
    BufferRequest,
    BufferResponse,
    Coordinate,
    IntersectionRequest,
    IntersectionResponse,
    IntersectionResult,
    HealthResponse,
    RiskLevel,
)
from app.data.eco_zones import (
    CG_ECO_ZONES,
    _project_to_meters,
    _project_to_wgs84,
    _create_circle_polygon,
)
from app.data.sentinel import (
    SatelliteAnalysisRequest,
    SatelliteAnalysisResponse,
    generate_mock_satellite_analysis,
)

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("ecoclear-gis")

# Category-specific buffer requirements (km)
CATEGORY_BUFFER = {
    "A": 10.0,   # Red category — highly polluting
    "B1": 5.0,   # Orange category — moderately polluting
    "B2": 2.0,   # Green category — low pollution
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan."""
    logger.info(f"EcoClear GIS Service starting — {len(CG_ECO_ZONES)} eco-zones loaded")
    yield
    logger.info("EcoClear GIS Service shutting down")


app = FastAPI(
    title="EcoClear GIS Service",
    description="Spatial analysis for eco-sensitive zone proximity and buffer calculations",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:9002",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────── Distance Helper ──────────────────────────────────────────


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Compute Haversine distance in km between two WGS84 points."""
    R = 6371.0  # Earth radius km
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ─────────────────────── Health ────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="2.1.0",
        service="ecoclear-gis",
        zones_loaded=len(CG_ECO_ZONES),
        spatial_engine="Shapely 2.x + PyProj + Sentinel-2 NDVI",
    )


# ─────────────────────── Proximity Analysis ────────────────────────────


@app.post("/api/gis/proximity", response_model=ProximityResponse)
async def proximity_analysis(request: ProximityRequest):
    """
    Analyze proximity of a site to all eco-sensitive zones.

    Equivalent to PostGIS ST_Distance + ST_DWithin but using
    Shapely in-memory geometries with Haversine for accuracy.
    """
    try:
        lat, lng = request.lat, request.lng
        category_buffer = CATEGORY_BUFFER.get(request.category or "B2", 2.0)
        custom_buffer = request.buffer_km

        results: list[ZoneProximity] = []

        for zone in CG_ECO_ZONES:
            distance = haversine_distance(lat, lng, zone.center_lat, zone.center_lng)
            distance_rounded = round(distance, 1)

            within_zone = distance <= zone.radius_km
            buffer_dist = custom_buffer if custom_buffer else zone.buffer_km
            within_buffer = distance <= (zone.radius_km + buffer_dist)

            # Risk classification
            if within_zone:
                risk = RiskLevel.CRITICAL
            elif within_buffer:
                risk = RiskLevel.HIGH
            elif distance <= zone.radius_km + buffer_dist * 2:
                risk = RiskLevel.MEDIUM
            else:
                risk = RiskLevel.LOW

            results.append(ZoneProximity(
                zone_id=zone.id,
                zone_name=zone.name,
                zone_type=zone.zone_type,
                distance_km=distance_rounded,
                within_zone=within_zone,
                within_buffer=within_buffer,
                risk_level=risk,
                description=zone.description,
            ))

        # Sort by distance
        results.sort(key=lambda r: r.distance_km)

        # Overall risk = worst case
        zones_in_buffer = [r for r in results if r.within_buffer]
        if any(r.risk_level == RiskLevel.CRITICAL for r in results):
            overall_risk = RiskLevel.CRITICAL
        elif any(r.risk_level == RiskLevel.HIGH for r in results):
            overall_risk = RiskLevel.HIGH
        elif any(r.risk_level == RiskLevel.MEDIUM for r in results):
            overall_risk = RiskLevel.MEDIUM
        else:
            overall_risk = RiskLevel.LOW

        # Recommendation
        if overall_risk == RiskLevel.CRITICAL:
            rec = "Site is WITHIN an eco-sensitive zone. Project cannot proceed without Wildlife/Forest Clearance. Recommend relocation."
        elif overall_risk == RiskLevel.HIGH:
            rec = "Site is within buffer zone of an eco-sensitive area. Additional environmental studies and clearances are mandatory."
        elif overall_risk == RiskLevel.MEDIUM:
            rec = "Site is in moderate proximity to eco-sensitive areas. Standard EIA with buffer zone assessment is required."
        else:
            rec = "Site has no significant proximity concerns with eco-sensitive zones. Standard clearance process applies."

        nearest = results[0] if results else None

        return ProximityResponse(
            lat=lat,
            lng=lng,
            nearest_zone=nearest.zone_name if nearest else None,
            nearest_distance_km=nearest.distance_km if nearest else None,
            overall_risk=overall_risk,
            zone_results=results,
            total_zones_checked=len(results),
            zones_within_buffer=len(zones_in_buffer),
            recommendation=rec,
        )

    except Exception as e:
        logger.error(f"Proximity analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Proximity analysis failed: {str(e)}")


# ─────────────────────── Buffer Computation ────────────────────────────


@app.post("/api/gis/buffer", response_model=BufferResponse)
async def compute_buffer(request: BufferRequest):
    """
    Compute a buffer zone polygon around a point.

    Equivalent to PostGIS ST_Buffer. Projects to UTM for accurate
    meter-based buffering, then projects back to WGS84 GeoJSON.
    """
    try:
        point = Point(request.lng, request.lat)

        # Create buffer in projected coordinates for accuracy
        buffer_polygon = _create_circle_polygon(request.lat, request.lng, request.buffer_km)

        # Calculate area
        projected_buffer = _project_to_meters(buffer_polygon)
        area_sq_m = projected_buffer.area
        area_sq_km = round(area_sq_m / 1_000_000, 2)

        # Check which zones the buffer intersects
        intersecting = []
        for zone in CG_ECO_ZONES:
            if zone.geometry and buffer_polygon.intersects(zone.geometry):
                intersecting.append(zone.name)

        return BufferResponse(
            center=Coordinate(lat=request.lat, lng=request.lng),
            buffer_km=request.buffer_km,
            buffer_geojson=mapping(buffer_polygon),
            area_sq_km=area_sq_km,
            intersecting_zones=intersecting,
        )

    except Exception as e:
        logger.error(f"Buffer computation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Buffer computation failed: {str(e)}")


# ─────────────────────── Intersection Check ────────────────────────────


@app.post("/api/gis/intersection", response_model=IntersectionResponse)
async def check_intersection(request: IntersectionRequest):
    """
    Check if a GeoJSON geometry intersects with any eco-sensitive zones.

    Equivalent to PostGIS ST_Intersects + ST_Intersection for area calculation.
    """
    try:
        # Parse input GeoJSON
        try:
            site_geom = shape(request.geojson)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid GeoJSON: {str(e)}")

        category_buffer = CATEGORY_BUFFER.get(request.category or "B2", 2.0)

        results: list[IntersectionResult] = []
        intersecting_count = 0

        for zone in CG_ECO_ZONES:
            if zone.geometry is None:
                continue

            # Check intersection with zone + buffer
            buffered_zone = zone.buffered_geometry
            zone_geom = buffered_zone if buffered_zone else zone.geometry

            does_intersect = site_geom.intersects(zone_geom)
            overlap_area = None

            if does_intersect:
                intersecting_count += 1
                try:
                    intersection = site_geom.intersection(zone_geom)
                    projected = _project_to_meters(intersection)
                    overlap_area = round(projected.area / 1_000_000, 4)
                except Exception:
                    overlap_area = None

            # Determine risk
            within_core = site_geom.intersects(zone.geometry) if zone.geometry else False
            if within_core:
                risk = RiskLevel.CRITICAL
            elif does_intersect:
                risk = RiskLevel.HIGH
            else:
                # Check distance-based risk
                site_center = site_geom.centroid
                dist = haversine_distance(
                    site_center.y, site_center.x,
                    zone.center_lat, zone.center_lng
                )
                if dist <= zone.radius_km + zone.buffer_km * 2:
                    risk = RiskLevel.MEDIUM
                else:
                    risk = RiskLevel.LOW

            results.append(IntersectionResult(
                zone_id=zone.id,
                zone_name=zone.name,
                zone_type=zone.zone_type,
                intersects=does_intersect,
                overlap_area_sq_km=overlap_area,
                risk_level=risk,
            ))

        # Overall risk
        if any(r.risk_level == RiskLevel.CRITICAL for r in results):
            overall_risk = RiskLevel.CRITICAL
        elif any(r.risk_level == RiskLevel.HIGH for r in results):
            overall_risk = RiskLevel.HIGH
        elif any(r.risk_level == RiskLevel.MEDIUM for r in results):
            overall_risk = RiskLevel.MEDIUM
        else:
            overall_risk = RiskLevel.LOW

        # Recommendation
        if overall_risk == RiskLevel.CRITICAL:
            rec = "Site geometry overlaps with core eco-sensitive zone. Environmental and Wildlife Clearance mandatory."
        elif overall_risk == RiskLevel.HIGH:
            rec = "Site geometry intersects buffer zone. Enhanced EIA and additional clearances required."
        elif overall_risk == RiskLevel.MEDIUM:
            rec = "Site is in moderate proximity. Standard EIA process with buffer assessment recommended."
        else:
            rec = "No intersection with eco-sensitive zones detected. Standard clearance applies."

        return IntersectionResponse(
            total_zones=len(results),
            intersecting_zones=intersecting_count,
            overall_risk=overall_risk,
            results=results,
            recommendation=rec,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intersection check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Intersection check failed: {str(e)}")


# ─────────────────────── Satellite Analysis (Sentinel-2 NDVI) ──────────


@app.post("/api/gis/satellite", response_model=SatelliteAnalysisResponse)
async def satellite_analysis(request: SatelliteAnalysisRequest):
    """
    Sentinel-2 satellite vegetation analysis.

    Provides NDVI (Normalized Difference Vegetation Index) analysis
    for a given location, including land-use breakdown and change detection.
    Uses mock data for hackathon; production would connect to Copernicus CDSE.
    """
    try:
        result = generate_mock_satellite_analysis(
            lat=request.lat,
            lng=request.lng,
            buffer_km=request.buffer_km,
        )
        logger.info(
            f"Satellite analysis for ({request.lat}, {request.lng}): "
            f"NDVI={result.ndvi.mean_ndvi}, class={result.ndvi.vegetation_class}"
        )
        return result

    except Exception as e:
        logger.error(f"Satellite analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Satellite analysis failed: {str(e)}")


# ─────────────────────── Entry Point ───────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8002")),
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
