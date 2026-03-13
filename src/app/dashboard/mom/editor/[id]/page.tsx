
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Brain, Save, FileCheck, CheckCircle2, Download, FileText, Lock, Loader2, Users, PenTool, LayoutTemplate } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { DetailSkeleton } from "@/components/ui/page-skeleton";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { ESignDocument } from "@/components/ESignDocument";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { generateMinutesOfMeetingDraft } from "@/ai/flows/generate-minutes-of-meeting-draft";
import { hashString } from "@/lib/crypto";
import { buildTemplateVars, substituteTemplateVars } from "@/lib/template-vars";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export default function MoMEditorPage() {
  const params = useParams();
  const { id } = params;
  const { applications, gists, upsertGist, updateApplicationStatus, saveMinutes, minutes, currentUser, templates, users } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();

  const application = applications.find(a => a.id === id);
  const existingGist = gists.find(g => g.applicationId === id);
  const existingMinutes = minutes.find(m => m.applicationId === id);
  
  const [editedGist, setEditedGist] = useState(existingGist?.editedText || "");
  const [generating, setGenerating] = useState(false);
  const [finalMoM, setFinalMoM] = useState<any>(existingMinutes ? {
    discussionSummary: existingMinutes.discussionSummary,
    committeeDecision: existingMinutes.committeeDecision,
    conditions: existingMinutes.conditions,
  } : null);
  const [momHash, setMomHash] = useState<string>("");
  const [signed, setSigned] = useState(false);

  // Gist templates (type === 'gist') for the template picker
  const gistTemplates = templates.filter(t => t.type === 'gist');

  const handleApplyTemplate = (templateId: string) => {
    const tpl = gistTemplates.find(t => t.id === templateId);
    if (!tpl || !application) return;
    const proponent = users.find(u => u.id === application.applicantId) ?? null;
    const vars = buildTemplateVars(application, proponent, currentUser ?? null);
    const substituted = substituteTemplateVars(tpl.content, vars);
    setEditedGist(substituted);
  };

  const isFinalized = application?.status === 'Finalized' || (application?.status === 'MoMGenerated' && !!existingMinutes);
  const isLocked = application?.status === 'Finalized';

  useEffect(() => {
    if (existingGist) setEditedGist(existingGist.editedText);
  }, [existingGist]);

  const handleSaveGist = useCallback(() => {
    if (!application || isLocked) return;
    upsertGist({ 
      applicationId: application.id, 
      generatedText: existingGist?.generatedText || "", 
      editedText: editedGist 
    });
    toast({ title: "Gist Saved", description: "Changes saved to the meeting gist." });
  }, [application, isLocked, editedGist, existingGist, upsertGist, toast]);

  if (!application) return <DetailSkeleton />;

  const handleGenerateDraft = async () => {
    if (isLocked) return;
    setGenerating(true);
    try {
      const draft = await generateMinutesOfMeetingDraft({
        editedGist,
        projectName: application.projectName,
        industrySector: application.industrySector,
        category: application.category,
        location: application.location,
      });
      setFinalMoM(draft);
      updateApplicationStatus(application.id, 'MoMGenerated');
      // Compute SHA-256 hash of the MoM content for eSign
      const momText = `${draft.discussionSummary}\n${draft.committeeDecision}\n${draft.conditions.join('\n')}`;
      const hash = await hashString(momText);
      setMomHash(hash);
      // Persist the MoM
      saveMinutes({
        applicationId: application.id,
        discussionSummary: draft.discussionSummary,
        committeeDecision: draft.committeeDecision,
        conditions: draft.conditions,
      });
    } catch {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate MoM draft." });
    } finally {
      setGenerating(false);
    }
  };

  const finalizeMoM = () => {
    updateApplicationStatus(application.id, 'Finalized');
    toast({ title: "MoM Finalized", description: "Environmental Clearance status updated to Finalized." });
    router.push(`/dashboard/applications/${application.id}`);
  };

  const exportPDF = () => {
    if (!finalMoM) return;
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(18);
    doc.text("Minutes of Meeting", margin, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Project: ${application.projectName}`, margin, y);
    y += 7;
    doc.text(`Sector: ${application.industrySector} | Category: ${application.category}`, margin, y);
    y += 7;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 14;

    doc.setFontSize(14);
    doc.text("Discussion Summary", margin, y);
    y += 8;
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(finalMoM.discussionSummary, 170);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;

    doc.setFontSize(14);
    doc.text("Committee Decision", margin, y);
    y += 8;
    doc.setFontSize(10);
    const decisionLines = doc.splitTextToSize(finalMoM.committeeDecision, 170);
    doc.text(decisionLines, margin, y);
    y += decisionLines.length * 5 + 10;

    doc.setFontSize(14);
    doc.text("Conditions", margin, y);
    y += 8;
    doc.setFontSize(10);
    finalMoM.conditions.forEach((c: string, i: number) => {
      const condLines = doc.splitTextToSize(`${i + 1}. ${c}`, 170);
      doc.text(condLines, margin, y);
      y += condLines.length * 5 + 3;
    });

    doc.save(`MoM_${application.projectName.replace(/\s+/g, '_')}.pdf`);
    toast({ title: "PDF Exported", description: "Minutes of Meeting saved as PDF." });
  };

  const exportDOCX = async () => {
    if (!finalMoM) return;
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: "Minutes of Meeting", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [
            new TextRun({ text: `Project: `, bold: true }),
            new TextRun(application.projectName),
          ]}),
          new Paragraph({ children: [
            new TextRun({ text: `Sector: `, bold: true }),
            new TextRun(`${application.industrySector} | Category: ${application.category}`),
          ]}),
          new Paragraph({ children: [
            new TextRun({ text: `Date: `, bold: true }),
            new TextRun(new Date().toLocaleDateString()),
          ]}),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Discussion Summary", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: finalMoM.discussionSummary }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Committee Decision", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new TextRun({ text: finalMoM.committeeDecision, bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Conditions", heading: HeadingLevel.HEADING_2 }),
          ...finalMoM.conditions.map((c: string, i: number) => 
            new Paragraph({ text: `${i + 1}. ${c}` })
          ),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `MoM_${application.projectName.replace(/\s+/g, '_')}.docx`);
    toast({ title: "DOCX Exported", description: "Minutes of Meeting saved as DOCX." });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <AnimatedContainer animation="fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold"><GradientText>MoM Processing</GradientText></h1>
            <p className="text-muted-foreground">{application.projectName} Review</p>
            {isLocked && (
              <div className="flex items-center gap-1 mt-1 text-amber-600 dark:text-amber-400 text-sm font-semibold">
                <Lock className="h-3.5 w-3.5" /> This MoM has been finalized and is read-only.
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={() => router.back()}>Exit Editor</Button>
        </div>
      </AnimatedContainer>

      <div className="grid md:grid-cols-2 gap-8">
        <AnimatedContainer animation="slide-up" delay={100}>
        <Card className="shadow-lg h-fit border-border/50">
          <CardHeader className="bg-primary/5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Meeting Gist</CardTitle>
            </div>
            <CardDescription>
              {isLocked ? "View the finalized meeting gist below" : "Edit the summarized meeting discussions below"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              {!isLocked && gistTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select onValueChange={handleApplyTemplate}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Load from template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {gistTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.templateName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Label className="flex items-center gap-2">
                Current Gist Text
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Real-time collaborative (CRDT)
                </span>
              </Label>
              <CollaborativeEditor
                documentId={application.id}
                userName={currentUser?.name || "Anonymous"}
                userRole={currentUser?.role}
                initialContent={existingGist?.editedText || ""}
                onChange={(html, text) => setEditedGist(text)}
                readOnly={!!isLocked}
                placeholder="The committee discussed..."
                className="min-h-[400px]"
              />
            </div>
          </CardContent>
          {!isLocked && (
            <CardFooter className="flex justify-between border-t border-border/50 bg-muted/20 p-4">
              <Button variant="outline" size="sm" onClick={handleSaveGist} className="gap-2">
                <Save className="h-4 w-4" /> Save Gist
              </Button>
              <Button size="sm" onClick={handleGenerateDraft} disabled={generating || !editedGist} className="gap-2">
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating Draft...</>
                ) : (
                  <>Convert to Structured MoM <FileCheck className="h-4 w-4" /></>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="slide-up" delay={200}>
        <div className="space-y-6">
          {!finalMoM ? (
            <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-border/50 rounded-xl bg-muted/30 text-center text-muted-foreground">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                  <FileCheck className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p>Edit the gist and click &quot;Convert&quot; to preview the formal MoM document.</p>
              </div>
            </div>
          ) : (
            <Card className="border-emerald-200 dark:border-emerald-500/30 shadow-xl animate-fade-in">
              <CardHeader className="bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20">
                <CardTitle className="text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Structured MoM Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Discussion Summary</h4>
                  <p className="mt-1 text-sm text-foreground/80">{finalMoM.discussionSummary}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Committee Decision</h4>
                  <p className="mt-1 text-sm font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-500/10 p-2 rounded">{finalMoM.committeeDecision}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Conditions</h4>
                  <ul className="mt-2 space-y-2">
                    {finalMoM.conditions.map((c: string, i: number) => (
                      <li key={i} className="text-sm bg-muted/30 p-2 rounded border-l-4 border-emerald-400 dark:border-emerald-500">{c}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 border-t border-border/50 p-4">
                {/* eSign — Digital Signature before finalization */}
                 {!isLocked && finalMoM && momHash && !signed && (
                   <ESignDocument
                     documentHash={momHash}
                     signerName={currentUser?.name || "CECB Official"}
                     signerDesignation={currentUser?.role === "Scrutiny Team" ? "Scrutiny Officer" : currentUser?.role === "Admin" ? "Member Secretary" : "CECB Official"}
                     documentName={`MoM — ${application.projectName}`}
                     onSigned={(sig) => {
                       setSigned(true);
                       // Persist signature metadata into the MinutesOfMeeting record
                       if (finalMoM) {
                         saveMinutes({
                           applicationId: application.id,
                           discussionSummary: finalMoM.discussionSummary,
                           committeeDecision: finalMoM.committeeDecision,
                           conditions: finalMoM.conditions,
                           esignCertificateSerial: sig.certificateSerial,
                           esignIssuer: sig.issuer,
                           esignSignedAt: sig.signedAt,
                           esignSignerName: currentUser?.name,
                           esignDocumentHash: sig.documentHash,
                         });
                       }
                     }}
                     className="w-full"
                   />
                 )}
                {signed && !isLocked && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 p-2 rounded-lg w-full">
                    <PenTool className="h-4 w-4" />
                    Document digitally signed. You may now finalize.
                  </div>
                )}
                <div className="flex gap-2 w-full">
                  {!isLocked && (
                    <ShimmerButton className="flex-1 font-bold" onClick={finalizeMoM} disabled={!signed && !!momHash}>
                      {!signed && momHash ? "Sign before finalizing" : "Finalize & Approve EC"}
                    </ShimmerButton>
                  )}
                  <Button variant="outline" size="icon" title="Export PDF" onClick={exportPDF} className="hover:border-primary/50 transition-colors">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Export DOCX" onClick={exportDOCX} className="hover:border-primary/50 transition-colors">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
        </AnimatedContainer>
      </div>
    </div>
  );
}
