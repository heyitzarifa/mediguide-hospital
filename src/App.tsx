import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import type { AppViewTab, UserRole, User } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
// useAuth is used in MainApp to suppress the Header on the public landing page while logged out
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { HospitalLandingPage } from './pages/HospitalLandingPage';
import { NavigationPage } from './pages/NavigationPage';
import { QueuePage } from './pages/QueuePage';
import { PrescriptionPage } from './pages/PrescriptionPage';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { VisitorDashboardPage } from './pages/VisitorDashboardPage';
import { ManagementDashboardPage } from './pages/ManagementDashboardPage';
import { EmergencyModal } from './components/emergency/EmergencyModal';
import { AuthModal } from './components/auth/AuthModal';
import { AIChatbox } from './components/chat/AIChatbox';
import { AppointmentBookingModal } from './components/appointments/AppointmentBookingModal';
import { PostAuthPage } from './pages/PostAuthPage';

const TAB_PATH_MAP: Record<AppViewTab, string> = {
  'landing': '/',
  'navigation': '/navigation',
  'queue': '/queue',
  'prescription': '/prescription',
  'staff-dashboard': '/staff',
  'patient-dashboard': '/patient',
  'visitor-dashboard': '/visitor',
  'management-dashboard': '/management',
  'post-auth': '/post-auth',
  'hospital-landing': '/h'
};

const PATH_TAB_MAP: Record<string, AppViewTab> = {
  '/': 'landing',
  '/navigation': 'navigation',
  '/queue': 'queue',
  '/prescription': 'prescription',
  '/staff': 'staff-dashboard',
  '/patient': 'patient-dashboard',
  '/visitor': 'visitor-dashboard',
  '/management': 'management-dashboard',
  '/post-auth': 'post-auth'
};

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
  onUnauthorized?: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children, onUnauthorized }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    if (onUnauthorized) onUnauthorized();
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (onUnauthorized) onUnauthorized();
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const HospitalLandingRoute: React.FC<{
  onSelectHospital: (hosp: any) => void;
  onOpenAuth: (role?: UserRole, mode?: 'login' | 'register', hospitalId?: string, hospitalName?: string) => void;
  onTabChange: (tab: AppViewTab) => void;
}> = ({ onSelectHospital, onOpenAuth, onTabChange }) => {
  const { token } = useParams<{ token: string }>();
  if (!token) return <Navigate to="/" replace />;
  return (
    <HospitalLandingPage
      token={token}
      onSelectHospital={onSelectHospital}
      onOpenAuth={onOpenAuth}
      onTabChange={onTabChange}
    />
  );
};


function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth();

  // The Header (authenticated nav) must NEVER appear on public routes,
  // regardless of whether the user is logged in.
  // Public routes: "/" (landing) and "/h/*" (hospital QR entry).
  // All app routes (/patient, /staff, /navigation, /queue, etc.) show the header.
  const isPublicRoute = location.pathname === '/' || location.pathname.startsWith('/h/');
  const showHeader = !isPublicRoute;


  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('PATIENT');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [navDestinationId, setNavDestinationId] = useState<string | null>(null);
  const [activeHospitalId, setActiveHospitalId] = useState<string>(() => {
    return localStorage.getItem('smartcare_hospital_id') || 'hosp-main';
  });

  const [bookingModalDept, setBookingModalDept] = useState<string>('Cardiology');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  // Hospital context carried from QR scan → AuthModal
  const [authHospitalId, setAuthHospitalId] = useState<string | undefined>(undefined);
  const [authHospitalName, setAuthHospitalName] = useState<string | undefined>(undefined);

  const currentTab: AppViewTab = (() => {
    const path = location.pathname;
    if (path.startsWith('/h/')) return 'hospital-landing';
    return PATH_TAB_MAP[path] || 'landing';
  })();

  useEffect(() => {
    const path = location.pathname;
    let title = 'MediGuide — Hospital Indoor Navigation & Patient Platform';
    if (path === '/navigation') title = 'MediGuide — Indoor Navigation';
    else if (path === '/queue') title = 'MediGuide — OPD Queue Prediction';
    else if (path === '/prescription') title = 'MediGuide — AI Prescription Reader';
    else if (path === '/staff') title = 'MediGuide — Staff Console';
    else if (path === '/patient') title = 'MediGuide — Patient Portal';
    else if (path === '/visitor') title = 'MediGuide — Visitor Guide';
    else if (path === '/management') title = 'MediGuide — Management Analytics';
    else if (path.startsWith('/h/')) title = 'MediGuide — Hospital Portal';

    document.title = title;
  }, [location.pathname]);

  const handleTabChange = (tab: AppViewTab) => {
    const path = TAB_PATH_MAP[tab] || '/';
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (role?: UserRole, mode?: 'login' | 'register', hospitalId?: string, hospitalName?: string) => {
    if (role) setAuthInitialRole(role);
    setAuthInitialMode(mode || 'login');
    setAuthHospitalId(hospitalId);
    setAuthHospitalName(hospitalName);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (loggedInUser: User) => {
    let targetPath = '/post-auth';
    if (loggedInUser.role === 'STAFF') targetPath = '/staff';
    else if (loggedInUser.role === 'PATIENT') targetPath = '/patient';
    else if (loggedInUser.role === 'MANAGEMENT') targetPath = '/management';
    else if (loggedInUser.role === 'VISITOR') targetPath = '/visitor';

    navigate(targetPath);
  };

  const handleNavigateToDepartment = (deptName?: string) => {
    if (deptName?.includes('Cardiology')) {
      setNavDestinationId('loc-cardio-l2');
    } else if (deptName?.includes('Emergency')) {
      setNavDestinationId('loc-er-l0');
    }
    navigate('/navigation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateFromChat = (tab: AppViewTab, options?: { destinationId?: string; openBookingModal?: boolean; departmentName?: string }) => {
    if (options?.destinationId) {
      setNavDestinationId(options.destinationId);
    }
    if (options?.openBookingModal) {
      setBookingModalDept(options.departmentName || 'Cardiology');
      setIsBookingModalOpen(true);
    }
    const path = TAB_PATH_MAP[tab] || '/';
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
      {showHeader && (
        <Header
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onEmergencyClick={() => setIsEmergencyOpen(true)}
          onOpenAuth={handleOpenAuth}
        />
      )}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage onTabChange={handleTabChange} onOpenAuth={handleOpenAuth} />} />

          <Route
            path="/h/:token"
            element={
              <HospitalLandingRoute
                onSelectHospital={(hosp) => setActiveHospitalId(hosp.id)}
                onOpenAuth={handleOpenAuth}
                onTabChange={handleTabChange}
              />
            }
          />

          <Route path="/navigation" element={<NavigationPage initialDestinationId={navDestinationId} />} />
          <Route path="/queue" element={<QueuePage onNavigateToDept={handleNavigateToDepartment} />} />
          <Route path="/prescription" element={<PrescriptionPage />} />

          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['STAFF']} onUnauthorized={() => handleOpenAuth('STAFF')}>
                <StaffDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']} onUnauthorized={() => handleOpenAuth('PATIENT')}>
                <PatientDashboardPage onTabChange={handleTabChange} onNavigateToTab={handleNavigateFromChat} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/visitor"
            element={
              <ProtectedRoute allowedRoles={['VISITOR']} onUnauthorized={() => handleOpenAuth('VISITOR')}>
                <VisitorDashboardPage onTabChange={handleTabChange} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/management"
            element={
              <ProtectedRoute allowedRoles={['MANAGEMENT']} onUnauthorized={() => handleOpenAuth('MANAGEMENT')}>
                <ManagementDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/post-auth"
            element={
              <ProtectedRoute>
                <PostAuthPage onTabChange={handleTabChange} />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isPublicRoute && <Footer onTabChange={handleTabChange} />}

      {/* AI MediGuide Chatbox — only on authenticated app pages */}
      {!isPublicRoute && (
        <AIChatbox
          onNavigateToTab={handleNavigateFromChat}
          activeHospitalId={activeHospitalId}
          onHospitalChange={setActiveHospitalId}
        />
      )}

      {/* App-level Appointment Booking Modal triggered by Chatbox or Patient Dashboard */}
      {isBookingModalOpen && (
        <AppointmentBookingModal
          initialDepartment={bookingModalDept}
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={() => {
            setIsBookingModalOpen(false);
          }}
          onNavigateToTab={handleNavigateFromChat}
        />
      )}

      {isEmergencyOpen && (
        <EmergencyModal
          onClose={() => setIsEmergencyOpen(false)}
          onNavigateEmergency={() => {
            setIsEmergencyOpen(false);
            setNavDestinationId('loc-er-l0');
            navigate('/navigation');
          }}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          initialRole={authInitialRole}
          initialMode={authInitialMode}
          hospitalId={authHospitalId}
          hospitalName={authHospitalName}
          onClose={() => {
            setIsAuthOpen(false);
            setAuthHospitalId(undefined);
            setAuthHospitalName(undefined);
          }}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
