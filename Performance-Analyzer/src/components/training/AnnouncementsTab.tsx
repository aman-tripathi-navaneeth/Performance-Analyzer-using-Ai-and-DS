import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { API_BASE_URL } from '../../config';

interface AnnouncementsTabProps {
  facultyUsername: string;
}

export const AnnouncementsTab = ({ facultyUsername }: AnnouncementsTabProps) => {
  const [message, setMessage] = useState('');
  const [targetYear, setTargetYear] = useState('All');
  const [targetBranch, setTargetBranch] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcements`);
      if (response.ok) {
        setRecentAnnouncements(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          postedBy: facultyUsername,
          targetYear,
          targetBranch
        })
      });

      if (response.ok) {
        toast.success('Announcement broadcast successfully');
        setMessage('');
        setTargetYear('All');
        setTargetBranch('All');
        fetchAnnouncements();
      } else {
        toast.error('Failed to post announcement');
      }
    } catch (err) {
      toast.error('Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Broadcast Announcement</CardTitle>
          <CardDescription>Send real-time updates or links directly to the student dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Important updates, links, or notices here..."
                required 
                className="min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Year</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                >
                  <option value="All">All Years</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Target Branch</Label>
                <Input 
                  placeholder="e.g. CSE or All" 
                  value={targetBranch} 
                  onChange={(e) => setTargetBranch(e.target.value)} 
                />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Broadcasting..." : "Broadcast Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
          <CardDescription>Your recently broadcasted messages.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent announcements.</p>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {recentAnnouncements.map((ann, idx) => (
                <div key={idx} className="p-3 border rounded-lg bg-secondary/5 space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{ann.message}</p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Target: Year {ann.targetYear}, {ann.targetBranch}</span>
                    <span>{ann.timestamp ? new Date(ann.timestamp).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
