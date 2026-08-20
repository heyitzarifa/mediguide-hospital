import React from 'react';
import type { FloorLevel } from '../../types';
import { HOSPITAL_FLOORS } from '../../data/mockData';
import { Layers } from 'lucide-react';

interface FloorSelectorProps {
  currentFloor: FloorLevel;
  onFloorChange: (floor: FloorLevel) => void;
}

export const FloorSelector: React.FC<FloorSelectorProps> = ({ currentFloor, onFloorChange }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
        <Layers className="w-4 h-4 text-teal-400" />
        <span>Select Floor</span>
      </div>

      <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto custom-scrollbar">
        {HOSPITAL_FLOORS.map((f) => {
          const isActive = currentFloor === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFloorChange(f.id as FloorLevel)}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
              }`}
            >
              <span className="text-sm font-mono">{f.code}</span>
              <span className="hidden md:block text-[11px] font-normal text-slate-300 ml-2">{f.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
