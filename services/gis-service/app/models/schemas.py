"""
EcoClear GIS Service — Pydantic models for request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Coordinate(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")


# ---- Proximity Analysis ----

class ProximityRequest(BaseModel):
    """Request for proximity analysis against eco-sensitive zones."""
    lat: float = Field(..., ge=-90, le=90, description="Site latitude")
    lng: float = Field(..., ge=-180, le=180, description="Site longitude")
    category: Optional[str] = Field("B2", description="Application category (A, B1, B2)")
    buffer_km: Optional[float] = Field(None, description="Custom buffer distance in km")


class ZoneProximity(BaseModel):
    zone_id: str
    zone_name: str
    zone_type: str
    distance_km: float
    within_zone: bool
    within_buffer: bool
    risk_level: RiskLevel
    description: str


class ProximityResponse(BaseModel):
    lat: float
    lng: float
    nearest_zone: Optional[str] = None
    nearest_distance_km: Optional[float] = None
    overall_risk: RiskLevel
    zone_results: list[ZoneProximity] = Field(default_factory=list)
    total_zones_checked: int = 0
    zones_within_buffer: int = 0
    recommendation: str = ""


# ---- Buffer Analysis ----

class BufferRequest(BaseModel):
    """Request for buffer zone computation around a point or geometry."""
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    buffer_km: float = Field(..., gt=0, description="Buffer distance in kilometers")


class BufferResponse(BaseModel):
    center: Coordinate
    buffer_km: float
    buffer_geojson: dict = Field(..., description="GeoJSON Polygon of the buffer zone")
    area_sq_km: float = Field(..., description="Area of buffer in square kilometers")
    intersecting_zones: list[str] = Field(default_factory=list)


# ---- Intersection Analysis ----

class IntersectionRequest(BaseModel):
    """Check if a site or geometry intersects with any eco-sensitive zones."""
    geojson: dict = Field(..., description="GeoJSON geometry (Point, Polygon, etc.)")
    category: Optional[str] = Field("B2", description="Application category")


class IntersectionResult(BaseModel):
    zone_id: str
    zone_name: str
    zone_type: str
    intersects: bool
    overlap_area_sq_km: Optional[float] = None
    risk_level: RiskLevel


class IntersectionResponse(BaseModel):
    total_zones: int
    intersecting_zones: int
    overall_risk: RiskLevel
    results: list[IntersectionResult] = Field(default_factory=list)
    recommendation: str = ""


# ---- Health ----

class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    zones_loaded: int
    spatial_engine: str
