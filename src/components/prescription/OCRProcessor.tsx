import React from 'react';
import { Sparkles, Scan } from 'lucide-react';

interface OCRProcessorProps {
  imageUrl: string;
  isAnalyzing: boolean;
  confidence: number;
}

export const OCRProcessor: React.FC<OCRProcessorProps> = ({
  imageUrl,
  isAnalyzing,
  confidence,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-teal-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Prescription Scan Preview</h3>
        </div>
        {!isAnalyzing && (
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
            OCR Confidence: {confidence}% High Match
          </span>
        )}
      </div>

      <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        <img 
          src={imageUrl} 
          alt="Prescription Scan" 
          className="w-full h-full object-contain"
        />

        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 shadow-lg shadow-teal-500/80 animate-scan-line absolute" />
            <Sparkles className="w-10 h-10 text-teal-400 animate-spin mb-3" style={{ animationDuration: '4s' }} />
            <p className="text-sm font-bold text-white">SmartCare OCR AI Parsing Medicine Text...</p>
            <p className="text-xs text-slate-400 mt-1">Extracting dosages, frequency, and patient instructions</p>
          </div>
        )}
      </div>
    </div>
  );
};
