import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2, Activity, LayoutGrid } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export const BranchAnalyticsDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/branch-analytics`);
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  if (isLoading) return <div className="space-y-4">
    <div className="animate-pulse h-64 bg-muted rounded-lg" />
    <div className="grid grid-cols-2 gap-4">
      <div className="animate-pulse h-32 bg-muted rounded-lg" />
      <div className="animate-pulse h-32 bg-muted rounded-lg" />
    </div>
  </div>;

  if (!data || !data.analytics) return <div className="text-center py-12 text-muted-foreground">No analytics data found. Ensure students have been added.</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle>Institutional Performance Overview</CardTitle>
          </div>
          <CardDescription>Average scores and category distributions by academic group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.analytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey={(d) => `${d.branch} ${d.year.split(' ')[0]}`} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Avg Score']} 
                />
                <Legend />
                <Bar dataKey="average_score" name="Average Score (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Academic Group Distribution
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.analytics.map((d: any, i: number) => (
                <div key={i} className="bg-secondary/10 border border-primary/5 rounded-xl p-4 hover:border-primary/20 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="font-bold text-sm">{d.branch}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{d.year}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-black text-primary">{d.average_score}%</span>
                        <p className="text-[9px] text-muted-foreground">{d.total_students} students</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    {Object.entries(d.distribution).map(([cat, count]: any) => (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span>{cat}</span>
                            <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${cat === 'Excellent' ? 'bg-green-500' : cat === 'Good' ? 'bg-blue-500' : cat === 'Average' ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: d.total_students > 0 ? `${(count / d.total_students) * 100}%` : '0%' }}
                            />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <LayoutGrid className="h-5 w-5 text-primary" /> Top 5 Students (System Wide)
           </CardTitle>
           <CardDescription>Highlights of the highest performing students across all years.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {data.top_performers.length > 0 ? data.top_performers.map((s: any, i: number) => (
                    <div key={i} className="bg-card border rounded-lg p-3 text-center shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1 bg-yellow-500/10 text-yellow-600 rounded-bl-lg font-bold text-[10px]">#{i+1}</div>
                        <p className="font-bold text-sm truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mb-2">{s.roll}</p>
                        <div className="text-xl font-black text-primary">{s.score}%</div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{s.branch}</p>
                    </div>
                )) : (
                    <p className="col-span-last text-center text-sm text-muted-foreground italic">Insufficient performance records to generate rankings.</p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
