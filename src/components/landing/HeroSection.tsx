import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import type { AppViewTab, UserRole } from '../../types';

interface HeroSectionProps {
  onTabChange: (tab: AppViewTab) => void;
  onOpenAuth: (role?: UserRole, mode?: 'login' | 'register') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAuth }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-20 lg:py-28 border-b border-slate-800 flex items-center justify-center">
      
      {/* Soft Decorative Background Circles / Rings for Visual Interest */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-teal-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] border border-teal-500/10 rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] border border-emerald-500/10 rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
        
        {/* Logo + MediGuide Brand Name */}
        <div className="inline-flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/25">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <span className="font-extrabold text-3xl sm:text-4xl tracking-tight text-white">
            Medi<span className="text-teal-400">Guide</span>
          </span>
        </div>

        {/* Tagline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
          Never lose your way <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
            inside a hospital again.
          </span>
        </h1>

        {/* Description Paragraph */}
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
          MediGuide delivers turn-by-turn indoor hospital directions, real-time OPD queue prediction, AI prescription reading, and instant conversational healthcare assistance.
        </p>

        {/* Register & Login Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => onOpenAuth('PATIENT', 'register')}
            className="flex items-center gap-2.5 px-8 py-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-base sm:text-lg shadow-xl shadow-teal-500/25 transition-all hover:scale-[1.02] active:scale-98"
          >
            <span>Register</span>
            <ArrowRight className="w-5 h-5 text-slate-950" />
          </button>

          <button
            onClick={() => onOpenAuth('PATIENT', 'login')}
            className="flex items-center gap-2.5 px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-base sm:text-lg transition-all hover:text-white"
          >
            <span>Login</span>
          </button>
        </div>

        {/* Badges */}
        <div className="pt-6 flex items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Secure Patient Access</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-400" />
            <span>5 Hospital Floors Indexed</span>
          </div>
        </div>

      </div>
    </section>
  );
};
