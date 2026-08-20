import React from 'react';
import { AlertTriangle, CheckCircle2, Navigation2, Clock, FileSearch } from 'lucide-react';

export const ProblemSolution: React.FC = () => {
  return (
    <section className="py-16 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs uppercase tracking-widest font-bold text-teal-400 mb-2">Hospital Challenges vs SmartCare Solution</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white">
            Designed to Solve Real Hospital Confusion
          </p>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">
            Patients and visitors spend an average of 18 minutes searching for departments in large multi-floor medical centers. SmartCare changes that.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Problem Card */}
          <div className="bg-slate-950/80 border border-rose-900/40 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-rose-200">The Traditional Experience</h3>
                <p className="text-xs text-rose-400/80">Confusing signs, long waits, unreadable prescriptions</p>
              </div>
            </div>

            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span><strong>Lost in hallways:</strong> Wandering between floors searching for Cardiology or Blood Labs.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span><strong>Unpredictable waiting times:</strong> Sitting in crowded waiting rooms without knowing when doctor consultation starts.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span><strong>Cryptic medical notes:</strong> Struggling to decipher handwritten doctor prescriptions and dosage times.</span>
              </li>
            </ul>
          </div>

          {/* Solution Card */}
          <div className="bg-slate-950/80 border border-teal-500/40 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-teal-950 text-teal-300 border border-teal-700/60">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-teal-200">The SmartCare AI Experience</h3>
                <p className="text-xs text-teal-400">Guiding patients with precision technology</p>
              </div>
            </div>

            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <Navigation2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span><strong>Interactive Indoor Navigation:</strong> Multi-floor turn-by-turn map guidance directly to room doors.</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span><strong>Smart Queue Prediction:</strong> Real-time token position tracking and estimated consultation countdowns.</span>
              </li>
              <li className="flex items-start gap-3">
                <FileSearch className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span><strong>Prescription OCR Reader:</strong> Instant medicine extraction and plain-language patient explanations.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
};
