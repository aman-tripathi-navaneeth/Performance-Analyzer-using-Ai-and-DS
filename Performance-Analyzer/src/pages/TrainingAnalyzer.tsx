import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FacultyDashboard from '../components/training/FacultyDashboard';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";

const TrainingAnalyzer = () => {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (['faculty', 'tpo', 'hod'].includes(user.role)) {
          setUsername(user.username);
          setRole(user.role);
        }
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-space-gradient pb-20">
      <Navbar />

      <div className="pt-24 container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-10 text-center animate-fade-in">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary mb-3">
            Training Tool
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Training Performance Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track student performance and evaluate training metrics across subjects.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-6 rounded-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Faculty Dashboard</h2>
                <p className="text-muted-foreground text-sm">
                  Logged in as: <span className="text-primary font-medium">{username}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft size={16} />
                  Home
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </div>
            </div>

            <FacultyDashboard facultyUsername={username} facultyRole={role} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingAnalyzer;
