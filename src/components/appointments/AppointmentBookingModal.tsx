import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Stethoscope, Building2, AlertCircle, CheckCircle2, X, Compass, ArrowRight } from 'lucide-react';
import { SmartCareAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { DoctorRecord, AppViewTab } from '../../types';

interface AppointmentBookingModalProps {
  onClose: () => void;
  onSuccess: () => void;
  isStaffMode?: boolean;
  initialDepartment?: string;
  onNavigateToTab?: (tab: AppViewTab, options?: { destinationId?: string }) => void;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  onClose,
  onSuccess,
  isStaffMode = false,
  initialDepartment = 'Cardiology',
  onNavigateToTab
}) => {
  const { token, user } = useAuth();

  // Patients list for staff mode
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Department & Doctor selection
  const [departments] = useState<string[]>([
    'Cardiology',
    'Neurology',
    'Emergency & Trauma',
    'Orthopedics',
    'Pediatrics',
    'Radiology & X-Ray'
  ]);
  const [selectedDept, setSelectedDept] = useState<string>(initialDepartment || 'Cardiology');
  
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);

  // Date & Time Slot selection
  const [aptDate, setAptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [allSlots, setAllSlots] = useState<string[]>([
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Status & Confirmation Result
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    doctorName: string;
    departmentName: string;
    appointmentDate: string;
    appointmentTime: string;
    tokenNumber: string;
    roomNumber: string;
    destId: string;
  } | null>(null);

  // Load doctors & patients on mount or department change
  useEffect(() => {
    loadDoctors();
    if (isStaffMode) {
      loadPatients();
    }
  }, [selectedDept, isStaffMode]);

  // Load available slots whenever selected doctor or date changes
  useEffect(() => {
    if (selectedDoctor && aptDate) {
      loadSlots();
    }
  }, [selectedDoctor, aptDate]);

  const loadDoctors = async () => {
    try {
      const docList = await SmartCareAPI.getPublicDoctors(selectedDept);
      setDoctors(docList);
      if (docList.length > 0) {
        setSelectedDoctor(docList[0]);
      } else {
        setSelectedDoctor(null);
      }
    } catch (e) {
      console.warn('Failed to load doctors list');
    }
  };

  const loadPatients = async () => {
    try {
      const patList = await SmartCareAPI.getManagementPatients(token);
      setPatients(patList);
      if (patList.length > 0) {
        setSelectedPatientId(patList[0].userId || patList[0].id);
      }
    } catch (e) {
      console.warn('Failed to load patients list');
    }
  };

  const loadSlots = async () => {
    if (!selectedDoctor) return;
    setIsLoadingSlots(true);
    setSelectedSlot('');
    setErrorMessage(null);
    try {
      const res = await SmartCareAPI.getAvailableSlots(selectedDoctor.id, selectedDoctor.name, aptDate);
      const avail = res.availableSlots || [];
      const booked = res.bookedSlots || [];
      setAvailableSlots(avail);
      setBookedSlots(booked);
      if (res.allSlots && res.allSlots.length > 0) {
        setAllSlots(res.allSlots);
      }
      if (avail.length > 0) {
        setSelectedSlot(avail[0]);
      }
    } catch (e: any) {
      console.warn('Failed to load available time slots:', e.message);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) {
      setErrorMessage('Please select a doctor.');
      return;
    }
    if (!aptDate || !selectedSlot) {
      setErrorMessage('Please select an available date and time slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        doctor_id: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        department_name: selectedDept,
        appointment_date: aptDate,
        appointment_time: selectedSlot,
        reason: reason.trim() || 'General OPD Consultation'
      };

      if (isStaffMode) {
        if (!selectedPatientId) {
          setErrorMessage('Please select a patient for this appointment.');
          setIsSubmitting(false);
          return;
        }
        const patObj = patients.find(p => p.userId === selectedPatientId || p.id === selectedPatientId);
        payload.patient_id = selectedPatientId;
        payload.patient_name = patObj?.name || 'Patient';
      } else {
        payload.patient_id = user?.id || 'u-patient-1';
        payload.patient_name = user?.name || 'Alex Morgan';
      }

      const res = await SmartCareAPI.bookAppointment(payload, token);
      
      // Determine destination ID for turn-by-turn map
      let destId = 'loc-cardio-l2';
      if (selectedDept.includes('Neuro')) destId = 'loc-neuro-l2';
      if (selectedDept.includes('Emerg')) destId = 'loc-er-l0';
      if (selectedDept.includes('Ortho')) destId = 'loc-ortho-l2';
      if (selectedDept.includes('Pedia')) destId = 'loc-pedia-l1';

      setConfirmedBooking({
        id: res.appointment?.id || `apt-${Date.now()}`,
        doctorName: selectedDoctor.name,
        departmentName: selectedDept,
        appointmentDate: aptDate,
        appointmentTime: selectedSlot,
        tokenNumber: 'A-027',
        roomNumber: selectedDoctor.roomNumber || 'Room 204',
        destId
      });

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to book appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionClick = (targetTab: AppViewTab, destId?: string) => {
    onClose();
    if (onNavigateToTab) {
      onNavigateToTab(targetTab, { destinationId: destId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans">
        
        {/* If Confirmation State is Active */}
        {confirmedBooking ? (
          <div className="space-y-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                CONFIRMED
              </span>
              <h3 className="text-2xl font-black text-white pt-2">
                Appointment Booked!
              </h3>
              <p className="text-xs text-slate-300">
                Your appointment has been successfully recorded in the SmartCare system.
              </p>
            </div>

            {/* Confirmation Summary Card */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-base text-white">{confirmedBooking.doctorName}</h4>
                  <p className="text-xs text-teal-400 font-semibold">{confirmedBooking.departmentName} Department ({confirmedBooking.roomNumber})</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">ASSIGNED TOKEN</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">#{confirmedBooking.tokenNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">DATE & TIME</span>
                  <span className="font-bold text-white font-mono">{confirmedBooking.appointmentDate} • {confirmedBooking.appointmentTime}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">QUEUE STATUS</span>
                  <span className="font-bold text-amber-300 font-mono">5 Patients Ahead (~16 min)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleActionClick('patient-dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                <Calendar className="w-4 h-4" />
                <span>View Appointment Details</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                onClick={() => handleActionClick('queue')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Track Live Queue Token</span>
                <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
              </button>

              <button
                onClick={() => handleActionClick('navigation', confirmedBooking.destId)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all"
              >
                <Compass className="w-4 h-4 text-teal-400" />
                <span>Navigate to Doctor ({confirmedBooking.roomNumber})</span>
                <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
              </button>
            </div>
          </div>
        ) : (
          /* Booking Wizard Form */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isStaffMode ? 'Book Appointment for Patient' : 'Book OPD Appointment'}
                  </h3>
                  <p className="text-xs text-slate-400">Select department, doctor, date, and time slot</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Alert Banner */}
            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-800 p-3.5 rounded-2xl text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">

              {/* Staff Mode: Patient Selector */}
              {isStaffMode && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    Select Patient *
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500 font-semibold"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.userId || p.id}>
                        {p.name} ({p.patientCode || p.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 1: Department Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    Step 1: Hospital Department *
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono font-semibold">Active Hospital Context</span>
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500 font-semibold"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} Department
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Doctor Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                  Step 2: Select Consulting Physician *
                </label>
                {doctors.length === 0 ? (
                  <p className="text-slate-400 p-2 font-mono">No active physicians found for this department.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {doctors.map((doc) => {
                      const isSelected = selectedDoctor?.id === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-teal-950/60 border-teal-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <strong className="block font-bold text-sm text-white">{doc.name}</strong>
                            <span className="text-[11px] text-slate-400">{doc.roomNumber} • {doc.departmentName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === 'Consulting' || doc.status === 'Available'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Date Picker */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  Step 3: Appointment Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={aptDate}
                  onChange={(e) => setAptDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              {/* Step 4: Available Time Slots Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    Step 4: Select Available Time Slot *
                  </span>
                  {isLoadingSlots && <span className="text-[10px] text-teal-400 animate-pulse font-mono">Checking slots...</span>}
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {allSlots.map((slot) => {
                    const isAvailable = availableSlots.includes(slot);
                    const isBooked = bookedSlots.includes(slot) || !isAvailable;
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-mono font-bold border transition-all text-center ${
                          isSelected
                            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/30'
                            : isBooked
                            ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed line-through'
                            : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-teal-500/50 hover:text-white'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 5: Reason for Visit */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">Step 5: Reason for Visit / Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Follow-up consultation, chest discomfort, routine checkup"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSlot}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Booking...' : 'Confirm Appointment'}</span>
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  );
};
