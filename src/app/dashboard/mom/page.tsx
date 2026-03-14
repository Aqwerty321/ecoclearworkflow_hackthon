
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar, FileEdit, CheckCircle2, ShieldCheck, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CountUp } from "@/components/ui/count-up";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { filterApplicationsByAccess } from "@/lib/types";
import { SLABadge } from "@/components/SLABadge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function MeetingDeskPage() {
  const { applications, currentUser, hydrated, updateApplication } = useAppStore();
  const { toast } = useToast();

  const [schedulingAppId, setSchedulingAppId] = useState<string | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("10:00");

  if (!hydrated) return <TableSkeleton />;

  if (currentUser?.role !== 'MoM Team' && currentUser?.role !== 'Admin') {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-3">
        <p>You do not have permission to access the Meeting Desk.</p>
        <Button variant="outline" size="sm" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  // Apply ABAC filtering — users only see applications matching their sector/district assignments
  const accessibleApps = currentUser ? filterApplicationsByAccess(currentUser, applications) : applications;

  const meetingApps = accessibleApps.filter(app => 
    ['Referred', 'MoMGenerated', 'Finalized'].includes(app.status)
  );

  const referredCount = accessibleApps.filter(a => a.status === 'Referred').length;
  const momCount = accessibleApps.filter(a => a.status === 'MoMGenerated').length;
  const finalizedCount = accessibleApps.filter(a => a.status === 'Finalized').length;

  // Show ABAC indicator if user has restricted access
  const hasAbacRestrictions = currentUser?.role !== 'Admin' && (
    (currentUser?.assignedSectors && currentUser.assignedSectors.length > 0) ||
    !!currentUser?.assignedDistrict
  );

  const handleSchedule = () => {
    if (!schedulingAppId || !meetingDate) return;
    try {
      const iso = new Date(`${meetingDate}T${meetingTime}:00`).toISOString();
      updateApplication(schedulingAppId, { scheduledMeetingAt: iso });
      toast({
        title: "Meeting Scheduled",
        description: `Committee meeting set for ${new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      });
      setSchedulingAppId(null);
      setMeetingDate("");
      setMeetingTime("10:00");
    } catch (error) {
      console.error("Failed to schedule meeting:", error);
      toast({
        title: "Error",
        description: "Invalid date or time. Please check and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-in">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            <GradientText>Meeting Desk</GradientText>
          </h1>
          <p className="text-muted-foreground">Manage committee meeting gists and draft Minutes of Meeting (MoM)</p>
          {hasAbacRestrictions && (
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-primary font-medium">
                Filtered by: {currentUser?.assignedSectors?.join(', ') || 'All sectors'}
                {currentUser?.assignedDistrict && ` · ${currentUser.assignedDistrict}`}
              </span>
            </div>
          )}
        </div>
      </AnimatedContainer>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Referred to Meeting", count: referredCount, icon: Calendar, color: "border-l-indigo-500", iconColor: "text-indigo-400 dark:text-indigo-300" },
          { label: "Drafts Generated", count: momCount, icon: FileEdit, color: "border-l-emerald-500", iconColor: "text-emerald-400 dark:text-emerald-300" },
          { label: "Recently Finalized", count: finalizedCount, icon: CheckCircle2, color: "border-l-slate-500 dark:border-l-slate-400", iconColor: "text-muted-foreground/50" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <AnimatedContainer key={item.label} animation="slide-up" delay={i * 80}>
              <SpotlightCard className={`border-l-4 ${item.color}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-bold mt-1"><CountUp end={item.count} /></p>
                    </div>
                    <Icon className={`h-8 w-8 ${item.iconColor} animate-float`} />
                  </div>
                </CardContent>
              </SpotlightCard>
            </AnimatedContainer>
          );
        })}
      </div>

      <AnimatedContainer animation="slide-up" delay={300}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Committee Queue</CardTitle>
            <CardDescription>Applications discussed or scheduled for upcoming environmental committee meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {meetingApps.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No applications are currently in the meeting queue.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Project Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Meeting</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetingApps.map((app) => (
                    <TableRow key={app.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{app.projectName}</TableCell>
                      <TableCell>{app.category}</TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell><SLABadge application={app} compact /></TableCell>
                      <TableCell>
                        {app.scheduledMeetingAt ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {new Date(app.scheduledMeetingAt).toLocaleDateString('en-IN')}
                            {' '}
                            {new Date(app.scheduledMeetingAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {app.status === 'Referred' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-70 group-hover:opacity-100 transition-opacity"
                            onClick={() => { setSchedulingAppId(app.id); setMeetingDate(''); }}
                          >
                            <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                            Schedule
                          </Button>
                        )}
                        {app.status === 'Referred' || app.status === 'MoMGenerated' ? (
                          <Button variant="default" size="sm" asChild className="opacity-70 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/mom/editor/${app.id}`}>
                              <FileEdit className="h-4 w-4 mr-2" />
                              Process MoM
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild className="opacity-70 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/applications/${app.id}`}>
                              View Record
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Schedule Meeting Dialog */}
      <Dialog open={!!schedulingAppId} onOpenChange={() => setSchedulingAppId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Schedule Committee Meeting
            </DialogTitle>
            <DialogDescription>
              Set the date and time for the environmental committee meeting for this application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Meeting Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-time">Meeting Time</Label>
              <Input
                id="meeting-time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulingAppId(null)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!meetingDate}>Confirm Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
