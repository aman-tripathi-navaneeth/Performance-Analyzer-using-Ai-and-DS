import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActivitySquare, Users, BookOpen, BriefcaseBusiness, ClipboardList, Megaphone, Link, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

const StatCard = ({ title, value, icon, color = "text-primary" }: StatCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="pt-5 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
        </div>
        <div className={`${color} bg-primary/10 p-2 rounded-lg`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const SystemStatsPanel = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch_stats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/stats`);
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetch_stats();
  }, []);

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i} className="animate-pulse"><CardContent className="pt-5 pb-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>
      ))}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ActivitySquare className="h-5 w-5 text-primary" /> System Health & Statistics
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Live system-wide overview</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats.total_students} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Faculty" value={stats.total_faculty} icon={<Users className="h-5 w-5" />} color="text-blue-500" />
        <StatCard title="Tests Created" value={stats.total_tests} icon={<ClipboardList className="h-5 w-5" />} color="text-violet-500" />
        <StatCard title="Test Submissions" value={stats.total_results} icon={<BookOpen className="h-5 w-5" />} color="text-green-500" />
        <StatCard title="Active Jobs" value={stats.total_jobs} icon={<BriefcaseBusiness className="h-5 w-5" />} color="text-orange-500" />
        <StatCard title="Announcements" value={stats.total_announcements} icon={<Megaphone className="h-5 w-5" />} color="text-pink-500" />
        <StatCard title="Study Resources" value={stats.total_resources} icon={<Link className="h-5 w-5" />} color="text-cyan-500" />
        <StatCard title="Avg System Score" value={`${stats.avg_system_score}%`} icon={<TrendingUp className="h-5 w-5" />} color="text-amber-500" />
      </div>
    </div>
  );
};
