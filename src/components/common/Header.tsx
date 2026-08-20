import React from 'react';
import { Compass, Clock, FileText, Home, ShieldAlert, Sparkles, UserCheck, Stethoscope, Eye, Building2, LogOut, User } from 'lucide-react';
import type { AppViewTab, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentTab: AppViewTab;
  onTabChange: (tab: AppViewTab) => void;
  onEmergencyClick: () => void;
  onOpenAuth: (role?: UserRole, mode?: 'login' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, onEmergencyClick, onOpenAuth }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const navItems: { id: AppViewTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'landing', label: 'Overview', icon: Home },
    { id: 'navigation', label: 'Indoor Navigation', icon: Compass },
    { id: 'queue', label: 'Queue Prediction', icon: Clock },
    { id: 'prescription', label: 'Prescription Reader', icon: FileText },
  ];

  // Dynamic role dashboard tab
  if (user?.role === 'STAFF') {
    navItems.push({ id: 'staff-dashboard', label: 'Staff Console', icon: Stethoscope });
  } else if (user?.role === 'PATIENT') {
    navItems.push({ id: 'patient-dashboard', label: 'My Patient Portal', icon: UserCheck });
  } else if (user?.role === 'VISITOR') {
    navItems.push({ id: 'visitor-dashboard', label: 'Visitor Guide', icon: Eye });
  } else if (user?.role === 'MANAGEMENT') {
    navItems.push({ id: 'management-dashboard', label: 'Management', icon: Building2 });
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 text-white backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onTabChange('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl tracking-tight text-white">Smart<span className="text-teal-400">Care</span></span>
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-teal-500/30">
                LIVE DB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Hospital Indoor Navigation & Patient Platform</p>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Auth / Profile Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span className="text-white hidden sm:inline">{user.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-bold">
                  {user.role}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border border-slate-700 text-xs transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth(undefined, 'login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
              >
                <User className="w-4 h-4 text-teal-400" />
                <span>Role Login</span>
              </button>
              <button
                onClick={() => onOpenAuth(undefined, 'register')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all"
              >
                <span>Register</span>
              </button>
            </div>
          )}

          <button
            onClick={onEmergencyClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition-all shadow-sm hover:shadow-rose-600/20 active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">Emergency SOS</span>
          </button>

        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden flex items-center justify-around bg-slate-900 border-t border-slate-800 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
