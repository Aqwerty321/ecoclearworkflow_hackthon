
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Brain, Save, FileCheck, CheckCircle2, Download } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { generateMinutesOfMeetingDraft } from "@/ai/flows/generate-minutes-of-meeting-draft";

export default function MoMEditorPage() {
  const params = useParams();
  const { id } = params;
  const { applications, gists, upsertGist, updateApplicationStatus } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();

  const application = applications.find(a => a.id === id);
  const existingGist = gists.find(g => g.applicationId === id);
  
  const [editedGist, setEditedGist] = useState(existingGist?.editedText || "");
  const [generating, setGenerating] = useState(false);
  const [finalMoM, setFinalMoM] = useState<any>(null);

  useEffect(() => {
    if (existingGist) setEditedGist(existingGist.editedText);
  }, [existingGist]);

  if (!application) return <div>Application not found</div>;

  const handleSaveGist = () => {
    upsertGist({ 
      applicationId: application.id, 
      generatedText: existingGist?.generatedText || "", 
      editedText: editedGist 
    });
    toast({ title: "Gist Saved", description: "Changes saved to the meeting gist." });
  };

  const handleGenerateDraft = async () => {
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
    } catch (e) {
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">MoM Processing</h1>
          <p className="text-muted-foreground">{application.projectName} Review</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>Exit Editor</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg h-fit">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Meeting Gist</CardTitle>
            </div>
            <CardDescription>Edit the summarized meeting discussions below</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Current Gist Text</Label>
              <Textarea 
                value={editedGist}
                onChange={(e) => setEditedGist(e.target.value)}
                className="min-h-[400px] font-sans text-sm leading-relaxed"
                placeholder="The committee discussed..."
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t bg-slate-50 p-4">
            <Button variant="outline" size="sm" onClick={handleSaveGist}>
              <Save className="mr-2 h-4 w-4" /> Save Gist
            </Button>
            <Button size="sm" onClick={handleGenerateDraft} disabled={generating || !editedGist}>
              {generating ? "Generating Draft..." : "Convert to Structured MoM"}
              {!generating && <FileCheck className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {!finalMoM ? (
            <div className="h-full flex items-center justify-center p-12 border-2 border-dashed rounded-xl bg-slate-50 text-center text-muted-foreground">
              <div className="space-y-2">
                <FileCheck className="h-12 w-12 mx-auto opacity-10" />
                <p>Edit the gist and click "Convert" to preview the formal MoM document.</p>
              </div>
            </div>
          ) : (
            <Card className="border-emerald-200 shadow-xl animate-in zoom-in-95 duration-300">
              <CardHeader className="bg-emerald-50 border-b border-emerald-100">
                <CardTitle className="text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Structured MoM Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase">Discussion Summary</h4>
                  <p className="mt-1 text-sm text-slate-700">{finalMoM.discussionSummary}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase">Committee Decision</h4>
                  <p className="mt-1 text-sm font-bold text-emerald-900 bg-emerald-100/50 p-2 rounded">{finalMoM.committeeDecision}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase">Conditions</h4>
                  <ul className="mt-2 space-y-2">
                    {finalMoM.conditions.map((c: string, i: number) => (
                      <li key={i} className="text-sm bg-slate-50 p-2 rounded border-l-4 border-emerald-400">{c}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 border-t p-4">
                <Button className="flex-1 font-bold" onClick={finalizeMoM}>Finalize & Approve EC</Button>
                <Button variant="outline" size="icon" title="Export PDF">
                  <Download className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
