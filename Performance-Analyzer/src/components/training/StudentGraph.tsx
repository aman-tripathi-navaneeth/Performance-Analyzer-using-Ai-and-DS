import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ClassPerformanceData, StudentPerformance } from "./trainingTypes";

interface StudentGraphProps {
    data: ClassPerformanceData;
}

export const StudentGraph = ({ data }: StudentGraphProps) => {
    const [selectedStudentRoll, setSelectedStudentRoll] = useState<string>('');

    const selectedStudent = data.students.find(s => s.rollNumber === selectedStudentRoll);

    // Calculate Class Averages per subject for comparison
    const classAveragesMap = new Map<string, { total: number; count: number }>();
    data.students.forEach(student => {
        student.subjects.forEach(sub => {
            const existing = classAveragesMap.get(sub.subjectName) || { total: 0, count: 0 };
            classAveragesMap.set(sub.subjectName, {
                total: existing.total + (sub.finalScore || sub.marks),
                count: existing.count + 1
            });
        });
    });

    // Prepare comparison data for the chart
    const comparisonData = selectedStudent ? selectedStudent.subjects.map(sub => {
        const classStats = classAveragesMap.get(sub.subjectName);
        const classAvg = classStats ? Number((classStats.total / classStats.count).toFixed(1)) : 0;

        return {
            subject: sub.subjectName,
            studentMarks: sub.marks,
            assessmentScore: sub.assessmentScore || 0,
            finalScore: sub.finalScore || sub.marks,
            classAverage: classAvg
        };
    }) : [];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>Individual Student Performance</CardTitle>
                    <CardDescription>Select a student to compare their marks with the class average</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="max-w-md">
                        <Label className="text-sm font-medium mb-2 block">Select Student</Label>
                        <Select value={selectedStudentRoll} onValueChange={setSelectedStudentRoll}>
                            <SelectTrigger>
                                <SelectValue placeholder="Search by Roll Number" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {data.students.map(student => (
                                    <SelectItem key={student.rollNumber} value={student.rollNumber}>
                                        {student.rollNumber}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedStudent && (
                        <div className="pt-4 border-t">
                            <div className="mb-6 bg-secondary/20 p-4 rounded-xl max-w-sm">
                                <p className="text-sm text-muted-foreground">Combined Average Marks</p>
                                <p className="font-semibold text-lg">{selectedStudent.averageMarks.toFixed(1)}%</p>
                            </div>

                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                        <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="finalScore" name={`Student Average`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="classAverage" name="Class Average" fill="hsl(var(--muted-foreground)/0.5)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
