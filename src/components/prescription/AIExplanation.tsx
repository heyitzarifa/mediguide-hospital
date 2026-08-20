import React from 'react';
import { Sparkles, CheckCircle2, HeartHandshake } from 'lucide-react';

interface AIExplanationProps {
  overview: string;
  keyTakeaways: string[];
  lifestyleAdvice: string[];
}

export const AIExplanation: React.FC<AIExplanationProps> = ({
  overview,
  keyTakeaways,
  lifestyleAdvice,
}) => {
  return (
    <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Patient-Friendly AI Explanation</h3>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
        {overview}
      </p>

      {/* Key Takeaways */}
      <div>
        <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block mb-2">Key Medication Timings:</span>
        <ul className="space-y-2 text-xs text-slate-300">
          {keyTakeaways.map((item, index) => (
            <li key={index} className="flex items-start gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Lifestyle Advice */}
      <div>
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">Patient Care Reminders:</span>
        <ul className="space-y-2 text-xs text-slate-300">
          {lifestyleAdvice.map((item, index) => (
            <li key={index} className="flex items-start gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <HeartHandshake className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};
