"""
CECB Sector-Specific Regulatory Knowledge Base.

Contains the same regulations as the Next.js Genkit flow but structured
for multi-agent retrieval. Each sector has detailed parameters that the
Regulatory Analyzer node uses for compliance checking.
"""

from typing import Dict, List


# Mirrors src/ai/flows/regulatory-compliance-check.ts SECTOR_REGULATIONS
SECTOR_REGULATIONS: Dict[str, List[str]] = {
    "Mining": [
        "Mining Plan approval from Indian Bureau of Mines (IBM)",
        "Forest Clearance under Forest Conservation Act, 1980 (if forest land involved)",
        "Consent to Establish from CECB/SPCB",
        "Environmental Management Plan (EMP) with specific dust suppression measures",
        "Mine Closure Plan with financial assurance",
        "Rehabilitation & Resettlement (R&R) Plan if displacement involved",
        "Baseline ambient air quality data (PM10, PM2.5, SO2, NOx) within 10km radius",
        "Groundwater impact assessment with hydrogeological study",
        "Biodiversity Impact Assessment for ecologically sensitive areas",
        "Buffer zone compliance: minimum 5km from Protected Areas",
    ],
    "Energy": [
        "Thermal Power: Fly ash utilization plan (100% as per MoEFCC notification)",
        "Thermal Power: Cooling tower specifications and zero liquid discharge (ZLD) plan",
        "Stack emission monitoring plan for PM, SO2, NOx within NAAQS limits",
        "Ambient Air Quality monitoring stations within 10km buffer zone",
        "Water consumption plan with efficiency targets (<3.5 m³/MWh for new plants)",
        "Ash pond design with impervious lining specification",
        "Coal/fuel transportation plan with environmental safeguards",
        "Renewable energy: Bird/wildlife impact assessment (for wind/solar in sensitive areas)",
        "Grid connectivity and evacuation plan",
        "Emergency preparedness and disaster management plan",
    ],
    "Infrastructure": [
        "Traffic Impact Assessment for roads and highways",
        "Tree enumeration and compensatory afforestation plan (1:3 ratio)",
        "Drainage and flood management plan",
        "Construction debris management and recycling plan",
        "Noise pollution mitigation plan for residential proximate zones",
        "Soil erosion control measures during construction phase",
        "Green belt development plan (minimum 33% of project area)",
        "Occupational health and safety plan for construction workers",
        "Waste management plan (solid waste, sewage, hazardous waste)",
        "Cultural heritage impact assessment (if applicable)",
    ],
    "Manufacturing": [
        "Hazardous waste management authorization under HW Rules 2016",
        "Effluent Treatment Plant (ETP) design with ZLD capability",
        "Air pollution control equipment specifications (ESP/bag filter)",
        "Occupational health monitoring plan",
        "Chemical storage and handling safety plan (for chemical industry)",
        "Sponge Iron: Particulate emission limit compliance (<50 mg/Nm³)",
        "Product-specific environmental standards compliance",
        "Waste minimization and resource recovery plan",
        "Environmental audit and compliance monitoring schedule",
        "Insurance coverage for environmental liability",
    ],
}

# Required documents by category
REQUIRED_DOCUMENTS: Dict[str, List[str]] = {
    "A": [
        "Full Environmental Impact Assessment (EIA) Report",
        "Form-1 (Application Form for EC)",
        "Pre-feasibility Report",
        "Conceptual Plan / Layout Map",
        "Terms of Reference (ToR) issued by MoEFCC/SEIAA",
        "Public Hearing Report",
        "EMP (Environmental Management Plan) with cost estimates",
        "Risk Assessment & Disaster Management Plan",
        "CRZ Clearance (if coastal zone applicable)",
        "Forest Clearance (if forest land involved)",
        "Wildlife Clearance (if near Protected Area)",
        "NOC from Local Authorities",
    ],
    "B1": [
        "Environmental Impact Assessment (EIA) Report",
        "Form-1 (Application Form for EC)",
        "Pre-feasibility Report",
        "Terms of Reference (ToR) issued by SEIAA",
        "Public Hearing Report",
        "Environmental Management Plan",
        "NOC from Local Authorities",
    ],
    "B2": [
        "Form-1 (Application Form for EC)",
        "Pre-feasibility Report",
        "Conceptual Plan / Layout Map",
        "Environmental Management Plan",
        "NOC from Local Authorities",
    ],
}


# Indian environmental legislation references
REGULATION_REFERENCES: Dict[str, str] = {
    "EIA Notification 2006": "S.O. 1533(E), 14 September 2006 and subsequent amendments",
    "Air Act 1981": "The Air (Prevention and Control of Pollution) Act, 1981",
    "Water Act 1974": "The Water (Prevention and Control of Pollution) Act, 1974",
    "Forest Conservation Act 1980": "Forest (Conservation) Act, 1980 as amended in 1988",
    "Wildlife Protection Act 1972": "Wild Life (Protection) Act, 1972",
    "EP Act 1986": "Environment (Protection) Act, 1986",
    "HW Rules 2016": "Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016",
    "CRZ Notification 2019": "Coastal Regulation Zone Notification, 2019",
    "NGT Orders": "National Green Tribunal Orders applicable to Chhattisgarh",
}


def get_sector_rules(sector: str) -> List[str]:
    """Get regulatory parameters for a given sector."""
    return SECTOR_REGULATIONS.get(sector, [])


def get_required_docs(category: str) -> List[str]:
    """Get required documents for a given category."""
    return REQUIRED_DOCUMENTS.get(category, REQUIRED_DOCUMENTS.get("B2", []))


def get_all_sectors() -> List[str]:
    """Get list of all configured sectors."""
    return list(SECTOR_REGULATIONS.keys())
