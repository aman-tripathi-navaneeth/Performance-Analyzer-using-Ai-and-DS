import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from '../../config';

export const AuditLogViewer = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actorFilter, setActorFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const LIMIT = 15;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (actorFilter) params.append('actor', actorFilter);
      const res = await fetch(`${API_BASE_URL}/api/admin/audit-log?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const actionColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-red-500/20 text-red-700 border-red-300';
    if (action.includes('CREATE') || action.includes('IMPORT')) return 'bg-green-500/20 text-green-700 border-green-300';
    if (action.includes('UPDATE')) return 'bg-blue-500/20 text-blue-700 border-blue-300';
    return 'bg-secondary text-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          <CardTitle>Audit Log</CardTitle>
        </div>
        <CardDescription>Track all key system actions for accountability and debugging.</CardDescription>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Filter by username..."
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={() => { setPage(1); fetchLogs(); }}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground animate-pulse py-8">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No audit logs found.</p>
        ) : (
          <>
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-secondary/5">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={actionColor(log.action)}>{log.action}</Badge>
                      <span className="text-sm text-muted-foreground">{log.entityType}: <span className="text-foreground font-medium">{log.entityId}</span></span>
                    </div>
                    <p className="text-xs text-muted-foreground">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs font-medium">{log.actorUsername}</p>
                    <p className="text-xs text-muted-foreground">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
