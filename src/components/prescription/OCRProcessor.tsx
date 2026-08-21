import React from 'react';
import { Sparkles, Scan } from 'lucide-react';

interface OCRProcessorProps {
  imageUrl: string;
  isAnalyzing: boolean;
  confidence: number;
  /** OCR progress 0-100, shown while isAnalyzing is true */
  ocrProgress?: number;
  /** Status message from Tesseract logger, e.g. "recognizing text" */
  ocrStatusText?: string;
}

export const OCRProcessor: React.FC<OCRProcessorProps> = ({
  imageUrl,
  isAnalyzing,
  confidence,
  ocrProgress = 0,
  ocrStatusText = 'Analyzing...',
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-teal-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Prescription Scan Preview</h3>
        </div>
        {!isAnalyzing && confidence > 0 && (
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
            OCR Confidence: {confidence}% High Match
          </span>
        )}
        {isAnalyzing && (
          <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
            {Math.round(ocrProgress)}% complete
          </span>
        )}
      </div>

      <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Prescription Scan"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-slate-600 text-xs font-mono">No image loaded</div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-4">
            {/* Animated scan line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 shadow-lg shadow-teal-500/80 animate-scan-line absolute" />
            <Sparkles className="w-10 h-10 text-teal-400 animate-spin" style={{ animationDuration: '4s' }} />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">MediGuide OCR — Reading Prescription...</p>
              <p className="text-xs text-slate-400 capitalize">{ocrStatusText}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, ocrProgress)}%` }}
                />
              </div>
              <p className="text-[10px] text-teal-400 font-mono mt-1 text-right">
                {Math.round(ocrProgress)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
