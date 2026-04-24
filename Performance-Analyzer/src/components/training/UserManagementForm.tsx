import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { yearOptions } from './trainingTypes';
import { useBranches } from '../../hooks/useBranches';
import { API_BASE_URL } from '../../config';
import { Switch } from '@/components/ui/switch';

interface UserManagementFormProps {
  userType: 'faculty' | 'student';
  onSubmit: (data: any) => void;
  onCancel: () => void;
  editData?: any;
  isEditMode?: boolean;
  subjects?: { id: string; name: string }[];
}

const UserManagementForm = ({
  userType,
  onSubmit,
  onCancel,
  editData,
  isEditMode = false,
  subjects = [],
}: UserManagementFormProps) => {
  const { branchOptions } = useBranches();
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    password: '',
    name: '',
    subject: '',
    class: '',
    year: '',
    branch: '',
    role: 'faculty',
  });

  const [availableSections, setAvailableSections] = useState<string[]>([]);
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/sections`)
      .then(res => res.json())
      .then(data => setAvailableSections(data.map((s: any) => s.name)))
      .catch(err => console.error('Failed to fetch sections', err));
  }, []);

  useEffect(() => {
    if (isEditMode && editData) {
      setFormData({
        ...formData,
        ...editData,
        password: '••••••••', // Placeholder for security
      });
    }
  }, [editData, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove password if not changed from placeholder
    const dataToSubmit = {
      ...formData,
      password: formData.password === '••••••••' ? undefined : formData.password,
    };
    onSubmit(dataToSubmit);
  };

  const formTitle = `${isEditMode ? 'Edit' : 'Add'} ${userType === 'faculty' ? 'Faculty' : 'Student'}`;

  return (
    <div className="bg-secondary/10 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">{formTitle}</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={`Enter ${userType} username`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isEditMode ? "Leave unchanged or enter new password" : "Enter password"}
              required={!isEditMode}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
          </div>

          {userType === 'faculty' && (
            <div className="space-y-2">
              <Label htmlFor="subject">Assigned Subject</Label>
              <Input 
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                list="subjects-list"
                placeholder="Type or select subject"
                className="bg-background"
                required
              />
              <datalist id="subjects-list">
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.name} />
                ))}
              </datalist>
              <p className="text-[10px] text-muted-foreground mt-1">Free will enabled: Enter any new subject or choose from suggestions.</p>
            </div>
          )}

          {userType === 'faculty' && (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">TPO Permissions</Label>
                <p className="text-xs text-muted-foreground italic">Allows access to placement & recruitment controls.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase ${formData.role === 'tpo' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {formData.role === 'tpo' ? 'Administrator' : 'Faculty Only'}
                </span>
                <Switch 
                  checked={formData.role === 'tpo'} 
                  onCheckedChange={(checked) => handleSelectChange('role', checked ? 'tpo' : 'faculty')}
                />
              </div>
            </div>
          )}

          {userType === 'student' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select
                  value={formData.year}
                  onValueChange={(value) => handleSelectChange('year', value)}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={formData.branch}
                  onValueChange={(value) => handleSelectChange('branch', value)}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Section</Label>
                <Select
                  value={formData.class}
                  onValueChange={(value) => handleSelectChange('class', value)}
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.length === 0 ? (
                      <SelectItem value="none" disabled>No sections</SelectItem>
                    ) : (
                      availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end mt-6 space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditMode ? 'Update' : 'Add'} {userType === 'faculty' ? 'Faculty' : 'Student'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserManagementForm;
