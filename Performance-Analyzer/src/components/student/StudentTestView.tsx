import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignedTest } from '../../data/mockTestData';
import { format } from "date-fns";
import { PlayCircle, Clock, CalendarDays } from 'lucide-react';
import { toast } from "sonner";
import { TakeTestView } from './TakeTestView';
import { API_BASE_URL } from '../../config';

interface StudentTestViewProps {
    year: string;
    branch: string;
    section: string;
}

export const StudentTestView = ({ year, branch, section }: StudentTestViewProps) => {
    const [availableTests, setAvailableTests] = useState<any[]>([]);
    const [activeTest, setActiveTest] = useState<any | null>(null);
    const [studentRoll, setStudentRoll] = useState('');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setStudentRoll(user.rollNumber || 'unknown_roll');
            } catch (e) {
                // Ignore
            }
        }
    }, [])

    useEffect(() => {
        if (!year || !branch || !section || year === "N/A" || branch === "N/A" || section === "N/A" || !studentRoll) return;

        const fetchTests = async () => {
            try {
                const params = new URLSearchParams({
                    year: year,
                    branch: branch,
                    section: section,
                    student_roll: studentRoll
                });
                params.set('_t', String(Date.now()));
                const response = await fetch(`${API_BASE_URL}/api/tests/student?${params.toString()}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    const formattedTests = data.map((t: any) => ({
                        id: t.id,
                        testName: t.testName || t.title || 'Untitled Test',
                        subject: t.subject,
                        year: t.year,
                        branch: t.branch,
                        section: t.section,
                        startTime: t.startTime ? t.startTime.split('T')[1]?.substring(0, 5) : '',
                        endTime: t.endTime ? t.endTime.split('T')[1]?.substring(0, 5) : '',
                        date: t.startTime ? t.startTime.split('T')[0] : (t.date || ''),
                        createdBy: t.createdBy,
                        questionCount: t.questions?.length || 0
                    }));
                    setAvailableTests(formattedTests);
                } else {
                    setAvailableTests([]);
                }
            } catch (err) {
                console.error("Failed to fetch tests", err);
                setAvailableTests([]);
            }
        };

        fetchTests();
        const interval = setInterval(fetchTests, 30000); // Polling every 30s to hide tests that expire while inactive
        return () => clearInterval(interval);
    }, [year, branch, section, studentRoll, activeTest]);

    const handleStartTest = (test: any) => {
        if (test.date && test.startTime) {
            // Reconstruct the start time as a Date object from date (YYYY-MM-DD) and startTime (HH:MM)
            const scheduledStartStr = `${test.date}T${test.startTime}:00`;
            const scheduledStartTime = new Date(scheduledStartStr);
            const currentTime = new Date();

            if (currentTime < scheduledStartTime) {
                toast.error("The test has not started yet. Please wait until the scheduled time.");
                return;
            }
        }

        setActiveTest(test);
    };

    if (activeTest) {
        return (
            <TakeTestView
                testId={activeTest.id}
                testName={activeTest.testName}
                studentRoll={studentRoll}
                onBack={() => setActiveTest(null)}
                onComplete={(score, total) => {
                    // Could optionally remove the test from the available list here
                    setActiveTest(null);
                }}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold">Available Tests</h2>
                    <p className="text-muted-foreground">Tests assigned to {year}, {branch} Section {section}</p>
                </div>
            </div>

            {(!year || !branch || !section || year === "N/A" || branch === "N/A" || section === "N/A") ? (
                <Card className="border-dashed bg-destructive/5 border-destructive/20">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                            <CalendarDays className="h-8 w-8 text-destructive/60" />
                        </div>
                        <h3 className="text-lg font-medium mb-1 text-destructive">Incomplete Profile</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Your student profile does not have a valid Year, Branch, or Section assigned. Please create a new account to see tests targeted for your class.
                        </p>
                    </CardContent>
                </Card>
            ) : availableTests.length === 0 ? (
                <Card className="border-dashed bg-secondary/5">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <CalendarDays className="h-8 w-8 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">No Tests Available</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            You're all caught up! There are no active tests assigned to your class section at the moment.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {availableTests.map((test) => (
                        <Card key={test.id} className="border border-border/50 hover:border-primary/50 transition-colors shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                                        {test.subject}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock size={12} />
                                        {format(new Date(test.date || new Date()), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <CardTitle className="text-xl">{test.testName}</CardTitle>
                                <CardDescription>
                                    Duration: {test.startTime} to {test.endTime}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <Button
                                    onClick={() => handleStartTest(test)}
                                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                                    variant="outline"
                                >
                                    <PlayCircle size={16} className="mr-2" />
                                    Start Test
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
