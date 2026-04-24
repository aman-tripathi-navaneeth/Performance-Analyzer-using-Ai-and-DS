import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, Clock, AlertCircle, XCircle, Award } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface ApplicationTimelineProps {
  rollNumber: string;
}

const STAGE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  'Applied': { icon: <Clock className="h-4 w-4" />, color: 'text-blue-500 border-blue-200 bg-blue-50' },
  'Shortlisted': { icon: <CheckCircle className="h-4 w-4" />, color: 'text-yellow-500 border-yellow-200 bg-yellow-50' },
  'Interview Scheduled': { icon: <AlertCircle className="h-4 w-4" />, color: 'text-orange-500 border-orange-200 bg-orange-50' },
  'Offer Extended': { icon: <Award className="h-4 w-4" />, color: 'text-green-500 border-green-200 bg-green-50' },
  'Placed': { icon: <Award className="h-4 w-4" />, color: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  'Rejected': { icon: <XCircle className="h-4 w-4" />, color: 'text-red-500 border-red-200 bg-red-50' },
};

export const ApplicationTimeline = ({ rollNumber }: ApplicationTimelineProps) => {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!rollNumber) return;
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/application-timeline`);
        if (res.ok) setTimeline(await res.json());
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    fetchTimeline();
  }, [rollNumber]);

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-xl" />;
  if (timeline.length === 0) return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <Building2 className="mx-auto h-10 w-10 mb-2 opacity-40" />
        No application history yet.
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Application Status Timeline</CardTitle>
        </div>
        <CardDescription>Your placement journey across all companies.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {timeline.map((entry) => {
            const cfg = STAGE_CONFIG[entry.stage] || { icon: <Clock className="h-4 w-4" />, color: 'text-muted-foreground border-border bg-secondary/10' };
            return (
              <div key={entry.id} className={`flex items-center justify-between p-3 border rounded-lg ${cfg.color}`}>
                <div className="flex items-center gap-3">
                  {cfg.icon}
                  <div>
                    <p className="font-medium text-sm">{entry.company}</p>
                    <p className="text-xs opacity-75">{entry.updated_at ? new Date(entry.updated_at).toLocaleDateString() : ''}</p>
                  </div>
                </div>
                <Badge className={`border ${cfg.color}`}>{entry.stage}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
