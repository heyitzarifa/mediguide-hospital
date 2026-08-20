import React, { useState } from 'react';
import type { PrescriptionScanResult } from '../types';
import { SAMPLE_PRESCRIPTIONS } from '../data/mockData';
import { SmartCareAPI } from '../services/api';
import { ImageUploader } from '../components/prescription/ImageUploader';
import { OCRProcessor } from '../components/prescription/OCRProcessor';
import { MedicineCard } from '../components/prescription/MedicineCard';
import { AIExplanation } from '../components/prescription/AIExplanation';
import { SafetyDisclaimer } from '../components/prescription/SafetyDisclaimer';
import { FileText } from 'lucide-react';

export const PrescriptionPage: React.FC = () => {
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionScanResult>(SAMPLE_PRESCRIPTIONS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSelectSample = (sample: PrescriptionScanResult) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setSelectedPrescription(sample);
      setIsAnalyzing(false);
    }, 800);
  };

  const handleCustomUpload = (file: File) => {
    setIsAnalyzing(true);
    SmartCareAPI.analyzePrescription(file).then((res) => {
      setSelectedPrescription(res);
      setIsAnalyzing(false);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Prescription Reader & AI Explainer</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload medical prescriptions to extract dosages, timings, and receive patient-friendly AI explanations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-6">
          <ImageUploader
            onSelectSample={handleSelectSample}
            onCustomUpload={handleCustomUpload}
          />

          <OCRProcessor
            imageUrl={selectedPrescription.imageUrl}
            isAnalyzing={isAnalyzing}
            confidence={selectedPrescription.ocrConfidence}
          />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 space-y-6">
          <SafetyDisclaimer message={selectedPrescription.safetyDisclaimer} />

          {selectedPrescription.error_warning && (
            <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-600/80 text-amber-200 space-y-2 shadow-lg">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                ⚠ OCR Extraction Alert
              </div>
              <p className="text-xs sm:text-sm font-semibold">
                {selectedPrescription.error_warning}
              </p>
            </div>
          )}

          <AIExplanation
            overview={selectedPrescription.aiExplanation.overview}
            keyTakeaways={selectedPrescription.aiExplanation.keyTakeaways}
            lifestyleAdvice={selectedPrescription.aiExplanation.lifestyleAdvice}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Extracted Medications ({selectedPrescription.medicines.length})
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Doctor: {selectedPrescription.doctorName}
              </span>
            </div>

            {selectedPrescription.medicines.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">No medicines confidently identified from image.</p>
                <p>Please upload a clearer image of your prescription slip or consult your doctor/pharmacist directly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPrescription.medicines.map((med) => (
                  <MedicineCard key={med.id} medicine={med} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
