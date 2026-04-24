import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit, Trash, Filter, Search, ShieldCheck } from 'lucide-react';
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import UserManagementForm from '../training/UserManagementForm';
import { API_BASE_URL } from '../../config';
import { getCollection, insertItem, deleteItem, updateItem } from '../../lib/storage';

const FacultyManagement = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Dialog State
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

  // Explicitly requested load function ensuring single source of truth from storage
  const loadFacultyOnRefresh = () => {
    console.log("Loading faculty on refresh from storage...");
    const storedFaculty = getCollection<any>('db_teachers');
    
    // Fallback/Initialization if completely empty
    if (storedFaculty.length === 0) {
        console.log("Storage empty, initializing with default data");
        const defaultFaculty = { id: 'FL-001', name: 'John Doe', branch: 'CSE', username: 'jdoe', password: 'password123', role: 'faculty' };
        insertItem('db_teachers', defaultFaculty);
        setFaculty([defaultFaculty]);
    } else {
        console.log("Data loaded from storage:", storedFaculty);
        setFaculty(storedFaculty);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subjects`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  useEffect(() => {
    loadFacultyOnRefresh();
    fetchSubjects();
  }, []);

  const filteredFaculty = faculty.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addFaculty = (newFaculty: any) => {
    try {
      console.log("Before Save:", getCollection('db_teachers'));
      
      const facultyObj = {
          name: newFaculty.name,
          username: newFaculty.username,
          password: newFaculty.password || 'password123',
          role: 'faculty',
          subject: newFaculty.subject,
          id: Date.now().toString()
      };

      // Ensure storage immediately updates
      insertItem('db_teachers', facultyObj);
      
      // Update local state directly so UI is synced with storage
      setFaculty(getCollection('db_teachers'));
      
      console.log("After Save:", getCollection('db_teachers'));

      setShowForm(false);
      toast.success(`Faculty ${newFaculty.name} added successfully`);
    } catch (error: any) {
      toast.error('Error saving data to local storage');
    }
  };

  const handleEdit = (id: string) => {
    const facultyToEdit = faculty.find(f => f.id === id);
    if (facultyToEdit) {
      setEditItem(facultyToEdit);
      setIsEditMode(true);
      setShowForm(true);
    }
  };

  const handleUpdate = (updatedFaculty: any) => {
    try {
      updateItem('db_teachers', { id: updatedFaculty.id }, updatedFaculty);
      setFaculty(getCollection('db_teachers')); // Read strictly from source
      setShowForm(false);
      setEditItem(null);
      setIsEditMode(false);
      toast.success(`Faculty ${updatedFaculty.name} updated successfully`);
    } catch (e) { 
      toast.error("Storage error"); 
    }
  };

  const deleteFaculty = (id: string) => {
    const facultyMember = faculty.find(f => f.id === id);
    setDeleteDialog({
      open: true,
      title: "Remove Faculty Member?",
      description: `Are you sure you want to remove ${facultyMember?.name || 'this faculty member'}? This will revoke their access to the platform immediately.`,
      action: async () => {
        try {
          // Immediately delete from source
          deleteItem('db_teachers', { id });
          
          // Refresh state from primary source of truth
          setFaculty(getCollection('db_teachers'));
          toast.success("Faculty removed successfully");
        } catch (e) { 
          toast.error("Storage cleanup failed"); 
        }
      }
    });
  };

  const handleBulkCleanup = () => {
    setDeleteDialog({
      open: true,
      title: "CRITICAL ACTION: Purge All Faculty?",
      description: "This will PERMANENTLY delete ALL faculty and TPO records from the system. This action is irreversible.",
      action: async () => {
        try {
          // Clear standard collection, leaving it completely empty
          import('../../lib/storage').then(({ deleteCookie }) => deleteCookie('db_teachers'));
          setFaculty([]);
          toast.success("All faculty records purged successfully.");
        } catch (e) {
          toast.error("Storage error during bulk cleanup.");
        }
      }
    });
  };

  const handleToggleTPO = (facultyMember: any) => {
    const newRole = facultyMember.role === 'tpo' ? 'faculty' : 'tpo';
    try {
      updateItem('db_teachers', { id: facultyMember.id }, { ...facultyMember, role: newRole });
      setFaculty(getCollection('db_teachers'));
      toast.success(`${facultyMember.name} is now ${newRole === 'tpo' ? 'a TPO' : 'Regular Faculty'}`);
    } catch (e) {
      toast.error("Role update failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-secondary/10 backdrop-blur-md rounded-xl border border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
          <Input
            placeholder="Search Faculty by Name, Username or Subject..."
            className="pl-10 h-11 bg-background/50 border-primary/20 focus:ring-primary/30 focus:border-primary/40 rounded-lg shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 h-11 border-primary/20 hover:bg-primary/5 transition-all"
            onClick={() => loadFacultyOnRefresh()}
          >
            Refresh
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all font-semibold"
            onClick={handleBulkCleanup}
          >
            <Trash size={18} />
            Bulk Cleanup
          </Button>
          <Button
            onClick={() => {
              setIsEditMode(false);
              setEditItem(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 h-11 shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all font-semibold"
          >
            <PlusCircle size={20} />
            Add Faculty Member
          </Button>
        </div>
      </div>

      {showForm && (
        <UserManagementForm
          userType="faculty"
          onSubmit={isEditMode ? handleUpdate : addFaculty}
          onCancel={() => {
            setShowForm(false);
            setEditItem(null);
            setIsEditMode(false);
          }}
          editData={editItem}
          isEditMode={isEditMode}
          subjects={subjects}
        />
      )}

      <div className="bg-secondary/5 backdrop-blur-sm rounded-lg p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Assigned Subject</TableHead>
              <TableHead>TPO Access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFaculty.map((f) => (
              <TableRow key={f.id} className={f.role === 'tpo' ? "bg-primary/5" : ""}>
                <TableCell className="font-medium">{f.username}</TableCell>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.subject}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={f.role === 'tpo'} 
                      onCheckedChange={() => handleToggleTPO(f)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className={`text-[10px] font-bold uppercase ${f.role === 'tpo' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {f.role === 'tpo' ? 'Authorized' : 'Disabled'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(f.id)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFaculty(f.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Premium Confirm Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog(prev => ({...prev, open: o}))}>
          <AlertDialogContent className="border-red-500/20 bg-background/95 backdrop-blur-md">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                       <Trash className="h-5 w-5" /> {deleteDialog.title}
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

export default FacultyManagement;
