import React from 'react';
import type { NavigationRoute, NavigationInstruction } from '../../types';
import { Footprints, ArrowUpRight, CornerUpLeft, CornerUpRight, ArrowUp, Flag, PlayCircle } from 'lucide-react';

interface GuidancePanelProps {
  route: NavigationRoute | null;
  onStartGuidance: () => void;
}

export const GuidancePanel: React.FC<GuidancePanelProps> = ({ route, onStartGuidance }) => {
  if (!route) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-3">
        <Footprints className="w-10 h-10 mx-auto text-slate-600 animate-bounce" />
        <h3 className="text-sm font-bold text-slate-300">No Destination Selected</h3>
        <p className="text-xs text-slate-400">Search or click any department location on the map to generate route instructions.</p>
      </div>
    );
  }

  const getStepIcon = (type: NavigationInstruction['instructionType']) => {
    switch (type) {
      case 'walk': return <ArrowUp className="w-4 h-4 text-teal-400" />;
      case 'turn-left': return <CornerUpLeft className="w-4 h-4 text-cyan-400" />;
      case 'turn-right': return <CornerUpRight className="w-4 h-4 text-emerald-400" />;
      case 'elevator': return <ArrowUpRight className="w-4 h-4 text-amber-400" />;
      case 'stairs': return <ArrowUpRight className="w-4 h-4 text-purple-400" />;
      case 'arrive': return <Flag className="w-4 h-4 text-rose-400" />;
      default: return <Footprints className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-white space-y-5">
      
      {/* Route Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">Route Generated</span>
          <h3 className="text-lg font-bold text-white">Route to {route.destination.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{route.destination.roomNumber} · {route.destination.floorName}</p>
        </div>
        
        {/* Stats Pill */}
        <div className="text-right bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl">
          <div className="text-sm font-mono font-bold text-teal-400">{route.totalDistanceMeters} m</div>
          <div className="text-[11px] text-slate-400">~{route.totalEtaMinutes} min walk</div>
        </div>
      </div>

      {/* Turn-by-Turn Instruction List */}
      <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
        <span className="text-[11px] text-slate-400 font-semibold block uppercase">Step-by-Step Directions:</span>
        {route.steps.map((step) => (
          <div 
            key={step.stepNumber}
            className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-800 flex-shrink-0 mt-0.5">
              {getStepIcon(step.instructionType)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Step {step.stepNumber}</span>
                {step.distanceMeters > 0 && (
                  <span className="font-mono text-[10px] text-teal-400">{step.distanceMeters} m</span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">{step.text}</p>
              <p className="text-[11px] text-slate-400 mt-1">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Start Live Guided Navigation CTA */}
      <button
        onClick={onStartGuidance}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.01] active:scale-98"
      >
        <PlayCircle className="w-5 h-5 text-slate-950" />
        <span>Start Live Step Guidance</span>
      </button>

    </div>
  );
};
