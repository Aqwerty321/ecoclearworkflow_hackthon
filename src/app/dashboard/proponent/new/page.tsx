
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Category, CG_DISTRICTS } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, MapPin, Layers, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import dynamic from "next/dynamic";
import { checkProximity } from "@/lib/gis-data";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] rounded-xl border border-border bg-muted flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Navigation className="h-5 w-5 animate-pulse" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
});

const STEPS = [
  { title: "Project Details", description: "Basic project information", icon: FileText },
  { title: "Site Location", description: "GIS coordinates and eco-zone check", icon: MapPin },
  { title: "Description", description: "Environmental context and scope", icon: Layers },
  { title: "Review & Submit", description: "Verify and create draft", icon: CheckCircle2 },
];

export default function NewApplicationPage() {
  const { addApplication, sectors, currentUser } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    projectName: "",
    industrySector: "",
    category: "B2" as Category,
    description: "",
    location: "",
    district: "",
    coordinates: null as { lat: number; lng: number } | null,
  });

  // Proximity analysis for the selected coordinates
  const proximityResults = useMemo(() => {
    if (!formData.coordinates) return null;
    return checkProximity(formData.coordinates.lat, formData.coordinates.lng);
  }, [formData.coordinates]);

  const highRiskCount = useMemo(() => {
    if (!proximityResults) return 0;
    return proximityResults.filter(p => p.riskLevel === "critical" || p.riskLevel === "high").length;
  }, [proximityResults]);

  const canProceed = () => {
    if (step === 0) {
      return formData.projectName && formData.industrySector && formData.location && formData.district;
    }
    if (step === 1) {
      // Map step — coordinates recommended but not strictly required
      return true;
    }
    if (step === 2) {
      return formData.description.length > 10;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    const app = await addApplication({
      ...formData,
      applicantId: currentUser.id,
      coordinates: formData.coordinates ?? undefined,
    });

    toast({
      title: "Success",
      description: "Application drafted successfully. You can now upload documents and submit.",
    });

    router.push(`/dashboard/applications/${app.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Header */}
      <AnimatedContainer animation="fade-in">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold"><GradientText>New Application</GradientText></h1>
          <p className="text-sm text-muted-foreground">Complete the steps below to create your environmental clearance application</p>
        </div>
      </AnimatedContainer>

      {/* Step indicator */}
      <AnimatedContainer animation="fade-in" delay={100}>
        <div className="flex items-center justify-between w-full max-w-lg mx-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex flex-col items-center relative flex-1">
                {i !== 0 && (
                  <div className={cn(
                    "absolute h-0.5 w-full -left-1/2 top-5 -z-10 transition-colors duration-500",
                    i <= step ? "bg-primary" : "bg-border"
                  )}>
                    {i <= step && (
                      <div className="h-full bg-primary animate-draw-line origin-left" />
                    )}
                  </div>
                )}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-bold bg-background transition-all duration-300",
                  i < step && "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20",
                  i === step && "border-primary text-primary ring-4 ring-primary/10 shadow-md",
                  i > step && "border-border text-muted-foreground"
                )}>
                  {i < step ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn(
                  "mt-2 text-xs font-semibold transition-colors duration-300",
                  i === step ? "text-primary" : "text-muted-foreground"
                )}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="slide-up" delay={200}>
        <Card className="shadow-xl border-border/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardTitle className="text-2xl font-bold">{STEPS[step].title}</CardTitle>
            <CardDescription className="text-primary-foreground/80">{STEPS[step].description}</CardDescription>
            {/* Progress bar */}
            <div className="mt-3 h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-foreground/60 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-8">
            {/* Step 1: Project Details */}
            {step === 0 && (
              <div className="animate-fade-in space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="projectName" className="text-sm font-medium">Project Name</Label>
                    <Input
                      id="projectName"
                      placeholder="e.g. Solar Power Park Phase 1"
                      required
                      className="h-11 focus:ring-2 focus:ring-primary/20"
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector" className="text-sm font-medium">Industry Sector</Label>
                    <Select
                      value={formData.industrySector}
                      onValueChange={(v) => setFormData({ ...formData, industrySector: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((s) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v as Category })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Category A (Central Impact)</SelectItem>
                        <SelectItem value="B1">Category B1 (State Impact)</SelectItem>
                        <SelectItem value="B2">Category B2 (Low Impact)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district" className="text-sm font-medium">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        District
                      </span>
                    </Label>
                    <Select
                      value={formData.district}
                      onValueChange={(v) => setFormData({ ...formData, district: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        {CG_DISTRICTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Project Location (Address)
                    </span>
                  </Label>
                  <Input
                    id="location"
                    placeholder="Village/Town, Tehsil, District"
                    required
                    className="h-11 focus:ring-2 focus:ring-primary/20"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Site Location (GIS Map) */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Click on the map to mark the exact project site location. The system will automatically check proximity to eco-sensitive zones in Chhattisgarh.
                  </p>
                </div>
                <MapPicker
                  mode="pick"
                  value={formData.coordinates}
                  onChange={(coords) => setFormData({ ...formData, coordinates: coords })}
                  category={formData.category}
                  height={350}
                  showAnalysis={true}
                />
                {!formData.coordinates && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    No coordinates selected. You can add them later, but eco-zone analysis requires a location.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Description */}
            {step === 2 && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="description" className="text-sm font-medium">Detailed Project Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the scope, environmental footprint, and mitigation plans..."
                  className="min-h-[250px] focus:ring-2 focus:ring-primary/20"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Include details about the project scope, environmental footprint, land area, expected emissions, water usage, and any planned mitigation measures.
                  </p>
                  <span className={cn(
                    "text-xs font-medium tabular-nums",
                    formData.description.length > 10 ? "text-success" : "text-muted-foreground"
                  )}>
                    {formData.description.length} chars
                  </span>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-bold text-lg"><GradientText>Application Summary</GradientText></h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Project Name</h4>
                    <p className="text-lg font-medium mt-1">{formData.projectName}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Industry Sector</h4>
                    <p className="text-lg font-medium mt-1">{formData.industrySector}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Category</h4>
                    <p className="text-lg font-medium mt-1">Category {formData.category}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Location</h4>
                    <p className="text-lg font-medium mt-1">{formData.location}</p>
                    {formData.district && (
                      <p className="text-sm text-muted-foreground">District: {formData.district}</p>
                    )}
                  </div>
                </div>
                {formData.coordinates && (
                  <div className={cn(
                    "p-4 rounded-lg border",
                    highRiskCount > 0
                      ? "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30"
                      : "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30"
                  )}>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">GIS Coordinates</h4>
                    <p className="text-sm font-mono mt-1">
                      {formData.coordinates.lat.toFixed(5)}, {formData.coordinates.lng.toFixed(5)}
                    </p>
                    {highRiskCount > 0 ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Warning: {highRiskCount} eco-sensitive zone{highRiskCount > 1 ? "s" : ""} nearby — additional clearances required
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        No critical eco-zone conflicts detected
                      </p>
                    )}
                  </div>
                )}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Project Description</h4>
                  <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{formData.description}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  After submission, you can upload supporting documents on the application detail page.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/50 p-6 bg-muted/20">
            {step === 0 ? (
              <Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
            ) : (
              <Button variant="outline" type="button" onClick={() => setStep(step - 1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Previous
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                className="font-bold gap-2"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <ShimmerButton type="button" className="font-bold gap-2" onClick={handleSubmit}>
                Initialize Application <CheckCircle2 className="h-4 w-4" />
              </ShimmerButton>
            )}
          </CardFooter>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
