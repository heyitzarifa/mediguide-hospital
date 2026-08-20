import React, { useRef } from 'react';
import { SAMPLE_PRESCRIPTIONS } from '../../data/mockData';
import { Upload } from 'lucide-react';
import type { PrescriptionScanResult } from '../../types';

interface ImageUploaderProps {
  onSelectSample: (sample: PrescriptionScanResult) => void;
  onCustomUpload: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onSelectSample,
  onCustomUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCustomUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-6">
      
      {/* Drag & Drop Upload Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl p-8 text-center bg-slate-950/60 hover:bg-slate-950 transition-all cursor-pointer group"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Upload className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
          Upload or Drop Prescription Slip Image
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Supports JPG, PNG, WEBP medical prescription files up to 10MB.
        </p>

        <button className="mt-4 px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-teal-600 text-slate-200 group-hover:text-white font-semibold text-xs border border-slate-700 transition-colors">
          Browse File Computer
        </button>
      </div>

      {/* Quick Test Samples */}
      <div>
        <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block mb-3">
          Or Select Instant Test Sample Prescription:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAMPLE_PRESCRIPTIONS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500 text-left transition-all group"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 relative border border-slate-700">
                <img 
                  src={sample.imageUrl} 
                  alt={sample.sampleName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-teal-300">
                  {sample.sampleName}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {sample.doctorName}
                </div>
                <span className="text-[9px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800 mt-1 inline-block">
                  OCR {sample.ocrConfidence}% Match
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
