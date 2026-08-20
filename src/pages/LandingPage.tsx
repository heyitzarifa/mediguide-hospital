import React from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { ProblemSolution } from '../components/landing/ProblemSolution';
import { FeatureGrid } from '../components/landing/FeatureGrid';
import { TrustSection } from '../components/landing/TrustSection';
import type { AppViewTab, UserRole } from '../types';

interface LandingPageProps {
  onTabChange: (tab: AppViewTab) => void;
  onOpenAuth: (role?: UserRole, mode?: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onTabChange, onOpenAuth }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <HeroSection onTabChange={onTabChange} onOpenAuth={onOpenAuth} />
      <ProblemSolution />
      <FeatureGrid onTabChange={onTabChange} />
      <TrustSection />
    </div>
  );
};
