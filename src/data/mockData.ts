import type { HospitalLocation, NavigationRoute, DepartmentQueue, PrescriptionScanResult, HospitalContextInfo } from '../types';

export const MOCK_HOSPITALS: HospitalContextInfo[] = [
  {
    id: 'hosp-main',
    name: 'SmartCare Multi-Specialty Hospital (Main Campus)',
    code: 'SC-MAIN-01',
    city: 'Metro City',
    address: '100 Healthcare Blvd, Metro City'
  },
  {
    id: 'hosp-stjude',
    name: 'SmartCare St. Jude Specialty Center',
    code: 'SC-STJUDE-02',
    city: 'North Wing',
    address: '45 Care Avenue, North District'
  },
  {
    id: 'hosp-citycenter',
    name: 'SmartCare City Center OPD & Emergency',
    code: 'SC-CITY-03',
    city: 'Downtown',
    address: '12 Plaza Drive, City Center'
  }
];

export const HOSPITAL_FLOORS = [
  { id: 'L3', name: 'Level 3', code: 'L3', description: 'Surgeries, ICU & Specialty Wards' },
  { id: 'L2', name: 'Level 2', code: 'L2', description: 'Cardiology, Neurology & Orthopedics' },
  { id: 'L1', name: 'Level 1', code: 'L1', description: 'Pediatrics, OPD & Diagnostic Labs' },
  { id: 'L0', name: 'Ground Floor', code: 'L0', description: 'Main Reception, Pharmacy & Emergency' },
  { id: 'B1', name: 'Basement 1', code: 'B1', description: 'Radiology, MRI, Parking & Cafeteria' },
] as const;

export const MOCK_LOCATIONS: HospitalLocation[] = [
  // Ground Floor L0
  {
    id: 'loc-rec-l0',
    name: 'Main Reception & Information Desk',
    floor: 'L0',
    floorName: 'Ground Floor',
    roomNumber: 'G-01',
    category: 'Reception',
    description: 'Central help desk, patient check-in, and visitor registration.',
    x: 150,
    y: 450,
    isPopular: true,
  },
  {
    id: 'loc-pharm-l0',
    name: 'Main Hospital Pharmacy',
    floor: 'L0',
    floorName: 'Ground Floor',
    roomNumber: 'G-12',
    category: 'Pharmacy',
    description: '24/7 inpatient and outpatient medicine dispensing.',
    x: 620,
    y: 450,
    isPopular: true,
  },
  {
    id: 'loc-er-l0',
    name: 'Emergency & Trauma Care',
    floor: 'L0',
    floorName: 'Ground Floor',
    roomNumber: 'G-00',
    category: 'Emergency',
    description: 'Immediate critical care unit and ambulance entrance.',
    x: 120,
    y: 180,
    isPopular: true,
  },
  {
    id: 'loc-elev-l0',
    name: 'Main Elevator Bank A',
    floor: 'L0',
    floorName: 'Ground Floor',
    roomNumber: 'Elevator A',
    category: 'Reception',
    description: 'Central elevators connecting B1 to Level 3.',
    x: 400,
    y: 300,
    isPopular: false,
  },
  {
    id: 'loc-rest-l0',
    name: 'Ground Floor Restrooms',
    floor: 'L0',
    floorName: 'Ground Floor',
    roomNumber: 'G-WC',
    category: 'Restroom',
    description: 'Wheelchair accessible restrooms & baby care room.',
    x: 680,
    y: 200,
    isPopular: false,
  },

  // Level 1 (L1)
  {
    id: 'loc-lab-l1',
    name: 'Central Pathology & Blood Lab',
    floor: 'L1',
    floorName: 'Level 1',
    roomNumber: '1-08',
    category: 'Laboratory',
    description: 'Blood sample collection, pathology tests & diagnostics.',
    x: 220,
    y: 220,
    isPopular: true,
  },
  {
    id: 'loc-pedia-l1',
    name: 'Pediatrics Department',
    floor: 'L1',
    floorName: 'Level 1',
    roomNumber: '1-20',
    category: 'Pediatrics',
    description: 'Child care clinic, pediatric OPD & vaccination desk.',
    x: 580,
    y: 380,
    isPopular: true,
  },
  {
    id: 'loc-elev-l1',
    name: 'Elevator Bank A (Level 1)',
    floor: 'L1',
    floorName: 'Level 1',
    roomNumber: 'Elevator A',
    category: 'Reception',
    description: 'Central elevators connecting B1 to Level 3.',
    x: 400,
    y: 300,
    isPopular: false,
  },

  // Level 2 (L2)
  {
    id: 'loc-cardio-l2',
    name: 'Cardiology Department & ECG Lab',
    floor: 'L2',
    floorName: 'Level 2',
    roomNumber: '2-14',
    category: 'Cardiology',
    description: 'Heart care specialists, echocardiograms, and cardiac consultation.',
    x: 640,
    y: 210,
    isPopular: true,
  },
  {
    id: 'loc-neuro-l2',
    name: 'Neurology Department',
    floor: 'L2',
    floorName: 'Level 2',
    roomNumber: '2-05',
    category: 'Neurology',
    description: 'Brain & nerve care unit, EEG testing, and specialist OPD.',
    x: 200,
    y: 390,
    isPopular: true,
  },
  {
    id: 'loc-ortho-l2',
    name: 'Orthopedics & Joint Care',
    floor: 'L2',
    floorName: 'Level 2',
    roomNumber: '2-22',
    category: 'Orthopedics',
    description: 'Bone, joint, and trauma rehabilitation clinic.',
    x: 600,
    y: 440,
    isPopular: true,
  },
  {
    id: 'loc-elev-l2',
    name: 'Elevator Bank A (Level 2)',
    floor: 'L2',
    floorName: 'Level 2',
    roomNumber: 'Elevator A',
    category: 'Reception',
    description: 'Central elevators connecting B1 to Level 3.',
    x: 400,
    y: 300,
    isPopular: false,
  },

  // Level 3 (L3)
  {
    id: 'loc-icu-l3',
    name: 'Intensive Care Unit (ICU)',
    floor: 'L3',
    floorName: 'Level 3',
    roomNumber: '3-01',
    category: 'ICU',
    description: 'Critical care, cardiac ICU & surgical recovery wards.',
    x: 250,
    y: 180,
    isPopular: true,
  },

  // Basement 1 (B1)
  {
    id: 'loc-radio-b1',
    name: 'Advanced Radiology & MRI Center',
    floor: 'B1',
    floorName: 'Basement 1',
    roomNumber: 'B-04',
    category: 'Radiology',
    description: 'MRI scan, CT scan, Digital X-Ray & Ultrasound.',
    x: 220,
    y: 420,
    isPopular: true,
  },
  {
    id: 'loc-cafe-b1',
    name: 'SmartCare Dining & Cafeteria',
    floor: 'B1',
    floorName: 'Basement 1',
    roomNumber: 'B-10',
    category: 'Cafeteria',
    description: 'Fresh healthy meals, coffee lounge, and visitor seating.',
    x: 650,
    y: 250,
    isPopular: true,
  },
];

export const MOCK_ROUTES: Record<string, NavigationRoute> = {
  'loc-rec-l0_loc-cardio-l2': {
    routeId: 'route-rec-cardio',
    origin: MOCK_LOCATIONS[0],
    destination: MOCK_LOCATIONS[8],
    totalDistanceMeters: 180,
    totalEtaMinutes: 3,
    floorsInvolved: ['L0', 'L2'],
    waypoints: [
      'Main Reception Desk (Ground Floor)',
      'Central Corridor A',
      'Elevator Bank A (Take to Level 2)',
      'Level 2 North Corridor',
      'Cardiology Department Room 2-14'
    ],
    steps: [
      {
        stepNumber: 1,
        text: 'Walk straight through the main entrance corridor',
        instructionType: 'walk',
        distanceMeters: 45,
        floor: 'L0',
        detail: 'Head towards the Central Atrium, past Information Desk.'
      },
      {
        stepNumber: 2,
        text: 'Take Elevator Bank A up to Level 2',
        instructionType: 'elevator',
        distanceMeters: 20,
        floor: 'L0',
        detail: 'Press Floor 2 button in Elevator A. Level 2 Cardiology will be clearly signed.'
      },
      {
        stepNumber: 3,
        text: 'Turn right after exiting Elevator Bank A',
        instructionType: 'turn-right',
        distanceMeters: 35,
        floor: 'L2',
        detail: 'Follow the teal directional floor strip towards North Wing.'
      },
      {
        stepNumber: 4,
        text: 'Continue straight down Corridor 2B for 80 meters',
        instructionType: 'walk',
        distanceMeters: 80,
        floor: 'L2',
        detail: 'Pass Neurology Desk (Room 2-05) on your left.'
      },
      {
        stepNumber: 5,
        text: 'Destination: Cardiology Department (Room 2-14) is on your left',
        instructionType: 'arrive',
        distanceMeters: 0,
        floor: 'L2',
        detail: 'Check in at the Cardiology Reception desk for your token.'
      }
    ],
    pathCoordinates: [
      { x: 150, y: 450, floor: 'L0' },
      { x: 280, y: 450, floor: 'L0' },
      { x: 400, y: 300, floor: 'L0' },
      { x: 400, y: 300, floor: 'L2' },
      { x: 520, y: 300, floor: 'L2' },
      { x: 520, y: 210, floor: 'L2' },
      { x: 640, y: 210, floor: 'L2' }
    ]
  },
  'loc-rec-l0_loc-pharm-l0': {
    routeId: 'route-rec-pharm',
    origin: MOCK_LOCATIONS[0],
    destination: MOCK_LOCATIONS[1],
    totalDistanceMeters: 90,
    totalEtaMinutes: 1,
    floorsInvolved: ['L0'],
    waypoints: ['Main Reception Desk', 'East Corridor G-1', 'Pharmacy Desk G-12'],
    steps: [
      {
        stepNumber: 1,
        text: 'Walk right from the Main Reception Desk',
        instructionType: 'turn-right',
        distanceMeters: 30,
        floor: 'L0',
        detail: 'Follow the green signs marked Pharmacy & Outpatient Services.'
      },
      {
        stepNumber: 2,
        text: 'Continue straight down East Corridor for 60 meters',
        instructionType: 'walk',
        distanceMeters: 60,
        floor: 'L0',
        detail: 'Pass Cashier Counter on your right.'
      },
      {
        stepNumber: 3,
        text: 'Destination: Main Pharmacy (Room G-12) is straight ahead',
        instructionType: 'arrive',
        distanceMeters: 0,
        floor: 'L0',
        detail: 'Drop your prescription at Counter 2 or use the SmartCare kiosk.'
      }
    ],
    pathCoordinates: [
      { x: 150, y: 450, floor: 'L0' },
      { x: 380, y: 450, floor: 'L0' },
      { x: 620, y: 450, floor: 'L0' }
    ]
  }
};

export const MOCK_QUEUES: Record<string, DepartmentQueue> = {
  'Cardiology': {
    deptId: 'dept-cardio',
    deptName: 'Cardiology Department',
    doctorName: 'Dr. Sarah Jenkins, MD (Chief Cardiologist)',
    roomNumber: 'Room 2-14 (Level 2)',
    currentToken: 14,
    patientToken: 22,
    peopleAhead: 7,
    estimatedWaitMinutes: 32,
    doctorStatus: 'Consulting',
    avgConsultationMinutes: 4,
    queueLoadStatus: 'Moderate',
    lastUpdatedTime: 'Just now',
    tokenList: [
      { tokenNumber: 14, status: 'consulting', estimatedTime: 'Now in room' },
      { tokenNumber: 15, status: 'waiting', estimatedTime: '~4 min' },
      { tokenNumber: 16, status: 'waiting', estimatedTime: '~8 min' },
      { tokenNumber: 17, status: 'waiting', estimatedTime: '~12 min' },
      { tokenNumber: 18, status: 'waiting', estimatedTime: '~16 min' },
      { tokenNumber: 19, status: 'waiting', estimatedTime: '~20 min' },
      { tokenNumber: 20, status: 'waiting', estimatedTime: '~24 min' },
      { tokenNumber: 21, status: 'waiting', estimatedTime: '~28 min' },
      { tokenNumber: 22, status: 'user', estimatedTime: '~32 min' },
      { tokenNumber: 23, status: 'waiting', estimatedTime: '~36 min' },
    ]
  },
  'Neurology': {
    deptId: 'dept-neuro',
    deptName: 'Neurology Department',
    doctorName: 'Dr. Robert Chen, MD',
    roomNumber: 'Room 2-05 (Level 2)',
    currentToken: 9,
    patientToken: 12,
    peopleAhead: 2,
    estimatedWaitMinutes: 14,
    doctorStatus: 'Consulting',
    avgConsultationMinutes: 5,
    queueLoadStatus: 'Low',
    lastUpdatedTime: '1 min ago',
    tokenList: [
      { tokenNumber: 9, status: 'consulting', estimatedTime: 'Now in room' },
      { tokenNumber: 10, status: 'waiting', estimatedTime: '~5 min' },
      { tokenNumber: 11, status: 'waiting', estimatedTime: '~10 min' },
      { tokenNumber: 12, status: 'user', estimatedTime: '~14 min' },
      { tokenNumber: 13, status: 'waiting', estimatedTime: '~19 min' },
    ]
  },
  'Orthopedics': {
    deptId: 'dept-ortho',
    deptName: 'Orthopedics & Joint Care',
    doctorName: 'Dr. Marcus Vance, MS',
    roomNumber: 'Room 2-22 (Level 2)',
    currentToken: 31,
    patientToken: 45,
    peopleAhead: 13,
    estimatedWaitMinutes: 55,
    doctorStatus: 'In Emergency',
    avgConsultationMinutes: 6,
    queueLoadStatus: 'Peak',
    lastUpdatedTime: '2 mins ago',
    tokenList: [
      { tokenNumber: 31, status: 'consulting', estimatedTime: 'Delayed (Emergency Case)' },
      { tokenNumber: 35, status: 'waiting', estimatedTime: '~25 min' },
      { tokenNumber: 40, status: 'waiting', estimatedTime: '~40 min' },
      { tokenNumber: 45, status: 'user', estimatedTime: '~55 min' },
    ]
  },
  'Pediatrics': {
    deptId: 'dept-pedia',
    deptName: 'Pediatrics Clinic',
    doctorName: 'Dr. Emily Vance, MD',
    roomNumber: 'Room 1-20 (Level 1)',
    currentToken: 18,
    patientToken: 21,
    peopleAhead: 2,
    estimatedWaitMinutes: 10,
    doctorStatus: 'Consulting',
    avgConsultationMinutes: 3,
    queueLoadStatus: 'Low',
    lastUpdatedTime: 'Just now',
    tokenList: [
      { tokenNumber: 18, status: 'consulting', estimatedTime: 'Now in room' },
      { tokenNumber: 19, status: 'waiting', estimatedTime: '~3 min' },
      { tokenNumber: 20, status: 'waiting', estimatedTime: '~6 min' },
      { tokenNumber: 21, status: 'user', estimatedTime: '~10 min' },
    ]
  }
};

export const SAMPLE_PRESCRIPTIONS: PrescriptionScanResult[] = [
  {
    id: 'rx-cardio-01',
    sampleName: 'Cardiology Care Prescription (Heart & Blood Pressure)',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop',
    doctorName: 'Dr. Sarah Jenkins, MD (Cardiology)',
    patientName: 'John Doe',
    date: '2026-08-18',
    ocrConfidence: 98,
    medicines: [
      {
        id: 'm1',
        name: 'Atorvastatin 20mg',
        dosage: '20 mg',
        frequency: 'Once daily',
        timing: 'At bedtime (Night)',
        duration: '30 days',
        instructions: 'Take after dinner with water. Avoid grapefruit juice.',
        purposeSummary: 'Helps lower LDL cholesterol levels and protect blood vessels.',
        confidenceScore: 99
      },
      {
        id: 'm2',
        name: 'Telmisartan 40mg',
        dosage: '40 mg',
        frequency: 'Once daily',
        timing: 'Morning (After breakfast)',
        duration: '30 days',
        instructions: 'Take regularly at the same time every morning with water.',
        purposeSummary: 'Helps control high blood pressure and reduces strain on the heart.',
        confidenceScore: 97
      },
      {
        id: 'm3',
        name: 'Ecosprin 75mg',
        dosage: '75 mg',
        frequency: 'Once daily',
        timing: 'After lunch',
        duration: '30 days',
        instructions: 'Swallow whole with a full glass of water. Do not crush.',
        purposeSummary: 'Blood-thinning medicine to improve circulation and prevent clots.',
        confidenceScore: 98
      }
    ],
    aiExplanation: {
      overview: 'This prescription contains 3 cardiovascular medications prescribed for blood pressure regulation, cholesterol management, and arterial health.',
      keyTakeaways: [
        'Take Telmisartan 40mg every morning after breakfast.',
        'Take Ecosprin 75mg every afternoon after lunch with plenty of water.',
        'Take Atorvastatin 20mg every night at bedtime.'
      ],
      lifestyleAdvice: [
        'Maintain low-sodium dietary habits.',
        'Stay well-hydrated throughout the day.',
        'Avoid consuming grapefruit products while taking Atorvastatin.'
      ]
    },
    safetyDisclaimer: 'Prescription details are extracted using OCR text processing. Always verify dosage, timing, and brand names with your prescribing physician or pharmacist.'
  },
  {
    id: 'rx-infect-02',
    sampleName: 'Respiratory Infection & Antibiotic Course',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
    doctorName: 'Dr. Michael Chang, MD (Internal Medicine)',
    patientName: 'Jane Smith',
    date: '2026-08-17',
    ocrConfidence: 94,
    medicines: [
      {
        id: 'm4',
        name: 'Amoxicillin + Clavulanate 625mg',
        dosage: '625 mg',
        frequency: 'Twice daily (12 hours apart)',
        timing: 'After meals (Morning & Night)',
        duration: '5 days',
        instructions: 'Complete full 5-day course even if symptoms improve early.',
        purposeSummary: 'Broad-spectrum antibiotic to treat bacterial respiratory infection.',
        confidenceScore: 96
      },
      {
        id: 'm5',
        name: 'Paracetamol 650mg',
        dosage: '650 mg',
        frequency: 'As needed (SOS) max 3 times daily',
        timing: 'When fever exceeds 100°F or severe body ache occurs',
        duration: '3 days',
        instructions: 'Maintain minimum 6-hour gap between doses.',
        purposeSummary: 'Reduces fever and alleviates muscle aches.',
        confidenceScore: 95
      }
    ],
    aiExplanation: {
      overview: 'This prescription is a 5-day antibiotic course aimed at clearing a bacterial infection, paired with fever management.',
      keyTakeaways: [
        'Complete the full 5 days of Amoxicillin 625mg twice daily.',
        'Only take Paracetamol 650mg if fever or body pain is present.'
      ],
      lifestyleAdvice: [
        'Get plenty of rest and stay hydrated.',
        'Take antibiotics with food to avoid mild stomach upset.'
      ]
    },
    safetyDisclaimer: 'Prescription details are extracted using OCR text processing. Always verify dosage, timing, and brand names with your prescribing physician or pharmacist.'
  }
];
