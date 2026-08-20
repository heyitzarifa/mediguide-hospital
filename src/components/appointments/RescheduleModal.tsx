import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { SmartCareAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { AppointmentRecord } from '../../types';

interface RescheduleModalProps {
  appointment: AppointmentRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  appointment,
  onClose,
  onSuccess
}) => {
  const { token } = useAuth();

  const [newDate, setNewDate] = useState<string>(
    appointment.appointmentDate || new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
  }, [newDate]);

  const loadSlots = async () => {
    setIsLoadingSlots(true);
    setSelectedSlot('');
    setErrorMessage(null);
    try {
      const res = await SmartCareAPI.getAvailableSlots(
        appointment.doctorId,
        appointment.doctorName,
        newDate
      );
      setAvailableSlots(res.availableSlots || []);
      if (res.availableSlots && res.availableSlots.length > 0) {
        setSelectedSlot(res.availableSlots[0]);
      }
    } catch (e: any) {
      console.warn('Failed to load slots:', e.message);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !selectedSlot) {
      setErrorMessage('Please select a new date and time slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await SmartCareAPI.rescheduleAppointment(appointment.id, newDate, selectedSlot, token);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reschedule appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white">
            <Calendar className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold">Reschedule Appointment</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1 text-xs">
          <strong className="text-white block font-bold">{appointment.doctorName}</strong>
          <span className="text-slate-400 block">{appointment.departmentName} OPD</span>
          <span className="text-teal-400 font-mono block">Patient: {appointment.patientName}</span>
        </div>

        {errorMessage && (
          <div className="bg-rose-950/60 border border-rose-800 p-3.5 rounded-2xl text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Select New Date *</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>Select New Available Time Slot *</span>
              {isLoadingSlots && <span className="text-teal-400 animate-pulse text-[10px]">Loading slots...</span>}
            </label>

            {availableSlots.length === 0 ? (
              <p className="p-3 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                No slots available on this date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold border transition-all text-center ${
                      selectedSlot === slot
                        ? 'bg-teal-500 text-slate-950 border-teal-400 font-black shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedSlot}
              className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold flex items-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
