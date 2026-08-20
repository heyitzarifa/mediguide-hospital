import React from 'react';
import type { ExtractedMedicine } from '../../types';
import { Pill } from 'lucide-react';

interface MedicineCardProps {
  medicine: ExtractedMedicine;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({ medicine }) => {
  return (
    <div className="bg-slate-950/80 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-5 text-white transition-all space-y-3">
      
      {/* Medicine Name Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">{medicine.name}</h4>
            <span className="text-xs text-slate-400 font-mono">Dosage: {medicine.dosage}</span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800">
          Match {medicine.confidenceScore}%
        </span>
      </div>

      {/* Purpose Summary */}
      <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
        <strong className="text-teal-400">Purpose:</strong> {medicine.purposeSummary}
      </p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-semibold">Frequency</span>
          <span className="font-bold text-slate-200">{medicine.frequency}</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-semibold">Timing</span>
          <span className="font-bold text-slate-200">{medicine.timing}</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-semibold">Duration</span>
          <span className="font-bold text-slate-200">{medicine.duration}</span>
        </div>
      </div>

      {/* Doctor Instructions */}
      <div className="text-xs text-slate-400 pt-1">
        <strong className="text-slate-300">Prescription Note:</strong> {medicine.instructions}
      </div>

    </div>
  );
};
