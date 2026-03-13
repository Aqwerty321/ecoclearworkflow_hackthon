"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, AlertTriangle, ShieldCheck, ShieldAlert, Navigation, Layers } from "lucide-react";
import { CG_ECO_ZONES, checkProximity, type ProximityResult, type EcoZone, CATEGORY_BUFFER } from "@/lib/gis-data";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

// ---- Leaflet dynamic imports (SSR-safe) ----
// We lazy-load everything Leaflet-related inside useEffect to avoid window errors in Next.js SSR.

interface MapPickerProps {
  /** If true, user can click to place a marker. If false, display-only. */
  mode?: "pick" | "display";
  /** Current lat/lng value (controlled) */
  value?: { lat: number; lng: number } | null;
  /** Called when user picks a location (pick mode only) */
  onChange?: (coords: { lat: number; lng: number }) => void;
  /** Application category for buffer calculation */
  category?: Category;
  /** Map height in pixels */
  height?: number;
  /** Show eco-zone proximity analysis panel */
  showAnalysis?: boolean;
  /** CSS class for the container */
  className?: string;
}

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const RISK_TEXT: Record<string, string> = {
  critical: "text-red-700 dark:text-red-400",
  high: "text-orange-700 dark:text-orange-400",
  medium: "text-yellow-700 dark:text-yellow-400",
  low: "text-green-700 dark:text-green-400",
};

const RISK_BG: Record<string, string> = {
  critical: "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30",
  high: "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30",
  medium: "bg-yellow-50 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/30",
  low: "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30",
};

const ZONE_TYPE_COLORS: Record<string, string> = {
  national_park: "#dc2626",
  tiger_reserve: "#ea580c",
  wildlife_sanctuary: "#ca8a04",
  reserve_forest: "#16a34a",
  river: "#2563eb",
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  national_park: "National Park",
  tiger_reserve: "Tiger Reserve",
  wildlife_sanctuary: "Wildlife Sanctuary",
  reserve_forest: "Reserve Forest",
  river: "River Corridor",
};

// Chhattisgarh approximate center
const CG_CENTER: [number, number] = [21.27, 81.86];
const CG_ZOOM = 7;

export function MapPicker({
  mode = "pick",
  value,
  onChange,
  category = "B2",
  height = 400,
  showAnalysis = true,
  className,
}: MapPickerProps) {
  const [mapReady, setMapReady] = useState(false);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [leafletMap, setLeafletMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [manualLat, setManualLat] = useState(value?.lat?.toString() ?? "");
  const [manualLng, setManualLng] = useState(value?.lng?.toString() ?? "");

  // Proximity analysis
  const proximity = useMemo(() => {
    if (!value) return null;
    return checkProximity(value.lat, value.lng);
  }, [value]);

  const highRiskZones = useMemo(() => {
    if (!proximity) return [];
    return proximity.filter((p) => p.riskLevel === "critical" || p.riskLevel === "high");
  }, [proximity]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainer) return;

    let L: any;
    let map: any;
    let markerRef: any;

    const init = async () => {
      // Dynamic import of Leaflet (avoids SSR window error)
      L = (await import("leaflet")).default;

      // Inject Leaflet CSS if not already present
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
        // Wait briefly for CSS to load
        await new Promise((r) => setTimeout(r, 100));
      }

      // Fix default marker icon issue with webpack/Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Create map
      map = L.map(mapContainer, {
        center: value ? [value.lat, value.lng] : CG_CENTER,
        zoom: value ? 10 : CG_ZOOM,
        scrollWheelZoom: true,
      });

      // OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Draw eco-zone circles
      CG_ECO_ZONES.forEach((zone) => {
        const color = ZONE_TYPE_COLORS[zone.type] || "#6b7280";
        // Zone boundary
        L.circle([zone.center[0], zone.center[1]], {
          radius: zone.radiusKm * 1000,
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "5 5",
        }).addTo(map).bindPopup(
          `<strong>${zone.name}</strong><br/>` +
          `Type: ${ZONE_TYPE_LABELS[zone.type]}<br/>` +
          `Buffer: ${zone.bufferKm} km<br/>` +
          `<em>${zone.description}</em>`
        );

        // Buffer zone (outer ring)
        L.circle([zone.center[0], zone.center[1]], {
          radius: (zone.radiusKm + zone.bufferKm) * 1000,
          color: color,
          fillColor: color,
          fillOpacity: 0.05,
          weight: 1,
          dashArray: "3 6",
        }).addTo(map);

        // Zone label
        L.marker([zone.center[0], zone.center[1]], {
          icon: L.divIcon({
            className: "leaflet-eco-label",
            html: `<div style="background:${color};color:white;padding:2px 6px;border-radius:4px;font-size:10px;white-space:nowrap;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${zone.name}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
        }).addTo(map);
      });

      // Place existing marker
      if (value) {
        markerRef = L.marker([value.lat, value.lng], {
          draggable: mode === "pick",
        }).addTo(map);
        markerRef.bindPopup(
          `<strong>Project Site</strong><br/>Lat: ${value.lat.toFixed(5)}<br/>Lng: ${value.lng.toFixed(5)}`
        );

        if (mode === "pick") {
          markerRef.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            onChange?.({ lat: Math.round(pos.lat * 100000) / 100000, lng: Math.round(pos.lng * 100000) / 100000 });
          });
        }

        setMarker(markerRef);
      }

      // Click to place marker (pick mode only)
      if (mode === "pick") {
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          const rounded = {
            lat: Math.round(lat * 100000) / 100000,
            lng: Math.round(lng * 100000) / 100000,
          };

          if (markerRef) {
            markerRef.setLatLng([rounded.lat, rounded.lng]);
            markerRef.setPopupContent(
              `<strong>Project Site</strong><br/>Lat: ${rounded.lat.toFixed(5)}<br/>Lng: ${rounded.lng.toFixed(5)}`
            );
          } else {
            markerRef = L.marker([rounded.lat, rounded.lng], { draggable: true }).addTo(map);
            markerRef.bindPopup(
              `<strong>Project Site</strong><br/>Lat: ${rounded.lat.toFixed(5)}<br/>Lng: ${rounded.lng.toFixed(5)}`
            );
            markerRef.on("dragend", (e: any) => {
              const pos = e.target.getLatLng();
              onChange?.({ lat: Math.round(pos.lat * 100000) / 100000, lng: Math.round(pos.lng * 100000) / 100000 });
            });
            setMarker(markerRef);
          }

          onChange?.(rounded);
        });
      }

      setLeafletMap(map);
      setMapReady(true);
    };

    init();

    return () => {
      if (map) {
        map.remove();
      }
    };
    // Only run on mount / mapContainer change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer]);

  // Update marker position when value changes externally
  useEffect(() => {
    if (!leafletMap || !mapReady) return;

    if (value && marker) {
      marker.setLatLng([value.lat, value.lng]);
      marker.setPopupContent(
        `<strong>Project Site</strong><br/>Lat: ${value.lat.toFixed(5)}<br/>Lng: ${value.lng.toFixed(5)}`
      );
    } else if (value && !marker) {
      // Need to create marker dynamically
      import("leaflet").then((L) => {
        const m = L.default.marker([value.lat, value.lng], {
          draggable: mode === "pick",
        }).addTo(leafletMap);
        m.bindPopup(
          `<strong>Project Site</strong><br/>Lat: ${value.lat.toFixed(5)}<br/>Lng: ${value.lng.toFixed(5)}`
        );
        if (mode === "pick") {
          m.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            onChange?.({ lat: Math.round(pos.lat * 100000) / 100000, lng: Math.round(pos.lng * 100000) / 100000 });
          });
        }
        setMarker(m);
      });
    }
    // Sync manual input fields
    if (value) {
      setManualLat(value.lat.toString());
      setManualLng(value.lng.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, mapReady]);

  const handleManualCoords = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    onChange?.({ lat, lng });
    leafletMap?.setView([lat, lng], 10);
  }, [manualLat, manualLng, onChange, leafletMap]);

  const categoryBuffer = CATEGORY_BUFFER[category] ?? 2;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-border shadow-sm">
        <div
          ref={setMapContainer}
          style={{ height: `${height}px`, width: "100%" }}
          className="bg-muted"
        />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Navigation className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium">Loading map...</span>
            </div>
          </div>
        )}
        {/* Legend */}
        <div className="absolute bottom-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 p-2 shadow-md">
          <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
            <Layers className="h-3 w-3" /> Eco Zones
          </div>
          {Object.entries(ZONE_TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5 text-[10px]">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ZONE_TYPE_COLORS[type] }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
        {mode === "pick" && (
          <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 px-3 py-1.5 shadow-md">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Click on the map to select project location
            </p>
          </div>
        )}
      </div>

      {/* Manual coordinate entry (pick mode) */}
      {mode === "pick" && (
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g. 21.2514"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.00001"
              placeholder="e.g. 81.6296"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="h-9 text-sm font-mono"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleManualCoords}
            className="h-9"
          >
            <Navigation className="h-3.5 w-3.5 mr-1" /> Go
          </Button>
        </div>
      )}

      {/* Proximity Analysis */}
      {showAnalysis && value && proximity && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Eco-Zone Proximity Analysis
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Category {category} buffer: {categoryBuffer} km
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Risk summary banner */}
            {highRiskZones.length > 0 ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {highRiskZones.length} eco-sensitive zone{highRiskZones.length > 1 ? "s" : ""} nearby
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                    This project site falls within the buffer zone of protected areas.
                    Additional environmental safeguards and clearances will be required.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    No critical eco-zone conflicts
                  </p>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                    The selected location is outside the buffer zones of all tracked protected areas.
                  </p>
                </div>
              </div>
            )}

            {/* Zone list (top 5) */}
            <div className="space-y-2">
              {proximity.slice(0, 5).map((result) => (
                <div
                  key={result.zone.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    RISK_BG[result.riskLevel]
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn("w-2 h-8 rounded-full", RISK_COLORS[result.riskLevel])}
                    />
                    <div>
                      <p className="text-sm font-semibold">{result.zone.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ZONE_TYPE_LABELS[result.zone.type]} &bull; Buffer: {result.zone.bufferKm} km
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold tabular-nums", RISK_TEXT[result.riskLevel])}>
                      {result.distanceKm} km
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        result.riskLevel === "critical" && "border-red-300 text-red-700 dark:border-red-500 dark:text-red-400",
                        result.riskLevel === "high" && "border-orange-300 text-orange-700 dark:border-orange-500 dark:text-orange-400",
                        result.riskLevel === "medium" && "border-yellow-300 text-yellow-700 dark:border-yellow-500 dark:text-yellow-400",
                        result.riskLevel === "low" && "border-green-300 text-green-700 dark:border-green-500 dark:text-green-400"
                      )}
                    >
                      {result.withinZone
                        ? "Inside Zone"
                        : result.withinBuffer
                        ? "In Buffer"
                        : result.riskLevel}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected coordinates display */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MapPicker;
