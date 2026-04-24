import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Award, Briefcase, ExternalLink, UserCircle, Camera, Activity, Target, ArrowLeft, LogOut } from 'lucide-react';
import { GoalTrackerView } from '../components/student/GoalTrackerView';
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudentTestView } from '../components/student/StudentTestView';
import { TestHistoryView } from '../components/student/TestHistoryView';
import { LeaderboardView } from '../components/student/LeaderboardView';
import { UpcomingTestBanner } from '../components/student/UpcomingTestBanner';
import { StudentAnnouncements } from '../components/student/StudentAnnouncements';
import { PredictiveScoreCard } from '../components/student/PredictiveScoreCard';
import { StudentInsightsDashboard } from '../components/student/StudentInsightsDashboard';
import { API_BASE_URL } from '../config';

const PlacementHub = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState('jobs');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [studentData, setStudentData] = useState({
    name: "Loading...",
    rollNumber: "",
    batch: "2021-2025",
    year: "",
    branch: "",
    section: "",
    email: ""
  });

  const [availableJobs, setAvailableJobs] = useState<any[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let roll = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'student') {
          roll = user.rollNumber || user.username;
          setUsername(user.username);
          setStudentData({
            name: user.name || user.username,
            rollNumber: roll,
            batch: "2021-2025",
            year: user.year || "N/A",
            branch: user.branch || "N/A",
            section: user.section || "N/A",
            email: `${roll}@student.ideal.edu`
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Fetch class specific jobs
    if (roll) {
      const fetchJobs = async () => {
        try {
          // Try student-specific filtered endpoint first
          const res = await fetch(`${API_BASE_URL}/api/student/${roll}/jobs`);
          if (res.ok) {
            const data = await res.json();
            if (data.length > 0) {
              setAvailableJobs(data);
              return;
            }
          }
          // Fallback: fetch all jobs (covers cases where student record isn't found)
          const fallbackRes = await fetch(`${API_BASE_URL}/api/jobs`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            setAvailableJobs(fallbackData);
          }
        } catch (e) {
          console.error("Failed to load jobs");
        }
      };
      fetchJobs();
    }
  }, []);



  const handleLogout = () => {
    localStorage.removeItem('user');
    setProfilePicture(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate upload
      toast.loading('Uploading profile picture...');

      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = () => {
          setProfilePicture(reader.result as string);
          toast.dismiss();
          toast.success('Profile picture updated successfully');
        };
        reader.readAsDataURL(file);
      }, 1000);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-space-gradient">
      <Navbar />

      <div className="pt-32 pb-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary mb-3">
            Student Dashboard
          </span>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 cosmic-text">
            Your Campus Placement Portal
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
            Manage your placement journey and professional development
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <StudentAnnouncements 
             year={studentData.year}
             branch={studentData.branch}
          />
          {studentData.rollNumber && (
            <UpcomingTestBanner 
              rollNumber={studentData.rollNumber} 
              year={studentData.year} 
              branch={studentData.branch} 
              section={studentData.section} 
            />
          )}

          <Card className="mb-8 overflow-hidden cosmic-card">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/4 bg-secondary/20 p-6 flex flex-col items-center justify-center border-r border-border/10">
                <div className="relative mb-4 group">
                  <Avatar className="w-28 h-28 border-2 border-primary/20">
                    <AvatarImage src={profilePicture || undefined} />
                    <AvatarFallback className="text-3xl bg-primary/10">
                      {studentData.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div 
                    className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-full 
                             flex items-center justify-center opacity-0 group-hover:opacity-100
                             transition-opacity duration-200 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="text-white" size={24} />
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                  />
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full bg-secondary/20 hover:bg-secondary/40"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={14} className="mr-2" />
                    Update Photo
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full flex items-center gap-2"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft size={14} />
                    Home
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} className="mr-2" />
                    Logout
                  </Button>
                </div>
              </div>

              <div className="md:w-3/4 p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <UserCircle size={24} className="text-primary" />
                  {studentData.name}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium font-mono">{studentData.rollNumber}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{studentData.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Academic Year</p>
                    <p className="font-medium">{studentData.year}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Branch & Section</p>
                    <p className="font-medium">{studentData.branch} - {studentData.section}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 w-full justify-start overflow-x-auto">
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Briefcase size={16} />
                Available Jobs
              </TabsTrigger>
              <TabsTrigger value="tests" className="flex items-center gap-2">
                <Award size={16} />
                Available Tests
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Activity size={16} />
                Performance Analytics
              </TabsTrigger>
              <TabsTrigger value="roadmap" className="flex items-center gap-2">
                <Target size={16} />
                Goals & Roadmaps
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableJobs.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-10 text-muted-foreground">
                    No jobs currently posted for your class (Year {studentData.year}).
                  </div>
                ) : (
                  availableJobs.map(job => (
                    <Card key={job.id} className="cosmic-card overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl mb-1">{job.title}</CardTitle>
                            <CardDescription>{job.company}</CardDescription>
                          </div>
                          <span className="px-2 py-1 bg-secondary/30 rounded-md text-xs">
                            {new Date(job.posted_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-2">
                        <div className="mb-4">
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {job.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/10 flex justify-end items-center gap-2">
                          {job.jobLink ? (
                            <Button
                              size="sm"
                              className="bg-cosmic-500 hover:bg-cosmic-600 transition-colors text-white"
                              onClick={() => window.open(job.jobLink, '_blank', 'noopener,noreferrer')}
                            >
                              <ExternalLink size={14} className="mr-1" />
                              Apply Now
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-cosmic-500 hover:bg-cosmic-600 transition-colors text-white"
                              onClick={() => {
                                toast.success(`Registered interest for ${job.company}`);
                              }}
                            >
                              <ExternalLink size={14} className="mr-1" />
                              Apply
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )))}
              </div>

              {/* Timeline explicitly removed by user request */}
            </TabsContent>

            <TabsContent value="tests" className="space-y-6">
              <StudentTestView
                year={studentData.year}
                branch={studentData.branch}
                section={studentData.section}
              />
              <div className="mt-8">
                {studentData.rollNumber && (
                  <TestHistoryView rollNumber={studentData.rollNumber} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 pt-4">
              {studentData.rollNumber && (
                <StudentInsightsDashboard studentRoll={studentData.rollNumber} />
              )}
              {studentData.rollNumber && (
                <PredictiveScoreCard rollNumber={studentData.rollNumber} />
              )}
              <div className="mt-8">
                <LeaderboardView />
              </div>
            </TabsContent>

            <TabsContent value="roadmap" className="space-y-6 pt-4">
              {studentData.rollNumber && (
                <GoalTrackerView rollNumber={studentData.rollNumber} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PlacementHub;
