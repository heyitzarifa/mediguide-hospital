import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { User, UserRole } from '../../types';
import { X, User as UserIcon, Lock, Mail, ArrowRight, Building2, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess?: (user: User) => void;
  /** When opened from a hospital QR scan — scopes registration to this hospital */
  hospitalId?: string;
  hospitalName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialRole = 'PATIENT',
  initialMode = 'login',
  onClose,
  onSuccess,
  hospitalId,
  hospitalName
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Cardiology');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If opened from a QR scan, hide the role picker — patients scan, not staff/management
  const isHospitalScoped = !!hospitalId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = mode === 'login'
        ? await login(email, password)
        : await register(name, email, password, selectedRole, department, hospitalId);

      if (onSuccess) onSuccess(loggedInUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-white">
            Medi<span className="text-teal-400">Guide</span> Authentication
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Role-based security system enforcing backend API permissions.
          </p>
        </div>

        {/* Hospital Context Badge — shown only when opened from a QR scan */}
        {isHospitalScoped && hospitalName && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Verified Hospital Portal</span>
              </div>
              <p className="text-sm font-semibold text-white truncate mt-0.5">{hospitalName}</p>
              <p className="text-[10px] text-slate-400 font-mono">ID: {hospitalId} · Registration scoped to this hospital</p>
            </div>
          </div>
        )}

        {/* Role Selector Tabs — hidden when hospital-scoped (patients scan QR codes) */}
        {!isHospitalScoped && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Select Operating Role:</label>
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['STAFF', 'PATIENT', 'VISITOR', 'MANAGEMENT'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                    selectedRole === r
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {selectedRole === 'STAFF' && !isHospitalScoped && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Emergency & Trauma">Emergency & Trauma</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Radiology & X-Ray">Radiology & X-Ray</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>
              {loading
                ? 'Authenticating...'
                : mode === 'login'
                ? `Sign In${isHospitalScoped ? '' : ` as ${selectedRole}`}`
                : `Create ${isHospitalScoped ? 'Patient' : selectedRole} Account`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-teal-400 font-bold hover:underline"
              >
                Register Now
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-teal-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
