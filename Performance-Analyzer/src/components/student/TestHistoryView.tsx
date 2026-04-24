import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from '../../config';

interface TestHistoryViewProps {
    rollNumber: string;
}

export const TestHistoryView = ({ rollNumber }: TestHistoryViewProps) => {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!rollNumber) return;

        const fetchHistory = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/students/${rollNumber}/test-history`);
                if (response.ok) {
                    setHistory(await response.json());
                }
            } catch (err) {
                console.error("Failed to fetch test history", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [rollNumber]);

    if (isLoading) {
        return <div className="text-center py-4 text-muted-foreground animate-pulse">Loading test history...</div>;
    }

    if (history.length === 0) {
        return (
            <Card className="bg-secondary/5 mt-6">
                <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">You haven't taken any tests yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mt-8 border-border/50 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg">Test History & Retake Analytics</CardTitle>
                <CardDescription>Review your past performances and identify areas for improvement.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test Name</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                                <TableHead className="text-right">Percentage</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">{record.testName || "Unknown"}</TableCell>
                                    <TableCell>{record.subject}</TableCell>
                                    <TableCell>
                                        {record.submitted_at ? new Date(record.submitted_at).toLocaleDateString() : 'Unknown'}
                                    </TableCell>
                                    <TableCell className="text-right">{record.score} / {record.total_questions}</TableCell>
                                    <TableCell className="text-right">{record.percentage.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">
                                        {record.percentage >= 70 ? (
                                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Passed</Badge>
                                        ) : (
                                            <Badge variant="destructive">Needs Work</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
