import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Bot, X, Send, Compass, Calendar, Clock, FileText, 
  ArrowRight, RotateCcw, Building2, 
  Stethoscope, Eye, Activity 
} from 'lucide-react';
import type { AppViewTab, UserRole, ChatMessage, ChatAction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SmartCareAPI } from '../../services/api';
import { MOCK_HOSPITALS } from '../../data/mockData';

interface AIChatboxProps {
  onNavigateToTab: (tab: AppViewTab, options?: { destinationId?: string; openBookingModal?: boolean; departmentName?: string }) => void;
  activeHospitalId?: string;
  onHospitalChange?: (hospId: string) => void;
}

export const AIChatbox: React.FC<AIChatboxProps> = ({ 
  onNavigateToTab, 
  activeHospitalId = 'hosp-main',
  onHospitalChange 
}) => {
  const { user } = useAuth();
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
          "Create an appointment",
          "Show today's queue",
          "Check doctor availability",
          "Receptionist workflow"
        ];
      case 'MANAGEMENT':
        return [
          "Show today's appointments",
          "Show queue statistics",
          "Show doctor availability",
          "Hospital operational summary"
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
          "Book an appointment",
          "Where is Cardiology?",
          "What's my queue status?",
          "Explain my prescription"
        ];
    }
  };

  // Generate initial welcome message when opened or role/hospital changes
  const initWelcomeMessage = (currentRole: UserRole, hospName: string): ChatMessage => {
    let roleText = "How can I assist your visit today? 😊";
    if (currentRole === 'PATIENT') roleText = "I can help you book an OPD appointment, navigate to departments, check your live queue token, or explain prescriptions!";
    if (currentRole === 'STAFF') roleText = "I can assist you with live OPD queue updates, patient appointments, and receptionist workflows.";
    if (currentRole === 'MANAGEMENT') roleText = "I can provide real-time hospital occupancy analytics, doctor utilization rates, and queue statistics.";
    if (currentRole === 'VISITOR') roleText = "I can help you find departments, cafeteria & parking locations, and check visiting hours.";

    return {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Hi there! 👋 I am your SmartCare Assistant for **${hospName}**.\n${roleText}`,
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
      const responseMsg = await SmartCareAPI.sendChatMessage(
        textToSend,
        role,
        selectedHospitalId
      );
      setMessages(prev => [...prev, responseMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: "I experienced a temporary network issue. Please try again or click below to browse features directly.",
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
        text: `Switched context to **${targetHosp.name}** (ID: \`${targetHosp.id}\`). All doctors, appointments, live queues, and turn maps are now using ${targetHosp.name}'s data.`,
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
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-6 h-6 text-slate-950 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
          </div>
          <span className="text-sm font-extrabold tracking-wide hidden sm:inline text-slate-950">💬 SmartCare AI</span>
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
                  <h3 className="font-bold text-sm text-white leading-tight">💬 SmartCare AI</h3>
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
              <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/80 p-3 rounded-2xl w-28 border border-slate-700">
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
              placeholder={`Ask AI in ${role.toLowerCase()} context...`}
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
