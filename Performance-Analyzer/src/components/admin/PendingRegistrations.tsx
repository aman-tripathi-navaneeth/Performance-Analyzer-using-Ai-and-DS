import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_BASE_URL } from '../../config';
import { Check, X, Clock, UserSquare2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface PendingStudent {
    rollNumber: string;
    name: string;
    year: string;
    branch: string;
    section: string;
    status: string;
}

export const PendingRegistrations = () => {
    const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPendingStudents = async () => {
        setIsLoading(true);
        try {
            const students = await import('../../lib/storage').then(mod => mod.getCollection<any>('db_students'));
            setPendingStudents(students.filter((s: any) => s.status === 'pending'));
            setSelectedStudents([]); // Reset selection on fetch
        } catch (error) {
            console.error("Failed to fetch pending students:", error);
            toast.error("Could not load pending registrations");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingStudents();
    }, []);

    const toggleSelection = (rollNumber: string) => {
        setSelectedStudents(prev => 
            prev.includes(rollNumber) 
                ? prev.filter(r => r !== rollNumber)
                : [...prev, rollNumber]
        );
    };

    const toggleAll = () => {
        if (selectedStudents.length === pendingStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(pendingStudents.map(s => s.rollNumber));
        }
    };

    const handleBulkAction = async (action: 'approve' | 'reject') => {
        if (selectedStudents.length === 0) return;

        try {
            const { getCollection, saveCollection } = await import('../../lib/storage');
            const students = getCollection<any>('db_students');
            
            const updatedStudents = students.map((s: any) => {
                if (selectedStudents.includes(s.rollNumber)) {
                    return { ...s, status: action === 'approve' ? 'approved' : 'rejected' };
                }
                return s;
            });
            
            // If rejected, actively remove them from database
            const finalStudents = action === 'reject' ? updatedStudents.filter((s: any) => s.status !== 'rejected') : updatedStudents;
            saveCollection('db_students', finalStudents);

            toast.success(`Successfully ${action}d ${selectedStudents.length} students`);
            fetchPendingStudents();
        } catch (error) {
            console.error(`Error during bulk ${action}:`, error);
            toast.error(`Local storage error during bulk ${action}`);
        }
    };

    return (
        <Card className="shadow-lg border-primary/20 backdrop-blur-sm bg-background/50 animate-fade-in">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2 text-primary">
                        <UserSquare2 size={24} />
                        Pending Student Registrations
                    </CardTitle>
                    <CardDescription>
                        Review and approve students who have requested platform access.
                    </CardDescription>
                </div>
                
                {selectedStudents.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 sm:mt-0 animate-in fade-in zoom-in duration-300">
                        <Badge variant="secondary" className="px-3 py-1">
                            {selectedStudents.length} Selected
                        </Badge>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve Selected
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Approve Students</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to approve {selectedStudents.length} students? They will be granted access to the platform immediately.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleBulkAction('approve')} className="bg-green-600 hover:bg-green-700">
                                        Approve
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="shadow-lg shadow-destructive/20">
                                    <X className="mr-2 h-4 w-4" />
                                    Reject Selected
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Registrations</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to reject and delete {selectedStudents.length} pending registrations? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleBulkAction('reject')} className="bg-destructive text-destructive-foreground">
                                        Reject & Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-secondary/30">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox 
                                        checked={pendingStudents.length > 0 && selectedStudents.length === pendingStudents.length}
                                        onCheckedChange={toggleAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>Roll Number / Name</TableHead>
                                <TableHead>Expected Class</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <div className="flex items-center justify-center text-muted-foreground">
                                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
                                            Loading registrations...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : pendingStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                                        <UserSquare2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        No pending student registrations found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pendingStudents.map((student) => (
                                    <TableRow 
                                        key={student.rollNumber}
                                        className={selectedStudents.includes(student.rollNumber) ? "bg-primary/5" : ""}
                                    >
                                        <TableCell>
                                            <Checkbox 
                                                checked={selectedStudents.includes(student.rollNumber)}
                                                onCheckedChange={() => toggleSelection(student.rollNumber)}
                                                aria-label={`Select student ${student.name}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-foreground">{student.rollNumber}</div>
                                            <div className="text-sm text-muted-foreground">{student.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Badge variant="outline">{student.year}</Badge>
                                                <Badge variant="outline">{student.branch}</Badge>
                                                <Badge variant="outline">{student.section}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Pending Review
                                            </Badge>
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
