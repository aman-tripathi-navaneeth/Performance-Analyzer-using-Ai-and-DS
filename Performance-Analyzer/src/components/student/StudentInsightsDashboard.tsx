import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, RefreshCcw, AlertTriangle, Lightbulb, BookOpen, Target, BrainCircuit } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

interface AnalyticsProfile {
    student_roll: string;
    average_score: number;
    performance_level: string;
    weak_subjects: string[];
    reasons: string[];
    recommendations: string[];
    trend: string;
    predicted_score: number;
    risk_level: string;
    last_updated: string;
}

interface HistoricalData {
    source: string;
    subject: string;
    score: number;
    max_score: number;
    date: string;
    percentage?: number;
}

interface StudentInsightsDashboardProps {
    studentRoll: string;
}

export const StudentInsightsDashboard: React.FC<StudentInsightsDashboardProps> = ({ studentRoll }) => {
    const [profile, setProfile] = useState<AnalyticsProfile | null>(null);
    const [history, setHistory] = useState<HistoricalData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchAnalytics = async (generate: boolean = false) => {
        try {
            if (generate) setIsGenerating(true);
            else setIsLoading(true);

            // 1. Fetch Profile
            const endpoint = generate 
                ? `${API_BASE_URL}/api/analytics/generate/${studentRoll}`
                : `${API_BASE_URL}/api/analytics/profile/${studentRoll}`;
            
            const method = generate ? 'POST' : 'GET';
            
            const res = await fetch(endpoint, { method });
            if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                    setProfile(data.profile);
                } else if (!generate) {
                    // Profile not found, let's generate it
                    await fetchAnalytics(true);
                    return;
                }
            } else {
                toast.error("Failed to fetch analytics profile.");
            }

            // 2. Fetch Historical Data for Charts
            const historyRes = await fetch(`${API_BASE_URL}/api/students/${studentRoll}/analytics`);
            if (historyRes.ok) {
                const histData: HistoricalData[] = await historyRes.json();
                // Map to percentages for fair charting
                const normalized = histData.map(d => ({
                    ...d,
                    percentage: d.max_score > 0 ? (d.score / d.max_score) * 100 : 0
                }));
                // Sort by date roughly
                normalized.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setHistory(normalized);
            }

        } catch (error) {
            console.error("Analytics Error:", error);
            toast.error("Connection error while loading insights.");
        } finally {
            setIsLoading(false);
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchAnalytics(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentRoll]);

    const getTrendIcon = (trend: string) => {
        if (trend === "Improving") return <TrendingUp className="h-6 w-6 text-green-500" />;
        if (trend === "Declining" || trend === "Slight Drop") return <TrendingDown className="h-6 w-6 text-red-500" />;
        return <Minus className="h-6 w-6 text-yellow-500" />;
    };

    const getRiskBadge = (risk: string) => {
        switch(risk) {
            case "High": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
            case "Moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
            default: return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300";
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-muted-foreground animate-pulse">Analyzing your academic footprint...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center p-12 bg-secondary/10 rounded-xl border border-dashed">
                <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Insights Available</h3>
                <p className="text-muted-foreground mb-4">We need some test scores or uploaded marks to generate your AI profile.</p>
                <Button onClick={() => fetchAnalytics(true)} disabled={isGenerating}>
                    {isGenerating ? "Analyzing..." : "Force Generate Profile"}
                </Button>
            </div>
        );
    }

    // Chart Data Preparation
    const trendData = history.map((h, i) => ({
        name: `Assessment ${i+1}`,
        score: Math.round(h.percentage || 0),
        subject: h.subject
    }));

    // Group by subject for the bar chart
    const subjectMap: Record<string, number[]> = {};
    history.forEach(h => {
        if (!subjectMap[h.subject]) subjectMap[h.subject] = [];
        subjectMap[h.subject].push(h.percentage || 0);
    });
    
    const subjectData = Object.keys(subjectMap).map(sub => ({
        subject: sub.length > 10 ? sub.substring(0, 10) + '...' : sub,
        fullSubject: sub,
        average: Math.round(subjectMap[sub].reduce((a, b) => a + b, 0) / subjectMap[sub].length)
    }));

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        AI Performance Insights
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Intelligent breakdown of your academic trajectory and recommended actions.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchAnalytics(true)} disabled={isGenerating}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    Refresh Analysis
                </Button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-md transition-all overflow-hidden relative">
                    <div className={`absolute top-0 right-0 w-16 h-16 transform translate-x-4 -translate-y-4 rounded-full blur-2xl opacity-20 ${profile.performance_level === 'Strong' ? 'bg-green-500' : profile.performance_level === 'Average' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{profile.average_score}%</div>
                        <p className={`text-xs mt-1 font-medium ${profile.performance_level === 'Strong' ? 'text-green-600' : profile.performance_level === 'Average' ? 'text-blue-600' : 'text-red-600'}`}>
                            Tier: {profile.performance_level}
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Predicted Next Score</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{profile.predicted_score}%</div>
                        <p className="text-xs text-muted-foreground mt-1 gap-1 flex items-center">
                            Based on your recent trend
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Historical Trend</CardTitle>
                        {getTrendIcon(profile.trend)}
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{profile.trend}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Trajectory over last {history.length} assessments
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${profile.risk_level === 'High' ? 'text-red-500' : profile.risk_level === 'Moderate' ? 'text-yellow-500' : 'text-green-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-lg font-semibold border ${getRiskBadge(profile.risk_level)}`}>
                                {profile.risk_level}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Placement Readiness Alert
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* AI Diagnosis and Action Plan */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-l-4 border-l-blue-500/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                            <BrainCircuit className="h-5 w-5 mr-2 text-blue-500" />
                            Root Cause Diagnosis (WHY Analysis)
                        </CardTitle>
                        <CardDescription>
                            AI detected patterns explaining your current trajectory.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {profile.reasons && profile.reasons.length > 0 ? (
                            <ul className="space-y-3">
                                {profile.reasons.map((reason, i) => (
                                    <li key={i} className="flex gap-3 text-sm leading-relaxed p-3 bg-secondary/20 rounded-lg">
                                        <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                        <span>{reason}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No specific negative patterns detected.</p>
                        )}
                        
                        {profile.weak_subjects && profile.weak_subjects.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <span className="text-sm font-medium block mb-2">Focus Areas Diagnosed:</span>
                                <div className="flex flex-wrap gap-2">
                                    {profile.weak_subjects.map((sub, i) => (
                                        <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-md border border-red-200">
                                            {sub}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-primary/50 shadow-sm bg-primary/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                            <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                            Actionable Recommendations
                        </CardTitle>
                        <CardDescription>
                            Personalized steps to improve your placement chances.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {profile.recommendations && profile.recommendations.length > 0 ? (
                            <ul className="space-y-3">
                                {profile.recommendations.map((rec, i) => (
                                    <li key={i} className="flex gap-3 text-sm leading-relaxed p-3 bg-background rounded-lg border shadow-sm">
                                        <div className="bg-primary/10 p-1 rounded-full shrink-0 h-fit">
                                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span className="font-medium text-foreground/90">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">Keep up the excellent work!</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Graphs */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Performance Trend</CardTitle>
                        <CardDescription>Your score progression over time across all assessments.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        formatter={(value: number) => [`${value}%`, "Score"]}
                                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="score" 
                                        stroke="hsl(var(--primary))" 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2 }}
                                        activeDot={{ r: 6, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data to graph.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Subject Weakness Distribution</CardTitle>
                        <CardDescription>Your average score aggregated by subject.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72">
                        {subjectData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis 
                                        dataKey="subject" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                                    />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        formatter={(value: number) => [`${value}%`, "Avg Score"]}
                                    />
                                    <Bar 
                                        dataKey="average" 
                                        radius={[4, 4, 0, 0]}
                                        fill="hsl(var(--primary))" 
                                    />
                                    {/* Line showing the threshold for weakness */}
                                    <Line type="step" dataKey={() => 40} stroke="red" strokeWidth={2} dot={false} tooltipType="none" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data to graph.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <div className="text-right text-xs text-muted-foreground opacity-50">
                Last analyzed: {new Date(profile.last_updated + 'Z').toLocaleString()}
            </div>
        </div>
    );
};
