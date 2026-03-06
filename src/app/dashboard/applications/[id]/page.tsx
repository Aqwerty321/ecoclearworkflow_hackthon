
"use client";

import { useAppStore } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { ApplicationTimeline } from "@/components/ApplicationTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Upload, AlertTriangle, Send, CheckCircle, FileCheck, Brain, Edit3 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { scrutinyDocumentSummaryAndFlagging } from "@/ai/flows/scrutiny-document-summary-and-flagging";
import { generateMeetingGist } from "@/ai/flows/generate-meeting-gist";

export default function ApplicationDetailPage() {
  const params = useParams();
  const { id } = params;
  const { 
    applications, 
    documents, 
    currentUser, 
    updateApplicationStatus, 
    updatePaymentStatus,
    addDocument,
    upsertGist,
    gists
  } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const application = applications.find(a => a.id === id);
  const appDocs = documents.filter(d => d.applicationId === id);
  const appGist = gists.find(g => g.applicationId === id);

  if (!application) return <div>Application not found</div>;

  const isProponent = currentUser?.role === 'Project Proponent';
  const isScrutiny = currentUser?.role === 'Scrutiny Team';
  const isMoM = currentUser?.role === 'MoM Team';

  const handleAction = (newStatus: any, message: string) => {
    updateApplicationStatus(application.id, newStatus);
    toast({ title: "Status Updated", description: message });
  };

  const handlePayment = () => {
    updatePaymentStatus(application.id, 'paid');
    toast({ title: "Payment Successful", description: "Application fee marked as paid." });
  };

  const runScrutinyAI = async () => {
    if (appDocs.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No documents to analyze." });
      return;
    }
    setAnalyzing(true);
    try {
      // Mocked since real data URIs aren't available easily in demo state
      // But we'll call the flow anyway to show it works
      const res = await scrutinyDocumentSummaryAndFlagging({
        projectDescription: application.description,
        documentUrls: ["data:text/plain;base64,U2FtcGxlIERvY3VtZW50"]
      });
      setAnalysisResult(res);
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to run AI analysis." });
    } finally {
      setAnalyzing(false);
    }
  };

  const referToMeeting = async () => {
    handleAction('Referred', 'Referred to upcoming committee meeting.');
    // Generate initial gist
    const gistText = await generateMeetingGist({
      projectName: application.projectName,
      industrySector: application.industrySector,
      category: application.category,
      projectDescription: application.description
    });
    upsertGist({ applicationId: application.id, generatedText: gistText, editedText: gistText });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary">{application.projectName}</h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-muted-foreground">ID: {application.id} • Applied on {new Date(application.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div className="flex gap-2">
          {isProponent && application.status === 'Draft' && (
            <Button onClick={() => handleAction('Submitted', 'Application submitted for scrutiny.')} className="font-bold">
              <Send className="mr-2 h-4 w-4" /> Submit Application
            </Button>
          )}
          {isProponent && application.paymentStatus === 'pending' && (
            <Button onClick={handlePayment} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
              <CheckCircle className="mr-2 h-4 w-4" /> Pay Application Fee
            </Button>
          )}
          {isScrutiny && application.status === 'Submitted' && (
            <Button onClick={() => handleAction('UnderScrutiny', 'Formally accepted for technical review.')}>
              Accept for Scrutiny
            </Button>
          )}
          {isScrutiny && application.status === 'UnderScrutiny' && (
            <>
              <Button variant="outline" onClick={() => handleAction('EDS', 'Information request sent to proponent.')}>Request EDS</Button>
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
      </div>

      <ApplicationTimeline currentStatus={application.status} />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="details">Project Details</TabsTrigger>
          <TabsTrigger value="documents">Documents ({appDocs.length})</TabsTrigger>
          <TabsTrigger value="scrutiny" disabled={!isScrutiny && !isMoM}>AI Scrutiny</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Information</CardTitle>
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
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase">Project Description</h4>
                <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-wrap">{application.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Uploaded Documents</CardTitle>
                <CardDescription>Legal and technical documents for compliance</CardDescription>
              </div>
              {isProponent && (
                <Button size="sm" variant="outline" onClick={() => {
                  addDocument({ applicationId: application.id, name: 'Environmental Report', type: 'PDF', fileUrl: '#' });
                  toast({ title: "Document Uploaded", description: "Simulated upload complete." });
                }}>
                  <Upload className="mr-2 h-4 w-4" /> Upload New
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {appDocs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border-2 border-dashed">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p>No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl bg-white hover:border-primary transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/5 rounded-lg text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type} • Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scrutiny" className="mt-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                <CardTitle>AI-Powered Scrutiny Assistant</CardTitle>
              </div>
              <CardDescription>Analyze compliance and potential impacts using Gemini 1.5</CardDescription>
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
                  <div className="p-4 bg-white rounded-xl border">
                    <h3 className="font-bold text-primary mb-2">Analysis Summary</h3>
                    <p className="text-sm text-slate-700">{analysisResult.summary}</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-rose-100">
                      <h3 className="font-bold text-rose-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Compliance Issues
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysisResult.complianceIssues.map((issue: string, i: number) => (
                          <li key={i} className="text-sm text-slate-700">{issue}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-indigo-100">
                      <h3 className="font-bold text-indigo-700 mb-2 flex items-center gap-2">
                        <FileCheck className="h-4 w-4" /> Potential Impacts
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysisResult.potentialImpacts.map((impact: string, i: number) => (
                          <li key={i} className="text-sm text-slate-700">{impact}</li>
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
    </div>
  );
}
