import React, { useState, useEffect } from 'react';
import type { DepartmentQueue, QueueUpdatePayload } from '../types';
import { SmartCareAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AppointmentBookingModal } from '../components/appointments/AppointmentBookingModal';
import { Stethoscope, Play, CheckCircle, Plus, RefreshCw, ShieldCheck, Calendar } from 'lucide-react';

export const StaffDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [departmentName, setDepartmentName] = useState('Cardiology');
  const [queue, setQueue] = useState<DepartmentQueue | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isStaffBookingOpen, setIsStaffBookingOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    const data = await SmartCareAPI.getQueuePrediction(departmentName);
    setQueue(data);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    try {
      const apts = await SmartCareAPI.getAppointments(undefined, token);
      setAppointments(apts);
    } catch (e) {
      console.warn('Failed to fetch staff appointments');
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchAppointments();
    const interval = setInterval(() => {
      fetchQueue();
      fetchAppointments();
    }, 4000);
    return () => clearInterval(interval);
  }, [departmentName, token]);

  const handleAssignToken = async (aptId: string) => {
    setAssigningId(aptId);
    try {
      const res = await SmartCareAPI.assignTokenToAppointment(aptId, token);
      setMessage(`Successfully assigned Token #${res.assignedTokenNumber} to ${res.patientName}! Patient notified.`);
      await fetchAppointments();
      await fetchQueue();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to assign token');
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setAssigningId(null);
    }
  };

  const handleUpdate = async (payload: QueueUpdatePayload) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const updated = await SmartCareAPI.updateQueue(payload, token);
      setQueue(updated);
      setMessage(`Successfully executed: ${payload.action}`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    handleUpdate({
      departmentName,
      action: 'add_patient',
      patientName: newPatientName
    });
    setNewPatientName('');
    setIsAddPatientOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-teal-800/40 p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              STAFF PORTAL ACTIVE
            </span>
            <span className="text-xs text-slate-400 font-mono">Assigned: {user?.department || 'Cardiology OPD'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Live Staff OPD Queue Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Staff members control queue operations. Advancing tokens or updating doctor status immediately recalculates patient wait times and updates patient dashboards via database API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsStaffBookingOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment for Patient</span>
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 font-semibold block">Logged in as</span>
            <span className="text-sm font-bold text-white">{user?.name || 'Nurse Sarah Jenkins'}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-bold animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Staff Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Actions & Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Token Call Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Department Queue</span>
              <select
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="bg-slate-950 text-teal-300 border border-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="Cardiology">Cardiology OPD</option>
                <option value="Neurology">Neurology OPD</option>
                <option value="Emergency & Trauma">Emergency & Trauma</option>
                <option value="Orthopedics">Orthopedics OPD</option>
              </select>
            </div>

            {queue && (
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-3 relative overflow-hidden">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">CURRENT TOKEN BEING SERVED</div>
                <div className="text-6xl font-black text-teal-400 tracking-tight font-mono">
                  #{queue.currentToken}
                </div>
                <div className="text-xs text-slate-300 font-semibold">
                  Doctor: <span className="text-white font-bold">{queue.doctorName}</span> ({queue.roomNumber})
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleUpdate({ departmentName, action: 'call_next' })}
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-base shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Call Next Token (#{queue ? queue.currentToken + 1 : 25})</span>
              </button>

              <button
                onClick={() => setIsAddPatientOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Add Walk-in Patient to Queue</span>
              </button>
            </div>

            {/* Doctor Status Switcher */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Doctor Availability Status:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Consulting', 'Available', 'On Break', 'In Emergency'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdate({ departmentName, action: 'update_status', doctorStatus: st })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      queue?.doctorStatus === st
                        ? 'bg-teal-950 border-teal-500 text-teal-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal for Adding Walk-in Patient */}
          {isAddPatientOpen && (
            <div className="bg-slate-900 border border-slate-700 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Add Patient to {departmentName}</h3>
                <button onClick={() => setIsAddPatientOpen(false)} className="text-xs text-slate-400">Cancel</button>
              </div>
              <form onSubmit={handleAddPatientSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Patient Full Name"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                >
                  Issue Token #{queue ? queue.tokenList.length + 22 : 39}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Right Column: Live Waiting Patients Table */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">OPD Waiting List Tokens</h3>
                <p className="text-xs text-slate-400">Changes made here synchronize immediately with patient views.</p>
              </div>
              <button
                onClick={fetchQueue}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {queue && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {queue.tokenList.map((t) => {
                  const isCurrent = t.tokenNumber === queue.currentToken;
                  const isCompleted = t.tokenNumber < queue.currentToken;

                  return (
                    <div
                      key={t.tokenNumber}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-teal-950/60 border-teal-500 text-teal-200'
                          : isCompleted
                          ? 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-70'
                          : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl font-mono font-bold text-xs flex items-center justify-center ${
                          isCurrent ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{t.tokenNumber}
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-white">{t.patientName || `Patient #${t.tokenNumber}`}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{t.estimatedTime}</span>
                        </div>
                      </div>

                      <div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          isCurrent
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 animate-pulse'
                            : isCompleted
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                          {isCurrent ? 'In Examination' : isCompleted ? 'Completed' : 'Waiting'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* New Booked Appointments Section for Staff Token Assignment */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>New Booked Appointments ({appointments.length})</span>
                </h3>
                <p className="text-xs text-slate-400">Click "Assign Next Token" to generate sequential token and notify patient.</p>
              </div>
              <button
                onClick={fetchAppointments}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-bold transition-all"
              >
                Refresh
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No new appointments pending token assignment.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{apt.patientName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {apt.patientCode || apt.patientId}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.assignedTokenNumber ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {apt.assignedTokenNumber ? `Assigned #${apt.assignedTokenNumber}` : apt.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Dept: <strong className="text-slate-200">{apt.departmentName}</strong></span>
                        <span>Doctor: <strong className="text-slate-200">{apt.doctorName}</strong></span>
                      </div>
                      <div className="text-xs text-teal-400/90 font-mono">
                        📅 {apt.appointmentDate} at {apt.appointmentTime}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssignToken(apt.id)}
                      disabled={assigningId === apt.id || !!apt.assignedTokenNumber}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all shrink-0 ${
                        apt.assignedTokenNumber
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                          : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20 active:scale-95'
                      }`}
                    >
                      {assigningId === apt.id
                        ? 'Assigning...'
                        : apt.assignedTokenNumber
                        ? `Assigned #${apt.assignedTokenNumber}`
                        : 'Assign Next Token'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Appointment Booking Modal */}
      {isStaffBookingOpen && (
        <AppointmentBookingModal
          isStaffMode={true}
          onClose={() => setIsStaffBookingOpen(false)}
          onSuccess={() => {
            setMessage('Appointment created on behalf of patient successfully!');
            setTimeout(() => setMessage(null), 4000);
          }}
        />
      )}

    </div>
  );
};
