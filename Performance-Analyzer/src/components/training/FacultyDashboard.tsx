import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, BarChart2, PlusCircle, BriefcaseBusiness, BrainCircuit } from 'lucide-react';
import { UploadMarksTab } from './UploadMarksTab';
import { ViewPerformanceTab } from './ViewPerformanceTab';
import { CreateTestTab } from './CreateTestTab';
import PlacementManagement from './PlacementManagement';
import { AnnouncementsTab } from './AnnouncementsTab';
import { AtRiskTab } from './AtRiskTab';
import { WeeklyDigestTab } from './WeeklyDigestTab';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, AlertTriangle, GitCompare, Calendar, Sparkles } from 'lucide-react';

interface FacultyDashboardProps {
  facultyUsername: string;
  facultyRole?: string;
}

const FacultyDashboard = ({ facultyUsername, facultyRole }: FacultyDashboardProps) => {
  const [activeTab, setActiveTab] = useState<string>("upload-marks");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Faculty Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome, <span className="font-medium text-primary">{facultyUsername}</span>
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-2">
          <TabsTrigger value="upload-marks" className="flex items-center gap-2">
            <FileUp size={16} />
            Upload Subject Marks
          </TabsTrigger>
          <TabsTrigger value="view-performance" className="flex items-center gap-2">
            <BarChart2 size={16} />
            View Class & Student Performance
          </TabsTrigger>
          <TabsTrigger value="create-test" className="flex items-center gap-2">
            <PlusCircle size={16} />
            Create Tests
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone size={16} />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="at-risk" className="flex items-center gap-2">
            <AlertTriangle size={16} />
            At-Risk Students
          </TabsTrigger>
          <TabsTrigger value="weekly-digest" className="flex items-center gap-2">
            <Calendar size={16} />
            Weekly Digest
          </TabsTrigger>
          {facultyRole === 'tpo' && (
            <TabsTrigger value="post-job" className="flex items-center gap-2">
              <BriefcaseBusiness size={16} />
              Post Job
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="upload-marks" className="space-y-6">
          <UploadMarksTab facultyUsername={facultyUsername} />
        </TabsContent>

        <TabsContent value="view-performance" className="space-y-6">
          <ViewPerformanceTab />
        </TabsContent>

        <TabsContent value="create-test" className="space-y-6">
          <CreateTestTab facultyUsername={facultyUsername} />
        </TabsContent>


        <TabsContent value="announcements" className="space-y-6">
          <AnnouncementsTab facultyUsername={facultyUsername} />
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-6">
          <AtRiskTab />
        </TabsContent>

        <TabsContent value="weekly-digest" className="space-y-6">
          <WeeklyDigestTab />
        </TabsContent>

        {facultyRole === 'tpo' && (
          <TabsContent value="post-job" className="space-y-6">
            <PlacementManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default FacultyDashboard;
