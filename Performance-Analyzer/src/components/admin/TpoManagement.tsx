import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Save } from 'lucide-react';
import { toast } from "sonner";
import { API_BASE_URL } from '../../config';

const TpoManagement = () => {
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Password cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/tpo/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to update TPO password');
      }

      toast.success('TPO password updated successfully');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-secondary/5 backdrop-blur-sm max-w-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Lock className="text-primary w-5 h-5" />
            TPO Account Settings
          </CardTitle>
          <CardDescription>
            Manage access credentials for the Training & Placement Officer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/20 p-4 rounded-md flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Default Username</p>
              <p className="font-semibold text-lg">TPO</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-semibold text-primary">TPO</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="tpo-password" className="text-sm font-medium">Reset Password</label>
            <Input
              id="tpo-password"
              type="text"
              placeholder="Enter new strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">The TPO uses this password to log into the Faculty Portal.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleUpdatePassword} 
            disabled={isSubmitting || !newPassword}
            className="w-full gap-2"
          >
            <Save size={16} />
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TpoManagement;
