import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { User, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import { API_BASE_URL } from '../config';

const FacultyLoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (['faculty', 'tpo', 'hod'].includes(user.role)) {
                    navigate('/faculty-dashboard');
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        }
    }, [navigate]);

    const loginFaculty = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/teachers/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facultyId: username.trim(),
                    password: password.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Invalid credentials');
            }

            const teacher = data.faculty;

            localStorage.setItem('user', JSON.stringify({
                role: teacher.role,
                username: teacher.username || teacher.id,
                id: teacher.id,
                name: teacher.name,
                subject: teacher.subject
            }));

            let roleDisplay = 'Faculty';
            if (teacher.role === 'hod') roleDisplay = 'HOD';
            if (teacher.role === 'tpo') roleDisplay = 'TPO';
            toast.success(`${roleDisplay} login successful!`);

            navigate('/faculty-dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Error executing login');
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
                        <h2 className="text-3xl font-bold mb-2 text-center text-primary font-jetbrains">Faculty Portal</h2>
                        <p className="text-muted-foreground text-center mb-8">Access academic tools and analytics</p>

                        <form onSubmit={loginFaculty} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="faculty-username" className="block text-sm font-medium">
                                    Faculty Username
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <User size={18} />
                                    </div>
                                    <input
                                        id="faculty-username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-3 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                        placeholder="Enter your username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="faculty-password" className="block text-sm font-medium">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        id="faculty-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-secondary/50 border border-border/50 text-foreground block w-full pl-10 py-3 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`stellar-btn w-full py-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Logging in...' : 'Log In'}
                                </button>
                            </div>

                        </form>

                        <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10 animate-fade-in">
                            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                <User size={14} /> Faculty Credentials
                            </h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <p><span className="font-medium text-foreground">Username:</span> Aman</p>
                                <p><span className="font-medium text-foreground">Password:</span> aman@123</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyLoginPage;
