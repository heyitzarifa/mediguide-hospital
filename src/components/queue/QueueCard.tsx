import React from 'react';
import type { DepartmentQueue } from '../../types';
import { Users, UserCheck, Compass } from 'lucide-react';

interface QueueCardProps {
  queue: DepartmentQueue;
  onNavigateToDept: () => void;
}

export const QueueCard: React.FC<QueueCardProps> = ({ queue, onNavigateToDept }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">Live Token Status</span>
          <h2 className="text-2xl font-extrabold text-white">{queue.deptName}</h2>
          <p className="text-xs text-slate-300 font-medium mt-0.5">{queue.doctorName} · {queue.roomNumber}</p>
        </div>

        <button
          onClick={onNavigateToDept}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all"
        >
          <Compass className="w-4 h-4" />
          <span>Navigate to Department</span>
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Stat 1: Your Position */}
        <div className="bg-slate-950/80 border border-teal-500/40 rounded-2xl p-5 text-center space-y-1 relative overflow-hidden">
          <span className="text-xs font-semibold text-slate-400 block uppercase">Your Token Position</span>
          <div className="text-3xl sm:text-4xl font-black text-teal-300 font-mono">
            #{queue.patientToken}
          </div>
          <p className="text-xs font-bold text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-800/80 inline-block">
            You are #{queue.peopleAhead + 1} in queue
          </p>
        </div>

        {/* Stat 2: Estimated Wait Time */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-1">
          <span className="text-xs font-semibold text-slate-400 block uppercase">Estimated Wait Time</span>
          <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
            ~{queue.estimatedWaitMinutes} <span className="text-sm font-normal text-slate-400">min</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>{queue.peopleAhead} patients ahead of you</span>
          </p>
        </div>

        {/* Stat 3: Doctor & Current Token */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-1">
          <span className="text-xs font-semibold text-slate-400 block uppercase">Now Consulting Token</span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
            #{queue.currentToken}
          </div>
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Doctor Status: {queue.doctorStatus}</span>
          </p>
        </div>

      </div>

    </div>
  );
};
