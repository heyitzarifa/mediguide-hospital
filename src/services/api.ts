import type { 
  HospitalLocation, 
  NavigationRoute, 
  DepartmentQueue, 
  PrescriptionScanResult, 
  FloorLevel,
  UserRole,
  User,
  Hospital,
  QueueUpdatePayload,
  ManagementStats,
  VisitorInfo,
  DoctorRecord,
  StaffRecord,
  DepartmentRecord,
  AppointmentRecord,
  DoctorVoiceTranscription,
  ExtractedMedicationDetail,
  MedicationRecordItem,
  MedicationReminderItem,
  MedicationHistoryLog,
  ChatMessage
} from '../types';
import { MOCK_LOCATIONS, MOCK_ROUTES, MOCK_QUEUES, MOCK_HOSPITALS } from '../data/mockData';

const BASE_URL = 'http://localhost:5000/api';

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const hospitalId = localStorage.getItem('smartcare_hospital_id') || 'hosp-main';
  return {
    'Content-Type': 'application/json',
    'X-Hospital-ID': hospitalId,
    ...customHeaders
  };
}

/**
 * SmartCare API Service Layer - Connects to Flask REST APIs & MongoDB Database with fallback
 */
export const SmartCareAPI = {

  /** GET /hospitals/resolve?token=... - Resolves signed hospital QR token */
  async resolveHospitalToken(token: string): Promise<{ status: string; hospital: Hospital }> {
    const res = await fetch(`${BASE_URL}/hospitals/resolve?token=${encodeURIComponent(token)}`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid or tampered hospital QR code.');
    }
    return await res.json();
  },

  /** POST /hospitals - Admin endpoint to onboard a new hospital */
  async createHospital(payload: { name: string; address: string; logoUrl?: string }, token?: string | null): Promise<{ message: string; hospital: Hospital }> {
    const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${BASE_URL}/hospitals`, {
      method: 'POST',
      headers: getHeaders(authHeader),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to onboard hospital');
    }
    return await res.json();
  },

  /** GET /hospitals - List all onboarded hospitals */
  async getHospitals(): Promise<Hospital[]> {
    try {
      const res = await fetch(`${BASE_URL}/hospitals`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend getHospitals fallback');
    }
    return [{
      id: 'hosp-main',
      name: 'SmartCare General Hospital',
      address: '123 Health Ave, Medical District, NY 10001',
      logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80',
      qrToken: 'demo-token-hosp-main'
    }];
  },

  /** GET /hospitals/:id/qr - Get QR code PNG image URL */
  getHospitalQRUrl(hospitalId: string): string {
    return `${BASE_URL}/hospitals/${encodeURIComponent(hospitalId)}/qr`;
  },

  /** POST /auth/login */
  async login(email: string, password: string, hospitalId?: string): Promise<{ token: string; user: User }> {
    const activeHospitalId = hospitalId || localStorage.getItem('smartcare_hospital_id') || 'hosp-main';
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password, hospitalId: activeHospitalId })
      });
    } catch (e: any) {
      throw new Error('Unable to reach the server');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return await res.json();
  },

  /** POST /auth/register */
  async register(name: string, email: string, password: string, role: UserRole, hospitalId?: string, department?: string): Promise<{ token: string; user: User }> {
    const activeHospitalId = hospitalId || localStorage.getItem('smartcare_hospital_id') || 'hosp-main';
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, email, password, role, hospitalId: activeHospitalId, department })
      });
    } catch (e: any) {
      throw new Error('Unable to reach the server');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    return await res.json();
  },

  /** POST /appointments/:id/assign-token - Staff assigns next token number */
  async assignTokenToAppointment(aptId: string, token?: string | null): Promise<any> {
    const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${BASE_URL}/appointments/${encodeURIComponent(aptId)}/assign-token`, {
      method: 'POST',
      headers: getHeaders(authHeader)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to assign token');
    }
    return await res.json();
  },

  /** GET /notifications - Get patient notifications */
  async getUserNotifications(token?: string | null): Promise<any[]> {
    try {
      const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${BASE_URL}/notifications`, { headers: getHeaders(authHeader) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend getUserNotifications fallback');
    }
    return [];
  },

  /** POST /notifications/:id/read - Mark notification as read */
  async markNotificationRead(notifId: string, token?: string | null): Promise<any> {
    const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${BASE_URL}/notifications/${encodeURIComponent(notifId)}/read`, {
      method: 'POST',
      headers: getHeaders(authHeader)
    });
    if (res.ok) return await res.json();
    return { status: 'read' };
  },

  /** GET /patient/reminders/check - Check day-before reminders */
  async checkDayBeforeReminders(token?: string | null): Promise<any> {
    try {
      const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${BASE_URL}/patient/reminders/check`, { headers: getHeaders(authHeader) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend checkDayBeforeReminders fallback');
    }
    return { newRemindersCreated: [], unreadNotifications: [], unreadCount: 0 };
  },

  /** POST /medications/reminders/:id/confirm - Mark medication as taken */
  async confirmMedicationReminder(remId: string, token?: string | null): Promise<any> {
    const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${BASE_URL}/medications/reminders/${encodeURIComponent(remId)}/confirm`, {
      method: 'POST',
      headers: getHeaders(authHeader)
    });
    if (res.ok) return await res.json();
    return { status: 'taken' };
  },

  /** POST /medications/cross-check - Cross-check OCR medicines with Doctor Voice Instructions */
  async crossCheckMedicines(ocrMedicines: any[], voiceTranscription: string): Promise<{ status: string; matches: any[]; warnings: any[] }> {
    try {
      const res = await fetch(`${BASE_URL}/medications/cross-check`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ocrMedicines, voiceTranscription })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend crossCheckMedicines fallback');
    }

    const matches: any[] = [];
    const warnings: any[] = [];
    for (const med of ocrMedicines) {
      const name = med.name || med.medicine_name || '';
      if (!name) continue;
      if (voiceTranscription.toLowerCase().includes(name.toLowerCase().split(' ')[0])) {
        matches.push({ medicine: name, message: `✓ ${name} confirmed in doctor's voice instructions.` });
      } else {
        warnings.push({ medicine: name, message: `⚠ ${name} is in prescription but not explicitly heard in doctor instructions. Verify with pharmacist.` });
      }
    }
    return { status: 'completed', matches, warnings };
  },


  /** GET /locations - Fetch all hospital locations */
  async getLocations(floor?: FloorLevel): Promise<HospitalLocation[]> {
    try {
      const url = floor ? `${BASE_URL}/locations?floor=${floor}` : `${BASE_URL}/locations`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local locations mock');
    }
    if (floor) {
      return MOCK_LOCATIONS.filter(loc => loc.floor === floor);
    }
    return MOCK_LOCATIONS;
  },

  /** GET /locations/search?q=query */
  async searchLocations(query: string): Promise<HospitalLocation[]> {
    try {
      const res = await fetch(`${BASE_URL}/locations/search?q=${encodeURIComponent(query)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local search mock');
    }
    const q = query.toLowerCase().trim();
    if (!q) return MOCK_LOCATIONS.slice(0, 6);
    return MOCK_LOCATIONS.filter(loc => 
      loc.name.toLowerCase().includes(q) ||
      loc.category.toLowerCase().includes(q) ||
      loc.description.toLowerCase().includes(q) ||
      loc.roomNumber.toLowerCase().includes(q)
    );
  },

  /** POST /navigation/route - Calculate route between origin & destination */
  async calculateRoute(originId: string, destinationId: string): Promise<NavigationRoute> {
    try {
      const res = await fetch(`${BASE_URL}/navigation/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originId, destinationId })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local route calculator');
    }

    const routeKey = `${originId}_${destinationId}`;
    if (MOCK_ROUTES[routeKey]) return MOCK_ROUTES[routeKey];

    const origin = MOCK_LOCATIONS.find(l => l.id === originId) || MOCK_LOCATIONS[0];
    const destination = MOCK_LOCATIONS.find(l => l.id === destinationId) || MOCK_LOCATIONS[8];
    const isSameFloor = origin.floor === destination.floor;

    return {
      routeId: `route-${Date.now()}`,
      origin,
      destination,
      totalDistanceMeters: isSameFloor ? 75 : 160,
      totalEtaMinutes: isSameFloor ? 2 : 3,
      floorsInvolved: isSameFloor ? [origin.floor] : [origin.floor, destination.floor],
      waypoints: [origin.name, 'Central Elevator A', destination.name],
      steps: [
        {
          stepNumber: 1,
          text: `Start at ${origin.name} (${origin.floorName})`,
          instructionType: 'walk',
          distanceMeters: 30,
          floor: origin.floor,
          detail: `Proceed down main corridor from Room ${origin.roomNumber}.`
        },
        ...(!isSameFloor ? [{
          stepNumber: 2,
          text: `Take Elevator Bank A to ${destination.floorName}`,
          instructionType: 'elevator' as const,
          distanceMeters: 25,
          floor: origin.floor,
          detail: `Press button for ${destination.floorName} in Elevator A.`
        }] : []),
        {
          stepNumber: isSameFloor ? 2 : 3,
          text: `Turn ${destination.x > 400 ? 'right' : 'left'} towards ${destination.category} section`,
          instructionType: destination.x > 400 ? 'turn-right' : 'turn-left',
          distanceMeters: 45,
          floor: destination.floor,
          detail: 'Follow teal wall indicator strips.'
        },
        {
          stepNumber: isSameFloor ? 3 : 4,
          text: `Arrive at ${destination.name} (${destination.roomNumber})`,
          instructionType: 'arrive',
          distanceMeters: 0,
          floor: destination.floor,
          detail: `Destination is on your ${destination.x > 500 ? 'left' : 'right'}.`
        }
      ],
      pathCoordinates: [
        { x: origin.x, y: origin.y, floor: origin.floor },
        { x: 400, y: 300, floor: origin.floor },
        { x: 400, y: 300, floor: destination.floor },
        { x: destination.x, y: destination.y, floor: destination.floor }
      ]
    };
  },

  /** GET /queue/department/:name - Fetch live queue predictions from DB */
  async getQueuePrediction(deptName: string): Promise<DepartmentQueue> {
    try {
      const res = await fetch(`${BASE_URL}/queue/department/${encodeURIComponent(deptName)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local queue mock');
    }
    return MOCK_QUEUES[deptName] || MOCK_QUEUES['Cardiology'];
  },

  /** POST /queue/update - STAFF updating queue in real database */
  async updateQueue(payload: QueueUpdatePayload, token?: string | null): Promise<DepartmentQueue> {
    const res = await fetch(`${BASE_URL}/queue/update`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update queue');
    }
    const data = await res.json();
    return data.queue;
  },

  /** POST /prescription/analyze - Process uploaded image with OCR & AI */
  async analyzePrescription(imageSource: string | File, token?: string | null): Promise<PrescriptionScanResult> {
    if (imageSource instanceof File) {
      const formData = new FormData();
      formData.append('file', imageSource);
      formData.append('fileName', imageSource.name);

      const headers = getHeaders(token ? { 'Authorization': `Bearer ${token}` } : {});
      delete headers['Content-Type'];

      // Send to backend — do NOT fall back to fake data on failure.
      // The backend performs real OCR and returns the image as a base64 data URL.
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/prescription/analyze`, {
          method: 'POST',
          headers,
          body: formData
        });
      } catch (e: any) {
        throw new Error('Unable to reach the server. Please check that the backend is running.');
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Prescription analysis failed (HTTP ${res.status})`);
      }

      return await res.json();
    } else {
      try {
        const res = await fetch(`${BASE_URL}/prescription/analyze`, {
          method: 'POST',
          headers: getHeaders(token ? { 'Authorization': `Bearer ${token}` } : {}),
          body: JSON.stringify({ imageUrl: imageSource })
        });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Falling back to sample prescription analysis');
      }

      return {
        id: `rx-${Date.now()}`,
        sampleName: 'Sample Prescription',
        imageUrl: imageSource,
        doctorName: 'Dr. Elizabeth Warren, MD',
        patientName: 'Patient Document',
        date: new Date().toISOString().split('T')[0],
        ocrConfidence: 96,
      medicines: [
        {
          id: 'rx-m1',
          name: 'Metformin 500mg (Glucophage)',
          dosage: '500 mg',
          frequency: 'Twice daily',
          timing: 'With breakfast and dinner',
          duration: '30 days',
          instructions: 'Take with food to minimize digestive discomfort.',
          purposeSummary: 'Helps regulate blood sugar levels for Type-2 Diabetes management.',
          confidenceScore: 98
        },
        {
          id: 'rx-m2',
          name: 'Atorvastatin 10mg',
          dosage: '10 mg',
          frequency: 'Once daily',
          timing: 'At bedtime',
          duration: '30 days',
          instructions: 'Take continuously every evening with water.',
          purposeSummary: 'Supports healthy lipid levels and vascular integrity.',
          confidenceScore: 95
        }
      ],
      aiExplanation: {
        overview: 'This prescription comprises 2 maintenance medications prescribed for blood glucose stabilization and cholesterol management.',
        keyTakeaways: [
          'Take Metformin 500mg twice every day alongside your morning and evening meals.',
          'Take Atorvastatin 10mg once every night before sleeping.'
        ],
        lifestyleAdvice: [
          'Keep a consistent daily meal schedule.',
          'Engage in light 20-minute daily walking as recommended by your physician.'
        ]
      },
      safetyDisclaimer: 'Prescription details are extracted from the uploaded image. Please verify the medicine, dosage, and instructions with your doctor or pharmacist before taking it.'
    };
    }
  },

  /** GET /doctors */
  async getPublicDoctors(department?: string): Promise<DoctorRecord[]> {
    try {
      const url = department ? `${BASE_URL}/doctors?department=${encodeURIComponent(department)}` : `${BASE_URL}/doctors`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local doctors list');
    }
    return [
      { id: 'doc-1', name: 'Dr. Elizabeth Warren, MD', departmentName: 'Cardiology', roomNumber: 'Room 204', status: 'Consulting', avgConsultTimeMins: 5, isActive: true },
      { id: 'doc-2', name: 'Dr. Marcus Vance, MD', departmentName: 'Neurology', roomNumber: 'Room 210', status: 'Available', avgConsultTimeMins: 6, isActive: true },
      { id: 'doc-3', name: 'Dr. Helena Roy, MD', departmentName: 'Emergency & Trauma', roomNumber: 'ER Desk 01', status: 'In Emergency', avgConsultTimeMins: 3, isActive: true },
      { id: 'doc-4', name: 'Dr. James Chen, MD', departmentName: 'Orthopedics', roomNumber: 'Room 112', status: 'Consulting', avgConsultTimeMins: 7, isActive: true }
    ];
  },

  /** GET /appointments/available-slots */
  async getAvailableSlots(doctorId?: string, doctorName?: string, date?: string): Promise<{ date: string; availableSlots: string[]; bookedSlots: string[]; allSlots: string[] }> {
    const params = new URLSearchParams();
    if (doctorId) params.append('doctorId', doctorId);
    if (doctorName) params.append('doctorName', doctorName);
    if (date) params.append('date', date);

    const res = await fetch(`${BASE_URL}/appointments/available-slots?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch available time slots');
    }
    return await res.json();
  },

  /** POST /appointments/book */
  async bookAppointment(payload: {
    patient_id?: string;
    patient_name?: string;
    doctor_id?: string;
    doctor_name: string;
    department_name: string;
    appointment_date: string;
    appointment_time: string;
    reason?: string;
  }, token?: string | null): Promise<{ message: string; appointment: AppointmentRecord }> {
    const res = await fetch(`${BASE_URL}/appointments/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to book appointment');
    }
    return await res.json();
  },

  /** GET /appointments */
  async getAppointments(filters?: { date?: string; doctor?: string; department?: string; patient?: string; status?: string }, token?: string | null): Promise<AppointmentRecord[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.doctor) params.append('doctor', filters.doctor);
      if (filters?.department) params.append('department', filters.department);
      if (filters?.patient) params.append('patient', filters.patient);
      if (filters?.status) params.append('status', filters.status);

      const url = `${BASE_URL}/appointments?${params.toString()}`;
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local appointments');
    }
    return [];
  },

  /** GET /patient/appointments */
  async getPatientAppointments(token?: string | null): Promise<AppointmentRecord[]> {
    return this.getAppointments(undefined, token);
  },

  /** POST /appointments/:id/confirm */
  async confirmAppointment(aptId: string, token?: string | null): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${BASE_URL}/appointments/${aptId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to confirm appointment');
    }
    return await res.json();
  },

  /** POST /appointments/:id/reschedule */
  async rescheduleAppointment(aptId: string, newDate: string, newTime: string, token?: string | null): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${BASE_URL}/appointments/${aptId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ new_date: newDate, new_time: newTime })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reschedule appointment');
    }
    return await res.json();
  },

  /** POST /appointments/:id/cancel */
  async cancelAppointment(aptId: string, token?: string | null): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${BASE_URL}/appointments/${aptId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel appointment');
    }
    return await res.json();
  },

  /** POST /appointments/:id/complete */
  async completeAppointment(aptId: string, token?: string | null): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${BASE_URL}/appointments/${aptId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete appointment');
    }
    return await res.json();
  },

  /** GET /management/patients */
  async getManagementPatients(token?: string | null): Promise<any[]> {
    try {
      const res = await fetch(`${BASE_URL}/management/patients`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local patients');
    }
    return [
      { id: 'pt-1', userId: 'u-patient-1', name: 'Alex Morgan', email: 'alex@smartcare.com', patientCode: 'PAT-2026-904' }
    ];
  },

  /** PATIENT Reminders */
  async getPatientReminders(): Promise<{ id: string; time: string; title: string; dosage: string; completed: boolean }[]> {
    try {
      const res = await fetch(`${BASE_URL}/patient/reminders`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local reminders');
    }
    return [
      { id: 'rem-1', time: '08:00 AM', title: 'Metformin 500mg', dosage: '1 Tablet with Breakfast', completed: true },
      { id: 'rem-2', time: '02:00 PM', title: 'Hydration Check', dosage: 'Drink 500ml Water', completed: false },
      { id: 'rem-3', time: '09:00 PM', title: 'Atorvastatin 10mg', dosage: '1 Tablet at Bedtime', completed: false }
    ];
  },

  /** GET /management/stats - MANAGEMENT operational analytics */
  async getManagementStats(token?: string | null): Promise<ManagementStats> {
    const res = await fetch(`${BASE_URL}/management/stats`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Access denied');
    }
    return await res.json();
  },

  /** GET & POST /management/doctors */
  async getDoctors(token?: string | null): Promise<DoctorRecord[]> {
    const res = await fetch(`${BASE_URL}/management/doctors`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Access denied to doctors list');
    return await res.json();
  },

  async saveDoctor(doc: Partial<DoctorRecord>, token?: string | null): Promise<DoctorRecord[]> {
    const res = await fetch(`${BASE_URL}/management/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(doc)
    });
    if (!res.ok) throw new Error('Failed to save doctor record');
    return await res.json();
  },

  /** GET & POST /management/staff */
  async getStaff(token?: string | null): Promise<StaffRecord[]> {
    const res = await fetch(`${BASE_URL}/management/staff`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Access denied to staff list');
    return await res.json();
  },

  async saveStaff(staff: Partial<StaffRecord>, token?: string | null): Promise<StaffRecord[]> {
    const res = await fetch(`${BASE_URL}/management/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(staff)
    });
    if (!res.ok) throw new Error('Failed to save staff record');
    return await res.json();
  },

  /** GET & POST /management/departments */
  async getDepartments(token?: string | null): Promise<DepartmentRecord[]> {
    const res = await fetch(`${BASE_URL}/management/departments`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Access denied to departments list');
    return await res.json();
  },

  async saveDepartment(dept: Partial<DepartmentRecord>, token?: string | null): Promise<DepartmentRecord[]> {
    const res = await fetch(`${BASE_URL}/management/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(dept)
    });
    if (!res.ok) throw new Error('Failed to save department');
    return await res.json();
  },

  /** GET & POST /management/locations - Updates map location coordinates in DB & Nav map */
  async saveLocation(loc: Partial<HospitalLocation>, token?: string | null): Promise<HospitalLocation[]> {
    const res = await fetch(`${BASE_URL}/management/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(loc)
    });
    if (!res.ok) throw new Error('Failed to update hospital location map data');
    return await res.json();
  },

  /** GET /visitor/info */
  async getVisitorInfo(): Promise<VisitorInfo> {
    try {
      const res = await fetch(`${BASE_URL}/visitor/info`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local visitor info');
    }
    return {
      visitingHours: '10:00 AM - 08:00 PM Daily',
      icuVisitingHours: '04:00 PM - 06:00 PM (Strict 1 visitor at a time)',
      parkingInfo: 'Visitor Multi-level Parking P2 (Basement B1 & B2). Free for first 2 hours.',
      cafeteriaLocation: 'Level 1 (L1), Room Caf-101. Open 07:00 AM - 10:00 PM.',
      permittedDestinations: [
        'Main Reception Lobby (L0)',
        'Hospital Cafeteria (L1)',
        'Outpatient Consultation Waiting Areas (L1, L2)',
        'Inpatient Ward Visitor Lounges (L3)'
      ],
      wifiDetails: 'Guest WiFi: SmartCare-Guest (No password required)'
    };
  },

  /** POST /voice-recordings or /transcriptions */
  async saveVoiceRecording(transcriptionText: string, token?: string | null): Promise<DoctorVoiceTranscription> {
    const res = await fetch(`${BASE_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ transcription_text: transcriptionText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save voice transcription');
    }
    return await res.json();
  },

  /** POST /medications/extract */
  async extractMedications(transcriptionText: string): Promise<{ transcription_text: string; medications: ExtractedMedicationDetail[]; extracted_count: number }> {
    const res = await fetch(`${BASE_URL}/medications/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription_text: transcriptionText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to extract medication information');
    }
    return await res.json();
  },

  /**
   * POST /medications/extract — OCR variant (reuses the same NLP endpoint as voice flow).
   * Browser does OCR → sends raw text here → backend extract_medications_nlp runs.
   * This is intentionally an alias so both flows share one extraction function.
   */
  async extractMedicationsFromOcr(
    rawOcrText: string,
    token?: string | null
  ): Promise<{ transcription_text: string; medications: ExtractedMedicationDetail[]; extracted_count: number }> {
    const res = await fetch(`${BASE_URL}/medications/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ transcription_text: rawOcrText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to extract medications from OCR text');
    }
    return await res.json();
  },

  /**
   * GET /api/voice-recordings — fetch the patient's latest voice transcription text.
   * Used to populate the cross-check feature after OCR is complete.
   * Returns empty string if no transcription exists yet.
   */
  async getLatestVoiceTranscription(token?: string | null): Promise<string> {
    try {
      const res = await fetch(`${BASE_URL}/voice-recordings`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        // The endpoint returns an array sorted by created_at desc
        if (Array.isArray(data) && data.length > 0) {
          return data[0]?.transcription_text || '';
        }
        // Some backends return a single object
        if (data?.transcription_text) return data.transcription_text;
      }
    } catch (e) {
      console.warn('getLatestVoiceTranscription fallback:', e);
    }
    return '';
  },

  /** POST /medications/confirm */
  async confirmMedications(medications: ExtractedMedicationDetail[], token?: string | null): Promise<{ confirmed_medications: MedicationRecordItem[]; created_reminders: MedicationReminderItem[] }> {
    const res = await fetch(`${BASE_URL}/medications/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ medications })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to confirm medication schedule');
    }
    return await res.json();
  },

  /**
   * POST /medications/cross-check
   * Compare OCR-extracted medicines against a voice transcription.
   * Returns { status, matches[], warnings[] }.
   */
  async crossCheckMedicines(
    ocrMedicines: { name: string; dosage?: string; frequency?: string }[],
    voiceTranscription: string,
    token?: string | null
  ): Promise<{
    status: string;
    matches: { medicine: string; message: string }[];
    warnings: { medicine: string; type?: string; message: string }[];
  }> {
    const res = await fetch(`${BASE_URL}/medications/cross-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        ocrMedicines,
        voiceTranscription
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Cross-check failed');
    }
    return await res.json();
  },

  /** GET /medications */
  async getMedications(token?: string | null): Promise<MedicationRecordItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/medications`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local medications list');
    }
    return [];
  },

  /** GET /reminders */
  async getReminders(token?: string | null): Promise<MedicationReminderItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/reminders`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local reminders list');
    }
    return [];
  },

  /** POST /reminders/:id/taken */
  async markReminderTaken(reminderId: string, token?: string | null): Promise<{ message: string; next_reminder?: MedicationReminderItem }> {
    const res = await fetch(`${BASE_URL}/reminders/${reminderId}/taken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update reminder status');
    }
    return await res.json();
  },

  /** POST /reminders/:id/snooze */
  async markReminderSnooze(reminderId: string, snoozeMinutes: number = 15, token?: string | null): Promise<{ message: string; snoozed_until: string }> {
    const res = await fetch(`${BASE_URL}/reminders/${reminderId}/snooze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ snooze_minutes: snoozeMinutes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to snooze reminder');
    }
    return await res.json();
  },

  /** POST /reminders/:id/skip */
  async markReminderSkip(reminderId: string, token?: string | null): Promise<{ message: string; next_reminder?: MedicationReminderItem }> {
    const res = await fetch(`${BASE_URL}/reminders/${reminderId}/skip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to skip reminder');
    }
    return await res.json();
  },

  /** GET /medication-history */
  async getMedicationHistory(token?: string | null): Promise<MedicationHistoryLog[]> {
    try {
      const res = await fetch(`${BASE_URL}/medication-history`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Falling back to local medication history');
    }
    return [];
  },

  /** POST /chat - AI SmartCare Chatbox conversational helper */
  async sendChatMessage(
    query: string,
    role: UserRole = 'PATIENT',
    hospitalId: string = 'hosp-main',
    token?: string | null
  ): Promise<ChatMessage> {
    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: query,
          role,
          hospital_id: hospitalId
        })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: data.text || data.message || 'I am ready to help you navigate MediGuide.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: data.action,
          cardData: data.cardData
        };
      }
    } catch (e) {
      console.warn('Backend /chat fallback active:', e);
    }

    // Client-side fallback AI response generator respecting hospital_id and user role
    const q = query.toLowerCase().trim();
    const hosp = MOCK_HOSPITALS.find(h => h.id === hospitalId) || MOCK_HOSPITALS[0];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 0. Greetings & Thanks
    if (q === 'hi' || q === 'hello' || q === 'hey' || q.startsWith('hi ') || q.startsWith('hello ')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Hi there! 👋 I'm MediGuide AI for ${hosp.name}. How can I help your hospital visit today? 😊`,
        timestamp
      };
    }

    if (q.includes('thank') || q.includes('thanks') || q.includes('great') || q.includes('awesome')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `You're very welcome! 😊 Wishing you great health. Let me know if you need anything else.`,
        timestamp
      };
    }

    // 0.1 Medical Safety Disclaimer for diagnosis / prescription change advice
    if (q.includes('diagnose') || q.includes('sick') || q.includes('stop taking') || q.includes('change dose') || q.includes('side effect') || q.includes('medical decision')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `I can't safely make a medical decision for you. Please check with your doctor or pharmacist. I can help explain information already present in your prescription.`,
        timestamp,
        action: {
          type: 'scan_prescription',
          label: 'Scan Prescription',
          payload: { tab: 'prescription' }
        }
      };
    }

    // 0.2 Booking Intent ("I want to book", "book appointment", "cardiologist", "reserve slot")
    if (q.includes('book') || q.includes('reserve') || q.includes('schedule appointment') || q.includes('cardiologist') || q.includes('neurologist')) {
      let dept = 'Cardiology';
      if (q.includes('neuro')) dept = 'Neurology';
      if (q.includes('ortho')) dept = 'Orthopedics';
      if (q.includes('pedia')) dept = 'Pediatrics';

      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Sure! 😊 I can help you with that. Let's get your appointment scheduled with our ${dept} team at ${hosp.name}.`,
        timestamp,
        action: {
          type: 'book_appointment',
          label: 'Book Appointment',
          payload: { tab: 'patient-dashboard', departmentName: dept }
        },
        cardData: {
          title: `Book ${dept} OPD`,
          subtitle: hosp.name,
          details: [
            { label: 'Department', value: dept },
            { label: 'Hospital', value: hosp.name },
            { label: 'Booking Mode', value: 'Step-by-step Wizard' }
          ]
        }
      };
    }

    // 1. Navigation / Indoor location queries
    if (q.includes('where') || q.includes('route') || q.includes('direction') || q.includes('go to') || q.includes('find') || q.includes('cardio') || q.includes('neuro') || q.includes('er') || q.includes('emergency') || q.includes('pharmacy') || q.includes('lab') || q.includes('ortho') || q.includes('pedia') || q.includes('radio') || q.includes('icu') || q.includes('cafe') || q.includes('restroom')) {
      let matchedLoc = MOCK_LOCATIONS.find(l => 
        q.includes(l.category.toLowerCase()) || 
        q.includes(l.name.toLowerCase()) ||
        (q.includes('cardio') && l.category === 'Cardiology') ||
        (q.includes('neuro') && l.category === 'Neurology') ||
        (q.includes('emergency') && l.category === 'Emergency') ||
        (q.includes('pharmacy') && l.category === 'Pharmacy') ||
        (q.includes('lab') && l.category === 'Laboratory') ||
        (q.includes('ortho') && l.category === 'Orthopedics') ||
        (q.includes('pedia') && l.category === 'Pediatrics') ||
        (q.includes('radio') && l.category === 'Radiology') ||
        (q.includes('icu') && l.category === 'ICU') ||
        (q.includes('cafe') && l.category === 'Cafeteria') ||
        (q.includes('restroom') && l.category === 'Restroom')
      );

      if (!matchedLoc) {
        matchedLoc = MOCK_LOCATIONS[8]; // Cardiology L2 as default target
      }

      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `${matchedLoc.name} is located on ${matchedLoc.floorName} (Room ${matchedLoc.roomNumber}) at ${hosp.name}. Would you like me to show you the turn-by-turn route?`,
        timestamp,
        action: {
          type: 'navigate',
          label: 'Show Route',
          payload: {
            destinationId: matchedLoc.id,
            tab: 'navigation'
          }
        },
        cardData: {
          title: matchedLoc.name,
          subtitle: `${matchedLoc.floorName} • Room ${matchedLoc.roomNumber}`,
          details: [
            { label: 'Category', value: matchedLoc.category },
            { label: 'Floor', value: matchedLoc.floorName },
            { label: 'Room', value: matchedLoc.roomNumber },
            { label: 'Hospital', value: hosp.name }
          ]
        }
      };
    }

    // 2. Appointment queries
    if (q.includes('appointment') || q.includes('doctor') || q.includes('dr') || q.includes('slot') || q.includes('consultation')) {
      if (role === 'PATIENT' || role === 'VISITOR') {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Your upcoming appointment at ${hosp.name} is with Dr. Elizabeth Warren, MD in the Cardiology Department today at 10:30 AM (Room 204).`,
          timestamp,
          action: {
            type: 'view_appointment',
            label: 'View Appointment',
            payload: { tab: 'patient-dashboard' }
          },
          cardData: {
            title: 'Dr. Elizabeth Warren, MD',
            subtitle: 'Cardiology Department',
            details: [
              { label: 'Date & Time', value: 'Today, 10:30 AM' },
              { label: 'Room', value: 'Room 204 (Level 2)' },
              { label: 'Status', value: 'Confirmed' },
              { label: 'Hospital', value: hosp.name }
            ]
          }
        };
      } else if (role === 'STAFF') {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Today there are 8 scheduled appointments in Cardiology. Dr. Elizabeth Warren is currently Consulting in Room 204.`,
          timestamp,
          action: {
            type: 'view_staff',
            label: 'Open Staff Console',
            payload: { tab: 'staff-dashboard' }
          },
          cardData: {
            title: 'Cardiology Staff Schedule',
            subtitle: 'Active OPD Roster',
            details: [
              { label: 'Appointments Today', value: '8 Confirmed' },
              { label: 'Active Doctor', value: 'Dr. Elizabeth Warren (Consulting)' },
              { label: 'Available Doctor', value: 'Dr. Marcus Vance (Available)' }
            ]
          }
        };
      } else {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Executive Overview: 42 appointments booked today across all departments at ${hosp.name}. Utilization rate is 92%.`,
          timestamp,
          action: {
            type: 'view_management',
            label: 'View Management Dashboard',
            payload: { tab: 'management-dashboard' }
          }
        };
      }
    }

    // 3. Queue / Token queries
    if (q.includes('queue') || q.includes('token') || q.includes('ahead') || q.includes('wait') || q.includes('status') || q.includes('line')) {
      if (role === 'PATIENT' || role === 'VISITOR') {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `You hold Token A-027 at Cardiology OPD in ${hosp.name}. There are currently 5 patients ahead of you with an estimated wait time of 16 minutes.`,
          timestamp,
          action: {
            type: 'view_queue',
            label: 'View Queue',
            payload: { tab: 'queue' }
          },
          cardData: {
            title: 'Cardiology OPD Queue',
            subtitle: 'Token: A-027',
            details: [
              { label: 'Token Number', value: 'A-027' },
              { label: 'Current Token', value: 'A-022' },
              { label: 'Patients Ahead', value: '5 patients' },
              { label: 'Estimated Wait', value: '16 minutes' }
            ]
          }
        };
      } else if (role === 'STAFF') {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Cardiology Queue Status: Current Token A-022 is inside Room 204. Total 14 patients in waiting line. Queue Load: Moderate.`,
          timestamp,
          action: {
            type: 'view_queue',
            label: 'Manage Queue Tokens',
            payload: { tab: 'queue' }
          }
        };
      } else {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Hospital Queue Analytics: 6 active OPD queues. Average patient wait time is 14 minutes. Peak load detected in Orthopedics.`,
          timestamp,
          action: {
            type: 'view_management',
            label: 'View Queue Analytics',
            payload: { tab: 'management-dashboard' }
          }
        };
      }
    }

    // 4. Prescription queries
    if (q.includes('prescription') || q.includes('medicine') || q.includes('dose') || q.includes('scan') || q.includes('explain') || q.includes('pill') || q.includes('drug')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `You can scan your physical prescription using our AI Prescription Scanner. It automatically extracts medicine names, dosages, schedules, and provides simple plain-language guidance.`,
        timestamp,
        action: {
          type: 'scan_prescription',
          label: 'Scan Prescription',
          payload: { tab: 'prescription' }
        },
        cardData: {
          title: 'AI Prescription Reader',
          subtitle: 'Optical OCR & Plain Language Explainer',
          details: [
            { label: 'Supported Inputs', value: 'Images, Scans, Camera' },
            { label: 'Features', value: 'Dosage extraction & timing alerts' }
          ]
        }
      };
    }

    // 5. Staff specific queries
    if (role === 'STAFF' && (q.includes('reception') || q.includes('checkin') || q.includes('call next') || q.includes('availability'))) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Welcome to the Staff Workflow. You can call the next patient token, assign doctors, and update queue statuses in the Staff Console.`,
        timestamp,
        action: {
          type: 'view_staff',
          label: 'Open Staff Console',
          payload: { tab: 'staff-dashboard' }
        }
      };
    }

    // 6. Management specific queries
    if (role === 'MANAGEMENT' && (q.includes('summary') || q.includes('utilization') || q.includes('alert') || q.includes('stats') || q.includes('revenue') || q.includes('capacity'))) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Operational Summary for ${hosp.name}: 142 total patients today, 92% doctor utilization, 0 critical queue bottlenecks.`,
        timestamp,
        action: {
          type: 'view_management',
          label: 'Open Management Portal',
          payload: { tab: 'management-dashboard' }
        },
        cardData: {
          title: `${hosp.name} Dashboard`,
          subtitle: 'Executive Summary',
          details: [
            { label: 'Total Patients', value: '142 Today' },
            { label: 'Avg Wait Time', value: '14 mins' },
            { label: 'Active Queues', value: '6 OPDs' },
            { label: 'Alerts', value: '0 Critical' }
          ]
        }
      };
    }

    // 7. Visitor specific queries
    if (role === 'VISITOR' || q.includes('visiting') || q.includes('hours') || q.includes('parking') || q.includes('wifi') || q.includes('visitor')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Visiting hours at ${hosp.name} are 10:00 AM - 1:00 PM and 4:00 PM - 8:00 PM. Parking is located in Basement 1 (B1). Free WiFi: SmartCare_Guest.`,
        timestamp,
        action: {
          type: 'view_visitor',
          label: 'View Visitor Guide',
          payload: { tab: 'visitor-dashboard' }
        }
      };
    }

    // Natural variations for unknown/out-of-scope queries
    const unknownVariations = [
      `I'm mainly here to help with your hospital visit 😊 I can help with appointments, directions, queue status, or prescriptions. — MediGuide AI at ${hosp.name}`,
      `I'm not able to check that information right now, but I can definitely help you with MediGuide services at ${hosp.name}.`,
      `I'm not sure about that one, but no worries — I can help you find a department, check your appointment, or look up your queue!`
    ];
    const randomIndex = Math.floor(Math.random() * unknownVariations.length);

    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: unknownVariations[randomIndex],
      timestamp,
      action: {
        type: 'book_appointment',
        label: 'Book Appointment',
        payload: { tab: 'patient-dashboard', departmentName: 'Cardiology' }
      }
    };
  }
};


