import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, TrendingDown, Users, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export const WeeklyDigestTab = () => {
  const [digest, setDigest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDigest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/performance/weekly-digest`);
      if (res.ok) setDigest(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDigest(); }, []);

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  if (!digest || !digest.summary) return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <Calendar className="mx-auto h-10 w-10 mb-2 opacity-40" />
        No test activity in the last 7 days.
      </CardContent>
    </Card>
  );

  const { summary, top_performers, at_risk_this_week, period } = digest;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Weekly Performance Digest</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchDigest}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Period: {period}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Test Attempts', value: summary.total_test_attempts },
            { label: 'Class Average', value: `${summary.class_average}%` },
            { label: 'Highest Score', value: `${summary.highest_score}%` },
            { label: 'Active Students', value: summary.students_active },
          ].map((s) => (
            <div key={s.label} className="border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Top performers */}
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-1 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" /> Top Performers This Week
          </h4>
          <div className="space-y-2">
            {top_performers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students scored ≥80% this week.</p>
            ) : top_performers.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 bg-green-500/5 border border-green-200/50 rounded-lg">
                <span className="text-sm font-medium">{s.name} <span className="text-muted-foreground text-xs">({s.rollNumber})</span></span>
                <Badge className="bg-green-500/20 text-green-700 border-green-300">{s.avg}%</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* At risk this week */}
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-1 mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" /> Needs Attention This Week
          </h4>
          <div className="space-y-2">
            {at_risk_this_week.length === 0 ? (
              <p className="text-sm text-muted-foreground">No at-risk students this week. 🎉</p>
            ) : at_risk_this_week.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 bg-red-500/5 border border-red-200/50 rounded-lg">
                <span className="text-sm font-medium">{s.name} <span className="text-muted-foreground text-xs">({s.rollNumber})</span></span>
                <Badge className="bg-red-500/20 text-red-700 border-red-300">{s.avg}%</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
