
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
import { FileText, Download, Upload, AlertTriangle, Send, CheckCircle, FileCheck, Brain, Edit3, CreditCard, MessageSquare, RotateCcw, ShieldCheck, ShieldAlert, MapPin, Navigation, Award, Printer, Loader2, ClipboardList } from "lucide-react";
import { UPIPayment, FEE_SCHEDULE } from "@/components/UPIPayment";
import { computeSHA256 } from "@/lib/crypto";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { scrutinyDocumentSummaryAndFlagging } from "@/ai/flows/scrutiny-document-summary-and-flagging";
import { generateMeetingGist } from "@/ai/flows/generate-meeting-gist";
import { regulatoryComplianceCheck, generateEDSDraft, type RegulatoryComplianceOutput, type EDSDraftOutput } from "@/ai/flows/regulatory-compliance-check";
import { analyzeSatellite, type SatelliteAnalysisResponse } from "@/lib/api-client";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { DetailSkeleton } from "@/components/ui/page-skeleton";
import { MarkdownContent } from "@/components/MarkdownContent";
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
  const [complianceResult, setComplianceResult] = useState<RegulatoryComplianceOutput | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [satelliteResult, setSatelliteResult] = useState<SatelliteAnalysisResponse | null>(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [edsDraftResult, setEdsDraftResult] = useState<EDSDraftOutput | null>(null);
  const [edsDraftLoading, setEdsDraftLoading] = useState(false);
  
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

      const syntheticText =
        `Project: ${application.projectName}\n` +
        `Sector: ${application.industrySector}\n` +
        `Category: ${application.category}\n` +
        `Location: ${application.location || 'Not specified'}\n` +
        `Description: ${application.description}\n\n` +
        `Submitted Documents (${appDocs.length}):\n` +
        appDocs.map((d, i) => `${i + 1}. ${d.name} (${d.type})`).join('\n');

      // btoa() only handles Latin-1; use encodeURIComponent for UTF-8 safety
      const documentUrls = realUrls.length > 0
        ? realUrls
        : [`data:text/plain;base64,${btoa(unescape(encodeURIComponent(syntheticText)))}`];

      const res = await scrutinyDocumentSummaryAndFlagging({
        projectDescription: application.description,
        industrySector: application.industrySector,
        category: application.category as 'A' | 'B1' | 'B2',
        documentUrls,
      });
      setAnalysisResult(res);
      // Persist potential impacts as riskSummary for MoM draft enrichment
      if (res.potentialImpacts?.length) {
        updateApplication(application.id, {
          riskSummary: res.potentialImpacts.map((p: { issue: string }) => p.issue).join('; '),
        });
      }
    } catch (err) {
      console.error('[scrutiny] AI analysis failed:', err);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to run AI analysis." });
    } finally {
      setAnalyzing(false);
    }
  };

  const runComplianceCheck = async () => {
    setComplianceLoading(true);
    try {
      const res = await regulatoryComplianceCheck({
        projectName: application.projectName,
        industrySector: application.industrySector,
        category: application.category as 'A' | 'B1' | 'B2',
        projectDescription: application.description,
        location: application.location,
        district: application.district,
        uploadedDocumentTypes: appDocs.map(d => d.type),
        existingComments: appComments.map(c => c.comment),
      });
      setComplianceResult(res);
      // Persist environmental risk summary for MoM enrichment
      if (res.environmentalRiskSummary) {
        updateApplication(application.id, {
          riskSummary: res.environmentalRiskSummary,
        });
      }
    } catch (err) {
      console.error('[compliance] AI compliance check failed:', err);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to run regulatory compliance check." });
    } finally {
      setComplianceLoading(false);
    }
  };

  const runEDSDraft = async () => {
    setEdsDraftLoading(true);
    try {
      const deficiencies = complianceResult
        ? complianceResult.sectorSpecificFindings
            .filter(f => f.status !== 'compliant')
            .map(f => `${f.parameter}: ${f.details}`)
        : (analysisResult?.complianceFindings ?? []).map((f: { issue: string; regulation: string }) => `${f.issue} (${f.regulation})`);
      const missingDocuments = complianceResult?.missingDocuments ?? [];
      const res = await generateEDSDraft({
        projectName: application.projectName,
        applicationId: application.id,
        applicantName: application.ekycName ?? 'Project Proponent',
        industrySector: application.industrySector,
        category: application.category as 'A' | 'B1' | 'B2',
        deficiencies,
        missingDocuments,
      });
      setEdsDraftResult(res);
    } catch (err) {
      console.error('[eds-draft] Failed:', err);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate EDS letter." });
    } finally {
      setEdsDraftLoading(false);
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
        category: application.category as 'A' | 'B1' | 'B2',
        projectDescription: application.description,
        location: application.location,
        environmentalRiskSummary: application.riskSummary,
        complianceScore: complianceResult?.overallScore,
        riskLevel: complianceResult?.riskLevel,
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

          {/* EC Certificate — shown only when Finalized */}
          {isFinalized && (
            <div className="mt-6 print:mt-0">
              <Card className="border-2 border-emerald-400 dark:border-emerald-500 shadow-lg bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card overflow-hidden">
                {/* Header band */}
                <div className="bg-emerald-600 dark:bg-emerald-700 px-6 py-4 flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <p className="text-emerald-100 text-xs font-semibold uppercase tracking-widest">Chhattisgarh Environment Conservation Board</p>
                    <h2 className="text-white text-xl font-bold">Environmental Clearance Certificate</h2>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  {/* Certificate no & date */}
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Certificate No.</p>
                      <p className="font-mono font-bold text-primary">{`CECB/EC/${new Date(application.updatedAt).getFullYear()}/${application.id.slice(-8).toUpperCase()}`}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Issue Date</p>
                      <p className="font-semibold">{new Date(application.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Application ID</p>
                      <p className="font-mono text-xs">{application.id}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-emerald-200 dark:border-emerald-700" />

                  {/* Project details */}
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Project Name</p>
                      <p className="font-semibold text-base">{application.projectName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Industry Sector</p>
                      <p className="font-semibold">{application.industrySector}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Category</p>
                      <p className="font-semibold">Category {application.category}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Project Location</p>
                      <p className="font-semibold">{application.location || 'As per application'}{application.district ? `, ${application.district}` : ''}</p>
                    </div>
                    {application.ekycName && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Verified Applicant</p>
                        <p className="font-semibold flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          {application.ekycName}
                          {application.ekycMaskedAadhaar && <span className="text-xs text-muted-foreground">(Aadhaar: {application.ekycMaskedAadhaar})</span>}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-emerald-200 dark:border-emerald-700" />

                  {/* Attestation text */}
                  <p className="text-sm text-foreground/70 leading-relaxed italic">
                    This is to certify that the above-mentioned project has been reviewed by the Chhattisgarh Environment Conservation Board and is hereby granted Environmental Clearance subject to compliance with all applicable conditions under the Environment Protection Act, 1986 and rules made thereunder. The proponent shall adhere to the environmental safeguards as outlined in the approved EIA report and comply with all conditions imposed during the scrutiny process.
                  </p>

                  {/* Footer: seal + print */}
                  <div className="flex items-end justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 rounded-full border-2 border-emerald-400 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30">
                        <Award className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Member Secretary</p>
                        <p className="text-xs text-muted-foreground">Chhattisgarh Environment Conservation Board</p>
                        <p className="text-xs text-muted-foreground">Raipur, Chhattisgarh</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 print:hidden"
                      onClick={() => window.print()}
                    >
                      <Printer className="mr-2 h-4 w-4" /> Print Certificate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
                    <MarkdownContent className="text-sm">{analysisResult.summary}</MarkdownContent>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-card rounded-xl border border-rose-200 dark:border-rose-500/30">
                      <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Compliance Findings
                      </h3>
                      <ul className="space-y-2">
                        {analysisResult.complianceFindings.map((f: { issue: string; severity: string; regulation: string; recommendation: string }, i: number) => (
                          <li key={i} className="text-sm">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5 ${
                              f.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : f.severity === 'major' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : f.severity === 'minor' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>{f.severity}</span>
                            <span className="text-foreground/80">{f.issue}</span>
                            <p className="text-xs text-muted-foreground mt-0.5 ml-0.5">{f.regulation}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-card rounded-xl border border-indigo-200 dark:border-indigo-500/30">
                      <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                        <FileCheck className="h-4 w-4" /> Potential Impacts
                      </h3>
                      <ul className="space-y-2">
                        {analysisResult.potentialImpacts.map((p: { issue: string; severity: string; recommendation: string }, i: number) => (
                          <li key={i} className="text-sm">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5 ${
                              p.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : p.severity === 'major' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : p.severity === 'minor' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>{p.severity}</span>
                            <span className="text-foreground/80">{p.issue}</span>
                            <p className="text-xs text-muted-foreground mt-0.5 ml-0.5 italic">{p.recommendation}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAnalysisResult(null)}>Clear Analysis</Button>

                  {/* AI Recommendation card — derived from overall assessment + compliance findings count */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    analysisResult.overallAssessment === 'adequate'
                      ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30"
                      : analysisResult.overallAssessment === 'needs_revision'
                      ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                      : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30"
                  }`}>
                    <div className="mt-0.5">
                      {analysisResult.overallAssessment === 'adequate'
                        ? <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        : <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${
                        analysisResult.overallAssessment === 'adequate'
                          ? "text-green-700 dark:text-green-400"
                          : analysisResult.overallAssessment === 'needs_revision'
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-rose-700 dark:text-rose-400"
                      }`}>
                        AI Recommendation
                      </p>
                      <p className="text-sm text-foreground/80 mt-0.5">
                        {analysisResult.overallAssessment === 'adequate'
                          ? "Application appears compliant. No major issues detected — suitable for direct EC grant."
                          : analysisResult.overallAssessment === 'needs_revision'
                          ? `${analysisResult.complianceFindings?.length ?? 0} finding(s) identified. Consider requesting clarifications from the proponent before proceeding.`
                          : `${analysisResult.complianceFindings?.length ?? 0} compliance issues detected. Recommend issuing an Environmental Data Sheet (EDS) for detailed assessment.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regulatory Compliance Check — sector-specific parameter analysis */}
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <CardTitle>Regulatory Compliance Check</CardTitle>
              </div>
              <CardDescription>
                Cross-reference application against CECB sector-specific regulatory parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!complianceResult ? (
                <div className="text-center py-8">
                  <Button onClick={runComplianceCheck} disabled={complianceLoading} className="font-bold">
                    {complianceLoading ? "Checking Compliance..." : "Run Compliance Check"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* Score and risk level header */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className={cn(
                      "flex-1 p-4 rounded-xl border text-center",
                      complianceResult.overallScore >= 70
                        ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30"
                        : complianceResult.overallScore >= 40
                        ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30"
                    )}>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Compliance Score</p>
                      <p className={cn(
                        "text-3xl font-bold mt-1",
                        complianceResult.overallScore >= 70 ? "text-green-700 dark:text-green-400"
                          : complianceResult.overallScore >= 40 ? "text-amber-700 dark:text-amber-400"
                          : "text-rose-700 dark:text-rose-400"
                      )}>
                        {complianceResult.overallScore}/100
                      </p>
                    </div>
                    <div className={cn(
                      "flex-1 p-4 rounded-xl border text-center",
                      complianceResult.riskLevel === 'low' ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30"
                        : complianceResult.riskLevel === 'medium' ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30"
                    )}>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Risk Level</p>
                      <p className={cn(
                        "text-xl font-bold mt-2 uppercase",
                        complianceResult.riskLevel === 'low' ? "text-green-700 dark:text-green-400"
                          : complianceResult.riskLevel === 'medium' ? "text-amber-700 dark:text-amber-400"
                          : "text-rose-700 dark:text-rose-400"
                      )}>
                        {complianceResult.riskLevel}
                      </p>
                    </div>
                  </div>

                  {/* Sector-specific findings */}
                  {complianceResult.sectorSpecificFindings.length > 0 && (
                    <div className="p-4 bg-card rounded-xl border">
                      <h3 className="font-bold text-primary mb-3">Sector-Specific Findings ({complianceResult.sectorSpecificFindings.length})</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {complianceResult.sectorSpecificFindings.map((f, i) => (
                          <div key={i} className={cn(
                            "p-3 rounded-lg border-l-4 text-sm",
                            f.severity === 'critical' ? "border-l-red-500 bg-red-50/50 dark:bg-red-500/5"
                              : f.severity === 'major' ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-500/5"
                              : f.severity === 'minor' ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-500/5"
                              : "border-l-gray-400 bg-muted/30"
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-foreground">{f.parameter}</span>
                              <div className="flex gap-2">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                  f.status === 'compliant' ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                    : f.status === 'non_compliant' ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                    : f.status === 'missing' ? "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                )}>{f.status.replace('_', ' ')}</span>
                                <span className={cn(
                                  "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                  f.severity === 'critical' ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                    : f.severity === 'major' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                    : f.severity === 'minor' ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400"
                                )}>{f.severity}</span>
                              </div>
                            </div>
                            <p className="text-foreground/70">{f.details}</p>
                            <p className="text-xs text-primary/80 mt-1 italic">{f.recommendation}</p>                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing documents */}
                  {complianceResult.missingDocuments.length > 0 && (
                    <div className="p-4 bg-card rounded-xl border border-rose-200 dark:border-rose-500/30">
                      <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Missing Documents ({complianceResult.missingDocuments.length})
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {complianceResult.missingDocuments.map((doc, i) => (
                          <li key={i} className="text-sm text-foreground/80">{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Environmental risk summary */}
                  {complianceResult.environmentalRiskSummary && (
                    <div className="p-4 bg-card rounded-xl border border-indigo-200 dark:border-indigo-500/30">
                      <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">Environmental Risk Summary</h3>
                      <MarkdownContent className="text-sm">{complianceResult.environmentalRiskSummary}</MarkdownContent>
                    </div>
                  )}

                  {/* EDS recommendation */}
                  {complianceResult.edsRecommendation && (
                    <div className="p-4 bg-card rounded-xl border border-amber-200 dark:border-amber-500/30">
                      <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                        <Send className="h-4 w-4" /> Recommended EDS Communication
                      </h3>
                      <MarkdownContent className="text-sm">{complianceResult.edsRecommendation}</MarkdownContent>
                    </div>
                  )}

                  {/* Generate EDS Draft Letter via AI */}
                  {isScrutiny && (
                    <div className="p-4 bg-card rounded-xl border border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-primary flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" /> AI-Generated EDS Letter
                        </h3>
                        <Button size="sm" onClick={runEDSDraft} disabled={edsDraftLoading}>
                          {edsDraftLoading
                            ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Generating...</>
                            : edsDraftResult ? 'Regenerate' : 'Generate EDS Letter'}
                        </Button>
                      </div>
                      {edsDraftResult ? (
                        <div className="space-y-3 animate-in fade-in duration-500">
                          <div className="p-3 bg-muted/40 rounded-lg border text-sm">
                            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Subject</p>
                            <p className="font-semibold">{edsDraftResult.subject}</p>
                          </div>
                          <div className="p-3 bg-muted/40 rounded-lg border text-sm">
                            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Letter Body</p>
                            <MarkdownContent className="text-xs">{edsDraftResult.body}</MarkdownContent>
                          </div>
                          {edsDraftResult.attachmentChecklist.length > 0 && (
                            <div className="p-3 bg-muted/40 rounded-lg border text-sm">
                              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Required Attachments / Actions</p>
                              <ul className="space-y-1">
                                {edsDraftResult.attachmentChecklist.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                                    <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">Recommended deadline: <span className="font-semibold">{edsDraftResult.deadlineDays} days</span></p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Generate a formal EDS communication letter ready to send to the proponent, based on the compliance findings above.
                        </p>
                      )}
                    </div>
                  )}

                  <Button variant="outline" size="sm" onClick={() => setComplianceResult(null)}>Clear Results</Button>
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
