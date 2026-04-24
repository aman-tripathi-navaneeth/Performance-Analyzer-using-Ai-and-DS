import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";
import { User, Lock, GraduationCap } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { yearOptions } from '../components/training/trainingTypes';
import { useBranches } from '../hooks/useBranches';
import { API_BASE_URL } from '../config';
import { getCollection, insertItem } from '../lib/storage';

const StudentLoginPage = () => {
    const { branchOptions } = useBranches();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') === 'register' ? 'register' : 'login';
    
    const [activeTab, setActiveTab] = useState(initialTab);
    
    // Login State
    const [loginEnrollmentId, setLoginEnrollmentId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoginLoading, setIsLoginLoading] = useState(false);

    // Registration State
    const [regName, setRegName] = useState('');
    const [regEnrollmentId, setRegEnrollmentId] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regYear, setRegYear] = useState('');
    const [regBranch, setRegBranch] = useState('');
    const [regSection, setRegSection] = useState('');
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [isRegLoading, setIsRegLoading] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role === 'student') {
                    navigate('/student-dashboard');
                }
            } catch (e) {}
        }

        // Fetch sections for registration form
        const sections = getCollection<any>('db_sections');
        setAvailableSections(sections.map(s => s.name));
    }, [navigate]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoginLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rollNumber: loginEnrollmentId,
                    password: loginPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Invalid Roll Number or Password');
            }

            localStorage.setItem('user', JSON.stringify({
                role: 'student',
                username: data.student.name,
                ...data.student
            }));

            toast.success('Student login successful!');
            navigate('/student-dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Error connecting to the server');
        } finally {
            setIsLoginLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!regName.trim() || !regEnrollmentId.trim() || !regPassword.trim() || !regYear || !regBranch || !regSection) {
            toast.error('Please fill all required fields.');
            return;
        }

        setIsRegLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: regName,
                    rollNumber: regEnrollmentId,
                    password: regPassword,
                    year: regYear,
                    branch: regBranch,
                    section: regSection
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Registration failed');
            }

            toast.success('Registration submitted! Please wait for admin approval.');
            setActiveTab('login');
            // Clear passwords
            setRegPassword('');
            setLoginPassword('');
            // Pre-fill login
            setLoginEnrollmentId(regEnrollmentId);
        } catch (error: any) {
            toast.error(error.message || 'Error connecting to the server');
        } finally {
            setIsRegLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Navbar />
            <div className="container mx-auto px-4 md:px-6 py-24 flex items-center justify-center min-h-[calc(100vh-80px)]">
                <div className="w-full max-w-md mx-auto">
                    <div className="glass-card p-8 rounded-xl animate-scale-in">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="login">Sign In</TabsTrigger>
                                <TabsTrigger value="register">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-3xl font-bold mb-2 text-center text-primary font-jetbrains">Welcome Back</h2>
                                <p className="text-muted-foreground text-center mb-8">Access your academic profile</p>

                                <form onSubmit={handleLoginSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="login-id" className="block text-sm font-medium">Roll Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                                                <GraduationCap size={18} />
                                            </div>
                                            <input
                                                id="login-id"
                                                type="text"
                                                value={loginEnrollmentId}
                                                onChange={(e) => setLoginEnrollmentId(e.target.value)}
                                                className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-3 rounded-lg focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                                                placeholder="Enter your Roll Number"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="login-password" className="block text-sm font-medium">Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                id="login-password"
                                                type="password"
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-3 rounded-lg focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                                                placeholder="Enter your password"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button type="submit" disabled={isLoginLoading} className={`stellar-btn w-full py-3 mb-4 ${isLoginLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                            {isLoginLoading ? 'Signing In...' : 'Sign In'}
                                        </button>

                                        <div className="relative my-4">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-border/50" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">
                                                    New Student?
                                                </span>
                                            </div>
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={() => setActiveTab('register')}
                                            className="w-full py-3 mt-4 rounded-lg font-medium border border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all duration-300"
                                        >
                                            Create an Account
                                        </button>
                                    </div>
                                </form>
                            </TabsContent>

                            <TabsContent value="register" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-3xl font-bold mb-2 text-center text-primary font-jetbrains">Create Account</h2>
                                <p className="text-muted-foreground text-center mb-8">Register for your academic profile</p>

                                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label htmlFor="reg-name" className="block text-sm font-medium">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                                                <User size={18} />
                                            </div>
                                            <input
                                                id="reg-name"
                                                type="text"
                                                value={regName}
                                                onChange={(e) => setRegName(e.target.value)}
                                                className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-2.5 rounded-lg focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="reg-id" className="block text-sm font-medium">Roll Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                                                <GraduationCap size={18} />
                                            </div>
                                            <input
                                                id="reg-id"
                                                type="text"
                                                value={regEnrollmentId}
                                                onChange={(e) => setRegEnrollmentId(e.target.value)}
                                                className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-2.5 rounded-lg focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                                                placeholder="Enter your Roll Number"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="reg-password" className="block text-sm font-medium">Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                id="reg-password"
                                                type="password"
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-2.5 rounded-lg focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                                                placeholder="Create a password"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-foreground">Year <span className="text-destructive">*</span></label>
                                            <Select value={regYear} onValueChange={setRegYear} required>
                                                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Year" /></SelectTrigger>
                                                <SelectContent>
                                                    {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-foreground">Branch <span className="text-destructive">*</span></label>
                                            <Select value={regBranch} onValueChange={setRegBranch} required>
                                                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Branch" /></SelectTrigger>
                                                <SelectContent>
                                                    {branchOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-foreground">Section <span className="text-destructive">*</span></label>
                                            <Select value={regSection} onValueChange={setRegSection} required>
                                                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Section" /></SelectTrigger>
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
                                        <button type="submit" disabled={isRegLoading} className={`stellar-btn w-full py-3 ${isRegLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                            {isRegLoading ? 'Submitting...' : 'Sign Up'}
                                        </button>
                                    </div>
                                    
                                    <div className="text-sm text-center text-muted-foreground mt-4">
                                        <p>Already have an account? <span onClick={() => setActiveTab('login')} className="text-primary hover:underline font-medium cursor-pointer">Sign in here</span></p>
                                    </div>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentLoginPage;
