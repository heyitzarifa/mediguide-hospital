import React from 'react';
import { Sparkles, Shield, HeartHandshake, Compass } from 'lucide-react';
import type { AppViewTab } from '../../types';

interface FooterProps {
  onTabChange: (tab: AppViewTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onTabChange }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Brand Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
                <Sparkles className="w-4 h-4 text-slate-950" />
              </div>
              <span className="font-bold text-lg text-white">Medi<span className="text-teal-400">Guide</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              AI-powered hospital indoor navigation, queue prediction, and patient assistant platform built for modern healthcare facilities.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400 bg-teal-950/60 border border-teal-800/50 px-3 py-1.5 rounded-lg w-fit">
              <Shield className="w-3.5 h-3.5" />
              <span>HIPAA Compliant & Secure</span>
            </div>
          </div>

          {/* Col 2: Core Platform Modules */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Platform Modules</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onTabChange('navigation')} className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-teal-400" />
                  Indoor Hospital Navigation
                </button>
              </li>
              <li>
                <button onClick={() => onTabChange('queue')} className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
                  Queue Prediction & Tokens
                </button>
              </li>
              <li>
                <button onClick={() => onTabChange('prescription')} className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  Prescription OCR & AI Explainer
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Hospital Locations */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Hospital Departments</h4>
            <ul className="space-y-2 text-xs">
              <li>Main Reception (Ground Floor)</li>
              <li>Cardiology & ECG (Level 2)</li>
              <li>Neurology Clinic (Level 2)</li>
              <li>Pediatrics & OPD (Level 1)</li>
              <li>Pathology Blood Lab (Level 1)</li>
              <li>Emergency & ICU (Level 0 / Level 3)</li>
            </ul>
          </div>

          {/* Col 4: Hackathon Disclaimer */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Hackathon Note</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              This frontend interface is part of the MediGuide team hackathon project. Frontend services are decoupled and ready for Flask API endpoint integration.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 text-center sm:flex sm:justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MediGuide Hospital System. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Designed with React, TypeScript & Tailwind CSS</p>
        </div>
      </div>
    </footer>
  );
};
