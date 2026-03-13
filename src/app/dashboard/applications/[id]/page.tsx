
"use client";

import { useAppStore } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { ApplicationTimeline } from "@/components/ApplicationTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Upload, AlertTriangle, Send, CheckCircle, FileCheck, Brain, Edit3, CreditCard, MessageSquare, RotateCcw, ShieldCheck, ShieldAlert, MapPin, Navigation } from "lucide-react";
import { UPIPayment, FEE_SCHEDULE } from "@/components/UPIPayment";
import { computeSHA256 } from "@/lib/crypto";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { scrutinyDocumentSummaryAndFlagging } from "@/ai/flows/scrutiny-document-summary-and-flagging";
import { generateMeetingGist } from "@/ai/flows/generate-meeting-gist";
import { analyzeSatellite, type SatelliteAnalysisResponse } from "@/lib/api-client";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { DetailSkeleton } from "@/components/ui/page-skeleton";
import dynamic from "next/dynamic";

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

const DOCUMENT_TYPES = [
  "Environmental Report",
  "Land Document",
  "Pollution Analysis",
  "EIA Report",
  "NOC Certificate",
  "Site Plan",
  "Risk Assessment",
  "Other",
];

export default function ApplicationDetailPage() {
  const params = useParams();
  const { id } = params;
  const { 
    applications, 
    documents, 
    comments,
    currentUser, 
    updateApplicationStatus, 
    updatePaymentStatus,
    updateApplication,
    addDocument,
    addComment,
    upsertGist,
    gists,
    firebaseConnected
  } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [satelliteResult, setSatelliteResult] = useState<SatelliteAnalysisResponse | null>(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  
  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState(DOCUMENT_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // EDS comment state
  const [edsDialogOpen, setEdsDialogOpen] = useState(false);
  const [edsComment, setEdsComment] = useState("");
  
  // Payment state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const application = applications.find(a => a.id === id);
  const appDocs = documents.filter(d => d.applicationId === id);
  const appComments = comments.filter(c => c.applicationId === id);

  if (!application) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 opacity-30" />
        </div>
        <p className="text-muted-foreground font-medium">Application not found</p>
      </div>
    </div>
  );

  const isProponent = currentUser?.role === 'Project Proponent';
  const isScrutiny = currentUser?.role === 'Scrutiny Team';
  const isMoM = currentUser?.role === 'MoM Team';
  const isFinalized = application.status === 'Finalized';

  const handleAction = (newStatus: any, message: string) => {
    updateApplicationStatus(application.id, newStatus);
    toast({ title: "Status Updated", description: message });
  };

  // Document upload handler with SHA-256 integrity hashing
  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Error", description: "Please select a file." });
      return;
    }
    
    setUploading(true);
    try {
      // Compute SHA-256 hash for document integrity
      const fileHash = await computeSHA256(file);

      if (firebaseConnected) {
        const storageRef = ref(storage!, `documents/${application.id}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        addDocument({ 
          applicationId: application.id, 
          name: file.name, 
          type: uploadDocType, 
          fileUrl: downloadUrl,
          sha256Hash: fileHash,
          fileSize: file.size,
          verified: true,
        });
      } else {
        // Demo mode — simulated upload with real hash
        addDocument({ 
          applicationId: application.id, 
          name: file.name, 
          type: uploadDocType, 
          fileUrl: '#demo',
          sha256Hash: fileHash,
          fileSize: file.size,
          verified: true,
        });
      }
      toast({ title: "Document Uploaded", description: `${file.name} uploaded with integrity hash.` });
      setUploadDialogOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the document." });
    } finally {
      setUploading(false);
    }
  };

  // EDS request with comment
  const handleRequestEDS = () => {
    if (!edsComment.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a comment about missing documents." });
      return;
    }
    addComment({
      applicationId: application.id,
      authorId: currentUser!.id,
      authorName: currentUser!.name,
      comment: edsComment,
    });
    handleAction('EDS', 'Information request sent to proponent.');
    setEdsDialogOpen(false);
    setEdsComment("");
  };

  // Payment via UPI
  const handlePaymentComplete = (transactionId: string) => {
    updatePaymentStatus(application.id, 'paid');
    toast({ title: "Payment Successful", description: `Application fee paid. Txn: ${transactionId}` });
  };

  const runScrutinyAI = async () => {
    if (appDocs.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No documents to analyze." });
      return;
    }
    setAnalyzing(true);
    try {
      // Use real Firebase Storage URLs if available; otherwise synthesize a descriptive text payload
      const realUrls = appDocs
        .filter(d => d.fileUrl && !d.fileUrl.startsWith('#'))
        .map(d => d.fileUrl);

      const documentUrls = realUrls.length > 0
        ? realUrls
        : [
            `data:text/plain;base64,${btoa(
              `Project: ${application.projectName}\n` +
              `Sector: ${application.industrySector}\n` +
              `Category: ${application.category}\n` +
              `Location: ${application.location || 'Not specified'}\n` +
              `Description: ${application.description}\n\n` +
              `Submitted Documents (${appDocs.length}):\n` +
              appDocs.map((d, i) => `${i + 1}. ${d.name} (${d.type})`).join('\n')
            )}`
          ];

      const res = await scrutinyDocumentSummaryAndFlagging({
        projectDescription: application.description,
        documentUrls,
      });
      setAnalysisResult(res);
      // Persist potential impacts as riskSummary for MoM draft enrichment
      if (res.potentialImpacts?.length) {
        updateApplication(application.id, {
          riskSummary: res.potentialImpacts.join('; '),
        });
      }
    } catch {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to run AI analysis." });
    } finally {
      setAnalyzing(false);
    }
  };

  const runSatelliteAnalysis = async () => {
    if (!application.coordinates) return;
    setSatelliteLoading(true);
    try {
      const res = await analyzeSatellite({
        lat: application.coordinates.lat,
        lng: application.coordinates.lng,
        buffer_km: 5,
      });
      if (res.data) {
        setSatelliteResult(res.data);
      } else {
        toast({ variant: "destructive", title: "Satellite Error", description: res.error || "Failed to fetch satellite data." });
      }
    } catch {
      toast({ variant: "destructive", title: "Satellite Error", description: "Failed to connect to GIS service." });
    } finally {
      setSatelliteLoading(false);
    }
  };

  const referToMeeting = async () => {
    handleAction('Referred', 'Referred to upcoming committee meeting.');
    try {
      const gistText = await generateMeetingGist({
        projectName: application.projectName,
        industrySector: application.industrySector,
        category: application.category,
        projectDescription: application.description
      });
      upsertGist({ applicationId: application.id, generatedText: gistText, editedText: gistText });
    } catch {
      toast({ variant: "destructive", title: "Gist Warning", description: "Application referred but gist generation failed." });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <AnimatedContainer animation="slide-up">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{application.projectName}</h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-sm text-muted-foreground">ID: {application.id} &bull; Applied on {new Date(application.createdAt).toLocaleDateString()}</p>
        </div>
        
        {!isFinalized && (
          <div className="flex gap-2 flex-wrap">
            {isProponent && application.status === 'Draft' && (
              <Button onClick={() => handleAction('Submitted', 'Application submitted for scrutiny.')} className="font-bold">
                <Send className="mr-2 h-4 w-4" /> Submit Application
              </Button>
            )}
            {isProponent && application.status === 'EDS' && (
              <Button onClick={() => handleAction('Submitted', 'Application resubmitted after EDS response.')} className="font-bold">
                <RotateCcw className="mr-2 h-4 w-4" /> Resubmit Application
              </Button>
            )}
            {isProponent && application.paymentStatus === 'pending' && (
              <Button onClick={() => { setPaymentDialogOpen(true); }} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                <CreditCard className="mr-2 h-4 w-4" /> Pay Application Fee
              </Button>
            )}
            {isScrutiny && application.status === 'Submitted' && (
              <Button onClick={() => handleAction('UnderScrutiny', 'Formally accepted for technical review.')}>
                Accept for Scrutiny
              </Button>
            )}
            {isScrutiny && application.status === 'UnderScrutiny' && (
              <>
                <Button variant="outline" onClick={() => setEdsDialogOpen(true)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Request EDS
                </Button>
                <Button onClick={referToMeeting}>Refer to Meeting</Button>
              </>
            )}
            {isMoM && application.status === 'Referred' && (
              <Button asChild>
                <a href={`/dashboard/mom/editor/${application.id}`}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit MoM Gist
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fade-in" delay={100}>
      <ApplicationTimeline currentStatus={application.status} />
      </AnimatedContainer>

      <AnimatedContainer animation="slide-up" delay={200}>
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-muted/50">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Docs ({appDocs.length})</TabsTrigger>
          <TabsTrigger value="gis">
            <MapPin className="h-3.5 w-3.5 mr-1" /> GIS
          </TabsTrigger>
          <TabsTrigger value="comments">EDS ({appComments.length})</TabsTrigger>
          <TabsTrigger value="scrutiny" disabled={!isScrutiny && !isMoM}>AI Scrutiny</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Core Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Industry Sector</h4>
                  <p className="text-lg">{application.industrySector}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Project Category</h4>
                  <p className="text-lg">Category {application.category}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Location</h4>
                  <p className="text-lg">{application.location || 'Not Specified'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Payment Status</h4>
                  <span className={cn(
                    "text-sm font-semibold px-3 py-1 rounded-full border",
                    application.paymentStatus === 'paid' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" 
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                  )}>
                    {application.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase">Project Description</h4>
                <p className="mt-1 text-foreground/80 leading-relaxed whitespace-pre-wrap">{application.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Uploaded Documents</CardTitle>
                <CardDescription>Legal and technical documents for compliance</CardDescription>
              </div>
              {isProponent && !isFinalized && (
                <Button size="sm" variant="outline" onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Upload New
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {appDocs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p>No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {appDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all duration-200 group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/5 rounded-lg text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type} &bull; {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          {doc.sha256Hash && (
                            <div className="flex items-center gap-1 mt-1">
                              {doc.verified ? (
                                <ShieldCheck className="h-3 w-3 text-green-600" />
                              ) : (
                                <ShieldAlert className="h-3 w-3 text-amber-600" />
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground" title={doc.sha256Hash}>
                                SHA-256: {doc.sha256Hash.slice(0, 16)}...
                              </span>
                              {doc.fileSize && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({(doc.fileSize / 1024).toFixed(1)} KB)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {doc.fileUrl && doc.fileUrl !== '#' && doc.fileUrl !== '#demo' && (
                        <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gis" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Site Location & Eco-Zone Analysis</CardTitle>
              </div>
              <CardDescription>
                {application.coordinates
                  ? `Project coordinates: ${application.coordinates.lat.toFixed(5)}, ${application.coordinates.lng.toFixed(5)}`
                  : "No GIS coordinates have been provided for this application."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.coordinates ? (
                <>
                  <MapPicker
                    mode="display"
                    value={application.coordinates}
                    category={application.category}
                    height={400}
                    showAnalysis={true}
                  />
                  {/* Sentinel-2 NDVI Satellite Analysis Panel */}
                  <div className="border rounded-xl p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold text-sm">Sentinel-2 Vegetation Analysis (NDVI)</h4>
                      </div>
                      <Button size="sm" variant="outline" onClick={runSatelliteAnalysis} disabled={satelliteLoading}>
                        {satelliteLoading ? "Fetching..." : satelliteResult ? "Refresh" : "Fetch Satellite Data"}
                      </Button>
                    </div>
                    {satelliteResult ? (
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Mean NDVI</span>
                            <span className="font-mono font-bold text-primary">{satelliteResult.ndvi.mean_ndvi.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vegetation Class</span>
                            <span className="font-semibold capitalize">{satelliteResult.ndvi.vegetation_class.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vegetation Cover</span>
                            <span className="font-semibold">{satelliteResult.ndvi.vegetation_cover_pct.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Acquisition Date</span>
                            <span className="font-mono text-xs">{satelliteResult.acquisition_date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cloud Cover</span>
                            <span>{satelliteResult.cloud_cover_pct.toFixed(1)}%</span>
                          </div>
                          {satelliteResult.change_detection && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Trend (6 months)</span>
                              <span className={cn("font-semibold capitalize", satelliteResult.change_detection.trend === 'improving' ? 'text-green-600' : satelliteResult.change_detection.trend === 'declining' ? 'text-red-600' : 'text-amber-600')}>
                                {satelliteResult.change_detection.trend}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Land Use Breakdown</p>
                          {Object.entries(satelliteResult.land_use_breakdown).map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="font-mono text-xs">{(val as number).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="md:col-span-2 p-3 bg-card rounded-lg border text-xs text-foreground/80">
                          <p className="font-semibold mb-1 text-primary">AI Recommendation</p>
                          <p>{satelliteResult.recommendation}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click &quot;Fetch Satellite Data&quot; to retrieve Sentinel-2 NDVI vegetation analysis for this site.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                  <MapPin className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p>No GIS coordinates provided.</p>
                  <p className="text-xs mt-1">The proponent can add coordinates when creating or editing the application.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">EDS Comments & Communication</CardTitle>
              <CardDescription>Comments from the scrutiny team regarding missing documents or information</CardDescription>
            </CardHeader>
            <CardContent>
              {appComments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                  <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p>No EDS comments yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appComments.map(c => (
                    <div key={c.id} className="p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-primary">{c.authorName}</span>
                        <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-foreground/80">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scrutiny" className="mt-6">
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                <CardTitle>AI-Powered Scrutiny Assistant</CardTitle>
              </div>
              <CardDescription>Analyze compliance and potential impacts using Gemini AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!analysisResult ? (
                <div className="text-center py-8">
                  <Button onClick={runScrutinyAI} disabled={analyzing || appDocs.length === 0} className="font-bold">
                    {analyzing ? "Analyzing Documents..." : "Start Scrutiny Analysis"}
                  </Button>
                  {appDocs.length === 0 && <p className="text-xs text-destructive mt-2">Upload documents first</p>}
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-4 bg-card rounded-xl border">
                    <h3 className="font-bold text-primary mb-2">Analysis Summary</h3>
                    <p className="text-sm text-foreground/80">{analysisResult.summary}</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-card rounded-xl border border-rose-200 dark:border-rose-500/30">
                      <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Compliance Issues
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysisResult.complianceIssues.map((issue: string, i: number) => (
                          <li key={i} className="text-sm text-foreground/80">{issue}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-card rounded-xl border border-indigo-200 dark:border-indigo-500/30">
                      <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                        <FileCheck className="h-4 w-4" /> Potential Impacts
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysisResult.potentialImpacts.map((impact: string, i: number) => (
                          <li key={i} className="text-sm text-foreground/80">{impact}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAnalysisResult(null)}>Clear Analysis</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </AnimatedContainer>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Select a document type and upload a file for this application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={uploadDocType} onValueChange={setUploadDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.png" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFileUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDS Comment Dialog */}
      <Dialog open={edsDialogOpen} onOpenChange={setEdsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Environmental Data Submission</DialogTitle>
            <DialogDescription>Describe the missing documents or information the proponent needs to provide.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Comments on Missing Information</Label>
            <Textarea
              value={edsComment}
              onChange={(e) => setEdsComment(e.target.value)}
              placeholder="Please provide the following missing documents: ..."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestEDS} disabled={!edsComment.trim()}>
              Send EDS Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPI Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Application Fee Payment</DialogTitle>
            <DialogDescription>
              Pay via UPI — scan QR code or use deep-link on mobile.
            </DialogDescription>
          </DialogHeader>
          <UPIPayment
            applicationId={application.id}
            projectName={application.projectName}
            category={application.category}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setPaymentDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
