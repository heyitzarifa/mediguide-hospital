import React, { useState } from 'react';
import type { NavigationRoute } from '../../types';
import { X, ChevronRight, ChevronLeft, Compass, CheckCircle } from 'lucide-react';

interface StepGuidanceModalProps {
  route: NavigationRoute;
  onClose: () => void;
}

export const StepGuidanceModal: React.FC<StepGuidanceModalProps> = ({ route, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = route.steps[currentStepIndex];
  const isLastStep = currentStepIndex === route.steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">Live Guidance Mode</span>
              <h3 className="text-base font-bold text-white">Navigating to {route.destination.name}</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>Step {currentStepIndex + 1} of {route.steps.length}</span>
            <span>{Math.round(((currentStepIndex + 1) / route.steps.length) * 100)}% Completed</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / route.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Big Instruction Step Card */}
        <div className="bg-slate-950 border border-teal-500/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 mx-auto flex items-center justify-center text-xl font-bold">
            {currentStepIndex + 1}
          </div>

          <h2 className="text-xl font-extrabold text-white leading-snug">
            {currentStep.text}
          </h2>

          <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            {currentStep.detail}
          </p>

          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
            <span>Floor: {currentStep.floor}</span>
            {currentStep.distanceMeters > 0 && <span>· {currentStep.distanceMeters}m ahead</span>}
          </div>
        </div>

        {/* Step Navigation Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-sm transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          {!isLastStep ? (
            <button
              onClick={() => setCurrentStepIndex(prev => Math.min(route.steps.length - 1, prev + 1))}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4 text-slate-950" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              <CheckCircle className="w-4 h-4 text-slate-950" />
              <span>Arrived at Destination</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
