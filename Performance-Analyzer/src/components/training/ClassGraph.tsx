import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ClassPerformanceData } from "./trainingTypes";

interface ClassGraphProps {
    data: ClassPerformanceData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const ClassGraph = ({ data }: ClassGraphProps) => {
    // Calculate Class Statistics
    const totalStudents = data.students.length;
    const overallAvg = data.students.reduce((sum, s) => sum + s.averageMarks, 0) / totalStudents;
    const highestMarks = Math.max(...data.students.map(s => s.averageMarks));
    const lowestMarks = Math.min(...data.students.map(s => s.averageMarks));

    // Determine Grade Distribution
    const gradeDistribution = [
        { name: 'O (90-100)', value: data.students.filter(s => s.averageMarks >= 90).length },
        { name: 'A+ (80-89)', value: data.students.filter(s => s.averageMarks >= 80 && s.averageMarks < 90).length },
        { name: 'A (70-79)', value: data.students.filter(s => s.averageMarks >= 70 && s.averageMarks < 80).length },
        { name: 'B (60-69)', value: data.students.filter(s => s.averageMarks >= 60 && s.averageMarks < 70).length },
        { name: 'F (<60)', value: data.students.filter(s => s.averageMarks < 60).length },
    ].filter(grade => grade.value > 0);

    // Subject-wise Averages
    const subjectMap = new Map<string, { total: number; count: number }>();

    data.students.forEach(student => {
        student.subjects.forEach(sub => {
            const existing = subjectMap.get(sub.subjectName) || { total: 0, count: 0 };
            subjectMap.set(sub.subjectName, {
                total: existing.total + (sub.finalScore || sub.marks),
                count: existing.count + 1
            });
        });
    });

    const subjectAverages = Array.from(subjectMap.entries()).map(([name, stats]) => ({
        name,
        average: Number((stats.total / stats.count).toFixed(1))
    }));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Class Average</p>
                        <p className="text-3xl font-bold mt-2">{overallAvg.toFixed(1)}%</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-500/5 border-green-500/20">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Highest Marks</p>
                        <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">{highestMarks.toFixed(1)}%</p>
                    </CardContent>
                </Card>
                <Card className="bg-destructive/5 border-destructive/20">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Lowest Marks</p>
                        <p className="text-3xl font-bold mt-2 text-destructive">{lowestMarks.toFixed(1)}%</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Subject-wise Averages</CardTitle>
                        <CardDescription>Average performance across different subjects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectAverages} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                                    />
                                    <Bar dataKey="average" name="Class Average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Grade Distribution</CardTitle>
                        <CardDescription>Number of students per grade tier</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={gradeDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {gradeDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
