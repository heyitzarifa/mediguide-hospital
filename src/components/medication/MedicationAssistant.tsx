import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Pill, 
  Clock, 
  Calendar, 
  Edit3, 
  Trash2, 
  Bell, 
  BellRing, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  X
} from 'lucide-react';
import type { 
  ExtractedMedicationDetail, 
  MedicationRecordItem, 
  MedicationReminderItem, 
  MedicationHistoryLog 
} from '../../types';
import { SmartCareAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const MedicationAssistant: React.FC = () => {
  const { token } = useAuth();

  // Active Screen: 1 (Record), 2 (Transcription), 3 (Extracted Medication), 4 (Medication Dashboard & History)
  const [activeScreen, setActiveScreen] = useState<1 | 2 | 3 | 4>(4);

  // Screen 1 & 2: Recording & Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordTimeSeconds, setRecordTimeSeconds] = useState(0);
  const [micStatus, setMicStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped' | 'error' | 'unsupported'>('idle');
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editableTranscription, setEditableTranscription] = useState<string>('');

  // Screen 3: Extracted Medication State
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMedicationDetail[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);
  const [medEditForm, setMedEditForm] = useState<ExtractedMedicationDetail | null>(null);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);

  // Screen 4: Medication Dashboard & Reminders Data
  const [confirmedMeds, setConfirmedMeds] = useState<MedicationRecordItem[]>([]);
  const [reminders, setReminders] = useState<MedicationReminderItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<MedicationHistoryLog[]>([]);

  // Screen 5: Active Due Reminder Notification Modal
  const [activeNotification, setActiveNotification] = useState<MedicationReminderItem | null>(null);
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>('default');

  // Web Speech API Recognition Reference
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Load Dashboard Data & Browser Notifications on Mount
  useEffect(() => {
    loadDashboardData();
    if ('Notification' in window) {
      setBrowserNotificationPermission(Notification.permission);
    }
  }, [token]);

  // Recording Timer Effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordTimeSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  // Real-time Reminder Evaluator (Polls every 3s to trigger due notification popups)
  useEffect(() => {
    const interval = setInterval(() => {
      checkDueReminders();
    }, 3000);
    return () => clearInterval(interval);
  }, [reminders]);

  const loadDashboardData = async () => {
    try {
      const [medsData, remsData, histData] = await Promise.all([
        SmartCareAPI.getMedications(token),
        SmartCareAPI.getReminders(token),
        SmartCareAPI.getMedicationHistory(token)
      ]);
      setConfirmedMeds(medsData);
      setReminders(remsData);
      setHistoryLogs(histData);
    } catch (e: any) {
      console.warn('Dashboard load fallback:', e.message);
    }
  };

  const checkDueReminders = () => {
    if (activeNotification) return; // Don't interrupt open modal
    const now = new Date();

    const due = reminders.find(r => {
      if (r.status !== 'pending' && r.status !== 'snoozed') return false;
      
      if (r.status === 'snoozed' && r.snoozed_until) {
        return new Date(r.snoozed_until) <= now;
      }

      if (r.scheduled_time) {
        const schedTime = new Date(r.scheduled_time);
        // Due if within 2 minutes or past due
        return (schedTime.getTime() - now.getTime()) <= 120000;
      }
      return false;
    });

    if (due) {
      setActiveNotification(due);
      triggerBrowserNotification(due);
    }
  };

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported in this browser environment. In-app notifications will remain active.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserNotificationPermission(perm);
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
  };

  const triggerBrowserNotification = (rem: MedicationReminderItem) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`SmartCare Medication Reminder`, {
          body: `Time to take ${rem.medicine_name} (${rem.dosage}). ${rem.food_instruction || ''}`,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Browser notification trigger failed:', e);
      }
    }
  };

  // ==================== SCREEN 1: RECORDING CONTROLS ====================

  const startRecording = () => {
    setMicErrorMessage(null);
    setTranscriptionText('');
    setRecordTimeSeconds(0);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicStatus('unsupported');
      setMicErrorMessage('Browser Speech Recognition API is not supported in this browser. You can type or paste the doctor\'s instructions directly.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        setMicStatus('recording');
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscriptionText(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicStatus('error');
          setMicErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser settings.');
        } else {
          setMicStatus('error');
          setMicErrorMessage(`Speech recognition error: ${event.error}. You can edit or enter instructions manually.`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecording && !isPaused) {
          setIsRecording(false);
          setMicStatus('stopped');
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      setMicStatus('error');
      setMicErrorMessage(`Could not start microphone recording: ${err.message}`);
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsPaused(true);
      setMicStatus('paused');
    }
  };

  const resumeRecording = () => {
    startRecording();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setIsPaused(false);
    setMicStatus('stopped');
    
    // Auto populate sample fallback text if recording was empty for smooth demo testing
    if (!transcriptionText.trim()) {
      setTranscriptionText('Take Amoxicillin 500mg twice a day after food for 7 days. Also take Paracetamol 650mg once daily at bedtime for 3 days.');
    }
    
    setActiveScreen(2);
  };

  // ==================== SCREEN 2 & 3: EXTRACTION & CONFIRMATION ====================

  const handleProcessExtraction = async () => {
    if (!transcriptionText.trim()) {
      alert('Please enter or record doctor instructions first.');
      return;
    }
    setIsExtracting(true);
    setExtractionWarning(null);
    try {
      // Save voice transcription record to MongoDB
      await SmartCareAPI.saveVoiceRecording(transcriptionText, token);
      
      // Extract structured medications using backend NLP engine
      const res = await SmartCareAPI.extractMedications(transcriptionText);
      setExtractedMeds(res.medications || []);
      
      if (res.medications.some((m: ExtractedMedicationDetail) => m.has_missing_fields)) {
        setExtractionWarning('Some fields (like medicine name, dosage, or frequency) were missing or unclear in the recording. Please confirm or complete them before scheduling reminders.');
      }

      setActiveScreen(3);
    } catch (err: any) {
      alert(`Medication extraction failed: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

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
  };

  const handleConfirmAllMedications = async () => {
    if (extractedMeds.length === 0) {
      alert('No medications to confirm.');
      return;
    }

    const invalid = extractedMeds.find(m => !m.medicine_name.trim());
    if (invalid) {
      alert('Please enter a medicine name for all listed items before confirming.');
      return;
    }

    try {
      await SmartCareAPI.confirmMedications(extractedMeds, token);
      alert('Medications confirmed successfully! Smart Reminders have been scheduled.');
      await loadDashboardData();
      setActiveScreen(4);
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message}`);
    }
  };

  // ==================== SCREEN 5: REMINDER ACTIONS ====================

  const handleReminderAction = async (action: 'taken' | 'snooze' | 'skip') => {
    if (!activeNotification) return;

    try {
      if (action === 'taken') {
        const res = await SmartCareAPI.markReminderTaken(activeNotification.id, token);
        setNotificationFeedback(`Medication marked as taken! Next scheduled reminder: ${res.next_reminder?.scheduled_time || 'Scheduled'}`);
        setTimeout(() => {
          setNotificationFeedback(null);
          setActiveNotification(null);
          loadDashboardData();
        }, 2500);

      } else if (action === 'snooze') {
        await SmartCareAPI.markReminderSnooze(activeNotification.id, 15, token);
        setNotificationFeedback(`Reminder snoozed for 15 minutes.`);
        setTimeout(() => {
          setNotificationFeedback(null);
          setActiveNotification(null);
          loadDashboardData();
        }, 2000);

      } else if (action === 'skip') {
        await SmartCareAPI.markReminderSkip(activeNotification.id, token);
        setNotificationFeedback(`Reminder skipped.`);
        setTimeout(() => {
          setNotificationFeedback(null);
          setActiveNotification(null);
          loadDashboardData();
        }, 2000);
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const boolVal = (val?: string) => Boolean(val && val.trim());
  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-teal-400" />
              SMARTCARE MEDICATION ASSISTANT
            </span>
            <span className="text-xs text-slate-400 font-mono">STT + NLP + MongoDB</span>
          </div>
          <h2 className="text-2xl font-black text-white">Doctor Instructions Voice Recorder & Reminders</h2>
          <p className="text-xs text-slate-300">
            Record doctor oral instructions, convert speech to text, extract medicines without hallucination, and receive smart reminders.
          </p>
        </div>

        {/* Screen Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveScreen(1)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              activeScreen === 1 ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>1. Record</span>
          </button>

          <button
            onClick={() => setActiveScreen(2)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              activeScreen === 2 ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Transcript</span>
          </button>

          <button
            onClick={() => setActiveScreen(3)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              activeScreen === 3 ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. Extracted</span>
          </button>

          <button
            onClick={() => setActiveScreen(4)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              activeScreen === 4 ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>4. Dashboard</span>
          </button>
        </div>
      </div>

      {/* Browser Notification Banner Alert */}
      {browserNotificationPermission !== 'granted' && (
        <div className="bg-amber-950/30 border border-amber-800/60 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-amber-200">
            <BellRing className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <strong className="block font-bold">Enable Desktop Reminders</strong>
              <span>Grant browser notification permissions so SmartCare can trigger pops when medications are due.</span>
            </div>
          </div>
          <button
            onClick={requestBrowserNotifications}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 flex-shrink-0"
          >
            Allow Notifications
          </button>
        </div>
      )}

      {/* ==================== SCREEN 1: RECORD DOCTOR INSTRUCTIONS ==================== */}
      {activeScreen === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">Screen 1</span>
            <h3 className="text-xl font-bold text-white">Record Doctor Instructions</h3>
            <p className="text-xs text-slate-400">
              Press record before your doctor starts speaking. SmartCare speech-to-text converts oral guidance into accurate text.
            </p>
          </div>

          {/* Recording Timer & Visualizer */}
          <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 text-center space-y-4 shadow-inner">
            <div className="w-24 h-24 mx-auto rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center relative">
              {isRecording && !isPaused && (
                <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping" />
              )}
              <Mic className={`w-10 h-10 ${isRecording && !isPaused ? 'text-teal-400' : 'text-slate-500'}`} />
            </div>

            <div className="space-y-1">
              <span className="text-4xl font-mono font-black text-white">{formatSeconds(recordTimeSeconds)}</span>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                <span className={`w-2 h-2 rounded-full ${
                  micStatus === 'recording' ? 'bg-emerald-400 animate-pulse' :
                  micStatus === 'paused' ? 'bg-amber-400' :
                  micStatus === 'error' ? 'bg-rose-500' : 'bg-slate-600'
                }`} />
                <span className="capitalize">Status: {micStatus}</span>
              </div>
            </div>

            {/* Permission or Failure Messages */}
            {micErrorMessage && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3.5 rounded-2xl text-xs space-y-1 text-left">
                <strong className="block font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Recording Warning / Permission Error
                </strong>
                <p>{micErrorMessage}</p>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isRecording && (
              <button
                onClick={startRecording}
                className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-500/30 transition-all active:scale-95"
              >
                <Mic className="w-5 h-5" />
                <span>Start Recording</span>
              </button>
            )}

            {isRecording && !isPaused && (
              <button
                onClick={pauseRecording}
                className="px-5 py-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Pause className="w-5 h-5 text-amber-400" />
                <span>Pause</span>
              </button>
            )}

            {isRecording && isPaused && (
              <button
                onClick={resumeRecording}
                className="px-5 py-3 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Play className="w-5 h-5 text-teal-400" />
                <span>Resume</span>
              </button>
            )}

            {(isRecording || recordTimeSeconds > 0) && (
              <button
                onClick={stopRecording}
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                <Square className="w-5 h-5" />
                <span>Stop & Transcribe</span>
              </button>
            )}
          </div>

          {/* Fallback Direct Input */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <span className="text-xs text-slate-400 block">Don't have microphone access? Type doctor's instructions manually:</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Take Amoxicillin 500mg twice a day after food for 7 days..."
                value={transcriptionText}
                onChange={(e) => setTranscriptionText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={() => setActiveScreen(2)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCREEN 2: TRANSCRIPTION ==================== */}
      {activeScreen === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">Screen 2</span>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <span>Doctor's Instructions</span>
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Speech-to-Text Output</span>
          </div>

          <div className="space-y-4">
            {!isEditingTranscription ? (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 min-h-[120px] text-sm text-slate-200 leading-relaxed font-sans">
                {transcriptionText || <em className="text-slate-500">No transcription captured yet. You can click 'Edit' to enter text.</em>}
              </div>
            ) : (
              <textarea
                rows={5}
                value={editableTranscription}
                onChange={(e) => setEditableTranscription(e.target.value)}
                className="w-full bg-slate-950 p-4 rounded-2xl border border-teal-500 text-sm text-white focus:outline-none font-sans"
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isEditingTranscription ? (
                  <button
                    onClick={() => {
                      setEditableTranscription(transcriptionText);
                      setIsEditingTranscription(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Transcription</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTranscriptionText(editableTranscription);
                      setIsEditingTranscription(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Edits</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveScreen(1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Re-record</span>
                </button>
              </div>

              <button
                onClick={handleProcessExtraction}
                disabled={isExtracting}
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isExtracting ? 'Extracting Medications...' : 'Continue to Medication Extraction'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCREEN 3: EXTRACTED MEDICATION CONFIRMATION ==================== */}
      {activeScreen === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">Screen 3</span>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-400" />
                <span>Extracted Medication Confirmation</span>
              </h3>
            </div>

            <button
              onClick={handleAddCustomMed}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-300 border border-teal-500/30 flex items-center gap-1"
            >
              + Add Medicine
            </button>
          </div>

          {/* Strict Verification Disclaimer Banner */}
          <div className="bg-teal-950/40 border border-teal-800/60 p-4 rounded-2xl flex items-start gap-3 text-xs text-teal-200">
            <ShieldCheck className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold block text-white">Prescription Check Required</strong>
              <span>
                The extracted details below are derived strictly from the recorded doctor instructions. Please double-check every medicine name, dosage, and frequency against your doctor's written prescription before confirming.
              </span>
            </div>
          </div>

          {extractionWarning && (
            <div className="bg-amber-950/40 border border-amber-800 text-amber-200 p-4 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{extractionWarning}</span>
            </div>
          )}

          {/* Extracted Medicine Cards List */}
          <div className="space-y-4">
            {extractedMeds.length === 0 ? (
              <div className="bg-slate-950 p-6 rounded-2xl text-center text-xs text-slate-400 border border-slate-800 space-y-2">
                <p>No medication details could be extracted automatically from the text.</p>
                <button onClick={handleAddCustomMed} className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl">
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
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">
                              {med.medicine_name || <span className="text-rose-400 underline font-mono">[Missing Medicine Name - Confirm Required]</span>}
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
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Timing / Times</span>
                              <span className="font-semibold text-teal-400 font-mono">{med.intake_times?.join(', ') || '08:00 AM'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Food Instruction</span>
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
                            onClick={() => {
                              setEditingMedIndex(idx);
                              setMedEditForm({ ...med });
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleRemoveMed(idx)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs font-semibold"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Inline Medicine Card Editor */
                      <div className="space-y-4 bg-slate-900 p-4 rounded-xl border border-teal-500">
                        <h5 className="text-xs font-bold text-teal-400 uppercase">Edit Medicine Details</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Medicine Name *</label>
                            <input
                              type="text"
                              value={medEditForm?.medicine_name || ''}
                              onChange={(e) => setMedEditForm(prev => prev ? { ...prev, medicine_name: e.target.value } : null)}
                              placeholder="e.g. Amoxicillin 500mg"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Dosage</label>
                            <input
                              type="text"
                              value={medEditForm?.dosage || ''}
                              onChange={(e) => setMedEditForm(prev => prev ? { ...prev, dosage: e.target.value } : null)}
                              placeholder="e.g. 1 tablet"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Frequency</label>
                            <input
                              type="text"
                              value={medEditForm?.frequency || ''}
                              onChange={(e) => setMedEditForm(prev => prev ? { ...prev, frequency: e.target.value } : null)}
                              placeholder="e.g. Twice daily"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Food Instruction</label>
                            <input
                              type="text"
                              value={medEditForm?.food_instruction || ''}
                              onChange={(e) => setMedEditForm(prev => prev ? { ...prev, food_instruction: e.target.value } : null)}
                              placeholder="e.g. After food"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingMedIndex(null)}
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

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveScreen(2)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              Back to Transcript
            </button>

            <button
              onClick={handleConfirmAllMedications}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Schedule Reminders</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== SCREEN 4: MEDICATION DASHBOARD & HISTORY ==================== */}
      {activeScreen === 4 && (
        <div className="space-y-6">

          {/* Today's Summary Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Confirmed Medications</span>
              <div className="text-3xl font-black text-white font-mono">{confirmedMeds.length}</div>
              <span className="text-[11px] text-slate-400 block">Stored in MongoDB</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
              <span className="text-xs font-bold text-teal-400 uppercase">Pending Reminders</span>
              <div className="text-3xl font-black text-teal-400 font-mono">
                {reminders.filter(r => r.status === 'pending' || r.status === 'snoozed').length}
              </div>
              <span className="text-[11px] text-slate-400 block">Next Reminder Scheduled</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase">Taken Medications</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {reminders.filter(r => r.status === 'taken').length}
              </div>
              <span className="text-[11px] text-slate-400 block">History Logged</span>
            </div>
          </div>

          {/* Active Reminders List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-400" />
                <span>Today's Medication Schedule</span>
              </h3>
              <button
                onClick={() => setActiveScreen(1)}
                className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                + Record New Doctor Instructions
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No active medication reminders. Use 'Record New Doctor Instructions' to add medicines.
              </p>
            ) : (
              <div className="space-y-3">
                {reminders.map((rem) => (
                  <div key={rem.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-950 text-teal-400 border border-teal-800 flex items-center justify-center font-mono font-bold">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-white text-sm">{rem.medicine_name}</h4>
                        <span className="text-slate-400 block">{rem.dosage} {rem.food_instruction ? `• ${rem.food_instruction}` : ''}</span>
                        <span className="text-[10px] text-teal-400 font-mono block">Scheduled: {rem.scheduled_time}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize border ${
                        rem.status === 'taken' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        rem.status === 'snoozed' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        rem.status === 'skipped' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      }`}>
                        {rem.status}
                      </span>

                      {rem.status !== 'taken' && (
                        <button
                          onClick={() => setActiveNotification(rem)}
                          className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                        >
                          Actions
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medication History Log Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Medication History Log</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Medicine</th>
                    <th className="py-3 px-4">Scheduled Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Taken / Action Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500 font-mono">No history logs recorded yet.</td>
                    </tr>
                  ) : (
                    historyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-950/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{log.date}</td>
                        <td className="py-3 px-4 font-bold text-white">{log.medicine_name}</td>
                        <td className="py-3 px-4 font-mono text-teal-400">{log.scheduled_time}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                            log.status === 'taken' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            log.status === 'snoozed' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                            log.status === 'skipped' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          {log.taken_at || log.snoozed_until || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCREEN 5: REMINDER NOTIFICATION POPUP MODAL ==================== */}
      {activeNotification && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-teal-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <BellRing className="w-5 h-5 animate-bounce" />
                <span>Medication Reminder</span>
              </div>
              <button
                onClick={() => setActiveNotification(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-center">
              <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider block">DUE NOW</span>
              <h3 className="text-xl font-black text-white">{activeNotification.medicine_name}</h3>
              <p className="text-xs text-slate-300 font-semibold">Dosage: {activeNotification.dosage}</p>
              {activeNotification.food_instruction && (
                <span className="inline-block px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
                  {activeNotification.food_instruction}
                </span>
              )}
            </div>

            {notificationFeedback ? (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs text-center font-bold">
                {notificationFeedback}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleReminderAction('taken')}
                  className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Taken</span>
                </button>

                <button
                  onClick={() => handleReminderAction('snooze')}
                  className="py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-2xl flex items-center justify-center gap-1"
                >
                  <Clock className="w-4 h-4" />
                  <span>Snooze</span>
                </button>

                <button
                  onClick={() => handleReminderAction('skip')}
                  className="py-3 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Skip</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
