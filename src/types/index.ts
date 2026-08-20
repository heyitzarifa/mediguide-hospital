export type UserRole = 'STAFF' | 'PATIENT' | 'VISITOR' | 'MANAGEMENT';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  logoUrl?: string;
  qrToken: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  patientCode?: string;
  hospitalId?: string;
}

export interface AuthSession {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export type FloorLevel = 'B1' | 'L0' | 'L1' | 'L2' | 'L3';

export type LocationCategory = 
  | 'Cardiology'
  | 'Neurology'
  | 'Emergency'
  | 'Pharmacy'
  | 'ICU'
  | 'Laboratory'
  | 'Cafeteria'
  | 'Restroom'
  | 'Reception'
  | 'Orthopedics'
  | 'Pediatrics'
  | 'Radiology';

export interface HospitalLocation {
  id: string;
  name: string;
  floor: FloorLevel;
  floorName: string;
  roomNumber: string;
  category: LocationCategory;
  description: string;
  x: number; // SVG X percentage/coordinate (0-800)
  y: number; // SVG Y percentage/coordinate (0-600)
  icon?: string;
  isPopular?: boolean;
}

export type InstructionType = 'walk' | 'turn-left' | 'turn-right' | 'elevator' | 'stairs' | 'arrive';

export interface NavigationInstruction {
  stepNumber: number;
  text: string;
  instructionType: InstructionType;
  distanceMeters: number;
  floor: FloorLevel;
  detail: string;
}

export interface PathPoint {
  x: number;
  y: number;
  floor: FloorLevel;
}

export interface NavigationRoute {
  routeId: string;
  origin: HospitalLocation;
  destination: HospitalLocation;
  totalDistanceMeters: number;
  totalEtaMinutes: number;
  floorsInvolved: FloorLevel[];
  steps: NavigationInstruction[];
  waypoints: string[];
  pathCoordinates: PathPoint[];
}

export interface DepartmentOption {
  id: string;
  name: string;
  floor: FloorLevel;
  roomNumber: string;
  activeDoctors: string[];
}

export interface DepartmentQueue {
  deptId: string;
  deptName: string;
  doctorName: string;
  roomNumber: string;
  currentToken: number;
  patientToken: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  doctorStatus: 'Consulting' | 'On Break' | 'In Emergency' | 'Available';
  avgConsultationMinutes: number;
  queueLoadStatus: 'Low' | 'Moderate' | 'High' | 'Peak';
  lastUpdatedTime: string;
  tokenList: {
    tokenNumber: number;
    patientName?: string;
    status: 'completed' | 'consulting' | 'waiting' | 'user';
    estimatedTime: string;
  }[];
}

export interface QueueUpdatePayload {
  departmentName: string;
  action: 'call_next' | 'update_status' | 'add_patient';
  doctorStatus?: 'Consulting' | 'On Break' | 'In Emergency' | 'Available';
  patientName?: string;
}

export interface ExtractedMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  instructions: string;
  purposeSummary: string;
  confidenceScore: number;
}

export interface PrescriptionScanResult {
  id: string;
  patient_id?: string;
  sampleName?: string;
  imageUrl: string;
  doctorName: string;
  patientName: string;
  date: string;
  ocrConfidence: number;
  error_warning?: string;
  medicines: ExtractedMedicine[];
  aiExplanation: {
    overview: string;
    keyTakeaways: string[];
    lifestyleAdvice: string[];
  };
  safetyDisclaimer: string;
}

export interface DoctorRecord {
  id: string;
  name: string;
  departmentName: string;
  roomNumber: string;
  status: 'Consulting' | 'Available' | 'On Break' | 'In Emergency';
  avgConsultTimeMins: number;
  isActive: boolean;
}

export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  departmentName: string;
  roleTitle: string;
  status: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  floor: string;
  roomNumber: string;
  description: string;
  status: string;
}

export interface AppointmentRecord {
  id: string;
  patientId?: string;
  patientName: string;
  patientCode?: string;
  doctorId?: string;
  doctorName: string;
  departmentName: string;
  appointmentDate: string;
  appointmentTime: string;
  bookedBy?: 'PATIENT' | 'STAFF';
  bookedByUserId?: string;
  reason?: string;
  status: 'Pending' | 'Confirmed' | 'In-Progress' | 'Completed' | 'Cancelled' | 'Rescheduled';
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationalAlert {
  id: string;
  title: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

export interface ManagementStats {
  totalPatientsToday: number;
  averageWaitTimeMins: number;
  doctorUtilizationRate: number;
  activeQueuesCount: number;
  activeDoctorsCount: number;
  totalDoctorsCount: number;
  departmentBreakdown: {
    name: string;
    floor: string;
    roomNumber: string;
    queueLength: number;
    activeDoctors: number;
    doctorStatus: string;
  }[];
  activityLogs: {
    time: string;
    event: string;
  }[];
  alerts?: OperationalAlert[];
}

export interface VisitorInfo {
  visitingHours: string;
  icuVisitingHours: string;
  parkingInfo: string;
  cafeteriaLocation: string;
  permittedDestinations: string[];
  wifiDetails: string;
}

export type ReminderStatus = 'pending' | 'taken' | 'skipped' | 'snoozed' | 'expired';

export interface DoctorVoiceTranscription {
  id: string;
  patient_id: string;
  recording_reference: string;
  transcription_text: string;
  extracted_medications?: any[];
  created_at: string;
}

export interface ExtractedMedicationDetail {
  id?: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  intake_times: string[];
  food_instruction: string;
  duration: string;
  start_date?: string;
  end_date?: string;
  special_instructions?: string;
  has_missing_fields?: boolean;
}

export interface MedicationRecordItem {
  id: string;
  patient_id: string;
  prescription_id?: string;
  source_record_id?: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  intake_times: string[];
  food_instruction: string;
  start_date: string;
  end_date?: string;
  duration: string;
  special_instructions?: string;
  source_transcription_id?: string;
  confirmation_status: 'pending_confirmation' | 'confirmed';
  created_at: string;
  updated_at?: string;
}

export interface MedicationReminderItem {
  id: string;
  patient_id: string;
  medication_id: string;
  medicine_name: string;
  dosage: string;
  food_instruction?: string;
  scheduled_time: string;
  status: ReminderStatus;
  taken_at?: string | null;
  snoozed_until?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface MedicationHistoryLog {
  id: string;
  date: string;
  medicine_name: string;
  dosage: string;
  scheduled_time: string;
  status: ReminderStatus;
  taken_at?: string | null;
  snoozed_until?: string | null;
}

export type AppViewTab = 
  | 'landing'
  | 'hospital-landing'
  | 'post-auth'
  | 'navigation' 
  | 'queue' 
  | 'prescription'
  | 'staff-dashboard'
  | 'patient-dashboard'
  | 'visitor-dashboard'
  | 'management-dashboard';

export type ChatActionType = 
  | 'navigate' 
  | 'view_appointment' 
  | 'book_appointment'
  | 'view_queue' 
  | 'scan_prescription'
  | 'view_staff' 
  | 'view_management'
  | 'view_visitor';

export interface ChatAction {
  type: ChatActionType;
  label: string;
  payload?: {
    destinationId?: string;
    departmentName?: string;
    tab?: AppViewTab;
  };
}

export interface ChatCardDetail {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: ChatAction;
  cardData?: {
    title?: string;
    subtitle?: string;
    details?: ChatCardDetail[];
  };
  isThinking?: boolean;
}

export interface HospitalContextInfo {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
}


