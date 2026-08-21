import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Bot, X, Send, Compass, Calendar, Clock, FileText, 
  ArrowRight, RotateCcw, Building2, 
  Stethoscope, Eye, Activity 
} from 'lucide-react';
import type { AppViewTab, UserRole, ChatMessage, ChatAction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SmartCareAPI } from '../../services/api';
import { MOCK_LOCATIONS, MOCK_HOSPITALS } from '../../data/mockData';

interface AIChatboxProps {
  onNavigateToTab: (tab: AppViewTab, options?: { destinationId?: string; openBookingModal?: boolean; departmentName?: string }) => void;
  activeHospitalId?: string;
  onHospitalChange?: (hospId: string) => void;
}

// ─── Intent detection ──────────────────────────────────────────────────────────
type Intent =
  | 'navigation'
  | 'appointment'
  | 'queue'
  | 'prescription'
  | 'greeting'
  | 'thanks'
  | 'safety'
  | 'booking'
  | 'visitor'
  | 'staff_workflow'
  | 'management'
  | 'unknown';

function detectIntent(q: string): Intent {
  const t = q.toLowerCase().trim();
  if (t === 'hi' || t === 'hello' || t === 'hey' || t.startsWith('hi ') || t.startsWith('hello ')) return 'greeting';
  if (t.includes('thank') || t.includes('great') || t.includes('awesome')) return 'thanks';
  if (t.includes('diagnose') || t.includes('stop taking') || t.includes('change dose') || t.includes('side effect')) return 'safety';
  if (t.includes('book') || t.includes('reserve') || t.includes('schedule appointment') || t.includes('cardiologist') || t.includes('neurologist')) return 'booking';
  if (t.includes('prescription') || t.includes('medicine') || t.includes('dose') || t.includes('scan') || t.includes('explain') || t.includes('pill') || t.includes('drug')) return 'prescription';
  if (t.includes('queue') || t.includes('token') || t.includes('ahead') || t.includes('wait') || t.includes('how long') || t.includes('line')) return 'queue';
  if (t.includes('appointment') || t.includes('my doctor') || t.includes('who is my doctor') || t.includes('dr.') || t.includes('when is my') || t.includes('consultation')) return 'appointment';
  if (t.includes('where') || t.includes('route') || t.includes('direction') || t.includes('go to') || t.includes('find') || t.includes('show me') || t.includes('cardio') || t.includes('neuro') || t.includes('er') || t.includes('emergency') || t.includes('pharmacy') || t.includes('lab') || t.includes('ortho') || t.includes('pedia') || t.includes('radio') || t.includes('icu') || t.includes('cafe') || t.includes('restroom') || t.includes('navigation')) return 'navigation';
  if (t.includes('visiting') || t.includes('visiting hours') || t.includes('parking') || t.includes('wifi') || t.includes('visitor') || t.includes('cafeteria')) return 'visitor';
  if (t.includes('reception') || t.includes('checkin') || t.includes('call next') || t.includes('availability')) return 'staff_workflow';
  if (t.includes('summary') || t.includes('utilization') || t.includes('stats') || t.includes('capacity')) return 'management';
  return 'unknown';
}

// ─── Location match from query ─────────────────────────────────────────────────
function matchLocation(q: string) {
  const t = q.toLowerCase();
  return (
    MOCK_LOCATIONS.find(l =>
      t.includes(l.name.toLowerCase()) ||
      t.includes(l.category.toLowerCase()) ||
      (t.includes('cardio') && l.category === 'Cardiology') ||
      (t.includes('neuro') && l.category === 'Neurology') ||
      ((t.includes('emergency') || t.includes(' er ') || t.includes('trauma')) && l.category === 'Emergency') ||
      (t.includes('pharmacy') && l.category === 'Pharmacy') ||
      ((t.includes('lab') || t.includes('blood')) && l.category === 'Laboratory') ||
      (t.includes('ortho') && l.category === 'Orthopedics') ||
      (t.includes('pedia') && l.category === 'Pediatrics') ||
      (t.includes('radio') || (t.includes('mri') || t.includes('xray') || t.includes('x-ray'))) && l.category === 'Radiology' ||
      (t.includes('icu') && l.category === 'ICU') ||
      ((t.includes('cafe') || t.includes('food') || t.includes('dining')) && l.category === 'Cafeteria') ||
      (t.includes('restroom') && l.category === 'Restroom')
    ) || MOCK_LOCATIONS.find(l => l.category === 'Cardiology') // default fallback
  );
}

export const AIChatbox: React.FC<AIChatboxProps> = ({ 
  onNavigateToTab, 
  activeHospitalId = 'hosp-main',
  onHospitalChange 
}) => {
  const { user, token } = useAuth();
  const role: UserRole = user?.role || 'PATIENT';

  const [isOpen, setIsOpen] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(activeHospitalId);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeHospital = MOCK_HOSPITALS.find(h => h.id === selectedHospitalId) || MOCK_HOSPITALS[0];

  // Role-based suggested quick prompts
  const getSuggestedPrompts = (currentRole: UserRole) => {
    switch (currentRole) {
      case 'STAFF':
        return [
          "Show today's queue",
          "Check doctor availability",
          "Receptionist workflow",
          "Create an appointment"
        ];
      case 'MANAGEMENT':
        return [
          "Hospital operational summary",
          "Show queue statistics",
          "Show doctor availability",
          "Show today's appointments"
        ];
      case 'VISITOR':
        return [
          "Visiting hours & rules",
          "Where is the Cafeteria?",
          "Parking & Wifi info",
          "Emergency entrance"
        ];
      case 'PATIENT':
      default:
        return [
          "Where is Cardiology?",
          "What is my token number?",
          "When is my appointment?",
          "Explain my prescription"
        ];
    }
  };

  // Generate initial welcome message when opened or role/hospital changes
  const initWelcomeMessage = (currentRole: UserRole, hospName: string): ChatMessage => {
    let roleText = "How can I assist your visit today? 😊";
    if (currentRole === 'PATIENT') roleText = "Ask me where to go, your token number, appointment time, doctor's name, or to explain your prescription!";
    if (currentRole === 'STAFF') roleText = "I can assist you with live OPD queue updates, patient appointments, and receptionist workflows.";
    if (currentRole === 'MANAGEMENT') roleText = "I can provide real-time hospital occupancy analytics, doctor utilization rates, and queue statistics.";
    if (currentRole === 'VISITOR') roleText = "I can help you find departments, cafeteria & parking locations, and check visiting hours.";

    return {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Hi there! 👋 I'm **MediGuide AI** for **${hospName}**.\n${roleText}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([initWelcomeMessage(role, activeHospital.name)]);
    }
  }, [role, selectedHospitalId]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Core send handler — tries live data first, then generic backend ──────────
  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const responseMsg = await buildSmartResponse(textToSend);
      setMessages(prev => [...prev, responseMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: "I experienced a temporary issue. Please try again or browse features directly.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: {
            type: 'navigate',
            label: 'Open Navigation',
            payload: { tab: 'navigation' }
          }
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // ─── Smart response builder — fetches real data before falling back ───────────
  const buildSmartResponse = async (query: string): Promise<ChatMessage> => {
    const intent = detectIntent(query);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hosp = activeHospital;

    // ── NAVIGATION: fetch real location match ──
    if (intent === 'navigation') {
      // Try live search first
      let loc = null;
      try {
        const results = await SmartCareAPI.searchLocations(query);
        loc = results[0] || null;
      } catch (_) {}
      if (!loc) loc = matchLocation(query);

      if (loc) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `📍 **${loc.name}** is on **${loc.floorName}** (Room ${loc.roomNumber}).\n${loc.description}\n\nWould you like me to show you the turn-by-turn route?`,
          timestamp: ts,
          action: {
            type: 'navigate',
            label: '🗺️ Show Navigation Route',
            payload: { destinationId: loc.id, tab: 'navigation' }
          },
          cardData: {
            title: loc.name,
            subtitle: `${loc.floorName} • Room ${loc.roomNumber}`,
            details: [
              { label: 'Category', value: loc.category },
              { label: 'Floor', value: loc.floorName },
              { label: 'Room', value: loc.roomNumber },
              { label: 'Hospital', value: hosp.name }
            ]
          }
        };
      }
    }

    // ── APPOINTMENT: fetch real patient appointments ──
    if (intent === 'appointment') {
      if (role === 'PATIENT') {
        try {
          const apts = await SmartCareAPI.getPatientAppointments(token);
          if (apts && apts.length > 0) {
            // Find the next upcoming/confirmed appointment
            const upcoming = apts.find(a =>
              a.status === 'confirmed' || a.status === 'scheduled' || a.status === 'booked'
            ) || apts[0];
            return {
              id: `msg-${Date.now()}`,
              sender: 'assistant',
              text: `📅 Your appointment is with **${upcoming.doctor_name}** (${upcoming.department_name}) on **${upcoming.appointment_date}** at **${upcoming.appointment_time}**.\n\nStatus: ${(upcoming.status || 'Scheduled').toUpperCase()}`,
              timestamp: ts,
              action: {
                type: 'view_appointment',
                label: '📋 View Appointment',
                payload: { tab: 'patient' }
              },
              cardData: {
                title: upcoming.doctor_name || 'Your Doctor',
                subtitle: upcoming.department_name || 'Department',
                details: [
                  { label: 'Date', value: upcoming.appointment_date || '—' },
                  { label: 'Time', value: upcoming.appointment_time || '—' },
                  { label: 'Status', value: upcoming.status?.toUpperCase() || 'Scheduled' },
                  { label: 'Token', value: upcoming.token_number ? `#${upcoming.token_number}` : 'Not assigned yet' }
                ]
              }
            };
          } else {
            return {
              id: `msg-${Date.now()}`,
              sender: 'assistant',
              text: `You don't have any upcoming appointments at ${hosp.name}. Would you like to book one?`,
              timestamp: ts,
              action: {
                type: 'book_appointment',
                label: '📅 Book an Appointment',
                payload: { tab: 'patient', openBookingModal: true, departmentName: 'Cardiology' }
              }
            };
          }
        } catch (_) {
          // fallback to generic
        }
      }
      // Non-patient roles → fall through to generic backend
    }

    // ── QUEUE / TOKEN: fetch real queue prediction ──
    if (intent === 'queue') {
      if (role === 'PATIENT') {
        try {
          // Get patient's appointment dept first
          const apts = await SmartCareAPI.getPatientAppointments(token);
          const dept = (apts && apts.length > 0) ? apts[0].department_name || 'Cardiology' : 'Cardiology';
          const queue = await SmartCareAPI.getQueuePrediction(dept);
          const tokenNum = (apts && apts.length > 0 && apts[0].token_number) ? `#${apts[0].token_number}` : 'Not assigned yet';
          const ahead = queue.currentToken && tokenNum !== 'Not assigned yet'
            ? Math.max(0, parseInt(tokenNum.replace('#', ''), 10) - parseInt(String(queue.currentToken).replace('#', '').replace('A-', '').replace('B-', ''), 10))
            : queue.patientsAhead ?? '—';
          const eta = queue.estimatedWaitMinutes ?? '—';

          return {
            id: `msg-${Date.now()}`,
            sender: 'assistant',
            text: `🎫 **${dept} OPD Queue**\n\nYour token: **${tokenNum}**\nCurrent serving: **${queue.currentToken || '—'}**\nPatients ahead: **${ahead}**\nEstimated wait: **${eta} minutes**`,
            timestamp: ts,
            action: {
              type: 'view_queue',
              label: '📊 View Live Queue',
              payload: { tab: 'queue' }
            },
            cardData: {
              title: `${dept} OPD Queue`,
              subtitle: `Your Token: ${tokenNum}`,
              details: [
                { label: 'Your Token', value: tokenNum },
                { label: 'Current Token', value: String(queue.currentToken || '—') },
                { label: 'Patients Ahead', value: String(ahead) },
                { label: 'Est. Wait', value: `${eta} min` }
              ]
            }
          };
        } catch (_) {
          // fallback to generic
        }
      }
    }

    // ── PRESCRIPTION ──
    if (intent === 'prescription') {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `📄 You can upload or photograph your prescription and MediGuide AI will:\n• Extract medicine names, dosages & schedules\n• Explain each medicine in plain language\n• Set medication reminders for you\n\nTap below to open the Prescription Reader.`,
        timestamp: ts,
        action: {
          type: 'scan_prescription',
          label: '📷 Open Prescription Reader',
          payload: { tab: 'prescription' }
        },
        cardData: {
          title: 'AI Prescription Reader',
          subtitle: 'OCR + Plain Language Explainer',
          details: [
            { label: 'Supports', value: 'JPG, PNG, Camera' },
            { label: 'Languages', value: 'English + Indian shorthand' }
          ]
        }
      };
    }

    // ── GREETING ──
    if (intent === 'greeting') {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Hi there! 👋 I'm MediGuide AI for **${hosp.name}**. I can help you:\n• 🗺️ Find any department\n• 📅 Check your appointment\n• 🎫 Check your token & wait time\n• 📄 Read your prescription\n\nWhat do you need?`,
        timestamp: ts
      };
    }

    // ── THANKS ──
    if (intent === 'thanks') {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `You're very welcome! 😊 Wishing you great health. Let me know if you need anything else.`,
        timestamp: ts
      };
    }

    // ── SAFETY DISCLAIMER ──
    if (intent === 'safety') {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `I'm not able to make medical decisions — please consult your doctor or pharmacist. I can help explain information already on your prescription.`,
        timestamp: ts,
        action: {
          type: 'scan_prescription',
          label: '📷 Scan Prescription',
          payload: { tab: 'prescription' }
        }
      };
    }

    // ── BOOKING ──
    if (intent === 'booking') {
      const q = query.toLowerCase();
      let dept = 'Cardiology';
      if (q.includes('neuro')) dept = 'Neurology';
      if (q.includes('ortho')) dept = 'Orthopedics';
      if (q.includes('pedia')) dept = 'Pediatrics';
      if (q.includes('emergency')) dept = 'Emergency';
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Sure! 😊 Let's book your **${dept}** appointment at ${hosp.name}. Click below to open the booking form.`,
        timestamp: ts,
        action: {
          type: 'book_appointment',
          label: '📅 Book Appointment',
          payload: { tab: 'patient', openBookingModal: true, departmentName: dept }
        },
        cardData: {
          title: `Book ${dept} OPD`,
          subtitle: hosp.name,
          details: [
            { label: 'Department', value: dept },
            { label: 'Hospital', value: hosp.name },
            { label: 'Mode', value: 'Step-by-step Wizard' }
          ]
        }
      };
    }

    // ── VISITOR ──
    if (intent === 'visitor') {
      try {
        const info = await SmartCareAPI.getVisitorInfo();
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `🏥 **Visitor Information — ${hosp.name}**\n\n⏰ Visiting hours: ${info.visitingHours}\n🚗 Parking: ${info.parkingInfo}\n☕ Cafeteria: ${info.cafeteriaLocation}\n📶 WiFi: ${info.wifiDetails}`,
          timestamp: ts,
          action: {
            type: 'view_visitor',
            label: '👁️ Visitor Guide',
            payload: { tab: 'visitor' }
          }
        };
      } catch (_) {}
    }

    // ── STAFF WORKFLOW ──
    if (intent === 'staff_workflow' && role === 'STAFF') {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Welcome to the Staff Workflow. You can call the next patient token, assign doctors, and update queue statuses in the Staff Console.`,
        timestamp: ts,
        action: {
          type: 'view_staff',
          label: 'Open Staff Console',
          payload: { tab: 'staff' }
        }
      };
    }

    // ── MANAGEMENT ──
    if (intent === 'management' && role === 'MANAGEMENT') {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Operational Summary for ${hosp.name}: Real-time analytics, doctor utilization, and queue data available in the Management Portal.`,
        timestamp: ts,
        action: {
          type: 'view_management',
          label: 'Open Management Portal',
          payload: { tab: 'management' }
        }
      };
    }

    // ── GENERIC BACKEND FALLBACK (preserves existing /chat endpoint behavior) ──
    try {
      const responseMsg = await SmartCareAPI.sendChatMessage(
        query,
        role,
        selectedHospitalId,
        token
      );
      return responseMsg;
    } catch (_) {}

    // Final unknown fallback
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: `I can help you with:\n• 🗺️ Finding departments (e.g. "Where is Cardiology?")\n• 🎫 Your token & wait time\n• 📅 Your appointment details\n• 📄 Reading your prescription\n\nWhat would you like to know?`,
      timestamp: ts
    };
  };

  const handleResetChat = () => {
    setMessages([initWelcomeMessage(role, activeHospital.name)]);
  };

  const handleActionClick = (action: ChatAction) => {
    const tab = action.payload?.tab || 'navigation';
    const destId = action.payload?.destinationId;
    const deptName = action.payload?.departmentName;
    const isBook = action.type === 'book_appointment';

    onNavigateToTab(tab, { 
      destinationId: destId, 
      openBookingModal: isBook,
      departmentName: deptName
    });
  };

  const handleSelectHospital = (hospId: string) => {
    setSelectedHospitalId(hospId);
    if (onHospitalChange) onHospitalChange(hospId);
    const targetHosp = MOCK_HOSPITALS.find(h => h.id === hospId) || MOCK_HOSPITALS[0];
    setMessages([
      {
        id: `hosp-switch-${Date.now()}`,
        sender: 'assistant',
        text: `Switched to **${targetHosp.name}**. All departments, appointments, queues, and navigation are now using ${targetHosp.name}'s data.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper icon for action buttons
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'navigate': return <Compass className="w-4 h-4" />;
      case 'view_appointment': 
      case 'book_appointment': return <Calendar className="w-4 h-4" />;
      case 'view_queue': return <Clock className="w-4 h-4" />;
      case 'scan_prescription': return <FileText className="w-4 h-4" />;
      case 'view_staff': return <Stethoscope className="w-4 h-4" />;
      case 'view_management': return <Activity className="w-4 h-4" />;
      case 'view_visitor': return <Eye className="w-4 h-4" />;
      default: return <ArrowRight className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-xl shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all group border border-teal-300/40"
          aria-label="Open MediGuide AI"
        >
          <div className="relative">
            <Sparkles className="w-6 h-6 text-slate-950 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
          </div>
          <span className="text-sm font-extrabold tracking-wide hidden sm:inline text-slate-950">💬 MediGuide AI</span>
        </button>
      )}

      {/* Expandable Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[640px] h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20">
                <Sparkles className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white leading-tight">💬 MediGuide AI</h3>
                  <span className="bg-teal-500/20 text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-teal-500/30">
                    ONLINE
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span className="text-slate-300 font-medium">{role} Context</span>
                  <span>•</span>
                  <span className="text-teal-400 truncate max-w-[150px]">{activeHospital.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset Conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close Assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hospital Context Selector Switcher Bar */}
          <div className="bg-slate-950/80 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[11px] font-medium">Hospital Context:</span>
            </div>
            <select
              value={selectedHospitalId}
              onChange={(e) => handleSelectHospital(e.target.value)}
              className="bg-slate-800 text-teal-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {MOCK_HOSPITALS.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 border border-slate-700/80 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {/* Text content with simple formatting */}
                  <p className="whitespace-pre-line font-normal">
                    {msg.text}
                  </p>

                  {/* Card Data View if present */}
                  {msg.cardData && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-teal-500/30 text-xs space-y-2">
                      {msg.cardData.title && (
                        <div className="font-bold text-teal-300 flex items-center justify-between">
                          <span>{msg.cardData.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{msg.cardData.subtitle}</span>
                        </div>
                      )}
                      {msg.cardData.details && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800 text-[11px]">
                          {msg.cardData.details.map((d, idx) => (
                            <div key={idx} className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">{d.label}</span>
                              <span className="font-semibold text-slate-200">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contextual Action Button */}
                  {msg.action && (
                    <div className="mt-3 pt-2 border-t border-slate-700/60">
                      <button
                        onClick={() => handleActionClick(msg.action!)}
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-teal-500/20 active:scale-98"
                      >
                        {getActionIcon(msg.action.type)}
                        <span>{msg.action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-950" />
                      </button>
                    </div>
                  )}

                  <span className={`block text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-teal-200/80 text-right' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/80 p-3 rounded-2xl w-32 border border-slate-700">
                <Bot className="w-4 h-4 text-teal-400 animate-spin" />
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips Bar */}
          <div className="bg-slate-900 p-2.5 border-t border-slate-800 overflow-x-auto whitespace-nowrap flex items-center gap-2">
            {getSuggestedPrompts(role).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendQuery(prompt)}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-teal-500/20 hover:border-teal-500/50 text-teal-300 text-[11px] font-medium border border-slate-700 transition-colors flex-shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask MediGuide AI anything..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
