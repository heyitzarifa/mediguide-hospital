import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import type { ExtractedMedicationDetail, PrescriptionScanResult } from '../types';
import { SAMPLE_PRESCRIPTIONS } from '../data/mockData';
import { SmartCareAPI } from '../services/api';
import { preprocessImageForOcr } from '../utils/imagePreprocessing';
import { ImageUploader } from '../components/prescription/ImageUploader';
import { OCRProcessor } from '../components/prescription/OCRProcessor';
import { MedicineCard } from '../components/prescription/MedicineCard';
import { AIExplanation } from '../components/prescription/AIExplanation';
import { SafetyDisclaimer } from '../components/prescription/SafetyDisclaimer';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  ShieldCheck,
  Pill,
  Check,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Flow states
// 'sample'  : showing a demo sample (initial state / after sample selected)
// 'ocr'     : OCR running on a real upload
// 'review'  : OCR done, medicines extracted, user is reviewing/editing
// 'confirmed': user confirmed, reminders created — showing success + cross-check
// ─────────────────────────────────────────────────────────────────────────────
type FlowState = 'sample' | 'ocr' | 'review' | 'confirmed';

export const PrescriptionPage: React.FC = () => {
  const { token } = useAuth();

  // ── Sample/legacy display state (demo mode)
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionScanResult>(SAMPLE_PRESCRIPTIONS[0]);
  const [isSampleMode, setIsSampleMode] = useState(true);

  // ── Real-upload flow state
  const [flowState, setFlowState] = useState<FlowState>('sample');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('Initializing...');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Extracted medications state (Screen 3-style review)
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMedicationDetail[]>([]);
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);
  const [medEditForm, setMedEditForm] = useState<ExtractedMedicationDetail | null>(null);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // ── Cross-check state
  const [crossCheckResult, setCrossCheckResult] = useState<{
    status: string;
    matches: { medicine: string; message: string }[];
    warnings: { medicine: string; type?: string; message: string }[];
  } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // SAMPLE DEMO PICKER (unchanged from original)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSelectSample = (sample: PrescriptionScanResult) => {
    setUploadError(null);
    setIsAnalyzing(true);
    setIsSampleMode(true);
    setFlowState('sample');
    setTimeout(() => {
      setSelectedPrescription(sample);
      setIsAnalyzing(false);
    }, 800);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // REAL UPLOAD HANDLER — main OCR flow
  // ─────────────────────────────────────────────────────────────────────────
  const handleCustomUpload = async (file: File) => {
    setUploadError(null);
    setIsSampleMode(false);
    setFlowState('ocr');
    setIsAnalyzing(true);
    setOcrProgress(0);
    setOcrStatusText('Preprocessing image...');
    setExtractedMeds([]);
    setExtractionWarning(null);
    setCrossCheckResult(null);

    // Show the real uploaded image immediately
    const rawObjectUrl = URL.createObjectURL(file);
    setUploadedImageUrl(rawObjectUrl);

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      // ── Step A: Preprocess image (grayscale + contrast)
      let preprocessedBlob: Blob;
      try {
        preprocessedBlob = await preprocessImageForOcr(file);
        setOcrStatusText('Starting OCR engine...');
      } catch (prepErr) {
        console.warn('Image preprocessing failed, using original:', prepErr);
        preprocessedBlob = file; // fallback: use raw file
      }

      // ── Step B: Tesseract.js WASM OCR with progress callbacks
      worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'loading tesseract core') {
            setOcrStatusText('Loading OCR engine...');
            setOcrProgress(Math.round(m.progress * 20));
          } else if (m.status === 'initializing tesseract') {
            setOcrStatusText('Initializing OCR...');
            setOcrProgress(20 + Math.round(m.progress * 20));
          } else if (m.status === 'loading language traineddata') {
            setOcrStatusText('Loading language data...');
            setOcrProgress(40 + Math.round(m.progress * 20));
          } else if (m.status === 'initializing api') {
            setOcrStatusText('Preparing text recognition...');
            setOcrProgress(60 + Math.round(m.progress * 10));
          } else if (m.status === 'recognizing text') {
            setOcrStatusText('Reading prescription text...');
            setOcrProgress(70 + Math.round(m.progress * 29));
          }
        }
      });

      setOcrStatusText('Running text recognition...');
      const result = await worker.recognize(preprocessedBlob);
      await worker.terminate();
      worker = null;

      setOcrProgress(100);
      setOcrStatusText('Extraction complete');

      const rawText = result.data.text || '';
      console.log('[OCR] Raw Tesseract output:\n', rawText);

      if (!rawText.trim()) {
        throw new Error(
          'No text could be extracted from the uploaded image. ' +
          'Please ensure the image is clear, well-lit, and contains printed text.'
        );
      }

      // ── Step C: Send raw text to backend NLP (same endpoint as voice flow)
      setOcrStatusText('Extracting medications from text...');
      const extractRes = await SmartCareAPI.extractMedicationsFromOcr(rawText, token);
      const meds = extractRes.medications || [];

      if (meds.length === 0) {
        // Honest empty state — show no medicines found
        setExtractedMeds([]);
        setExtractionWarning(
          'OCR ran successfully but no medication patterns were confidently identified in this prescription image. ' +
          'This may happen with handwritten prescriptions or unusual formatting. ' +
          'You can add medicines manually using the "Add Medicine" button below.'
        );
      } else if (meds.some((m: ExtractedMedicationDetail) => m.has_missing_fields)) {
        setExtractionWarning(
          'Some fields (dosage, frequency, or duration) could not be read clearly from the prescription. ' +
          'Please review and complete the highlighted fields before confirming.'
        );
      }

      setExtractedMeds(meds);
      setIsAnalyzing(false);
      setFlowState('review');

    } catch (err: any) {
      if (worker) {
        try { await worker.terminate(); } catch (_) {}
      }
      setIsAnalyzing(false);
      setFlowState('sample');
      setIsSampleMode(true);
      setUploadError(err.message || 'Prescription OCR failed. Please try again with a clearer image.');
      console.error('[OCR] Error:', err);
    } finally {
      // Don't revoke — we need the URL for the preview
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MEDICINE EDITING (same pattern as MedicationAssistant Screen 3)
  // ─────────────────────────────────────────────────────────────────────────
  const boolVal = (val?: string) => Boolean(val && val.trim());

  const handleAddCustomMed = () => {
    const newMed: ExtractedMedicationDetail = {
      medicine_name: '',
      dosage: '1 tablet',
      frequency: 'twice daily',
      intake_times: ['08:00', '20:00'],
      food_instruction: 'after food',
      duration: '5 days',
      start_date: new Date().toISOString().split('T')[0],
      special_instructions: '',
      has_missing_fields: true
    };
    setExtractedMeds(prev => [...prev, newMed]);
    setEditingMedIndex(extractedMeds.length);
    setMedEditForm(newMed);
  };

  const handleSaveMedEdit = () => {
    if (editingMedIndex !== null && medEditForm) {
      const updated = [...extractedMeds];
      updated[editingMedIndex] = {
        ...medEditForm,
        has_missing_fields: !boolVal(medEditForm.medicine_name) || !boolVal(medEditForm.dosage)
      };
      setExtractedMeds(updated);
      setEditingMedIndex(null);
      setMedEditForm(null);
    }
  };

  const handleRemoveMed = (index: number) => {
    setExtractedMeds(prev => prev.filter((_, i) => i !== index));
    if (editingMedIndex === index) {
      setEditingMedIndex(null);
      setMedEditForm(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIRM — calls existing /api/medications/confirm endpoint
  // ─────────────────────────────────────────────────────────────────────────
  const handleConfirmMedications = async () => {
    if (extractedMeds.length === 0) {
      alert('No medications to confirm. Please add at least one medicine.');
      return;
    }
    const invalid = extractedMeds.find(m => !m.medicine_name.trim());
    if (invalid) {
      alert('Please enter a medicine name for all listed items before confirming.');
      return;
    }

    setIsConfirming(true);
    try {
      await SmartCareAPI.confirmMedications(extractedMeds, token);
      setFlowState('confirmed');

      // ── Cross-check: fetch latest voice transcription and compare
      try {
        const voiceText = await SmartCareAPI.getLatestVoiceTranscription(token);
        if (voiceText.trim()) {
          const checkRes = await SmartCareAPI.crossCheckMedicines(
            extractedMeds.map(m => ({ name: m.medicine_name, dosage: m.dosage, frequency: m.frequency })),
            voiceText
          );
          setCrossCheckResult(checkRes);
        }
      } catch (ccErr) {
        console.warn('Cross-check failed (non-critical):', ccErr);
      }
    } catch (err: any) {
      alert(`Failed to confirm medications: ${err.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleStartOver = () => {
    setFlowState('sample');
    setIsSampleMode(true);
    setUploadedImageUrl('');
    setExtractedMeds([]);
    setExtractionWarning(null);
    setEditingMedIndex(null);
    setMedEditForm(null);
    setCrossCheckResult(null);
    setOcrProgress(0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Prescription Reader & AI Explainer</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload a prescription image - MediGuide will read the text using on-device OCR and schedule your medication reminders.
        </p>
      </div>

      {/* Upload error banner */}
      {uploadError && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-600/80 text-red-200 space-y-1 shadow-lg">
          <div className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Upload / OCR Error
          </div>
          <p className="text-xs sm:text-sm font-semibold">{uploadError}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          STATE: 'sample' — Demo mode (initial load + after sample selected)
          Shows the original sample prescription viewer unchanged.
          ═══════════════════════════════════════════════════════════════════ */}
      {(flowState === 'sample' || flowState === 'ocr') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left column */}
          <div className="lg:col-span-5 space-y-6">
            <ImageUploader
              onSelectSample={handleSelectSample}
              onCustomUpload={handleCustomUpload}
            />
            <OCRProcessor
              imageUrl={isSampleMode ? selectedPrescription.imageUrl : uploadedImageUrl}
              isAnalyzing={isAnalyzing}
              confidence={isSampleMode ? selectedPrescription.ocrConfidence : 0}
              ocrProgress={ocrProgress}
              ocrStatusText={ocrStatusText}
            />
          </div>

          {/* Right column — only shown in sample/demo mode */}
          {isSampleMode && (
            <div className="lg:col-span-7 space-y-6">
              <SafetyDisclaimer message={selectedPrescription.safetyDisclaimer} />

              {selectedPrescription.error_warning && (
                <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-600/80 text-amber-200 space-y-2 shadow-lg">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">⚠ OCR Extraction Alert</div>
                  <p className="text-xs sm:text-sm font-semibold">{selectedPrescription.error_warning}</p>
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
                  <span className="text-xs text-slate-400 font-mono">Doctor: {selectedPrescription.doctorName}</span>
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
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          STATE: 'review' — OCR done, showing extracted meds for user review
          Mirrors MedicationAssistant Screen 3 style
          ═══════════════════════════════════════════════════════════════════ */}
      {flowState === 'review' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: image preview */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Uploaded Prescription</h3>
              <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src={uploadedImageUrl}
                  alt="Uploaded prescription"
                  className="w-full object-contain max-h-96"
                />
              </div>
              <button
                onClick={handleStartOver}
                className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Upload Different Image
              </button>
            </div>
          </div>

          {/* Right: medication review panel */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">

              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">Step 2 — Review & Confirm</span>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Pill className="w-5 h-5 text-teal-400" />
                    Extracted Medications
                  </h3>
                </div>
                <button
                  onClick={handleAddCustomMed}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-300 border border-teal-500/30 flex items-center gap-1"
                >
                  + Add Medicine
                </button>
              </div>

              {/* Strict verification disclaimer */}
              <div className="bg-teal-950/40 border border-teal-800/60 p-4 rounded-2xl flex items-start gap-3 text-xs text-teal-200">
                <ShieldCheck className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-bold block text-white">Prescription Verification Required</strong>
                  <span>
                    OCR may misread text — always verify the medicine name, dosage, and frequency against your physical prescription
                    before confirming. Edit any incorrect fields using the Edit button.
                  </span>
                </div>
              </div>

              {/* Extraction warning */}
              {extractionWarning && (
                <div className="bg-amber-950/40 border border-amber-800 text-amber-200 p-4 rounded-2xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{extractionWarning}</span>
                </div>
              )}

              {/* Medicine cards */}
              <div className="space-y-4">
                {extractedMeds.length === 0 ? (
                  <div className="bg-slate-950 p-6 rounded-2xl text-center text-xs text-slate-400 border border-slate-800 space-y-3">
                    <p className="font-semibold text-slate-300">No medicines confidently identified from image.</p>
                    <p>Please upload a clearer image, or add medicines manually.</p>
                    <button
                      onClick={handleAddCustomMed}
                      className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs"
                    >
                      Add Medicine Manually
                    </button>
                  </div>
                ) : (
                  extractedMeds.map((med, idx) => {
                    const isEditing = editingMedIndex === idx;
                    return (
                      <div key={idx} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                        {!isEditing ? (
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-bold text-white">
                                  {med.medicine_name || (
                                    <span className="text-rose-400 underline font-mono">[Missing Medicine Name — Edit Required]</span>
                                  )}
                                </h4>
                                {med.has_missing_fields && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Missing Fields
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Dosage</span>
                                  <span className="font-semibold text-slate-200">{med.dosage || 'Not specified'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Frequency</span>
                                  <span className="font-semibold text-slate-200">{med.frequency || 'Not specified'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Reminder Times</span>
                                  <span className="font-semibold text-teal-400 font-mono">{med.intake_times?.join(', ') || '08:00'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Food</span>
                                  <span className="font-semibold text-slate-200">{med.food_instruction || 'None'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                                  <span className="font-semibold text-slate-200">{med.duration || 'Not specified'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setEditingMedIndex(idx); setMedEditForm({ ...med }); }}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleRemoveMed(idx)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Inline editor */
                          <div className="space-y-4 bg-slate-900 p-4 rounded-xl border border-teal-500">
                            <h5 className="text-xs font-bold text-teal-400 uppercase">Edit Medicine Details</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">Medicine Name *</label>
                                <input
                                  type="text"
                                  value={medEditForm?.medicine_name || ''}
                                  onChange={e => setMedEditForm(prev => prev ? { ...prev, medicine_name: e.target.value } : null)}
                                  placeholder="e.g. Metformin 500mg"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">Dosage</label>
                                <input
                                  type="text"
                                  value={medEditForm?.dosage || ''}
                                  onChange={e => setMedEditForm(prev => prev ? { ...prev, dosage: e.target.value } : null)}
                                  placeholder="e.g. 500mg / 1 tablet"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">Frequency</label>
                                <input
                                  type="text"
                                  value={medEditForm?.frequency || ''}
                                  onChange={e => setMedEditForm(prev => prev ? { ...prev, frequency: e.target.value } : null)}
                                  placeholder="e.g. Twice daily / BD / 1-0-1"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">Duration</label>
                                <input
                                  type="text"
                                  value={medEditForm?.duration || ''}
                                  onChange={e => setMedEditForm(prev => prev ? { ...prev, duration: e.target.value } : null)}
                                  placeholder="e.g. 7 days"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">Food Instruction</label>
                                <input
                                  type="text"
                                  value={medEditForm?.food_instruction || ''}
                                  onChange={e => setMedEditForm(prev => prev ? { ...prev, food_instruction: e.target.value } : null)}
                                  placeholder="e.g. After food / AC / PC"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingMedIndex(null); setMedEditForm(null); }}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveMedEdit}
                                className="px-4 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold"
                              >
                                Save Details
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Confirm button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Upload Different Image
                </button>

                <button
                  onClick={handleConfirmMedications}
                  disabled={isConfirming || extractedMeds.length === 0}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isConfirming ? 'Saving & Scheduling...' : 'Confirm & Schedule Reminders'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          STATE: 'confirmed' — Success state + cross-check card
          ═══════════════════════════════════════════════════════════════════ */}
      {flowState === 'confirmed' && (
        <div className="space-y-6 max-w-3xl mx-auto">

          {/* Success banner */}
          <div className="bg-emerald-950/60 border border-emerald-700 rounded-3xl p-6 text-center space-y-3 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white">Medications Confirmed!</h2>
            <p className="text-sm text-emerald-200">
              Your prescription medicines have been saved and reminder schedules created.
            </p>
            <p className="text-xs text-slate-400">
              {extractedMeds.length} medication{extractedMeds.length !== 1 ? 's' : ''} added to your reminder dashboard.
            </p>

            {/* Link to patient dashboard where MedicationAssistant lives */}
            <a
              href="/patient"
              className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/30 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              View Reminders Dashboard
            </a>
          </div>

          {/* Confirmed medicines summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Confirmed Medications ({extractedMeds.length})
            </h3>
            <div className="space-y-3">
              {extractedMeds.map((med, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white text-sm block">{med.medicine_name}</span>
                    <span className="text-slate-400">
                      {med.dosage} · {med.frequency} · {med.food_instruction || 'as directed'}
                    </span>
                    <span className="text-teal-400 font-mono block">
                      Reminders: {med.intake_times?.join(', ')}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-check card (only shown if a voice transcription exists) */}
          {crossCheckResult && crossCheckResult.status === 'completed' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Prescription vs. Doctor Voice — Cross-Check</h3>
              </div>

              {crossCheckResult.matches.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Matched in Both Sources</span>
                  {crossCheckResult.matches.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{m.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {crossCheckResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Warnings</span>
                  {crossCheckResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {crossCheckResult.matches.length === 0 && crossCheckResult.warnings.length === 0 && (
                <p className="text-xs text-slate-400">No cross-check data available.</p>
              )}
            </div>
          )}

          {/* Start over button */}
          <div className="text-center">
            <button
              onClick={handleStartOver}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Scan Another Prescription
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
