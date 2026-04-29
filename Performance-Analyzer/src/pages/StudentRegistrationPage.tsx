import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from "sonner";
import { User, Lock, GraduationCap } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { yearOptions } from '../components/training/trainingTypes';
import { useBranches } from '../hooks/useBranches';
import { API_BASE_URL } from '../config';

const StudentRegistrationPage = () => {
    const { branchOptions } = useBranches();
    const [name, setName] = useState('');
    const [enrollmentId, setEnrollmentId] = useState('');
    const [password, setPassword] = useState('');

    // Add missing student data attributes
    const [year, setYear] = useState('');
    const [branch, setBranch] = useState('');
    const [section, setSection] = useState('');
    const [availableSections, setAvailableSections] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/sections`)
            .then(res => res.json())
            .then(data => setAvailableSections(data.map((s: any) => s.name)))
            .catch(err => console.error('Failed to fetch sections', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (!name.trim()) {
            toast.error('Name cannot be empty.');
            return;
        }
        if (!enrollmentId.trim()) {
            toast.error('Roll Number cannot be empty.');
            return;
        }
        if (!password.trim()) {
            toast.error('Password cannot be empty.');
            return;
        }
        if (!year || !branch || !section) {
            toast.error('Please select Year, Branch, and Section.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    rollNumber: enrollmentId,
                    password: password,
                    year: year,
                    branch: branch,
                    section: section
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            // Also keep temporary storage just in case backend is not connected yet or for fallback auth in StudentLoginPage
            const registeredStudent = {
                name,
                enrollmentId,
                password
            };
            localStorage.setItem('registeredStudent', JSON.stringify(registeredStudent));

            toast.success('Registration successful! Please login.');
            navigate('/student-login');
        } catch (error: any) {
            toast.error(error.message || 'Error connecting to the server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Navbar />
            <div className="container mx-auto px-4 md:px-6 py-24 flex items-center justify-center min-h-[calc(100vh-80px)]">
                <div className="w-full max-w-md mx-auto">
                    <div className="glass-card p-8 rounded-xl animate-scale-in">
                        <h2 className="text-3xl font-bold mb-2 text-center text-primary font-jetbrains">Student Registration</h2>
                        <p className="text-muted-foreground text-center mb-8">Create your academic profile</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="student-name" className="block text-sm font-medium">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <User size={18} />
                                    </div>
                                    <input
                                        id="student-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-3 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="student-id" className="block text-sm font-medium">
                                    Roll Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <GraduationCap size={18} />
                                    </div>
                                    <input
                                        id="student-id"
                                        type="text"
                                        value={enrollmentId}
                                        onChange={(e) => setEnrollmentId(e.target.value)}
                                        className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-3 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                        placeholder="Enter your Roll Number"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="student-password" className="block text-sm font-medium">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        id="student-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-3 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                        placeholder="Create a password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-foreground">Year <span className="text-destructive">*</span></label>
                                    <Select value={year} onValueChange={setYear} required>
                                        <SelectTrigger className="bg-secondary/50 border-border/50 text-foreground"><SelectValue placeholder="Year" /></SelectTrigger>
                                        <SelectContent>
                                            {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-foreground">Branch <span className="text-destructive">*</span></label>
                                    <Select value={branch} onValueChange={setBranch} required>
                                        <SelectTrigger className="bg-secondary/50 border-border/50 text-foreground"><SelectValue placeholder="Branch" /></SelectTrigger>
                                        <SelectContent>
                                            {branchOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-foreground">Section <span className="text-destructive">*</span></label>
                                    <Select value={section} onValueChange={setSection} required>
                                        <SelectTrigger className="bg-secondary/50 border-border/50 text-foreground"><SelectValue placeholder="Section" /></SelectTrigger>
                                        <SelectContent>
                                            {availableSections.length === 0 ? (
                                                <SelectItem value="none" disabled>No sections</SelectItem>
                                            ) : (
                                                availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`stellar-btn w-full py-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Registering...' : 'Register'}
                                </button>
                            </div>

                            <div className="text-sm text-center text-muted-foreground mt-4">
                                <p>Already have an account? <Link to="/student-login" className="text-primary hover:underline font-medium">Log in here</Link></p>
                            </div>
                        </form>

                        <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10 animate-fade-in">
                            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                <GraduationCap size={14} /> Student Credentials
                            </h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <p><span className="font-medium text-foreground">Roll Number:</span> 226K1A0545</p>
                                <p><span className="font-medium text-foreground">Password:</span> aman</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentRegistrationPage;
