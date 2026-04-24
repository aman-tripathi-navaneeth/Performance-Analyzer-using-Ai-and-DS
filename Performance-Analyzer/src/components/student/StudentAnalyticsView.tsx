import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Activity, Plus, Target, CheckCircle, ExternalLink, BookOpen, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from '../../config';

interface StudentAnalyticsViewProps {
    rollNumber: string;
}

export const StudentAnalyticsView = ({ rollNumber }: StudentAnalyticsViewProps) => {
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [goals, setGoals] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [newGoal, setNewGoal] = useState({ subject: '', targetScore: '', deadline: '' });
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

    const handleDownloadPDF = async () => {
        setIsDownloadingPDF(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/report/pdf`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Performance_Report_${rollNumber}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('PDF download failed', e);
        } finally {
            setIsDownloadingPDF(false);
        }
    };

    useEffect(() => {
        if (!rollNumber || rollNumber === 'unknown_roll') return;

        const fetchAnalytics = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/analytics`);
                if (response.ok) {
                    const data = await response.json();

                    // but since sources might differ, we can just plot them as individual events
                    const mappedData = data.map((item: any) => ({
                        name: `${item.subject} (${item.date})`,
                        score: item.score,
                        max_score: item.max_score,
                        source: item.source,
                        percentage: Math.round((item.score / item.max_score) * 100),
                        rawSubject: item.subject
                    }));
                    setAnalyticsData(mappedData);

                    // Fetch resources for weak subjects (<70%)
                    const weakSubjects = [...new Set(mappedData.filter((d: any) => d.percentage < 70).map((d: any) => d.rawSubject))] as string[];
                    if (weakSubjects.length > 0) {
                        fetchResources(weakSubjects);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchGoals = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/goals`);
                if (response.ok) {
                    setGoals(await response.json());
                }
            } catch (err) {
                console.error("Failed to fetch goals", err);
            }
        };

        const fetchResources = async (subjectList: string[]) => {
            try {
                const allResources: any[] = [];
                for (const sub of subjectList) {
                    const response = await fetch(`${API_BASE_URL}/api/resources/${sub}`);
                    if (response.ok) {
                        const data = await response.json();
                        allResources.push(...data);
                    }
                }
                // Deduplicate resources by id
                const uniqueResources = Array.from(new Map(allResources.map(r => [r.id, r])).values());
                setResources(uniqueResources);
            } catch (err) {
                console.error("Failed to fetch resources", err);
            }
        };

        fetchAnalytics();
        fetchGoals();
    }, [rollNumber]);

    const handleCreateGoal = async () => {
        if (!newGoal.subject || !newGoal.targetScore) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: newGoal.subject,
                    targetScore: parseFloat(newGoal.targetScore),
                    deadline: newGoal.deadline
                })
            });
            if (response.ok) {
                const result = await response.json();
                setGoals([...goals, result.goal]);
                setIsGoalModalOpen(false);
                setNewGoal({ subject: '', targetScore: '', deadline: '' });
            }
        } catch (err) {
            console.error("Failed to create goal", err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <p className="text-muted-foreground animate-pulse">Loading analytics...</p>
            </div>
        );
    }

    if (analyticsData.length === 0) {
        return (
            <Card className="border-dashed bg-secondary/5">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Activity className="h-8 w-8 text-primary/60" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No Analytics Available</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        We don't have any performance data for you yet. Complete some tests or ask your faculty to upload your internal marks!
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Group analytics by subject to tarry them together
    const subjectMap = new Map<string, { subject: string; internalScore?: number; internalMax?: number; aiScore?: number; aiMax?: number; aiCount: number }>();
    
    analyticsData.forEach((d: any) => {
        let subj = d.rawSubject || d.subject || "Unknown";
        // Convert 'name' to 'subject' if that was how the data came in, otherwise API returns 'subject'
        if (d.name && !d.subject) subj = d.name;

        let existing = subjectMap.get(subj);
        if (!existing) {
            existing = { subject: subj, aiCount: 0 };
        }

        if (d.source === "Internal Excel Upload") {
            existing.internalScore = d.score;
            existing.internalMax = d.max_score;
        } else if (d.source === "AI Generated Test") {
            existing.aiScore = (existing.aiScore || 0) + d.score;
            existing.aiMax = (existing.aiMax || 0) + d.max_score;
            existing.aiCount += 1;
        }
        subjectMap.set(subj, existing);
    });

    const combinedData = Array.from(subjectMap.values()).map(sub => {
        let internalPct = sub.internalScore !== undefined && sub.internalMax ? (sub.internalScore / sub.internalMax) * 100 : undefined;
        let aiPct = sub.aiScore !== undefined && sub.aiMax ? (sub.aiScore / sub.aiMax) * 100 : undefined;
        
        // Handle values gracefully
        if (internalPct !== undefined && internalPct > 100) internalPct = 100;
        if (aiPct !== undefined && aiPct > 100) aiPct = 100;

        let combinedPct = 0;
        if (internalPct !== undefined && aiPct !== undefined) {
            combinedPct = (internalPct + aiPct) / 2;
        } else if (internalPct !== undefined) {
            combinedPct = internalPct;
        } else if (aiPct !== undefined) {
            combinedPct = aiPct;
        }

        return {
            subject: sub.subject,
            internalPercentage: internalPct !== undefined ? Number(internalPct.toFixed(1)) : 0,
            aiPercentage: aiPct !== undefined ? Number(aiPct.toFixed(1)) : 0,
            combinedPercentage: Number(combinedPct.toFixed(1)),
            hasInternal: internalPct !== undefined,
            hasAi: aiPct !== undefined
        };
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Performance Analytics</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPDF}
                    className="flex items-center gap-2"
                >
                    <Download className="h-4 w-4" />
                    {isDownloadingPDF ? 'Generating...' : 'Download Report (PDF)'}
                </Button>
            </div>

            {resources.length > 0 && (
                <Card className="border-blue-500/50 bg-blue-500/5 shadow-sm mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-500" />
                            Recommended Study Resources
                        </CardTitle>
                        <CardDescription>Based on your recent scores, faculty recommend reviewing these materials.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resources.map((res: any) => (
                                <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" 
                                   className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:bg-secondary/20 transition-colors">
                                    <div>
                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                            {res.title}
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                        </h4>
                                        <Badge variant="outline" className="mt-1 text-xs">{res.subject}</Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Added by {res.addedBy}</span>
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {combinedData.length > 0 && (
                <Card className="border border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Combined Performance Overview</CardTitle>
                        <CardDescription>Your performance on uploaded Internal Assessments and AI Online Tests, tarried together per subject.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={combinedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number, name: string) => [`${value}%`, name]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                                />
                                <Legend />
                                <Bar dataKey="internalPercentage" fill="hsl(var(--destructive))" name="Internal Marks" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="aiPercentage" fill="hsl(var(--primary))" name="AI Tests" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="combinedPercentage" fill="#8884d8" name="Combined Average" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

        </div>
    );
};
