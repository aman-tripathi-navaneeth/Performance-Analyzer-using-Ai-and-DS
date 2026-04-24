
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, PlusCircle, LayoutGrid, Calendar, Users, Search, Edit3 } from 'lucide-react';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { API_BASE_URL } from '../../config';
import { useBranches } from '../../hooks/useBranches';
import { Briefcase } from 'lucide-react';

const ManageSections = () => {
    const { branches, refetch: refetchBranches, branchOptions } = useBranches();
    const [sections, setSections] = useState<any[]>([]);
    const [newBranchShort, setNewBranchShort] = useState("");
    const [newBranchFull, setNewBranchFull] = useState("");
    const [students, setStudents] = useState<any[]>([]);
    const [newSection, setNewSection] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    
    // Edit Student State
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [editData, setEditData] = useState<any>({ name: '', branch: '', year: '', section: '', password: '' });

    // Delete Confirmation State
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => Promise<void>;
    }>({
        open: false,
        title: "",
        description: "",
        action: async () => {}
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [secRes, stuRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/sections`),
                fetch(`${API_BASE_URL}/api/students`)
            ]);
            
            if (secRes.ok) {
                const data = await secRes.json();
                setSections(Array.isArray(data) ? data : []);
            }
            if (stuRes.ok) {
                const data = await stuRes.json();
                setStudents(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to fetch management data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddSection = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/sections/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSection.trim().toUpperCase(),
                    branch: "ALL",
                    year: "ALL"
                }),
            });

            if (response.ok) {
                toast.success(`Section ${newSection} added.`);
                setNewSection("");
                fetchData();
            }
        } catch (err) {
            toast.error("Error adding section");
        }
    };

    const handleDeleteSection = async (sectionName: string) => {
        setDeleteDialog({
            open: true,
            title: "Are you absolutely sure?",
            description: `This will PERMANENTLY delete all students and academic data in section ${sectionName}. This action cannot be undone.`,
            action: async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/sections/${sectionName}`, { method: 'DELETE' });
                    if (response.ok) {
                        toast.success(`Section ${sectionName} deleted.`);
                        fetchData();
                    }
                } catch (err) {
                    toast.error("Delete failed");
                }
            }
        });
    };

    const handleDeleteYear = async (yearName: string) => {
        setDeleteDialog({
            open: true,
            title: "CRITICAL ACTION: Delete Entire Year?",
            description: `You are about to delete the ENTIRE ${yearName}. This will purge ALL students, marks, and records for this academic year from the database. This is a destructive operation.`,
            action: async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/years/${yearName}`, { method: 'DELETE' });
                    if (response.ok) {
                        toast.success(`All records for ${yearName} deleted.`);
                        fetchData();
                    }
                } catch (err) {
                    toast.error("Delete failed");
                }
            }
        });
    };

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/api/branches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBranchShort.toUpperCase(), full_name: newBranchFull })
            });
            if (res.ok) {
                toast.success(`Branch ${newBranchShort.toUpperCase()} added.`);
                setNewBranchShort(""); setNewBranchFull("");
                refetchBranches();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Error adding branch");
            }
        } catch (err) {
            toast.error("Error adding branch");
        }
    };

    const handleDeleteBranch = async (branchId: number, branchName: string) => {
        setDeleteDialog({
            open: true,
            title: "Delete Branch?",
            description: `This will permanently delete the ${branchName} branch (only works if no students are assigned).`,
            action: async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, { method: 'DELETE' });
                    if (response.ok) {
                        toast.success(`Branch ${branchName} deleted.`);
                        refetchBranches();
                    } else {
                        const err = await response.json();
                        toast.error(err.detail || "Cannot delete branch");
                    }
                } catch (err) {
                    toast.error("Delete failed");
                }
            }
        });
    };

    const handleEditStudent = (student: any) => {
        setEditingStudent(student);
        setEditData({
            name: student.name,
            branch: student.branch,
            year: student.year,
            section: student.section,
            password: '' // Optional password reset
        });
    };

    const handleUpdateStudent = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/students/${editingStudent.rollNumber}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });
            if (response.ok) {
                toast.success("Student details updated.");
                setEditingStudent(null);
                fetchData();
            }
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const handleDeleteStudent = async (roll: string) => {
        setDeleteDialog({
            open: true,
            title: "Delete Student Record?",
            description: `You are about to delete student ${roll} and all their associated academic history. This cannot be reversed.`,
            action: async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/students/${roll}`, { method: 'DELETE' });
                    if (response.ok) {
                        toast.success("Student record purged.");
                        fetchData();
                    }
                } catch (err) {
                    toast.error("Delete failed");
                }
            }
        });
    };

    const filteredStudents = students.filter(s => 
        (s?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s?.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

    // Manual Student Registration State
    const [manualStudent, setManualStudent] = useState({
        name: '',
        rollNumber: '',
        branch: 'CSE',
        year: '1st Year',
        section: '',
        password: '123' // Platform default
    });
    const [isRegistering, setIsRegistering] = useState(false);

    const handleRegisterStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualStudent.name || !manualStudent.rollNumber || !manualStudent.section) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsRegistering(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...manualStudent,
                    section: manualStudent.section.toUpperCase()
                }),
            });

            if (response.ok) {
                toast.success(`Student ${manualStudent.rollNumber} registered successfully.`);
                setManualStudent({ name: '', rollNumber: '', branch: 'CSE', year: '1st Year', section: '', password: '123' });
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.detail || "Registration failed");
            }
        } catch (err) {
            toast.error("Network error during registration");
        } finally {
            setIsRegistering(false);
        }
    };

    return (

        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* 1. Academic Year Management */}
            <Card className="border-red-200 dark:border-red-900/30">
                <CardHeader className="bg-red-500/5">
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <Calendar size={20} /> Academic Year Cleanup
                    </CardTitle>
                    <CardDescription>Safe delete entire academic years. Warning: This action is irreversible.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {years.map(year => (
                            <div key={year} className="p-4 rounded-xl border bg-secondary/10 flex items-center justify-between">
                                <span className="font-bold">{year}</span>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => handleDeleteYear(year)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Manual Student Registration */}
            <Card className="border-primary/20 shadow-sm bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Users size={20} /> Add Student Manually
                    </CardTitle>
                    <CardDescription>Enter student details directly into the system database.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegisterStudent} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input placeholder="John Doe" value={manualStudent.name} onChange={e => setManualStudent({...manualStudent, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Roll Number</Label>
                            <Input placeholder="21XX1A0501" value={manualStudent.rollNumber} onChange={e => setManualStudent({...manualStudent, rollNumber: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Section</Label>
                            <Input placeholder="A" maxLength={3} value={manualStudent.section} onChange={e => setManualStudent({...manualStudent, section: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Branch</Label>
                            <Select value={manualStudent.branch} onValueChange={v => setManualStudent({...manualStudent, branch: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {branchOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Year</Label>
                            <Select value={manualStudent.year} onValueChange={v => setManualStudent({...manualStudent, year: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={isRegistering}>
                            {isRegistering ? "Adding..." : "Add Student"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* 3. Branch Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase size={20} className="text-primary" /> Branches
                    </CardTitle>
                    <CardDescription>Add new academic branches or remove existing ones (if empty).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleAddBranch} className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <Label>Branch Code</Label>
                            <Input value={newBranchShort} onChange={e => setNewBranchShort(e.target.value.toUpperCase())} placeholder="e.g. CSE" maxLength={10} required />
                        </div>
                        <div className="space-y-2 flex-[2]">
                            <Label>Full Name</Label>
                            <Input value={newBranchFull} onChange={e => setNewBranchFull(e.target.value)} placeholder="e.g. Computer Science and Engineering" required />
                        </div>
                        <Button type="submit" disabled={!newBranchShort.trim()} className="w-full sm:w-auto"><PlusCircle size={16} className="mr-2" /> Add</Button>
                    </form>

                    <div className="flex flex-wrap gap-3">
                        {branches.map(br => (
                            <div key={br.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                <span className="font-bold text-sm tracking-tight" title={br.full_name}>{br.name}</span>
                                <button className="text-red-500 hover:text-red-700 ml-1" onClick={() => handleDeleteBranch(br.id, br.name)}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 4. Section Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LayoutGrid size={20} className="text-primary" /> Class Sections
                    </CardTitle>
                    <CardDescription>Add new sections or purge existing ones (auto-updates from bulk uploads).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleAddSection} className="flex gap-4 items-end max-w-sm">
                        <div className="space-y-2 flex-1">
                            <Label>New Section</Label>
                            <Input value={newSection} onChange={e => setNewSection(e.target.value.toUpperCase())} placeholder="e.g. E" maxLength={3} />
                        </div>
                        <Button type="submit" disabled={!newSection.trim()}><PlusCircle size={16} className="mr-2" /> Add</Button>
                    </form>

                    <div className="flex flex-wrap gap-3">
                        {sections.map(sec => (
                            <div key={sec.id || sec.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                <span className="font-bold text-sm tracking-tight">{sec.name}</span>
                                <button className="text-red-500 hover:text-red-700 ml-1" onClick={() => handleDeleteSection(sec.name)}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 3. Student Entity Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users size={20} className="text-primary" /> Individual Student Management
                    </CardTitle>
                    <div className="relative max-w-md mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search name or roll number..." className="pl-8 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-secondary/50">
                                <TableRow>
                                    <TableHead>Roll Number</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Year</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.slice(0, 50).map((student) => (
                                        <TableRow key={student.rollNumber} className="hover:bg-secondary/20">
                                            <TableCell className="font-mono font-bold">{student.rollNumber}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>{student.branch}</TableCell>
                                            <TableCell>{student.year}</TableCell>
                                            <TableCell>
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{student.section}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditStudent(student)}>
                                                        <Edit3 size={14} />
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50" onClick={() => handleDeleteStudent(student.rollNumber)}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No students found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Student Dialog */}
            <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold">
                            <Edit3 className="h-5 w-5 text-primary" /> Edit Student Details
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <Input value={editData.section} onChange={e => setEditData({...editData, section: e.target.value.toUpperCase()})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Select value={editData.branch} onValueChange={v => setEditData({...editData, branch: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {branchOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Select value={editData.year} onValueChange={v => setEditData({...editData, year: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>New Password (Optional)</Label>
                            <Input 
                                type="password" 
                                placeholder="Leave empty to keep current" 
                                value={editData.password} 
                                onChange={e => setEditData({...editData, password: e.target.value})} 
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-6">
                        <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
                        <Button onClick={handleUpdateStudent}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Premium Confirm Dialog */}
            <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog(prev => ({...prev, open: o}))}>
                <AlertDialogContent className="border-red-500/20 bg-background/95 backdrop-blur-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                             <Trash2 className="h-5 w-5" /> {deleteDialog.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-muted-foreground pt-2">
                            {deleteDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="bg-secondary/50 hover:bg-secondary">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6"
                            onClick={async () => {
                                await deleteDialog.action();
                                setDeleteDialog(prev => ({...prev, open: false}));
                            }}
                        >
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ManageSections;
