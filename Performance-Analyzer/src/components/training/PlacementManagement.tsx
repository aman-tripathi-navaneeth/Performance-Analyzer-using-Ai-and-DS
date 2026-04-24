
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Edit, Trash, BriefcaseBusiness, Send, Filter, Award } from 'lucide-react';
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from '../../config';

// Mock data for jobs
const initialJobs = [
  {
    id: '1',
    companyName: 'TechCorp',
    package: '10 LPA',
    minPercentage: 75,
    certificationRequired: true,
    certificationName: 'AWS Developer',
    jobUrl: 'https://example.com/techjob',
    lastDate: new Date('2025-05-15')
  },
  {
    id: '2',
    companyName: 'InnovateSoft',
    package: '8 LPA',
    minPercentage: 70,
    certificationRequired: false,
    certificationName: '',
    jobUrl: 'https://example.com/innosoft',
    lastDate: new Date('2025-05-20')
  },
  {
    id: '3',
    companyName: 'CloudSystems',
    package: '12 LPA',
    minPercentage: 80,
    certificationRequired: true,
    certificationName: 'Azure Fundamentals',
    jobUrl: 'https://example.com/cloudsys',
    lastDate: new Date('2025-04-30')
  }
];

// Mock data for applications
const initialApplications = [
  {
    id: '1',
    rollNumber: '216K1A0501',
    name: 'Rahul Kumar',
    email: 'rahul.k@student.ideal.edu',
    branch: 'CSE',
    company: 'TechCorp',
    applyDate: new Date('2025-03-20'),
    status: 'Applied'
  },
  {
    id: '2',
    rollNumber: '216K1A0502',
    name: 'Priya Sharma',
    email: 'priya.s@student.ideal.edu',
    branch: 'CSE',
    company: 'TechCorp',
    applyDate: new Date('2025-03-21'),
    status: 'Shortlisted'
  },
  {
    id: '3',
    rollNumber: '226K1A0503',
    name: 'Aditya Singh',
    email: 'aditya.s@student.ideal.edu',
    branch: 'CS',
    company: 'InnovateSoft',
    applyDate: new Date('2025-03-19'),
    status: 'Rejected'
  },
  {
    id: '4',
    rollNumber: '236K1A0504',
    name: 'Neha Patel',
    email: 'neha.p@student.ideal.edu',
    branch: 'CSE',
    company: 'CloudSystems',
    applyDate: new Date('2025-03-22'),
    status: 'Pending'
  }
];

type JobFormData = {
  id?: string;
  title: string;
  company: string;
  description: string;
  year: string;
  branch: string;
  section: string;
  min_score?: number;
  jobLink?: string;
}

const PlacementManagement = () => {
  const [activeTab, setActiveTab] = useState("jobs");
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Fetch jobs from backend
  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const [applications, setApplications] = useState(initialApplications);
  const [showJobForm, setShowJobForm] = useState(false);
  const [applicationFilter, setApplicationFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // Job form state
  const [jobFormData, setJobFormData] = useState<JobFormData>({
    title: '',
    company: '',
    description: '',
    year: '',
    branch: '',
    section: '',
    min_score: 0,
    jobLink: ''
  });

  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [selectedCompanyForNotification, setSelectedCompanyForNotification] = useState('');


  // Extract unique company names and branches for filters
  const uniqueCompanies = [...new Set(applications.map(app => app.company))];
  const uniqueBranches = [...new Set(applications.map(app => app.branch))];

  // Helper to determine student year from roll number
  const getStudentYear = (rollNumber: string) => {
    if (rollNumber.startsWith('216K1A05')) return '4th';
    if (rollNumber.startsWith('226K1A05')) return '3rd';
    if (rollNumber.startsWith('236K1A05')) return '2nd';
    if (rollNumber.startsWith('246K1A05')) return '1st';
    return 'Unknown';
  };

  // Handle job form input changes
  const handleJobFormChange = (field: keyof JobFormData, value: any) => {
    setJobFormData({
      ...jobFormData,
      [field]: value
    });
  };

  // Add or update job
  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get TPO username from local storage
    let posted_by = "TPO";
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.username) posted_by = user.username;
    } catch (e) { }

    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobFormData.title,
          company: jobFormData.company,
          description: jobFormData.description,
          year: jobFormData.year,
          branch: jobFormData.branch,
          section: jobFormData.section,
          posted_by: posted_by,
          min_score: jobFormData.min_score ? Number(jobFormData.min_score) : null,
          jobLink: jobFormData.jobLink || ''
        })
      });

      if (!response.ok) {
        toast.error("Failed to post job.");
        return;
      }

      toast.success("New job posted successfully");
      fetchJobs(); // Refresh jobs from server

      // Reset form
      setShowJobForm(false);
      setEditJobId(null);
      setJobFormData({
        title: '',
        company: '',
        description: '',
        year: '',
        branch: '',
        section: '',
        min_score: 0,
        jobLink: ''
      });
    } catch (error) {
      toast.error("Server connection error.");
    }
  };

  // Edit job
  const handleEditJob = (id: string) => {
    const jobToEdit = jobs.find(job => job.id === id);
    if (jobToEdit) {
      setJobFormData(jobToEdit);
      setEditJobId(id);
      setShowJobForm(true);
    }
  };

  // Delete job
  const handleDeleteJob = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, { method: 'DELETE' });
      if (response.ok) {
         setJobs(prev => prev.filter(job => job.id !== id));
         toast.success("Job deleted successfully");
         // Re-fetch to ensure storage and UI are fully in sync
         fetchJobs();
      } else {
         toast.error("Failed to delete job");
      }
    } catch(e) {
      toast.error("Network error while deleting job");
    }
  };

  // Send notifications to students
  const handleSendNotifications = () => {
    if (!selectedCompanyForNotification) {
      toast.error("Please select a company");
      return;
    }

    toast.success(`Notifications sent to students about ${selectedCompanyForNotification} job opportunity`);
    setSelectedCompanyForNotification('');
  };

  // Update application status
  const handleUpdateStatus = (id: string, newStatus: string) => {
    setApplications(applications.map(app =>
      app.id === id ? { ...app, status: newStatus } : app
    ));
    toast.success("Application status updated");
  };

  // Filter applications based on multiple criteria
  const filteredApplications = applications.filter(app => {
    const matchesStatus = applicationFilter === "all" || app.status.toLowerCase() === applicationFilter.toLowerCase();
    const matchesBranch = branchFilter === "all" || app.branch === branchFilter;
    const matchesCompany = companyFilter === "all" || app.company === companyFilter;
    const studentYear = getStudentYear(app.rollNumber);
    const matchesYear = yearFilter === "all" || studentYear === yearFilter;

    return matchesStatus && matchesBranch && matchesCompany && matchesYear;
  });



  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-start items-center gap-2 mb-4">
        <BriefcaseBusiness className="w-6 h-6 text-primary" />
        <span className="text-xl font-bold">Job Postings</span>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditJobId(null);
            setJobFormData({
              title: '',
              company: '',
              description: '',
              year: '',
              branch: '',
              section: '',
              jobLink: ''
            });
            setShowJobForm(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusCircle size={16} />
          Post New Job
        </Button>
      </div>

      {showJobForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editJobId ? "Edit Job" : "Post New Job"}</CardTitle>
            <CardDescription>
              Enter the details of the job opportunity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitJob} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="company"
                    value={jobFormData.company}
                    onChange={(e) => handleJobFormChange('company', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={jobFormData.title}
                    onChange={(e) => handleJobFormChange('title', e.target.value)}
                    required
                    placeholder="e.g., Software Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Target Year</Label>
                  <select
                    id="year"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={jobFormData.year}
                    onChange={(e) => handleJobFormChange('year', e.target.value)}
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="All">All Years</option>
                    <option value="First Year">First Year</option>
                    <option value="Second Year">Second Year</option>
                    <option value="Third Year">Third Year</option>
                    <option value="Fourth Year">Fourth Year</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Target Branch</Label>
                  <Input
                    id="branch"
                    value={jobFormData.branch}
                    onChange={(e) => handleJobFormChange('branch', e.target.value)}
                    placeholder="e.g., CSE or All"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Target Section</Label>
                  <Input
                    id="section"
                    value={jobFormData.section}
                    onChange={(e) => handleJobFormChange('section', e.target.value)}
                    placeholder="e.g., A or All"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_score">Minimum Score Criterion (Optional)</Label>
                  <Input
                    id="min_score"
                    type="number"
                    value={jobFormData.min_score || ''}
                    onChange={(e) => handleJobFormChange('min_score', e.target.value)}
                    placeholder="e.g., 60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={jobFormData.description}
                  onChange={(e) => handleJobFormChange('description', e.target.value)}
                  required
                  placeholder="Describe the role, requirements, and package..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobLink">Job Link (Apply URL)</Label>
                <Input
                  id="jobLink"
                  type="url"
                  value={jobFormData.jobLink || ''}
                  onChange={(e) => handleJobFormChange('jobLink', e.target.value)}
                  placeholder="https://careers.example.com/apply"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowJobForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editJobId ? "Update Job" : "Post Job"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Target Class</TableHead>
            <TableHead>Posted Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">{job.company}</TableCell>
              <TableCell>{job.title}</TableCell>
              <TableCell>{job.year || 'All'}</TableCell>
              <TableCell>{
                new Date(job.posted_at || Date.now()).toLocaleDateString()
              }</TableCell>
              <TableCell className="text-right flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditJob(job.id)}
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteJob(job.id)}
                >
                  <Trash size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>


    </div >
  );
};

export default PlacementManagement;
