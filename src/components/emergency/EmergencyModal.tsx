import React, { useState } from 'react';
import { ShieldAlert, MapPin, PhoneCall, X, CheckCircle2, ArrowRight } from 'lucide-react';

interface EmergencyModalProps {
  onClose: () => void;
  onNavigateEmergency: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ onClose, onNavigateEmergency }) => {
  const [isDispatched, setIsDispatched] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-rose-600 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white space-y-6 relative overflow-hidden">
        
        {/* Top Emergency Pulse Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600 animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-900/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Critical Assistance</span>
              <h3 className="text-lg font-black text-white">Emergency SOS Active</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ER Nearest Location Card */}
        <div className="bg-slate-950 border border-rose-900/60 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>Nearest Trauma & ER Desk</span>
            </span>
            <span className="font-mono text-white">Ground Floor (G-00)</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-300 pt-1">
            <span>Distance: <strong className="text-white font-mono">120 m</strong></span>
            <span>Walk ETA: <strong className="text-white font-mono">~2 min</strong></span>
          </div>
        </div>

        {!isDispatched ? (
          <div className="space-y-3">
            <button
              onClick={onNavigateEmergency}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg transition-all"
            >
              <span>Navigate to Emergency Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDispatched(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-600/30 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Request Hospital Staff Assistance</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/80 border border-emerald-500 rounded-2xl p-4 text-center space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-300">Hospital Rapid Response Staff Alerted</h4>
            <p className="text-xs text-slate-300">
              Staff dispatcher has received your checkpoint coordinates (Ground Floor Atrium). Stay where you are.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
