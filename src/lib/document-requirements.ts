
import type { Category } from "@/lib/types";

export interface DocumentRequirements {
  mandatory: string[];
  recommended: string[];
}

/**
 * Static lookup of required documents for Environmental Clearance applications.
 * Derived from CECB guidelines, EIA Notification 2006 (as amended), and sector-specific rules.
 * Category A = Full EIA + Public Hearing
 * Category B1 = Scoped EIA + Form 1
 * Category B2 = Form 1 + Project Brief only
 */
export function getRequiredDocuments(sector: string, category: Category): DocumentRequirements {
  // Base documents by category
  const base: Record<Category, { mandatory: string[]; recommended: string[] }> = {
    A: {
      mandatory: [
        "Form 1 (Environment Impact Assessment application form)",
        "Form 1A (Checklist of environmental attributes)",
        "Full Environment Impact Assessment (EIA) Report",
        "Environment Management Plan (EMP)",
        "Risk Assessment Report",
        "Public Hearing proceedings record (mandatory for Category A)",
        "Consent to Establish — CECB (Air Act 1981 & Water Act 1974)",
        "Land Ownership / Lease Agreement",
        "Land Use Certificate / conversion order from competent authority",
        "Site Plan and Layout Map",
        "NOC from Gram Panchayat / Urban Local Body",
      ],
      recommended: [
        "Baseline Environmental Data Report (air, water, soil, noise, biodiversity)",
        "Socio-economic impact assessment",
        "Greenbelt development plan",
        "Forest Clearance (if forest land involved — FC Act 1980)",
        "Wildlife clearance (if within 10 km of Protected Area)",
      ],
    },
    B1: {
      mandatory: [
        "Form 1 (Environment Impact Assessment application form)",
        "Scoped EIA Report",
        "Environment Management Plan (EMP)",
        "Consent to Establish — CECB",
        "Land Ownership / Lease Agreement",
        "Land Use Certificate",
        "Site Plan and Layout Map",
        "NOC from local body",
      ],
      recommended: [
        "Baseline Environmental Data Report",
        "Greenbelt development plan",
        "Forest Clearance (if applicable)",
      ],
    },
    B2: {
      mandatory: [
        "Form 1 (Environment Impact Assessment application form)",
        "Project Brief (detailed description of project and proposed activities)",
        "Consent to Establish — CECB",
        "Land Ownership / Lease Agreement",
        "Land Use Certificate",
        "Site Plan",
        "NOC from local body",
      ],
      recommended: [
        "Basic environmental baseline data",
        "Waste management plan",
      ],
    },
  };

  // Sector-specific additions
  const sectorAdditions: Record<string, { mandatory: string[]; recommended: string[] }> = {
    Mining: {
      mandatory: [
        "Mining Plan approved by Indian Bureau of Mines (IBM)",
        "Mine Closure Plan with financial assurance",
        "Progressive Land Reclamation Plan",
        "Hydrogeological Study and Groundwater Impact Assessment",
        "Baseline Ambient Air Quality Data (3 stations within 10 km)",
      ],
      recommended: [
        "Rehabilitation & Resettlement Plan (if displacement involved)",
        "Biodiversity Impact Assessment",
        "Topsoil preservation plan",
      ],
    },
    Energy: {
      mandatory: [
        "Stack Emission Data / Monitoring Report",
        "Fly Ash Utilization Plan (for thermal power)",
        "Water Consumption and Efficiency Plan",
        "Grid Connectivity / Evacuation Plan",
      ],
      recommended: [
        "Zero Liquid Discharge (ZLD) design document",
        "Ash pond design with liner specifications",
        "Emergency Preparedness and Disaster Management Plan",
      ],
    },
    Infrastructure: {
      mandatory: [
        "Traffic Impact Assessment (IRC guidelines)",
        "Tree Enumeration and Compensatory Afforestation Plan",
        "Drainage and Flood Management Plan",
        "Noise Pollution Mitigation Plan (CPCB norms)",
      ],
      recommended: [
        "Cultural Heritage Impact Assessment (if near ASI monument)",
        "Soil Erosion Control Best Management Practices document",
      ],
    },
    Manufacturing: {
      mandatory: [
        "Hazardous Waste Management Authorization (HW Rules 2016)",
        "Effluent Treatment Plant (ETP) Design Document",
        "Air Pollution Control Equipment Specifications",
        "Chemical Storage and Handling Safety Plan",
      ],
      recommended: [
        "Waste Minimization Plan",
        "Public Liability Insurance certificate",
        "Environmental Audit Schedule",
      ],
    },
    Tourism: {
      mandatory: [
        "Carrying Capacity Assessment",
        "Solid Waste Management Plan (SWM Rules 2016)",
        "Sewage Treatment and Disposal Plan",
      ],
      recommended: [
        "Green Building Standards compliance document (ECBC / GRIHA)",
        "Rainwater Harvesting and Water Conservation Plan",
        "CRZ compliance certificate (if coastal location)",
      ],
    },
    "Agriculture & Food Processing": {
      mandatory: [
        "Effluent Treatment Design (BOD ≤100 mg/L for land disposal)",
        "Groundwater Extraction Permission (CGWA)",
        "Pesticide / Chemical Storage Compliance document",
      ],
      recommended: [
        "Odour Control Plan",
        "Organic Waste Composting / Biogas Utilization Plan",
      ],
    },
    Healthcare: {
      mandatory: [
        "Biomedical Waste Management Authorization (BMW Rules 2016)",
        "Sewage Treatment Plant design for hospital wastewater",
        "Radiation Safety Plan (if diagnostic imaging — AERB)",
        "Infection Control and Waste Segregation Procedures",
      ],
      recommended: [
        "CETP tie-up agreement or in-house ETP design",
        "Hazardous Chemical Storage Plan for lab chemicals",
      ],
    },
  };

  const baseReqs = base[category];
  const sectorReqs = sectorAdditions[sector] ?? { mandatory: [], recommended: [] };

  return {
    mandatory: [...baseReqs.mandatory, ...sectorReqs.mandatory],
    recommended: [...baseReqs.recommended, ...sectorReqs.recommended],
  };
}
