"""
Sentinel-2 Satellite Analysis — NDVI vegetation index endpoint.

Extends the GIS service with satellite imagery analysis capabilities.
Uses mock data for hackathon; in production would connect to the
Copernicus Data Space Ecosystem (CDSE) API.

Sentinel-2 provides:
- 13 spectral bands (visible, NIR, SWIR)
- 10m spatial resolution
- ~5-day revisit period

NDVI (Normalized Difference Vegetation Index) = (NIR - Red) / (NIR + Red)
Range: -1.0 to 1.0 (>0.6 = dense vegetation, <0.2 = barren/urban)
"""

import logging
import math
import random
from datetime import datetime, timedelta

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

logger = logging.getLogger("ecoclear-gis.sentinel")


class VegetationClass(str, Enum):
    DENSE_FOREST = "dense_forest"
    MODERATE_VEGETATION = "moderate_vegetation"
    SPARSE_VEGETATION = "sparse_vegetation"
    GRASSLAND = "grassland"
    BARREN = "barren"
    URBAN = "urban"
    WATER = "water"


class SatelliteAnalysisRequest(BaseModel):
    """Request for Sentinel-2 satellite vegetation analysis."""
    lat: float = Field(..., ge=-90, le=90, description="Site latitude")
    lng: float = Field(..., ge=-180, le=180, description="Site longitude")
    buffer_km: float = Field(5.0, gt=0, description="Analysis radius in km")
    date_from: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")


class NDVIResult(BaseModel):
    mean_ndvi: float = Field(..., description="Mean NDVI value (-1 to 1)")
    min_ndvi: float
    max_ndvi: float
    std_ndvi: float
    vegetation_class: VegetationClass
    vegetation_cover_pct: float = Field(..., description="Estimated vegetation cover %")


class SatelliteAnalysisResponse(BaseModel):
    lat: float
    lng: float
    buffer_km: float
    acquisition_date: str
    satellite: str = "Sentinel-2A"
    cloud_cover_pct: float
    ndvi: NDVIResult
    land_use_breakdown: dict = Field(default_factory=dict)
    change_detection: Optional[dict] = None
    recommendation: str = ""
    data_source: str = "mock"  # "cdse" in production


def classify_vegetation(ndvi: float) -> VegetationClass:
    """Classify NDVI value into vegetation category."""
    if ndvi >= 0.6:
        return VegetationClass.DENSE_FOREST
    elif ndvi >= 0.4:
        return VegetationClass.MODERATE_VEGETATION
    elif ndvi >= 0.25:
        return VegetationClass.SPARSE_VEGETATION
    elif ndvi >= 0.15:
        return VegetationClass.GRASSLAND
    elif ndvi >= 0.05:
        return VegetationClass.BARREN
    elif ndvi >= -0.1:
        return VegetationClass.URBAN
    else:
        return VegetationClass.WATER


def generate_mock_satellite_analysis(lat: float, lng: float, buffer_km: float) -> SatelliteAnalysisResponse:
    """
    Generate realistic mock Sentinel-2 analysis results.

    Uses coordinate-seeded random to produce consistent results for the same location.
    Areas near known eco-zones get higher NDVI values.
    """
    # Seed random with coordinates for reproducibility
    seed = int(abs(lat * 10000) + abs(lng * 10000))
    rng = random.Random(seed)

    # Base NDVI depends on proximity to Chhattisgarh forest areas
    # Central CG (forested): higher NDVI; urban areas: lower
    lat_factor = 1.0 - abs(lat - 21.5) / 5.0  # Center around Raipur lat
    lng_factor = 1.0 - abs(lng - 81.6) / 5.0   # Center around Raipur lng
    base_ndvi = 0.3 + 0.3 * max(0, min(1, lat_factor * lng_factor))

    # Add some noise
    mean_ndvi = max(-0.1, min(0.9, base_ndvi + rng.gauss(0, 0.1)))
    std_ndvi = rng.uniform(0.05, 0.15)
    min_ndvi = max(-0.2, mean_ndvi - 2 * std_ndvi)
    max_ndvi = min(0.95, mean_ndvi + 2 * std_ndvi)

    veg_class = classify_vegetation(mean_ndvi)
    veg_cover = max(0, min(100, mean_ndvi * 110 + rng.uniform(-5, 5)))

    # Mock acquisition date (recent)
    days_ago = rng.randint(1, 10)
    acq_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    cloud_cover = rng.uniform(2, 25)

    # Land use breakdown
    forest_pct = veg_cover * 0.7
    agriculture_pct = veg_cover * 0.2
    grassland_pct = veg_cover * 0.1
    remaining = 100 - veg_cover
    urban_pct = remaining * 0.3
    barren_pct = remaining * 0.4
    water_pct = remaining * 0.3

    land_use = {
        "forest": round(forest_pct, 1),
        "agriculture": round(agriculture_pct, 1),
        "grassland": round(grassland_pct, 1),
        "urban_built_up": round(urban_pct, 1),
        "barren_soil": round(barren_pct, 1),
        "water_bodies": round(water_pct, 1),
    }

    # Change detection (compare with mock "6 months ago")
    prev_ndvi = mean_ndvi + rng.uniform(-0.08, 0.03)  # Slight decrease trend
    ndvi_change = round(mean_ndvi - prev_ndvi, 3)
    change = {
        "period": "6 months",
        "previous_ndvi": round(prev_ndvi, 3),
        "current_ndvi": round(mean_ndvi, 3),
        "change": ndvi_change,
        "trend": "improving" if ndvi_change > 0.02 else "declining" if ndvi_change < -0.02 else "stable",
        "deforestation_risk": "high" if ndvi_change < -0.05 else "medium" if ndvi_change < -0.02 else "low",
    }

    # Recommendation based on analysis
    if mean_ndvi >= 0.5:
        rec = (
            f"Site is in a densely vegetated area (NDVI={mean_ndvi:.2f}). "
            "High ecological sensitivity. Comprehensive EIA with biodiversity assessment is mandatory. "
            "Compensatory afforestation at 1:3 ratio will be required."
        )
    elif mean_ndvi >= 0.3:
        rec = (
            f"Moderate vegetation cover detected (NDVI={mean_ndvi:.2f}). "
            "Standard EIA with tree enumeration and green belt plan recommended. "
            "Monitor vegetation change trends before clearance."
        )
    elif mean_ndvi >= 0.15:
        rec = (
            f"Sparse vegetation (NDVI={mean_ndvi:.2f}). "
            "Lower ecological impact expected. Standard environmental assessment sufficient. "
            "Ensure soil erosion control measures are included in EMP."
        )
    else:
        rec = (
            f"Area is predominantly barren/urban (NDVI={mean_ndvi:.2f}). "
            "Lower ecological sensitivity. Standard clearance process applicable. "
            "Focus on air quality and waste management in the EIA."
        )

    if change["deforestation_risk"] == "high":
        rec += " WARNING: Significant vegetation decline detected in recent imagery — investigate before clearance."

    return SatelliteAnalysisResponse(
        lat=lat,
        lng=lng,
        buffer_km=buffer_km,
        acquisition_date=acq_date,
        satellite="Sentinel-2A",
        cloud_cover_pct=round(cloud_cover, 1),
        ndvi=NDVIResult(
            mean_ndvi=round(mean_ndvi, 3),
            min_ndvi=round(min_ndvi, 3),
            max_ndvi=round(max_ndvi, 3),
            std_ndvi=round(std_ndvi, 3),
            vegetation_class=veg_class,
            vegetation_cover_pct=round(veg_cover, 1),
        ),
        land_use_breakdown=land_use,
        change_detection=change,
        recommendation=rec,
        data_source="mock",
    )
