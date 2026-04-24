import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignedTest } from "../../data/mockTestData";
import { format } from "date-fns";
import { Clock, Users, Eye, CheckCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { API_BASE_URL } from '../../config';

interface TestListProps {
    tests: AssignedTest[];
    facultyUsername: string;
    onTestsChanged: () => void;
    onTestDeleted: (testId: string) => void;
}

export const TestList = ({ tests, facultyUsername, onTestsChanged, onTestDeleted }: TestListProps) => {
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [testQuestions, setTestQuestions] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
    const [testPendingDelete, setTestPendingDelete] = useState<AssignedTest | null>(null);

    const handleViewQuestions = async (testId: string, testName: string) => {
        setIsLoading(true);
        setSelectedTestId(testId);
        setIsDialogOpen(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/tests/${testId}/questions/all`);
            if (response.ok) {
                const data = await response.json();
                setTestQuestions(data);
            } else {
                toast.error("Failed to load generated questions");
                setTestQuestions([]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error connecting to server");
            setTestQuestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReleaseResults = async (testId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tests/${testId}/release`, {
                method: 'PUT'
            });
            if (response.ok) {
                toast.success("Results released to students successfully");
                // Optimistically update the test list if we could, 
                // but since tests is passed as prop, we just show a success message.
            } else {
                toast.error("Failed to release results");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error connecting to server");
        }
    };

    const handleDeleteTest = async (testId: string, testTitle: string) => {
        setDeletingTestId(testId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/tests/${testId}?username=${encodeURIComponent(facultyUsername)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success("Test deleted successfully");
                onTestDeleted(testId);
                await onTestsChanged();
            } else if (response.status === 404) {
                setTestPendingDelete(null);
                toast.info("This test was already removed. Refreshing the list.");
                onTestDeleted(testId);
                await onTestsChanged();
            } else {
                const errorData = await response.json();
                toast.error(errorData.detail || "Failed to delete test");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error connecting to server");
        } finally {
            setDeletingTestId(null);
        }
    };

    return (
        <>
            <Card className="animate-fade-in shadow-sm">
                <CardHeader>
                    <CardTitle>Created Tests</CardTitle>
                    <CardDescription>A list of all the tests you have assigned to your classes.</CardDescription>
                </CardHeader>
                <CardContent>
                    {tests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-secondary/10 rounded-lg">
                            <h3 className="font-medium text-lg">No Tests Created Yet</h3>
                            <p className="text-muted-foreground mt-1">Submit the form above to deploy your first assigned test.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Title & Subject</TableHead>
                                        <TableHead>Assigned To</TableHead>
                                        <TableHead>Schedule</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tests.map(test => (
                                        <TableRow key={test.id}>
                                            <TableCell>
                                                <div className="font-medium">{test.title}</div>
                                                <div className="text-sm text-muted-foreground">{test.subject}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-sm">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Users size={14} className="text-primary/70" />
                                                        {test.year} - {test.branch}
                                                    </div>
                                                    <span className="font-medium pl-5">Section {test.section}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-sm">
                                                    <div className="font-medium">
                                                        {format(new Date(test.date), 'MMM d, yyyy')}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Clock size={14} className="text-primary/70" />
                                                        {test.startTime} - {test.endTime}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2 flex-nowrap">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleReleaseResults(test.id)}
                                                        title="Make results visible to students"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Release Results
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewQuestions(test.id, test.title)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Questions
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => setTestPendingDelete(test)}
                                                        disabled={deletingTestId === test.id}
                                                        title="Delete this test"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Auto-Generated Questions</DialogTitle>
                        <DialogDescription>
                            A preview of the questions Gemini mapped to this specific test.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground animate-pulse">Loading questions...</div>
                        ) : testQuestions.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No questions were found for this test.</div>
                        ) : (
                            testQuestions.map((q, index) => (
                                <div key={q.id} className="p-4 rounded-lg bg-secondary/10 border border-border">
                                    <h4 className="font-medium text-foreground tracking-tight leading-relaxed mb-4">
                                        <span className="text-primary font-bold mr-2">{index + 1}.</span>
                                        {q.question}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div className={`p-2 rounded ${q.correct_answer === q.option_a ? 'bg-green-500/10 border border-green-500/30 font-medium' : 'bg-background'}`}>A. {q.option_a}</div>
                                        <div className={`p-2 rounded ${q.correct_answer === q.option_b ? 'bg-green-500/10 border border-green-500/30 font-medium' : 'bg-background'}`}>B. {q.option_b}</div>
                                        <div className={`p-2 rounded ${q.correct_answer === q.option_c ? 'bg-green-500/10 border border-green-500/30 font-medium' : 'bg-background'}`}>C. {q.option_c}</div>
                                        <div className={`p-2 rounded ${q.correct_answer === q.option_d ? 'bg-green-500/10 border border-green-500/30 font-medium' : 'bg-background'}`}>D. {q.option_d}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!testPendingDelete} onOpenChange={(open) => !open && setTestPendingDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Test?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {testPendingDelete
                                ? `Delete "${testPendingDelete.title}"? This will remove the test from the teacher view and from student dashboards as well.`
                                : "This will remove the selected test."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!deletingTestId}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                if (testPendingDelete) {
                                    void handleDeleteTest(testPendingDelete.id, testPendingDelete.title).then(() => {
                                        setTestPendingDelete(null);
                                    });
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deletingTestId ? 'Deleting...' : 'Delete Test'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
