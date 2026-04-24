import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface StudentAnnouncementsProps {
    year: string;
    branch: string;
}

export const StudentAnnouncements = ({ year, branch }: StudentAnnouncementsProps) => {
    const [announcements, setAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        if (!year || !branch) return;

        const fetchAnnouncements = async () => {
            try {
                // Fetch announcements targeted precisely to this student (or "All")
                const res = await fetch(`${API_BASE_URL}/api/announcements?year=${year}&branch=${branch}`);
                if (res.ok) {
                    const data = await res.json();
                    setAnnouncements(data.slice(0, 3)); // Show top 3 most recent
                }
            } catch (err) {
                console.error("Failed to fetch announcements", err);
            }
        };

        fetchAnnouncements();
    }, [year, branch]);

    if (announcements.length === 0) return null;

    return (
        <div className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="h-4 w-4" /> Faculty Announcements
            </h3>
            {announcements.map((ann) => (
                <Card key={ann.id} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap text-foreground font-medium leading-relaxed">{ann.message}</p>
                        </div>
                        <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                            <p>Posted by <span className="font-semibold text-primary">{ann.postedBy}</span></p>
                            <p>{ann.timestamp ? new Date(ann.timestamp).toLocaleDateString() : ''}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
