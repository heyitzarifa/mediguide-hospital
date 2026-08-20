import React from 'react';
import type { DepartmentQueue } from '../../types';
import { Sparkles } from 'lucide-react';

interface QueueVisualizerProps {
  queue: DepartmentQueue;
}

export const QueueVisualizer: React.FC<QueueVisualizerProps> = ({ queue }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Queue Flow Timeline</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">Pace: ~{queue.avgConsultationMinutes} min / patient</span>
      </div>

      <div className="overflow-x-auto custom-scrollbar py-3">
        <div className="flex items-center gap-3 min-w-[600px] px-1">
          {queue.tokenList.map((t) => {
            const isUser = t.status === 'user';
            const isConsulting = t.status === 'consulting';

            return (
              <div
                key={t.tokenNumber}
                className={`flex-1 flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                  isUser
                    ? 'bg-teal-950/90 border-teal-400 text-teal-300 ring-2 ring-teal-500/50 scale-105 shadow-lg shadow-teal-500/20'
                    : isConsulting
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1">
                  {isUser ? 'YOU (#22)' : isConsulting ? 'IN ROOM' : `WAITING`}
                </div>

                <div className={`text-xl font-black font-mono mb-1 ${
                  isUser ? 'text-teal-300' : isConsulting ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  #{t.tokenNumber}
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  {t.estimatedTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
