import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, TrendingUp, TrendingDown, RefreshCcw, AlertTriangle, UserCheck, ShieldAlert, Award } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface ClassAnalytics {
    class_average: number;
    total_students_analyzed: number;
    top_scorer: { name: string; roll: string; score: number };
    lowest_scorer: { name: string; roll: string; score: number };
    performance_distribution: { Strong: number; Average: number; Weak: number };
    risk_distribution: { High: number; Moderate: number; Low: number };
    subject_difficulty: { subject: string; weak_students_count: number; weak_percentage: number }[];
    weak_students: { name: string; roll: string; score: number }[];
    risk_students: { name: string; roll: string; trend: string; risk: string }[];
}

interface ClassInsightsDashboardProps {
    year: string;
    branch: string;
    section: string;
}

const COLORS_RISK = {
    High: '#ef4444',     // red-500
    Moderate: '#eab308', // yellow-500
    Low: '#22c55e'       // green-500
};

const COLORS_PERFORMANCE = {
    Strong: '#3b82f6',   // blue-500
    Average: '#8b5cf6',  // violet-500
    Weak: '#f97316'      // orange-500
};

export const ClassInsightsDashboard: React.FC<ClassInsightsDashboardProps> = ({ year, branch, section }) => {
    const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchClassAnalytics = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/analytics/class/${encodeURIComponent(year)}/${encodeURIComponent(branch)}/${encodeURIComponent(section)}`);
            const data = await response.json();

            if (response.ok && data.total_students_analyzed !== undefined) {
                setAnalytics(data);
            } else if (data.message) {
                toast.info(data.message);
                setAnalytics(null);
            } else {
                toast.error("Failed to load class analytics.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Connection error while loading class insights.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (year && branch && section) {
            fetchClassAnalytics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, branch, section]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-muted-foreground animate-pulse">Aggregating AI insights across the class...</p>
            </div>
        );
    }

    if (!analytics || analytics.total_students_analyzed === 0) {
        return (
            <div className="text-center p-12 bg-secondary/10 rounded-xl border border-dashed text-muted-foreground mt-4">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2 text-foreground">No Analytics Data Available</h3>
                <p className="mb-4">Insufficient test scores or marks uploaded for {year} - {branch} - {section}.</p>
                <Button onClick={fetchClassAnalytics} variant="outline">
                    <RefreshCcw className="h-4 w-4 mr-2" /> Retry
                </Button>
            </div>
        );
    }

    const riskData = [
        { name: 'Low Risk', value: analytics.risk_distribution.Low, color: COLORS_RISK.Low },
        { name: 'Moderate Risk', value: analytics.risk_distribution.Moderate, color: COLORS_RISK.Moderate },
        { name: 'High Risk', value: analytics.risk_distribution.High, color: COLORS_RISK.High },
    ].filter(d => d.value > 0);

    const performanceData = [
        { name: 'Strong', value: analytics.performance_distribution.Strong, color: COLORS_PERFORMANCE.Strong },
        { name: 'Average', value: analytics.performance_distribution.Average, color: COLORS_PERFORMANCE.Average },
        { name: 'Weak', value: analytics.performance_distribution.Weak, color: COLORS_PERFORMANCE.Weak },
    ].filter(d => d.value > 0);

    // Sort subjects by difficulty
    const subjectDifficultyData = [...analytics.subject_difficulty].sort((a, b) => b.weak_percentage - a.weak_percentage);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 mt-4">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Class Insight Dashboard</h2>
                    <p className="text-muted-foreground mt-1">
                        High-level AI summary for {year} {branch} {section}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchClassAnalytics}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-md transition-shadow bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{analytics.class_average}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Based on {analytics.total_students_analyzed} students</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                        <Award className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">{analytics.top_scorer.name || 'N/A'}</div>
                        <p className="text-sm text-green-600 font-medium mt-1">{analytics.top_scorer.score >= 0 ? `${Math.round(analytics.top_scorer.score)}%` : '-'}</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Lowest Performer</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-xl font-bold truncate">{analytics.lowest_scorer.name || 'N/A'}</div>
                         <p className="text-sm text-red-600 font-medium mt-1">{analytics.lowest_scorer.score <= 100 ? `${Math.round(analytics.lowest_scorer.score)}%` : '-'}</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow border-red-200 bg-red-50/50 dark:bg-red-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Students At Risk</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{analytics.risk_distribution.High + analytics.risk_distribution.Moderate}</div>
                        <p className="text-xs text-red-600 mt-1">Require immediate attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-sm lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Class Subject Difficulty</CardTitle>
                        <CardDescription>Percentage of students marked as 'weak' in each subject.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {subjectDifficultyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectDifficultyData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis 
                                        dataKey="subject" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis 
                                        domain={[0, 100]} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12 }} 
                                        tickFormatter={(val) => `${val}%`}
                                    />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        formatter={(value: number) => [`${value}%`, "Weak Students"]}
                                    />
                                    <Bar 
                                        dataKey="weak_percentage" 
                                        radius={[4, 4, 0, 0]}
                                        fill="hsl(var(--primary))" 
                                        fillOpacity={0.8}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No weak subjects detected.</div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Risk Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[140px] p-0">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={riskData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={30}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {riskData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number) => [value, "Students"]} />
                                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Performance Tiers</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[140px] p-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={performanceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={30}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {performanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number) => [value, "Students"]} />
                                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Action Lists */}
            <div className="grid gap-6 md:grid-cols-2">
                 <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                            At-Risk Students
                        </CardTitle>
                        <CardDescription>
                            Students showing declining trends or overall poor metrics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analytics.risk_students && analytics.risk_students.length > 0 ? (
                            <div className="space-y-3">
                                {analytics.risk_students.map((student, i) => (
                                    <div key={i} className="flex justify-between items-center bg-secondary/20 p-3 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">{student.roll}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${student.risk === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {student.risk} Risk
                                            </span>
                                            <p className="text-xs text-muted-foreground mt-1 capitalize">{student.trend} Trend</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center p-4">No at-risk students.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                            <UserCheck className="h-5 w-5 mr-2 text-orange-500" />
                            Weak Students (Overall)
                        </CardTitle>
                        <CardDescription>
                            Students who scored below 50% on average.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {analytics.weak_students && analytics.weak_students.length > 0 ? (
                            <div className="space-y-3">
                                {analytics.weak_students.map((student, i) => (
                                    <div key={i} className="flex justify-between items-center bg-secondary/10 p-3 rounded-lg border border-border/50">
                                        <div>
                                            <p className="font-medium text-sm">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">{student.roll}</p>
                                        </div>
                                        <div className="text-right font-bold text-orange-600">
                                            {Math.round(student.score)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center p-4">No weak students based on average.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
