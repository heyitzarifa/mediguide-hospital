import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SafetyDisclaimerProps {
  message: string;
}

export const SafetyDisclaimer: React.FC<SafetyDisclaimerProps> = ({ message }) => {
  return (
    <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-rose-200 flex items-start gap-3 shadow-lg">
      <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">Important Medical Safety Note</span>
        <p className="text-xs text-slate-300 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};
