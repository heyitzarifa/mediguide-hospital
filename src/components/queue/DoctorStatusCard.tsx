import React from 'react';
import type { DepartmentQueue } from '../../types';
import { Stethoscope, RotateCw } from 'lucide-react';

interface DoctorStatusCardProps {
  queue: DepartmentQueue;
  onAdvanceToken: () => void;
}

export const DoctorStatusCard: React.FC<DoctorStatusCardProps> = ({ queue, onAdvanceToken }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{queue.doctorName}</h3>
            <p className="text-xs text-slate-400">Chief Specialist · {queue.roomNumber}</p>
          </div>
        </div>

        <button
          onClick={onAdvanceToken}
          title="Simulate Queue Movement"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RotateCw className="w-4 h-4 text-teal-400" />
          <span>Simulate Next Token</span>
        </button>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Consultation in progress</span>
        </div>
        <span className="font-mono text-slate-400">Last updated: {queue.lastUpdatedTime}</span>
      </div>
    </div>
  );
};
