import React, { useState, useEffect } from 'react';
import type { DepartmentQueue, AppViewTab, AppointmentRecord } from '../types';
import { SmartCareAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MedicationAssistant } from '../components/medication/MedicationAssistant';
import { AppointmentBookingModal } from '../components/appointments/AppointmentBookingModal';
import { RescheduleModal } from '../components/appointments/RescheduleModal';
import { 
  Clock, 
  Compass, 
  FileText, 
  UserCheck, 
  ShieldCheck, 
  Calendar, 
  Bell, 
  Bot,
  Mic
} from 'lucide-react';

interface PatientDashboardPageProps {
  onTabChange: (tab: AppViewTab) => void;
  onNavigateToTab?: (tab: AppViewTab, options?: { destinationId?: string; openBookingModal?: boolean; departmentName?: string }) => void;
}

export const PatientDashboardPage: React.FC<PatientDashboardPageProps> = ({ onTabChange, onNavigateToTab }) => {
  const { user, token } = useAuth();
  const [patientTab, setPatientTab] = useState<'medication-assistant' | 'queue' | 'appointments' | 'reminders' | 'ai-assistant'>('medication-assistant');

  const [deptName] = useState('Cardiology');
  const [queue, setQueue] = useState<DepartmentQueue | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<string>('Just now');

  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentRecord | null>(null);

  const [aiQuery, setAiQuery] = useState('');
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I am your MediGuide Patient Assistant. How can I help with your OPD visit, medications, or navigation today?' }
  ]);

  const fetchPatientData = async () => {
    const [qData, aptData] = await Promise.all([
      SmartCareAPI.getQueuePrediction(deptName),
      SmartCareAPI.getPatientAppointments(token)
    ]);
    setQueue(qData);
    setAppointments(aptData);
    setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const fetchNotifications = async () => {
    try {
      const res = await SmartCareAPI.checkDayBeforeReminders(token);
      if (res.unreadNotifications) {
        setNotifications(res.unreadNotifications);
      }
    } catch (e) {
      console.warn('Failed to fetch patient notifications');
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await SmartCareAPI.markNotificationRead(notifId, token);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (e) {
      console.warn('Failed to mark notification read');
    }
  };

  useEffect(() => {
    fetchPatientData();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchPatientData();
      fetchNotifications();
    }, 2000);
    return () => clearInterval(interval);
  }, [deptName, token]);

  const handleSendAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    const q = aiQuery;
    setAiQuery('');
    setAiChat(prev => [...prev, { role: 'user', text: q }]);

    setTimeout(() => {
      let resp = "For specific medical questions, please consult your physician. You can check your prescription or navigate to your assigned room in the app.";
      if (q.toLowerCase().includes('queue') || q.toLowerCase().includes('wait')) {
        resp = `Your current Cardiology OPD token is #${queue?.patientToken || 31}. There are currently ${queue?.peopleAhead || 6} patients ahead of you with an estimated wait time of ~${queue?.estimatedWaitMinutes || 30} minutes.`;
      } else if (q.toLowerCase().includes('food') || q.toLowerCase().includes('eat')) {
        resp = "Some medications (like Metformin) should be taken with meals to prevent stomach discomfort. Please verify your scanned prescription timing instructions.";
      }
      setAiChat(prev => [...prev, { role: 'ai', text: resp }]);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Patient Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-800/40 p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              PATIENT PORTAL ACTIVE
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {user?.patientCode || 'PAT-2026-904'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Welcome, {user?.name || 'Alex Morgan'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Personal hospital journey portal: Live token position, indoor turn map, prescription reader & AI assistant.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time Live Sync: {lastSync}</span>
        </div>
      </div>

      {/* Unread Patient Notifications Banner */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="p-4 rounded-2xl bg-teal-950/90 border border-teal-500 text-teal-100 flex items-center justify-between gap-4 shadow-xl animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-teal-300 block uppercase tracking-wider">{notif.title}</span>
                  <p className="text-sm font-semibold text-white mt-0.5">{notif.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleMarkNotificationRead(notif.id)}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0 shadow-md transition-all active:scale-95"
              >
                OK
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Patient Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
        {[
          { id: 'medication-assistant', label: 'Doctor Instructions & Reminders', icon: Mic },
          { id: 'queue', label: 'My Live OPD Queue', icon: Clock },
          { id: 'appointments', label: 'My Appointments', icon: Calendar },
          { id: 'reminders', label: 'Medication Reminders', icon: Bell },
          { id: 'ai-assistant', label: 'AI Health Assistant', icon: Bot }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = patientTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPatientTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 0: MEDICATION ASSISTANT (VOICE RECORDER, EXTRACTION, REMINDERS, HISTORY) */}
      {patientTab === 'medication-assistant' && (
        <MedicationAssistant />
      )}


      {/* TAB 1: MY LIVE OPD QUEUE */}
      {patientTab === 'queue' && queue && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">Active OPD Consultation</span>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{queue.deptName} OPD</span>
                  <span className="text-slate-400 font-normal text-sm">({queue.roomNumber})</span>
                </h2>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                queue.doctorStatus === 'Consulting'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                Doctor Status: {queue.doctorStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">NOW SERVING TOKEN</span>
                <div className="text-4xl font-black text-teal-400 font-mono animate-pulse">#{queue.currentToken}</div>
                <span className="text-[10px] text-slate-400 block font-mono">Updated by Staff</span>
              </div>

              <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-800/60 text-center space-y-1">
                <span className="text-[11px] text-emerald-300 font-bold uppercase">YOUR ASSIGNED TOKEN</span>
                <div className="text-4xl font-black text-white font-mono">#{queue.patientToken}</div>
                <span className="text-[10px] text-emerald-400 block font-semibold">Priority Appointment</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">PATIENTS AHEAD</span>
                <div className="text-4xl font-black text-amber-400 font-mono">{queue.peopleAhead}</div>
                <span className="text-[10px] text-slate-400 block font-semibold">In OPD Queue</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">ESTIMATED WAIT</span>
                <div className="text-4xl font-black text-emerald-400 font-mono">~{queue.estimatedWaitMinutes} <span className="text-base font-semibold">min</span></div>
                <span className="text-[10px] text-slate-400 block font-semibold">Explainable AI Calculation</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Doctor: <strong className="text-white">{queue.doctorName}</strong> | Avg consult: {queue.avgConsultationMinutes} min</span>
              </div>

              <button
                onClick={() => onTabChange('navigation')}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>Navigate to OPD ({queue.roomNumber})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div onClick={() => onTabChange('navigation')} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl cursor-pointer hover:border-teal-500/50 transition-all space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center"><Compass className="w-5 h-5" /></div>
              <h3 className="text-base font-bold text-white">Indoor Navigation</h3>
              <p className="text-xs text-slate-400">Interactive multi-floor SVG map route with turn guidance.</p>
            </div>

            <div onClick={() => onTabChange('prescription')} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl cursor-pointer hover:border-emerald-500/50 transition-all space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
              <h3 className="text-base font-bold text-white">Prescription Reader</h3>
              <p className="text-xs text-slate-400">Upload prescription image for OCR extraction & AI explanations.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENTS */}
      {patientTab === 'appointments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-400" />
              <span>My Scheduled OPD Appointments</span>
            </h3>

            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              + Book New Appointment
            </button>
          </div>

          <div className="space-y-3">
            {appointments.length === 0 ? (
              <div className="bg-slate-950 p-6 rounded-2xl text-center text-xs text-slate-400 border border-slate-800 space-y-2">
                <p>No appointments booked yet.</p>
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl"
                >
                  Book Your First Appointment
                </button>
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{apt.doctorName}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                        apt.status === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        apt.status === 'Rescheduled' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        apt.status === 'Completed' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' :
                        apt.status === 'Cancelled' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                    <span className="text-slate-400 block">{apt.departmentName} OPD {apt.reason ? `• ${apt.reason}` : ''}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Booked via {apt.bookedBy || 'PATIENT'} portal</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-teal-400 font-mono text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                      {apt.appointmentDate} at {apt.appointmentTime}
                    </span>

                    {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setRescheduleApt(apt)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
                        >
                          Reschedule
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to cancel this appointment?')) {
                              await SmartCareAPI.cancelAppointment(apt.id, token);
                              fetchPatientData();
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 font-bold rounded-xl text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REMINDERS & MEDICATION ASSISTANT */}
      {patientTab === 'reminders' && (
        <MedicationAssistant />
      )}

      {/* TAB 4: AI HEALTH ASSISTANT */}
      {patientTab === 'ai-assistant' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <span>MediGuide AI Patient Assistant</span>
          </h3>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {aiChat.map((c, i) => (
              <div key={i} className={`p-3.5 rounded-2xl text-xs ${
                c.role === 'user' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200 ml-8' : 'bg-slate-950 border border-slate-800 text-slate-200 mr-8'
              }`}>
                <strong className="block text-[10px] text-slate-400 uppercase font-mono mb-1">{c.role === 'user' ? 'You' : 'MediGuide AI'}</strong>
                <p>{c.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendAi} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Ask about queue, prescription timing, or hospital rooms..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Ask AI</button>
          </form>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {isBookingModalOpen && (
        <AppointmentBookingModal
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={() => fetchPatientData()}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <RescheduleModal
          appointment={rescheduleApt}
          onClose={() => setRescheduleApt(null)}
          onSuccess={() => fetchPatientData()}
        />
      )}

    </div>
  );
};
