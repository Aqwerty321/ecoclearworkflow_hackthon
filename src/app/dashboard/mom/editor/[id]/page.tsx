
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Save, FileCheck, CheckCircle2, Download, FileText, Lock, Loader2, Users, PenTool, LayoutTemplate, AlertTriangle, Plus, X, RefreshCcw, Bot } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { DetailSkeleton } from "@/components/ui/page-skeleton";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { ESignDocument } from "@/components/ESignDocument";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { generateMinutesOfMeetingDraft } from "@/ai/flows/generate-minutes-of-meeting-draft";
import { generateMeetingGist } from "@/ai/flows/generate-meeting-gist";
import { hashString } from "@/lib/crypto";
import { buildTemplateVars, substituteTemplateVars } from "@/lib/template-vars";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

const COMMITTEE_DECISIONS = [
  "Approved with Conditions",
  "Approved",
  "Rejected",
  "Deferred for Further Study",
  "Returned for Revision",
];

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
  const [generatingGist, setGeneratingGist] = useState(false);

  // Draft state — populated by AI but NOT saved until officer approves
  const [finalMoM, setFinalMoM] = useState<any>(existingMinutes ? {
    discussionSummary: existingMinutes.discussionSummary,
    committeeDecision: existingMinutes.committeeDecision,
    conditions: existingMinutes.conditions,
  } : null);

  // Editable fields for the HITL review form
  const [editedDecision, setEditedDecision] = useState<string>(existingMinutes?.committeeDecision ?? "");
  const [editedSummary, setEditedSummary] = useState<string>(existingMinutes?.discussionSummary ?? "");
  const [editedConditions, setEditedConditions] = useState<string[]>(existingMinutes?.conditions ?? []);

  // momSaved: true when already committed to Firestore (existing or after officer approves)
  const [momSaved, setMomSaved] = useState(!!existingMinutes);

  const [momHash, setMomHash] = useState<string>("");
  const [signed, setSigned] = useState(false);
  // track new condition text input
  const [newCondition, setNewCondition] = useState("");

  // Compute hash on load if existing minutes present
  useEffect(() => {
    if (existingMinutes && !momHash) {
      const momText = `${existingMinutes.discussionSummary}\n${existingMinutes.committeeDecision}\n${existingMinutes.conditions.join('\n')}`;
      hashString(momText).then(setMomHash);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingMinutes?.applicationId]);

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

  // Regenerate gist via AI and save to Firestore immediately (escape hatch)
  const regenerateGist = async () => {
    if (!application || isLocked) return;
    setGeneratingGist(true);
    try {
      const gistText = await generateMeetingGist({
        projectName: application.projectName,
        industrySector: application.industrySector,
        category: application.category as 'A' | 'B1' | 'B2',
        projectDescription: application.description,
        location: application.location,
        environmentalRiskSummary: application.riskSummary,
      });
      upsertGist({ applicationId: application.id, generatedText: gistText, editedText: gistText });
      setEditedGist(gistText);
      toast({ title: "Meeting Brief Generated", description: "AI brief saved. Edit as needed." });
    } catch {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate meeting brief." });
    } finally {
      setGeneratingGist(false);
    }
  };

  // Generate MoM draft — populates editable state ONLY, does NOT save
  const handleGenerateDraft = async () => {
    if (isLocked) return;
    setGenerating(true);
    try {
      const draft = await generateMinutesOfMeetingDraft({
        editedGist,
        projectName: application.projectName,
        industrySector: application.industrySector,
        category: application.category as 'A' | 'B1' | 'B2',
        location: application.location,
        environmentalRiskSummary: application.riskSummary,
      });
      // Populate editable state for officer review — do NOT save to Firestore yet
      setFinalMoM(draft);
      setEditedDecision(draft.committeeDecision ?? "");
      setEditedSummary(draft.discussionSummary ?? "");
      setEditedConditions(draft.conditions ?? []);
      setMomSaved(false);
    } catch {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate MoM draft." });
    } finally {
      setGenerating(false);
    }
  };

  // Officer explicitly approves — recompute hash from edited content, then save
  const handleApproveMoM = async () => {
    if (!editedDecision.trim() || !editedSummary.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Decision and summary are required." });
      return;
    }
    const momText = `${editedSummary}\n${editedDecision}\n${editedConditions.join('\n')}`;
    const hash = await hashString(momText);
    setMomHash(hash);
    // Persist edited content to Firestore
    saveMinutes({
      applicationId: application.id,
      discussionSummary: editedSummary,
      committeeDecision: editedDecision,
      conditions: editedConditions,
    });
    if (application.status !== 'MoMGenerated') updateApplicationStatus(application.id, 'MoMGenerated');
    // Update finalMoM to reflect approved edits
    setFinalMoM({ discussionSummary: editedSummary, committeeDecision: editedDecision, conditions: editedConditions });
    setMomSaved(true);
    toast({ title: "MoM Approved & Saved", description: "Minutes committed. Proceed to eSign and finalize." });
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxY = pageHeight - margin;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > maxY) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFontSize(18);
    checkPageBreak(10);
    doc.text("Minutes of Meeting", margin, y);
    y += 10;
    doc.setFontSize(12);
    checkPageBreak(7);
    doc.text(`Project: ${application.projectName}`, margin, y);
    y += 7;
    checkPageBreak(7);
    doc.text(`Sector: ${application.industrySector} | Category: ${application.category}`, margin, y);
    y += 7;
    checkPageBreak(14);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 14;

    doc.setFontSize(14);
    checkPageBreak(8);
    doc.text("Discussion Summary", margin, y);
    y += 8;
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(finalMoM.discussionSummary, 170);
    checkPageBreak(summaryLines.length * 5 + 10);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;

    doc.setFontSize(14);
    checkPageBreak(8);
    doc.text("Committee Decision", margin, y);
    y += 8;
    doc.setFontSize(10);
    const decisionLines = doc.splitTextToSize(finalMoM.committeeDecision, 170);
    checkPageBreak(decisionLines.length * 5 + 10);
    doc.text(decisionLines, margin, y);
    y += decisionLines.length * 5 + 10;

    doc.setFontSize(14);
    checkPageBreak(8);
    doc.text("Conditions", margin, y);
    y += 8;
    doc.setFontSize(10);
    finalMoM.conditions.forEach((c: string, i: number) => {
      const condLines = doc.splitTextToSize(`${i + 1}. ${c}`, 170);
      checkPageBreak(condLines.length * 5 + 3);
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
        {/* LEFT: Gist editor */}
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
            {/* Prominent generate button when gist is empty */}
            {!editedGist && !isLocked && (
              <div className="flex flex-col items-center gap-3 py-8 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                <Brain className="h-10 w-10 text-primary/40" />
                <p className="text-sm text-muted-foreground text-center">No meeting brief yet. Generate one with AI or write manually.</p>
                <Button onClick={regenerateGist} disabled={generatingGist} className="gap-2">
                  {generatingGist ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Brain className="h-4 w-4" /> Generate Meeting Brief</>}
                </Button>
              </div>
            )}
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveGist} className="gap-2">
                  <Save className="h-4 w-4" /> Save Gist
                </Button>
                {editedGist && (
                  <Button variant="ghost" size="sm" onClick={regenerateGist} disabled={generatingGist} className="gap-2 text-muted-foreground">
                    {generatingGist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                    Regenerate Brief
                  </Button>
                )}
              </div>
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

        {/* RIGHT: MoM review/edit panel */}
        <AnimatedContainer animation="slide-up" delay={200}>
        <div className="space-y-6">
          {!finalMoM ? (
            /* Empty state */
            <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-border/50 rounded-xl bg-muted/30 text-center text-muted-foreground">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                  <FileCheck className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p>Edit the gist and click &quot;Convert&quot; to preview the formal MoM document.</p>
              </div>
            </div>
          ) : !momSaved && !isLocked ? (
            /* HITL editable form — AI draft, not yet saved */
            <Card className="border-amber-300 dark:border-amber-500/40 shadow-xl animate-fade-in">
              <CardHeader className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <Bot className="h-5 w-5" /> AI Draft — Pending Review
                  </CardTitle>
                  <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-500/40">
                    <AlertTriangle className="h-3 w-3" /> Review before saving
                  </span>
                </div>
                <CardDescription className="text-amber-700/80 dark:text-amber-400/80">
                  Edit all fields as needed. The MoM is only committed when you click &quot;Approve &amp; Save MoM&quot;.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {/* Committee Decision */}
                <div className="space-y-2">
                  <Label className="font-semibold">Committee Decision</Label>
                  <Select value={editedDecision} onValueChange={setEditedDecision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a decision..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMITTEE_DECISIONS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Allow freeform override if AI picked something not in list */}
                  {editedDecision && !COMMITTEE_DECISIONS.includes(editedDecision) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">AI suggested: &quot;{editedDecision}&quot; — please select from the list above.</p>
                  )}
                </div>

                {/* Discussion Summary */}
                <div className="space-y-2">
                  <Label className="font-semibold">Discussion Summary</Label>
                  <Textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="min-h-[140px]"
                    placeholder="Summarise the key points discussed by the committee..."
                  />
                </div>

                {/* Conditions list */}
                <div className="space-y-2">
                  <Label className="font-semibold">Conditions ({editedConditions.length})</Label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {editedConditions.map((cond, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-xs text-muted-foreground mt-2 w-5 shrink-0 text-right">{i + 1}.</span>
                        <Textarea
                          value={cond}
                          onChange={(e) => {
                            const next = [...editedConditions];
                            next[i] = e.target.value;
                            setEditedConditions(next);
                          }}
                          className="flex-1 min-h-[60px] text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 mt-1 text-muted-foreground hover:text-destructive"
                          onClick={() => setEditedConditions(editedConditions.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {/* Add new condition */}
                  <div className="flex gap-2 pt-1">
                    <Textarea
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      className="flex-1 min-h-[60px] text-sm"
                      placeholder="Add a new condition..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 mt-1"
                      disabled={!newCondition.trim()}
                      onClick={() => {
                        if (!newCondition.trim()) return;
                        setEditedConditions([...editedConditions, newCondition.trim()]);
                        setNewCondition("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 justify-end border-t border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-4">
                <Button
                  variant="outline"
                  onClick={() => { setFinalMoM(null); setMomSaved(false); }}
                  className="border-amber-400 text-amber-700 hover:bg-amber-50"
                >
                  Discard Draft
                </Button>
                <Button
                  onClick={handleApproveMoM}
                  disabled={!editedDecision || !editedSummary.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <FileCheck className="mr-2 h-4 w-4" /> Approve &amp; Save MoM
                </Button>
              </CardFooter>
            </Card>
          ) : (
            /* Saved / locked read-only view */
            <Card className="border-emerald-200 dark:border-emerald-500/30 shadow-xl animate-fade-in">
              <CardHeader className="bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20">
                <CardTitle className="text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Structured MoM
                  {momSaved && <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">Saved</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                   <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Discussion Summary</h4>
                   <MarkdownContent className="mt-1 text-sm">{finalMoM.discussionSummary}</MarkdownContent>
                 </div>
                 <div>
                   <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Committee Decision</h4>
                   <div className="mt-1 text-sm font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-500/10 p-2 rounded">
                     <MarkdownContent>{finalMoM.committeeDecision}</MarkdownContent>
                   </div>
                 </div>
                 <div>
                   <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Conditions</h4>
                   <ul className="mt-2 space-y-2">
                     {finalMoM.conditions.map((c: string, i: number) => (
                       <li key={i} className="text-sm bg-muted/30 p-2 rounded border-l-4 border-emerald-400 dark:border-emerald-500">
                         <MarkdownContent className="text-sm">{`${i + 1}. ${c}`}</MarkdownContent>
                       </li>
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
                    <ShimmerButton className="flex-1 font-bold" onClick={finalizeMoM} disabled={!signed || !momHash}>
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
