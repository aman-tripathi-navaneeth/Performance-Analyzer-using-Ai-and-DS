import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface UpcomingTestBannerProps {
    rollNumber: string;
    year: string;
    branch: string;
    section: string;
}

export const UpcomingTestBanner = ({ rollNumber, year, branch, section }: UpcomingTestBannerProps) => {
    const [upcomingTest, setUpcomingTest] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (!rollNumber || !year || !branch) return;

        const fetchTests = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/tests/student?year=${encodeURIComponent(year)}&branch=${encodeURIComponent(branch)}&section=${encodeURIComponent(section)}&student_roll=${encodeURIComponent(rollNumber)}&_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                    },
                });
                if (res.ok) {
                    const tests = await res.json();
                    
                    // Find test ending within 24 hours
                    const now = new Date();
                    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    let nextUpcomingTest = null;
                    
                    for (const t of tests) {
                        if (t.endTime) {
                            const endDate = new Date(t.endTime);
                            if (endDate > now && endDate <= in24Hours) {
                                nextUpcomingTest = t;
                                break;
                            }
                        }
                    }
                    setUpcomingTest(nextUpcomingTest);
                } else {
                    setUpcomingTest(null);
                }
            } catch (err) {
                console.error("Failed to check upcoming tests", err);
                setUpcomingTest(null);
            }
        };

        fetchTests();
        const interval = setInterval(fetchTests, 30000);
        return () => clearInterval(interval);
    }, [rollNumber, year, branch, section]);

    useEffect(() => {
        if (!upcomingTest?.endTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const endDate = new Date(upcomingTest.endTime);
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("Test ended");
                clearInterval(interval);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [upcomingTest]);

    if (!upcomingTest) return null;

    return (
        <Card className="mb-6 border-orange-500/50 bg-orange-500/10 shadow-sm animate-pulse">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="text-orange-500 h-6 w-6" />
                    <div>
                        <h4 className="font-semibold text-orange-700 dark:text-orange-400">Upcoming Test: {upcomingTest.testName}</h4>
                        <p className="text-sm text-orange-600/80 dark:text-orange-300">Subject: {upcomingTest.subject}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold">
                        <Clock className="h-5 w-5" />
                        <span>{timeLeft}</span>
                    </div>
                    <span className="text-xs text-orange-600/70 dark:text-orange-300">Time remaining</span>
                </div>
            </CardContent>
        </Card>
    );
};
