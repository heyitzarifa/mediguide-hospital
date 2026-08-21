import React from 'react';
import { CheckCircle, Zap } from 'lucide-react';

export const TrustSection: React.FC = () => {
  return (
    <section className="py-16 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs uppercase tracking-widest font-bold text-teal-400">Healthcare Excellence</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Built for High-Stress Hospital Environments
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                MediGuide combines high-contrast readable typography, accessible touch targets for patients of all ages, and low-latency client-side navigation maps.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Accessible Touch Maps</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Zero-Delay SVG Renderer</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Modular Flask Ready</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center">
              <div className="p-6 rounded-2xl bg-teal-950/60 border border-teal-800/80 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-300 mx-auto flex items-center justify-center border border-teal-500/40">
                  <Zap className="w-6 h-6 text-teal-400" />
                </div>
                <h4 className="text-lg font-bold text-white">Hackathon Demo Mode</h4>
                <p className="text-xs text-slate-300">
                  All 4 core modules are fully interactive with structured mock datasets ready to plug into Flask APIs.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
