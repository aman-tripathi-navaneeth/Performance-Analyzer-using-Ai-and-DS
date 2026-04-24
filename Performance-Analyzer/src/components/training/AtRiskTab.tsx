import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface AtRiskTabProps {
  branch?: string;
  year?: string;
  section?: string;
}

export const AtRiskTab = ({ branch = "All", year = "All", section = "All" }: AtRiskTabProps) => {
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threshold, setThreshold] = useState(40);

  useEffect(() => {
    const fetchAtRisk = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/performance/at-risk?branch=${branch}&year=${year}&section=${section}&threshold=${threshold}`
        );
        if (res.ok) setAtRisk(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAtRisk();
  }, [branch, year, section, threshold]);

  const getRiskBadge = (score: number) => {
    if (score < 25) return <Badge className="bg-red-500/20 text-red-700 border-red-300">Critical</Badge>;
    if (score < 35) return <Badge className="bg-orange-500/20 text-orange-700 border-orange-300">High Risk</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">At Risk</Badge>;
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500 h-5 w-5" />
            <CardTitle>At-Risk Students</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Threshold:</span>
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            >
              <option value={30}>30%</option>
              <option value={40}>40%</option>
              <option value={50}>50%</option>
            </select>
          </div>
        </div>
        <CardDescription>Students scoring below {threshold}% — needs immediate attention.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground animate-pulse py-8">Loading...</p>
        ) : atRisk.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <TrendingDown className="mx-auto h-10 w-10 mb-3 text-green-500" />
            <p className="font-medium text-green-600">No at-risk students found! Great work.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {atRisk.length} student{atRisk.length > 1 ? 's' : ''} flagged
            </div>
            {atRisk.map((s) => (
              <div key={s.rollNumber} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/10 transition-colors">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.rollNumber} · {s.branch} · Year {s.year} · Sec {s.section}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-bold text-red-500">{s.average_score}%</p>
                    <p className="text-xs text-muted-foreground">{s.tests_taken} tests</p>
                  </div>
                  {getRiskBadge(s.average_score)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
