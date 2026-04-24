import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GitCompare } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export const CrossSectionComparisonTab = () => {
  const [subject, setSubject] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComparison = async () => {
    if (!subject || !year || !branch) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/performance/cross-section-comparison?subject=${subject}&year=${year}&branch=${branch}`
      );
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          <CardTitle>Section-wise Subject Comparison</CardTitle>
        </div>
        <CardDescription>Compare a subject's average score across all sections for a given year and branch.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input placeholder="e.g. Java" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Year</Label>
            <Input placeholder="e.g. 2nd Year" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Branch</Label>
            <Input placeholder="e.g. CSE" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </div>
        </div>
        <Button onClick={fetchComparison} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Compare Sections'}
        </Button>

        {data.length > 0 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="section" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" name="Average Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="highest" name="Highest" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lowest" name="Lowest" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {data.map((s) => (
                <div key={s.section} className="border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-primary">{s.average}%</p>
                  <p className="text-xs text-muted-foreground">Section {s.section} ({s.count} students)</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
