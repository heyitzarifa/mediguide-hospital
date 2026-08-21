import React, { useEffect, useState } from 'react';
import type { Hospital, UserRole, AppViewTab } from '../types';
import { SmartCareAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  LogIn,
  Compass,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  MapPin,
  Users,
  BadgeCheck,
} from 'lucide-react';

interface HospitalLandingPageProps {
  token: string;
  onSelectHospital: (hospital: Hospital) => void;
  onOpenAuth: (role?: UserRole, mode?: 'login' | 'register', hospitalId?: string, hospitalName?: string) => void;
  onTabChange: (tab: AppViewTab) => void;
}

export const HospitalLandingPage: React.FC<HospitalLandingPageProps> = ({
  token,
  onSelectHospital,
  onOpenAuth,
  onTabChange,
}) => {
  const { user, isAuthenticated } = useAuth();

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function verifyAndResolve() {
      setLoading(true);
      setError(null);
      try {
        const res = await SmartCareAPI.resolveHospitalToken(token);
        if (isMounted) {
          setHospital(res.hospital);
          onSelectHospital(res.hospital);
          localStorage.setItem('smartcare_hospital_id', res.hospital.id);
          localStorage.setItem('smartcare_hospital_info', JSON.stringify(res.hospital));
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Invalid or tampered hospital QR code.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    verifyAndResolve();
    return () => { isMounted = false; };
  }, [token]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-4 border-t-teal-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Verifying Hospital QR Token</h2>
          <p className="text-sm text-slate-400 font-mono text-xs">Authenticating hospital credentials with backend...</p>
        </div>
      </div>
    );
  }

  // ── Invalid / Tampered Token ──────────────────────────────────────────────
  if (error || !hospital) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6">
        <div className="bg-slate-900/90 border border-rose-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              401 Unauthorized — Security Violation
            </span>
            <h1 className="text-2xl font-bold text-white">Invalid or Tampered QR Token</h1>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              {error || 'This QR code could not be verified by MediGuide Security. Please ensure you scanned an official QR code located at the hospital entrance desk.'}
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-2 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Token Received:</span>
              <span className="text-rose-400 truncate max-w-[200px]">{token}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Check:</span>
              <span className="text-rose-400 font-semibold">FAILED (Cryptographic Signature Mismatch)</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onTabChange('landing')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all text-sm"
            >
              Return to Main MediGuide Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Verified ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ── Verified Hospital Banner ── */}
      <div className="bg-gradient-to-r from-teal-900/40 via-emerald-900/30 to-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="relative">
            <img
              src={hospital.logoUrl || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80'}
              alt={hospital.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-teal-400/40 shadow-xl bg-slate-800"
            />
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Hospital Portal
              </span>
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50 font-mono">
                ID: {hospital.id}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to {hospital.name}
            </h1>

            <p className="text-sm text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
              {hospital.address}
            </p>

            <p className="text-xs text-slate-500">
              You're accessing MediGuide services for this hospital. Choose an option below to continue.
            </p>
          </div>
        </div>
      </div>

      {/* ── Already authenticated ── */}
      {isAuthenticated && user ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">You're already signed in</h2>
          </div>

          <div className="bg-slate-900/80 border border-teal-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* User info */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-2xl font-extrabold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Signed In</span>
                </div>
                <p className="text-white font-bold text-lg mt-0.5">
                  You're signed in as <span className="text-teal-300">{user.name}</span>
                </p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {user.email} · Role: {user.role} · Hospital: {hospital.name}
                </p>
              </div>
            </div>

            {/* Continue button */}
            <button
              onClick={() => {
                // Navigate to the role-appropriate dashboard
                if (user.role === 'PATIENT') onTabChange('patient-dashboard');
                else if (user.role === 'STAFF') onTabChange('staff-dashboard');
                else if (user.role === 'MANAGEMENT') onTabChange('management-dashboard');
                else if (user.role === 'VISITOR') onTabChange('visitor-dashboard');
                else onTabChange('landing');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all shrink-0 group"
            >
              Continue to Hospital
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Secondary: quick links */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onTabChange('queue')}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all group"
            >
              <Users className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">Check OPD Queue</p>
                <p className="text-xs text-slate-500">Live wait times</p>
              </div>
            </button>
            <button
              onClick={() => onTabChange('navigation')}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition-all group"
            >
              <Compass className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Indoor Navigation</p>
                <p className="text-xs text-slate-500">Find departments</p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* ── Not authenticated — show Register / Login choice ── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              Hospital Access
            </h2>
            <span className="text-xs text-slate-400">All actions linked to {hospital.name}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ── Card 1: New Visitor → Register ── */}
            <div
              onClick={() => onOpenAuth('PATIENT', 'register', hospital.id, hospital.name)}
              className="group bg-slate-900/80 border border-slate-800 hover:border-teal-500/60 p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/10 flex flex-col justify-between space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform text-2xl">
                  🆕
                </div>
                <span className="text-xs text-teal-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Register <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div>
                <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">New Visitor</p>
                <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                  Register at this Hospital
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Create a new MediGuide account and connect it to{' '}
                  <span className="text-slate-300 font-medium">{hospital.name}</span>.
                  Your account will be scoped to this hospital.
                </p>
              </div>

              <button className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" />
                REGISTER
              </button>
            </div>

            {/* ── Card 2: Existing Account → Log In ── */}
            <div
              onClick={() => onOpenAuth('PATIENT', 'login', hospital.id, hospital.name)}
              className="group bg-slate-900/80 border border-slate-800 hover:border-emerald-500/60 p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform text-2xl">
                  👤
                </div>
                <span className="text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Log In <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Existing Account</p>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Already have an account?
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Sign in to access your appointments, prescriptions, OPD queue tokens, and patient portal at{' '}
                  <span className="text-slate-300 font-medium">{hospital.name}</span>.
                </p>
              </div>

              <button className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                LOG IN
              </button>
            </div>

          </div>

          {/* Secondary quick links for unauthenticated visitors */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onTabChange('queue')}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all group"
            >
              <Users className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">Check OPD Queue</p>
                <p className="text-xs text-slate-500">No login required</p>
              </div>
            </button>
            <button
              onClick={() => onTabChange('navigation')}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition-all group"
            >
              <Compass className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Indoor Navigation</p>
                <p className="text-xs text-slate-500">Find any department</p>
              </div>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
