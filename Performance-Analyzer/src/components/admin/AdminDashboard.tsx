
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, BookOpen, Activity, School, LayoutGrid, BarChart2, ScrollText, ActivitySquare, Upload } from 'lucide-react';
import FacultyManagement from './FacultyManagement';
import StudentData from './StudentData';
import ManageSections from './ManageSections';
import TpoManagement from './TpoManagement';
import { SystemStatsPanel } from './SystemStatsPanel';
import { BranchAnalyticsDashboard } from './BranchAnalyticsDashboard';
import { AuditLogViewer } from './AuditLogViewer';
import { BulkAdminImport } from './BulkAdminImport';
import { PendingRegistrations } from './PendingRegistrations';
import { useEffect } from 'react';
import { API_BASE_URL } from '../../config';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("faculty");
  const [viewMode, setViewMode] = useState("management");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (viewMode === "management") {
      setActiveTab("faculty");
    } else {
      setActiveTab("analytics");
    }
  }, [viewMode]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`);
        if (response.ok) setStats(await response.json());
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Administrator Dashboard</h2>
          <p className="text-muted-foreground">
            System management and configuration panel
          </p>
        </div>

        <ToggleGroup type="single" value={viewMode} onValueChange={(val) => val && setViewMode(val)}>
          <ToggleGroupItem value="management" aria-label="Management View">
            <Settings className="h-4 w-4 mr-2" />
            Management
          </ToggleGroupItem>
          <ToggleGroupItem value="analytics" aria-label="Analytics View">
            <Activity className="h-4 w-4 mr-2" />
            Analytics
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <Card className="bg-secondary/5 backdrop-blur-sm shadow-sm border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Faculty
            </CardTitle>
            <CardDescription>Manage faculty accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_faculty ?? '--'}</p>
            <p className="text-xs text-muted-foreground">Active faculty members</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 backdrop-blur-sm shadow-sm border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <School className="h-5 w-5 mr-2 text-primary" />
              Students
            </CardTitle>
            <CardDescription>Student database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_students ?? '--'}</p>
            <p className="text-xs text-muted-foreground">Registered students</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 backdrop-blur-sm shadow-sm border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-primary" />
              Tests
            </CardTitle>
            <CardDescription>Assessment portal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_tests ?? '--'}</p>
            <p className="text-xs text-muted-foreground">Tests conducted</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 backdrop-blur-md shadow-lg border-primary/40 group overflow-hidden relative">
          <CardHeader className="pb-2">
             <CardTitle className="text-lg flex items-center text-primary">
              <ActivitySquare className="h-5 w-5 mr-2 text-primary group-hover:animate-pulse" />
              Performance
            </CardTitle>
            <CardDescription>System Avg</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-primary/80">{stats?.avg_system_score ?? '--'}%</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Overall accuracy score</p>
          </CardContent>
        </Card>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          {viewMode === "management" ? (
            <>
              <TabsTrigger value="faculty" className="flex items-center gap-2">
                <Users size={16} />
                Faculty
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <School size={16} />
                Student Data
              </TabsTrigger>
              <TabsTrigger value="sections" className="flex items-center gap-2">
                <LayoutGrid size={16} />
                Manage Sections
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Users size={16} />
                Pending Registrations
              </TabsTrigger>
              <TabsTrigger value="tpo" className="flex items-center gap-2">
                <Settings size={16} />
                TPO Controls
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Upload size={16} />
                Bulk Import
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart2 size={16} />
                Analytics Dashboard
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <ActivitySquare size={16} />
                System Health
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <ScrollText size={16} />
                Audit Log
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="faculty">
          <FacultyManagement />
        </TabsContent>

        <TabsContent value="students">
          <StudentData />
        </TabsContent>


        <TabsContent value="sections">
          <ManageSections />
        </TabsContent>

        <TabsContent value="pending">
          <PendingRegistrations />
        </TabsContent>

        <TabsContent value="tpo">
          <TpoManagement />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkAdminImport />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <BranchAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <SystemStatsPanel />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
