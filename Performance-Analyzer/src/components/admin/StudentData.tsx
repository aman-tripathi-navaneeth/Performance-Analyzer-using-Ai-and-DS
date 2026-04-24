import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Filter, Edit, Trash2, Plus, UserPlus } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { yearOptions } from '../training/trainingTypes';
import { useBranches } from '../../hooks/useBranches';

const StudentData = () => {
  const { branchOptions } = useBranches();
  const [students, setStudents] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    roll: string;
    action: () => Promise<void>;
  }>({
    open: false,
    roll: "",
    action: async () => {}
  });
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const branchParam = branchFilter === 'all' ? 'all' : branchFilter;
      const yearParam = yearFilter === 'all' ? 'all' : yearFilter;
      const sectionParam = sectionFilter === 'all' ? 'all' : sectionFilter;
      
      const [studentRes, sectionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/students?branch=${branchParam}&year=${yearParam}&section=${sectionParam}`),
        fetch(`${API_BASE_URL}/api/sections`)
      ]);
      
      if (studentRes.ok) setStudents(await studentRes.json());
      if (sectionRes.ok) setSections(await sectionRes.json());
      
    } catch (err) {
      console.error("Failed to fetch data", err);
      toast.error("Failed to load student data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormRoll(student.rollNumber);
    setFormBranch(student.branch);
    setFormYear(student.year);
    setFormSection(student.section);
    setFormPassword('');
    setIsEditModalOpen(true);
  };

  const handleAddClick = () => {
    setFormName('');
    setFormRoll('');
    setFormBranch('CSE');
    setFormYear('First Year');
    setFormSection('A');
    setFormPassword('');
    setIsAddModalOpen(true);
  };

  const saveStudent = async (isNew: boolean) => {
    if (!formName || !formRoll || !formBranch || !formYear || !formSection) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isNew 
        ? `${API_BASE_URL}/api/admin/students` 
        : `${API_BASE_URL}/api/students/${editingStudent.rollNumber}`;
      
      const method = isNew ? 'POST' : 'PUT';
      
      const payload = {
        name: formName,
        rollNumber: formRoll,
        branch: formBranch,
        year: formYear,
        section: formSection,
        password: formPassword || (isNew ? '123456' : undefined)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(isNew ? "Student added successfully" : "Student updated successfully");
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Operation failed");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (roll: string) => {
    setDeleteDialog({
      open: true,
      roll: roll,
      action: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/students/${roll}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("Student deleted");
            fetchData();
          } else {
            toast.error("Failed to delete");
          }
        } catch (e) { toast.error("Network error"); }
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, [branchFilter, yearFilter, sectionFilter]);

  const clearFilters = () => {
    setYearFilter('all');
    setBranchFilter('all');
    setSectionFilter('all');
    setPerformanceFilter('all');
    setSearchQuery('');
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPerformance = performanceFilter === 'all' || student.performance === performanceFilter;
    
    return matchesSearch && matchesPerformance;
  });

  const handleDownloadReport = () => {
    window.location.href = `${API_BASE_URL}/api/performance/weekly-digest`; 
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Filter Bar */}
      <div className="flex flex-col gap-4 p-4 bg-secondary/10 backdrop-blur-md rounded-xl border border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
            <Input
              placeholder="Search by Name or Roll Number..."
              className="pl-10 h-10 bg-background/50 border-primary/20 focus:ring-primary/30 focus:border-primary/40 rounded-lg shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            <Button 
                variant="outline"
                onClick={handleAddClick} 
                className="flex items-center gap-2 h-10 border-primary/30 text-primary hover:bg-primary/10 px-4 font-semibold"
            >
                <UserPlus size={18} />
                Add Student
            </Button>
            <Button 
                variant="secondary"
                onClick={() => fetchData()} 
                className="flex items-center gap-2 h-10 bg-secondary/30"
                title="Refresh Table"
            >
                Refresh
            </Button>
            <Button 
                onClick={handleDownloadReport} 
                className="flex items-center gap-2 h-10 shadow-lg shadow-primary/20 dark:shadow-none hover:translate-y-[-1px] transition-transform active:translate-y-0"
            >
                <Download size={18} />
                Export Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-primary/5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Academic Year</Label>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-9 bg-background/40 border-primary/10 hover:border-primary/30 transition-colors">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="1st Year">1st Year</SelectItem>
                <SelectItem value="2nd Year">2nd Year</SelectItem>
                <SelectItem value="3rd Year">3rd Year</SelectItem>
                <SelectItem value="4th Year">4th Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Branch</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 bg-background/40 border-primary/10 hover:border-primary/30">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="EEE">EEE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Section</Label>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="h-9 bg-background/40 border-primary/10 hover:border-primary/30">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Category</Label>
            <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
              <SelectTrigger className="h-9 bg-background/40 border-primary/10 hover:border-primary/30">
                <SelectValue placeholder="Performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Average">Average</SelectItem>
                <SelectItem value="Below Average">Below Average</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            {(yearFilter !== 'all' || branchFilter !== 'all' || sectionFilter !== 'all' || performanceFilter !== 'all' || searchQuery !== '') && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary hover:text-primary/70 h-9 px-3 font-medium transition-all hover:bg-transparent">
                  <Filter className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-secondary/5 backdrop-blur-sm rounded-lg p-4 overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
             <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
             <p className="text-muted-foreground animate-pulse">Loading student database...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-xs">{student.rollNumber}</TableCell>
                    <TableCell className="font-medium text-sm">{student.name}</TableCell>
                    <TableCell className="text-sm">{student.year}</TableCell>
                    <TableCell className="text-sm">{student.branch}</TableCell>
                    <TableCell className="text-sm">{student.section}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        student.performance === 'Excellent' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                        student.performance === 'Good' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        student.performance === 'Average' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        student.performance === 'Below Average' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {student.performance}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEditClick(student)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(student.rollNumber)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                     <div className="space-y-2">
                        <p className="text-lg font-medium">No Students Found</p>
                        <p className="text-muted-foreground max-w-xs mx-auto text-sm">Use the Bulk Import tab to upload your student list or check your filters.</p>
                     </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Student Dialog */}
      <Dialog open={isEditModalOpen || isAddModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditModalOpen(false);
          setIsAddModalOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[425px] bg-card border-primary/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAddModalOpen ? <UserPlus className="text-primary" size={20} /> : <Edit className="text-primary" size={20} />}
              {isAddModalOpen ? "Register New Student" : "Update Student Profile"}
            </DialogTitle>
            <DialogDescription>
              {isAddModalOpen ? "Fill in the details to create a new student account." : `Modifying details for Roll No: ${editingStudent?.rollNumber}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roll" className="text-right">Roll No</Label>
              <Input id="roll" value={formRoll} disabled={!isAddModalOpen} onChange={(e) => setFormRoll(e.target.value)} className="col-span-3 font-mono" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Year</Label>
              <Select value={formYear} onValueChange={setFormYear}>
                 <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                 <SelectContent>
                    {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                 </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Branch</Label>
              <Select value={formBranch} onValueChange={setFormBranch}>
                 <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                 <SelectContent>
                    {branchOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                 </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="section" className="text-right">Section</Label>
              <Input id="section" value={formSection} onChange={(e) => setFormSection(e.target.value.toUpperCase())} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pass" className="text-right">Password</Label>
              <Input id="pass" type="password" placeholder={isAddModalOpen ? "Default: 123456" : "Leave blank to keep current"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="col-span-3" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={() => saveStudent(isAddModalOpen)}>
              {isSubmitting ? "Processing..." : (isAddModalOpen ? "Add Student" : "Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Confirm Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog(prev => ({...prev, open: o}))}>
          <AlertDialogContent className="border-red-500/20 bg-background/95 backdrop-blur-md">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                       <Trash2 className="h-5 w-5" /> Delete Student Record?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-muted-foreground pt-2">
                      Are you sure you want to delete student <span className="font-mono font-bold text-foreground">{deleteDialog.roll}</span> and all their academic history? This action is irreversible.
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

export default StudentData;
