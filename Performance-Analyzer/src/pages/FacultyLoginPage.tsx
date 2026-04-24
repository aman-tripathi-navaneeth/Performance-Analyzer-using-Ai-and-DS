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
            // Trim inputs to prevent accidental spaces causing login failures
            const trimmedUsername = username.trim();
            const trimmedPassword = password.trim();

            console.log("=== Debugging Authentication ===");
            console.log("Input Credentials ->", { username: trimmedUsername, password: trimmedPassword });

            // Ensure single source of truth reading directly from storage
            const teachers = await import('../lib/storage').then(mod => mod.getCollection<any>('db_teachers'));
            console.log("Stored Faculty Data ->", teachers);

            // Correct mapping: UI sends 'username', we must match against 'username'
            // Added defensive casing and explicit checking
            const teacher = teachers.find((t: any) => {
                const isMatch = t.username?.trim() === trimmedUsername && t.password === trimmedPassword;
                if (isMatch) console.log(`[Auth Success] Match found for: ${t.username}`);
                return isMatch;
            });

            if (!teacher) {
                console.log("[Auth Failed] No matching credentials found.");
                throw new Error('Invalid credentials');
            }

            // Expected role can be 'faculty', 'tpo', or 'hod'
            localStorage.setItem('user', JSON.stringify({
                role: teacher.role,
                username: teacher.username,
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyLoginPage;
