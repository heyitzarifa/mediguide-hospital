import React, { useState, useEffect } from 'react';
import type { 
  ManagementStats, 
  DoctorRecord, 
  StaffRecord, 
  DepartmentRecord, 
  HospitalLocation,
  Hospital
} from '../types';
import { SmartCareAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Users, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  BarChart3, 
  Stethoscope, 
  UserPlus, 
  Plus, 
  MapPin, 
  FileText, 
  CheckCircle,
  QrCode,
  Download,
  Printer,
  X
} from 'lucide-react';

export const ManagementDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'doctors' | 'staff' | 'departments' | 'appointments' | 'analytics' | 'map-manager' | 'reports' | 'hospitals-qr'
  >('overview');

  const [stats, setStats] = useState<ManagementStats | null>(null);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [locations, setLocations] = useState<HospitalLocation[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalQr, setSelectedHospitalQr] = useState<Hospital | null>(null);

  const [loading, setLoading] = useState(false);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isAddLocOpen, setIsAddLocOpen] = useState(false);
  const [isAddHospOpen, setIsAddHospOpen] = useState(false);

  // Form States
  const [docForm, setDocForm] = useState({ name: '', departmentName: 'Cardiology', roomNumber: 'Room 204', status: 'Consulting', avgConsultTimeMins: 5 });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', departmentName: 'Cardiology', roleTitle: 'OPD Charge Nurse' });
  const [deptForm, setDeptForm] = useState({ name: '', floor: 'L1', roomNumber: 'Room 110', description: '' });
  const [locForm, setLocForm] = useState({ name: '', floor: 'L0' as const, roomNumber: 'Room 101', category: 'Cardiology' as const, description: '', x: 400, y: 300 });
  const [hospForm, setHospForm] = useState({ name: '', address: '', logoUrl: '' });

  const fetchAllManagementData = async () => {
    setLoading(true);
    setForbiddenError(null);
    try {
      const [sData, dData, stData, dpData, lData, hData] = await Promise.all([
        SmartCareAPI.getManagementStats(token),
        SmartCareAPI.getDoctors(token),
        SmartCareAPI.getStaff(token),
        SmartCareAPI.getDepartments(token),
        SmartCareAPI.getLocations(),
        SmartCareAPI.getHospitals()
      ]);
      setStats(sData);
      setDoctors(dData);
      setStaffList(stData);
      setDepartments(dpData);
      setLocations(lData);
      setHospitals(hData);
      if (hData.length > 0 && !selectedHospitalQr) {
        setSelectedHospitalQr(hData[0]);
      }
    } catch (err: any) {
      setForbiddenError(err.message || '403 Forbidden: Executive Management permissions required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllManagementData();
  }, [token]);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // Submit Handlers
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await SmartCareAPI.saveDoctor(docForm as any, token);
      setDoctors(updated);
      setIsAddDocOpen(false);
      showNotification(`Successfully added Dr. ${docForm.name}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await SmartCareAPI.saveStaff(staffForm as any, token);
      setStaffList(updated);
      setIsAddStaffOpen(false);
      showNotification(`Successfully added Staff member ${staffForm.name}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await SmartCareAPI.saveDepartment(deptForm as any, token);
      setDepartments(updated);
      setIsAddDeptOpen(false);
      showNotification(`Successfully created ${deptForm.name} Department`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await SmartCareAPI.saveLocation(locForm as any, token);
      setLocations(updated);
      setIsAddLocOpen(false);
      showNotification(`Hospital Map Location '${locForm.name}' saved to DB! Indoor Navigation maps updated immediately.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await SmartCareAPI.createHospital(hospForm, token);
      setHospitals(prev => [res.hospital, ...prev]);
      setSelectedHospitalQr(res.hospital);
      setIsAddHospOpen(false);
      setHospForm({ name: '', address: '', logoUrl: '' });
      showNotification(`Successfully onboarded hospital '${res.hospital.name}'! QR Code generated.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Role Security Guard: If not MANAGEMENT role or 403 Forbidden
  if (forbiddenError || (user && user.role !== 'MANAGEMENT')) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-rose-800/60 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white">403 Forbidden — Backend Authorization Enforced</h2>
          <p className="text-xs text-slate-400">
            {forbiddenError || `Your current role '${user?.role}' is not authorized to access executive management APIs or administrative controls.`}
          </p>
          <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 font-mono">
            Backend Permission Check: MANAGEMENT ROLE ONLY
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-800/40 p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              HOSPITAL MANAGEMENT SUITE
            </span>
            <span className="text-xs text-slate-400 font-mono">Executive Role: MANAGEMENT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Hospital Operational Administration & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Hospital-level operational overview, doctor/staff rosters, department queue analytics, and live SVG map location management.
          </p>
        </div>

        <button
          onClick={fetchAllManagementData}
          className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
        {[
          { id: 'overview', label: 'Hospital Overview', icon: BarChart3 },
          { id: 'hospitals-qr', label: 'Hospital QR Codes', icon: QrCode },
          { id: 'doctors', label: 'Doctor Management', icon: Stethoscope },
          { id: 'staff', label: 'Staff Roster', icon: Users },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'analytics', label: 'Queue & Apt Analytics', icon: Activity },
          { id: 'map-manager', label: 'Hospital Map Manager', icon: MapPin },
          { id: 'reports', label: 'Reports & Settings', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB: HOSPITAL QR & ONBOARDING */}
      {activeTab === 'hospitals-qr' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <QrCode className="w-6 h-6 text-teal-400" />
                Hospital Entrance QR Code Management
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generate, download, and print official reception QR codes with cryptographically signed tokens.
              </p>
            </div>

            <button
              onClick={() => setIsAddHospOpen(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Hospital</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hospital Selector List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Registered Facilities</h3>
              <div className="space-y-2">
                {hospitals.map((hosp) => {
                  const isSelected = selectedHospitalQr?.id === hosp.id;
                  return (
                    <div
                      key={hosp.id}
                      onClick={() => setSelectedHospitalQr(hosp)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected 
                          ? 'bg-teal-950/60 border-teal-500/60 shadow-lg shadow-teal-500/10' 
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img 
                        src={hosp.logoUrl || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80'} 
                        alt={hosp.name} 
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white truncate">{hosp.name}</h4>
                          <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                            {hosp.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{hosp.address}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QR Code Preview & Poster Actions */}
            {selectedHospitalQr && (
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Signed Entrance QR Code</span>
                    <h3 className="text-xl font-extrabold text-white">{selectedHospitalQr.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Signed Token: {selectedHospitalQr.qrToken.substring(0, 24)}...</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a
                      href={SmartCareAPI.getHospitalQRUrl(selectedHospitalQr.id)}
                      download={`MediGuide_QR_${selectedHospitalQr.id}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-4 h-4 text-teal-400" />
                      <span>Download PNG</span>
                    </a>
                    
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Poster</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  {/* Real Backend PNG QR Image */}
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                    <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-teal-500/30">
                      <img
                        src={SmartCareAPI.getHospitalQRUrl(selectedHospitalQr.id)}
                        alt={`QR Code for ${selectedHospitalQr.name}`}
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Live Backend Endpoint: GET /api/hospitals/{selectedHospitalQr.id}/qr
                    </span>
                  </div>

                  {/* Flow Information */}
                  <div className="space-y-4 text-xs text-slate-300">
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Security & Scoping Protocol
                      </h4>
                      <ul className="space-y-1.5 text-slate-400">
                        <li>• Scanning routes to <span className="text-teal-300 font-mono">/h/{selectedHospitalQr.qrToken.substring(0, 12)}...</span></li>
                        <li>• Cryptographically verified by Flask backend using <span className="text-teal-300 font-mono">SECRET_KEY</span></li>
                        <li>• Auto-scopes all appointments, OPD queues, and registrations to {selectedHospitalQr.name}</li>
                        <li>• Rejects tampered tokens with <span className="text-rose-400 font-mono">401 Unauthorized</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 1: HOSPITAL OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Patients Today</span>
              <div className="text-3xl font-black text-white font-mono">{stats.totalPatientsToday}</div>
              <span className="text-[10px] text-emerald-400 font-bold block">↑ +14% vs yesterday</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg OPD Wait Time</span>
              <div className="text-3xl font-black text-amber-400 font-mono">{stats.averageWaitTimeMins} min</div>
              <span className="text-[10px] text-slate-400 font-bold block">Target: &lt; 20 min</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Doctor Utilization</span>
              <div className="text-3xl font-black text-indigo-300 font-mono">{stats.doctorUtilizationRate}%</div>
              <span className="text-[10px] text-indigo-400 font-bold block">{stats.activeDoctorsCount} / {stats.totalDoctorsCount} Active</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Queues</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">{stats.activeQueuesCount}</div>
              <span className="text-[10px] text-slate-400 font-bold block">Across OPD Wings</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Department Operational Status</h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Floor</th>
                    <th className="pb-2">Queue</th>
                    <th className="pb-2">Doctors</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {stats.departmentBreakdown.map((dept, i) => (
                    <tr key={i} className="hover:bg-slate-950/60">
                      <td className="py-2.5 font-bold text-white">{dept.name}</td>
                      <td className="py-2.5 text-slate-400 font-mono">{dept.floor}</td>
                      <td className="py-2.5 font-bold text-amber-400 font-mono">{dept.queueLength} patients</td>
                      <td className="py-2.5 text-slate-300 font-mono">{dept.activeDoctors} Active</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {dept.doctorStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Operational Alerts</h3>
              <div className="space-y-3">
                {stats.alerts?.map((alt) => (
                  <div key={alt.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        alt.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>{alt.severity} PRIORITY</span>
                      <span className="text-[10px] font-mono text-slate-400">{alt.category}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white">{alt.title}</h4>
                    <p className="text-[11px] text-slate-400">{alt.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DOCTOR MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Hospital Doctor Roster Management</h3>
              <p className="text-xs text-slate-400">View, add doctors, update consultation availability, and assign OPD rooms.</p>
            </div>
            <button
              onClick={() => setIsAddDocOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Doctor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doc) => (
              <div key={doc.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{doc.name}</h4>
                      <span className="text-xs text-slate-400">{doc.departmentName} ({doc.roomNumber})</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    doc.status === 'Consulting' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Avg Consult: {doc.avgConsultTimeMins} min/patient</span>
                  <button
                    onClick={() => {
                      const newSt = doc.status === 'Consulting' ? 'Available' : 'Consulting';
                      SmartCareAPI.saveDoctor({ ...doc, status: newSt }, token).then(setDoctors);
                    }}
                    className="text-xs font-bold text-indigo-400 hover:underline"
                  >
                    Toggle Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Staff Roster & OPD Nurse Assignments</h3>
              <p className="text-xs text-slate-400">Manage employee accounts, assign departments, and control staff status.</p>
            </div>
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="space-y-3">
            {staffList.map((st) => (
              <div key={st.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold font-mono">
                    {st.employeeCode}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{st.name}</h4>
                    <span className="text-slate-400">{st.email} | {st.roleTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-teal-300 font-mono">{st.departmentName}</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {st.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DEPARTMENT MANAGEMENT */}
      {activeTab === 'departments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Hospital Department Administration</h3>
              <p className="text-xs text-slate-400">Configure OPD wings, floor levels, room allocations and active load.</p>
            </div>
            <button
              onClick={() => setIsAddDeptOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dp) => (
              <div key={dp.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{dp.name}</h4>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-800">
                    {dp.floor} ({dp.roomNumber})
                  </span>
                </div>
                <p className="text-xs text-slate-400">{dp.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: MAP LOCATION MANAGER (DYNAMIC DB MAP PERSISTENCE) */}
      {activeTab === 'map-manager' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Hospital Location & Map Data Manager</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Managing hospital room locations & SVG coordinates here persists directly to SQLite database and updates the Indoor Navigation map for Patients & Visitors immediately without code edits.
              </p>
            </div>
            <button
              onClick={() => setIsAddLocOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Map Location</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">{loc.name}</h4>
                  <span className="font-mono text-teal-400 font-bold">{loc.floor}</span>
                </div>
                <div className="text-slate-400">
                  Room: <strong className="text-slate-200">{loc.roomNumber}</strong> | Category: <strong className="text-slate-200">{loc.category}</strong>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span>SVG Coordinates: X={loc.x}, Y={loc.y}</span>
                  <span className="text-emerald-400 font-bold">Active on Map</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD DOCTOR */}
      {isAddDocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Add New Doctor</h3>
              <button onClick={() => setIsAddDocOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddDoctor} className="space-y-3 text-xs">
              <input
                type="text" required placeholder="Doctor Name (e.g. Dr. John Doe, MD)"
                value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <input
                type="text" required placeholder="Department Name"
                value={docForm.departmentName} onChange={(e) => setDocForm({ ...docForm, departmentName: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <input
                type="text" required placeholder="Room Number (e.g. Room 204)"
                value={docForm.roomNumber} onChange={(e) => setDocForm({ ...docForm, roomNumber: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Save Doctor Record</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Add New Staff Member</h3>
              <button onClick={() => setIsAddStaffOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <input
                type="text" required placeholder="Staff Full Name"
                value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <input
                type="email" required placeholder="Staff Email Address"
                value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Add Staff Account</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Add New Department</h3>
              <button onClick={() => setIsAddDeptOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddDept} className="space-y-3 text-xs">
              <input
                type="text" required placeholder="Department Name (e.g. Oncology)"
                value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <input
                type="text" required placeholder="Floor (e.g. L3)"
                value={deptForm.floor} onChange={(e) => setDeptForm({ ...deptForm, floor: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <input
                type="text" required placeholder="Room Number (e.g. Room 304)"
                value={deptForm.roomNumber} onChange={(e) => setDeptForm({ ...deptForm, roomNumber: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Save Department</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MAP LOCATION */}
      {isAddLocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Add Hospital Map Location</h3>
              <button onClick={() => setIsAddLocOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddLocation} className="space-y-3 text-xs">
              <input
                type="text" required placeholder="Location Name (e.g. Echo Cardiology Room)"
                value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" required placeholder="Floor (e.g. L2)"
                  value={locForm.floor} onChange={(e) => setLocForm({ ...locForm, floor: e.target.value as any })}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
                <input
                  type="text" required placeholder="Room (e.g. Room 208)"
                  value={locForm.roomNumber} onChange={(e) => setLocForm({ ...locForm, roomNumber: e.target.value })}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" required placeholder="SVG X (0-800)"
                  value={locForm.x} onChange={(e) => setLocForm({ ...locForm, x: parseInt(e.target.value) })}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
                <input
                  type="number" required placeholder="SVG Y (0-600)"
                  value={locForm.y} onChange={(e) => setLocForm({ ...locForm, y: parseInt(e.target.value) })}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Save Location to Hospital Map</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD NEW HOSPITAL */}
      {isAddHospOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" />
                Onboard New Hospital Facility
              </h3>
              <button onClick={() => setIsAddHospOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleAddHospital} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Hospital Name *</label>
                <input
                  type="text" required placeholder="e.g. MetroCare Central Hospital"
                  value={hospForm.name} onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Physical Entrance Address *</label>
                <input
                  type="text" required placeholder="e.g. 456 Metro Blvd, Suite 100"
                  value={hospForm.address} onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Logo Image URL (Optional)</label>
                <input
                  type="url" placeholder="https://..."
                  value={hospForm.logoUrl} onChange={(e) => setHospForm({ ...hospForm, logoUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition-all">
                Onboard & Generate Signed QR Code
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


