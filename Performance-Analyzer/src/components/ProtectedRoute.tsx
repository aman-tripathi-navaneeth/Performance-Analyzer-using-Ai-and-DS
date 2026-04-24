import { Navigate, Outlet } from 'react-router-dom';
import { toast } from "sonner";

interface ProtectedRouteProps {
    allowedRole: string;
}

const ProtectedRoute = ({ allowedRole }: ProtectedRouteProps) => {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
        toast.error('Please log in to access this page');
        const defaultRole = allowedRole.split(',')[0].trim();
        return <Navigate to={`/${defaultRole}-login`} replace />;
    }

    try {
        const user = JSON.parse(userStr);
        const allowedRoles = allowedRole.split(',').map(r => r.trim());
        if (!allowedRoles.includes(user.role)) {
            toast.error('Unauthorized access');
            return <Navigate to="/" replace />;
        }
        return <Outlet />;
    } catch (error) {
        localStorage.removeItem('user');
        const defaultRole = allowedRole.split(',')[0].trim();
        return <Navigate to={`/${defaultRole}-login`} replace />;
    }
};

export default ProtectedRoute;
