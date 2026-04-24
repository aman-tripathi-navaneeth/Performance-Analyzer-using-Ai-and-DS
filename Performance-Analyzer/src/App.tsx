import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import Index from "./pages/Index";
import AdminLoginPage from "./pages/AdminLoginPage";
import FacultyLoginPage from "./pages/FacultyLoginPage";
import StudentLoginPage from "./pages/StudentLoginPage";
import StudentRegistrationPage from "./pages/StudentRegistrationPage";
import AdminDashboard from "./pages/AdminDashboard";
import TrainingAnalyzer from "./pages/TrainingAnalyzer";
import PlacementHub from "./pages/PlacementHub";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/faculty-login" element={<FacultyLoginPage />} />
            <Route path="/student-login" element={<StudentLoginPage />} />
            <Route path="/student-register" element={<StudentRegistrationPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRole="admin" />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="faculty,tpo,hod" />}>
              <Route path="/faculty-dashboard" element={<TrainingAnalyzer />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="student" />}>
              <Route path="/student-dashboard" element={<PlacementHub />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
