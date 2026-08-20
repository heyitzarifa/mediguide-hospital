import React from 'react';
import { Compass, Calendar, FileText, Sparkles, UserCheck, ArrowRight } from 'lucide-react';
import type { AppViewTab } from '../types';
import { useAuth } from '../context/AuthContext';

interface PostAuthPageProps {
  onTabChange: (tab: AppViewTab) => void;
}

export const PostAuthPage: React.FC<PostAuthPageProps> = ({ onTabChange }) => {
  const { user } = useAuth();

  const modules: {
    id: string;
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    tab: AppViewTab;
    badgeStyle: string;
    glowStyle: string;
  }[] = [
    {
      id: 'nav',
      title: 'Navigation',
      description: 'Find your way with turn-by-turn hospital directions.',
      icon: Compass,
      tab: 'navigation',
      badgeStyle: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-cyan-500/10',
      glowStyle: 'hover:border-cyan-500/60 hover:shadow-cyan-500/20'
    },
    {
      id: 'apt',
      title: 'Appointment',
      description: 'Book visits when the hospital is least busy.',
      icon: Calendar,
      tab: 'patient-dashboard',
      badgeStyle: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10',
      glowStyle: 'hover:border-emerald-500/60 hover:shadow-emerald-500/20'
    },
    {
      id: 'rx',
      title: 'Prescription',
      description: 'AI turns your prescription into medicine reminders.',
      icon: FileText,
      tab: 'prescription',
      badgeStyle: 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-purple-500/10',
      glowStyle: 'hover:border-purple-500/60 hover:shadow-purple-500/20'
    },
    {
      id: 'ai',
      title: 'AI Assistant',
      description: 'Get instant answers and guidance, anytime.',
      icon: Sparkles,
      tab: 'patient-dashboard',
      badgeStyle: 'bg-teal-500/20 border-teal-500/40 text-teal-300 shadow-teal-500/10',
      glowStyle: 'hover:border-teal-500/60 hover:shadow-teal-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-12 space-y-10 max-w-7xl mx-auto flex flex-col justify-center">
      
      {/* Welcome Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
          <UserCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>AUTHENTICATED • {user?.role || 'PATIENT'} PORTAL</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Welcome, <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">{user?.name || 'Alex Morgan'}</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300">
          Select a hospital module below to begin your visit.
        </p>
      </div>

      {/* 4 Modules: Single Horizontal Row (Mobile 2x2 Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto w-full pt-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => onTabChange(m.tab)}
              className={`bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 flex flex-col items-center text-center space-y-3 cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-lg ${m.glowStyle} group`}
            >
              {/* Icon Badge: Sleek, consistent size, subtle border & soft shadow */}
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${m.badgeStyle}`}>
                <Icon className="w-7 h-7" />
              </div>

              {/* Module Name in Bold */}
              <h3 className="font-bold text-base text-white tracking-tight pt-1">
                {m.title}
              </h3>

              {/* Short, clear 1-line description (max 8-10 words) */}
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {m.description}
              </p>

              {/* Action Indicator */}
              <div className="pt-2 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-semibold">
                <span>Launch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Switch Shortcut Banner */}
      <div className="pt-6 text-center">
        <button
          onClick={() => {
            if (user?.role === 'STAFF') onTabChange('staff-dashboard');
            else if (user?.role === 'PATIENT') onTabChange('patient-dashboard');
            else if (user?.role === 'VISITOR') onTabChange('visitor-dashboard');
            else if (user?.role === 'MANAGEMENT') onTabChange('management-dashboard');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all"
        >
          <span>Open Full {user?.role || 'PATIENT'} Dashboard</span>
          <ArrowRight className="w-4 h-4 text-teal-400" />
        </button>
      </div>

    </div>
  );
};
