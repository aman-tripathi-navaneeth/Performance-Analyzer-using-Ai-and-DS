import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { toast } from 'sonner';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);

    // Check authentication state on route changes
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsLoggedIn(true);
        setUserRole(user.role);
      } catch (e) {
        setIsLoggedIn(false);
        setUserRole(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserRole(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/admin-dashboard';
    if (['faculty', 'tpo', 'hod'].includes(userRole)) return '/faculty-dashboard';
    if (userRole === 'student') return '/student-dashboard';
    return '/';
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-lg shadow-md' : 'bg-background/60 backdrop-blur-md'}`}>
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="https://www.idealtech.edu.in/website/assets/images/ideal_logo.jpg"
              alt="Ideal Institute of Technology"
              className="h-10 w-auto rounded-md"
            />
            <span className="text-lg font-bold font-jetbrains hidden md:inline-block animate-fade-in">
              Ideal Institute of Technology
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="nav-link text-base font-medium py-1 bg-background/30 px-3 rounded-md backdrop-blur-sm">Home</Link>
            {!isLoggedIn ? (
              <>
                <Link to="/admin-login" className="nav-link text-base font-medium py-1 bg-background/30 px-3 rounded-md backdrop-blur-sm">Admin Login</Link>
                <Link to="/faculty-login" className="nav-link text-base font-medium py-1 bg-background/30 px-3 rounded-md backdrop-blur-sm">Faculty Login</Link>
                <Link to="/student-login" className="nav-link text-base font-medium py-1 bg-background/30 px-3 rounded-md backdrop-blur-sm">Student Login</Link>
              </>
            ) : (
              <>
                <Link to={getDashboardLink()} className="nav-link text-base font-medium py-1 bg-primary/10 text-primary px-4 rounded-md flex items-center gap-2">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <button onClick={handleLogout} className="nav-link text-base font-medium py-1 text-destructive hover:bg-destructive/10 px-3 rounded-md smooth-transition flex items-center gap-2">
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
            <ThemeToggle />
          </div>

          <div className="md:hidden flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={toggleMenu}
              className="text-foreground focus:outline-none smooth-transition"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="container mx-auto px-4 py-3 bg-secondary/95 backdrop-blur-lg rounded-b-xl flex flex-col space-y-2 shadow-xl border-t border-border/10">
          <Link to="/" className="nav-link py-3 px-4 rounded-lg hover:bg-background/50">Home</Link>
          {!isLoggedIn ? (
            <>
              <Link to="/admin-login" className="nav-link py-3 px-4 rounded-lg hover:bg-background/50">Admin Login</Link>
              <Link to="/faculty-login" className="nav-link py-3 px-4 rounded-lg hover:bg-background/50">Faculty Login</Link>
              <Link to="/student-login" className="nav-link py-3 px-4 rounded-lg hover:bg-background/50">Student Login</Link>
            </>
          ) : (
            <>
              <Link to={getDashboardLink()} className="nav-link py-3 px-4 rounded-lg bg-primary/10 text-primary flex items-center gap-3">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <button onClick={handleLogout} className="nav-link w-full text-left py-3 px-4 rounded-lg text-destructive hover:bg-destructive/10 flex items-center gap-3">
                <LogOut size={18} /> Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
