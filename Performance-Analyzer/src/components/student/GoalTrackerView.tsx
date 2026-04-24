
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Target, CheckCircle, Trophy, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { API_BASE_URL } from '../../config';

interface GoalTrackerViewProps {
    rollNumber: string;
}

export const GoalTrackerView = ({ rollNumber }: GoalTrackerViewProps) => {
    const [goals, setGoals] = useState<any[]>([]);
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newGoal, setNewGoal] = useState({ subject: '', targetScore: '', deadline: '' });
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

    useEffect(() => {
        if (!rollNumber || rollNumber === 'unknown_roll') return;

        const fetchData = async () => {
            try {
                // Fetch performance to calculate progress
                const perfRes = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/analytics`);
                if (perfRes.ok) {
                    const data = await perfRes.json();
                    setAnalyticsData(data.map((item: any) => ({
                        subject: item.subject,
                        percentage: Math.round((item.score / item.max_score) * 100)
                    })));
                }

                // Fetch goals
                const goalsRes = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/goals`);
                if (goalsRes.ok) {
                    setGoals(await goalsRes.json());
                }
            } catch (err) {
                console.error("Failed to fetch goal tracker data", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
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

    if (isLoading) return <div className="text-center py-12 animate-pulse">Loading your roadmaps...</div>;

    const achievedCount = goals.filter(g => {
        const relevantData = analyticsData.filter(d => g.subject.toLowerCase().includes(d.subject.toLowerCase()) || d.subject.toLowerCase().includes(g.subject.toLowerCase()));
        const maxAchieved = relevantData.length > 0 ? Math.max(...relevantData.map(d => d.percentage)) : 0;
        return maxAchieved >= g.targetScore;
    }).length;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4 mb-2">
                <Card className="flex-1 bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Target className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Goals</p>
                                <p className="text-2xl font-bold">{goals.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="flex-1 bg-green-500/5 border-green-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Trophy className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Milestones Achieved</p>
                                <p className="text-2xl font-bold">{achievedCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-secondary/5 border-b">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">Personal Goals & Roadmap</CardTitle>
                        <CardDescription>Track your academic targets and placement readiness.</CardDescription>
                    </div>
                    <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                <Plus className="h-4 w-4 mr-1"/> Set New Goal
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] border-primary/20">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    Define Your Milestone
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Focus Subject</label>
                                    <Input placeholder="e.g. Data Structures, Python, DBMS" value={newGoal.subject} onChange={e => setNewGoal({...newGoal, subject: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Target Accuracy (%)</label>
                                    <Input type="number" placeholder="e.g. 85" value={newGoal.targetScore} onChange={e => setNewGoal({...newGoal, targetScore: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Target Completion Date</label>
                                    <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} />
                                </div>
                                <Button className="w-full mt-2" onClick={handleCreateGoal}>Create Milestone</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="pt-6">
                    {goals.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Target className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium text-lg">No Goals Set Yet</h3>
                            <p className="text-muted-foreground max-w-[280px] mx-auto text-sm">
                                Start by setting a target score for any subject you want to master.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {goals.map(goal => {
                                const relevantData = analyticsData.filter(d => goal.subject.toLowerCase().includes(d.subject.split(' (')[0].toLowerCase()) || d.subject.toLowerCase().includes(goal.subject.toLowerCase()));
                                const maxAchieved = relevantData.length > 0 ? Math.max(...relevantData.map(d => d.percentage)) : 0;
                                const isAchieved = maxAchieved >= goal.targetScore;
                                const progress = goal.targetScore ? Math.min((maxAchieved / goal.targetScore) * 100, 100) : 0;
                                
                                return (
                                    <div key={goal.id} className={`p-4 rounded-xl border transition-all ${isAchieved ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border/60'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-sm flex items-center gap-2">
                                                    {goal.subject} 
                                                    {isAchieved && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                </h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] flex items-center gap-1 text-muted-foreground uppercase font-semibold">
                                                        <Calendar className="h-3 w-3" /> {goal.deadline || 'No Deadline'}
                                                    </span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${isAchieved ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                                                        {isAchieved ? 'Achieved' : 'In Progress'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Target: {goal.targetScore}%</p>
                                                <p className="text-sm font-black">{maxAchieved}%</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5 pt-2">
                                            <div className="flex justify-between text-[10px] font-medium">
                                                <span>Progress to Milestone</span>
                                                <span>{Math.round(progress)}%</span>
                                            </div>
                                            <Progress value={progress} className={`h-2 ${isAchieved ? 'bg-green-100' : 'bg-secondary'}`} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
