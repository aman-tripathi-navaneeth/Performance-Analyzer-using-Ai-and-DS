import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface LeaderboardEntry {
    rollNumber: string;
    name: string;
    branch: string;
    section: string;
    average_score: number;
    tests_taken: number;
}

export const LeaderboardView = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/students/leaderboard`);
                if (response.ok) {
                    setLeaderboard(await response.json());
                }
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="h-5 w-5 text-yellow-500" />;
            case 2:
                return <Medal className="h-5 w-5 text-gray-400" />;
            case 3:
                return <Medal className="h-5 w-5 text-amber-600" />;
            default:
                return <span className="font-semibold text-muted-foreground w-5 text-center inline-block">{rank}</span>;
        }
    };

    if (isLoading) {
        return <div className="text-center py-12 animate-pulse text-muted-foreground">Loading leaderboard...</div>;
    }

    return (
        <Card className="animate-fade-in shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <CardTitle className="flex items-center gap-2">
                    <Award className="h-6 w-6 text-primary" />
                    Top Performers Leaderboard
                </CardTitle>
                <CardDescription>Discover the highest-achieving students across the institution based on average scores.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[80px]">Rank</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Branch & Section</TableHead>
                                <TableHead className="text-right">Tests Taken</TableHead>
                                <TableHead className="text-right">Average Score (%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No data available for leaderboard.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leaderboard.map((entry, index) => (
                                    <TableRow key={entry.rollNumber} className={index < 3 ? "bg-secondary/5" : ""}>
                                        <TableCell>
                                            <div className="flex justify-center items-center">
                                                {getRankIcon(index + 1)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-foreground">{entry.name}</div>
                                            <div className="text-xs text-muted-foreground">{entry.rollNumber}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm border px-2 py-0.5 rounded-full">{entry.branch}</span>
                                                <span className="text-sm text-muted-foreground">Sec {entry.section}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {entry.tests_taken}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {entry.average_score.toFixed(1)}%
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
