import os
import pymongo
from pymongo import MongoClient, ASCENDING
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

# Load environment variables from .env
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'smartcare_db')

_mongo_client = None

def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
    return _mongo_client

def get_db():
    client = get_mongo_client()
    return client[DB_NAME]

def check_db_connection():
    try:
        client = get_mongo_client()
        # Admin command ping test
        client.admin.command('ping')
        return True, None
    except Exception as e:
        return False, str(e)

def clean_doc(doc):
    """ Helper to strip MongoDB ObjectId _id field or convert to standard dict """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [clean_doc(d) for d in doc]
    if isinstance(doc, dict):
        d_copy = dict(doc)
        if '_id' in d_copy:
            del d_copy['_id']
        return d_copy
    return doc

def init_db():
    is_connected, err = check_db_connection()
    if not is_connected:
        print(f"[ERROR] Cannot connect to MongoDB at {MONGODB_URI}: {err}")
        return False

    db = get_db()

    # Create Indexes safely
    def safe_create_index(col, keys, **kwargs):
        try:
            col.create_index(keys, **kwargs)
        except pymongo.errors.OperationFailure:
            pass

    safe_create_index(db.hospitals, [("id", ASCENDING)], unique=True)
    safe_create_index(db.hospitals, [("qr_token", ASCENDING)], unique=True)
    safe_create_index(db.users, [("email", ASCENDING)], unique=True)
    safe_create_index(db.users, [("id", ASCENDING)], unique=True)
    safe_create_index(db.patients, [("id", ASCENDING)], unique=True)
    safe_create_index(db.patients, [("user_id", ASCENDING)], unique=True)
    safe_create_index(db.staff, [("id", ASCENDING)], unique=True)
    safe_create_index(db.staff, [("user_id", ASCENDING)], unique=True)
    safe_create_index(db.departments, [("id", ASCENDING)], unique=True)
    safe_create_index(db.departments, [("name", ASCENDING)])
    safe_create_index(db.doctors, [("id", ASCENDING)], unique=True)
    safe_create_index(db.hospital_locations, [("id", ASCENDING)], unique=True)
    safe_create_index(db.queues, [("id", ASCENDING)], unique=True)
    safe_create_index(db.queues, [("department_name", ASCENDING)])
    safe_create_index(db.appointments, [("id", ASCENDING)], unique=True)
    safe_create_index(db.appointments, [("patient_id", ASCENDING)])
    safe_create_index(db.appointments, [("doctor_id", ASCENDING)])
    safe_create_index(db.appointments, [("appointment_date", ASCENDING)])
    safe_create_index(db.appointments, [("status", ASCENDING)])
    safe_create_index(db.operational_alerts, [("id", ASCENDING)], unique=True)
    safe_create_index(db.hospital_settings, [("key", ASCENDING)], unique=True)

    # Voice Transcriptions & Medication Reminders Indexes
    safe_create_index(db.voice_transcriptions, [("id", ASCENDING)], unique=True)
    safe_create_index(db.voice_transcriptions, [("patient_id", ASCENDING)])
    safe_create_index(db.medication_records, [("id", ASCENDING)], unique=True)
    safe_create_index(db.medication_records, [("patient_id", ASCENDING)])
    safe_create_index(db.medication_records, [("confirmation_status", ASCENDING)])
    safe_create_index(db.medication_reminders, [("id", ASCENDING)], unique=True)
    safe_create_index(db.medication_reminders, [("patient_id", ASCENDING)])
    safe_create_index(db.medication_reminders, [("medication_id", ASCENDING)])
    safe_create_index(db.medication_reminders, [("scheduled_time", ASCENDING)])
    safe_create_index(db.medication_reminders, [("status", ASCENDING)])

    # Seed data if users collection is empty
    if db.users.count_documents({}) == 0:
        seed_data(db)
        print("[SUCCESS] MongoDB seeded with initial SmartCare dataset.")
    else:
        # Ensure default hospital exists even if DB was previously seeded
        ensure_default_hospital(db)
        print("[INFO] MongoDB collections already populated.")

    return True

from itsdangerous import URLSafeSerializer

def generate_signed_hospital_token(hospital_id):
    secret = os.environ.get('SECRET_KEY', 'smartcare_super_secret_hospital_signing_key_2026')
    serializer = URLSafeSerializer(secret, salt='hospital-qr-v1')
    return serializer.dumps({'hospital_id': hospital_id})

def verify_hospital_token(token):
    secret = os.environ.get('SECRET_KEY', 'smartcare_super_secret_hospital_signing_key_2026')
    serializer = URLSafeSerializer(secret, salt='hospital-qr-v1')
    try:
        data = serializer.loads(token)
        return data.get('hospital_id')
    except Exception:
        return None

def ensure_default_hospital(db):
    if db.hospitals.count_documents({'id': 'hosp-main'}) == 0:
        token = generate_signed_hospital_token('hosp-main')
        db.hospitals.insert_one({
            'id': 'hosp-main',
            'name': 'SmartCare General Hospital',
            'address': '123 Health Ave, Medical District, NY 10001',
            'logo_url': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80',
            'qr_token': token,
            'created_at': '2026-08-19 00:00:00'
        })

def seed_data(db):
    ensure_default_hospital(db)
    staff_pass = generate_password_hash('staff123')
    patient_pass = generate_password_hash('patient123')
    visitor_pass = generate_password_hash('visitor123')
    admin_pass = generate_password_hash('admin123')

    users = [
        {
            'id': 'u-staff-1',
            'hospital_id': 'hosp-main',
            'name': 'Nurse Sarah Jenkins',
            'email': 'staff@smartcare.com',
            'password_hash': staff_pass,
            'role': 'STAFF',
            'account_status': 'Active',
            'created_at': '2026-08-19 00:00:00'
        },
        {
            'id': 'u-patient-1',
            'hospital_id': 'hosp-main',
            'name': 'Alex Morgan',
            'email': 'alex@smartcare.com',
            'password_hash': patient_pass,
            'role': 'PATIENT',
            'account_status': 'Active',
            'created_at': '2026-08-19 00:00:00'
        },
        {
            'id': 'u-visitor-1',
            'hospital_id': 'hosp-main',
            'name': 'David Smith',
            'email': 'visitor@smartcare.com',
            'password_hash': visitor_pass,
            'role': 'VISITOR',
            'account_status': 'Active',
            'created_at': '2026-08-19 00:00:00'
        },
        {
            'id': 'u-admin-1',
            'hospital_id': 'hosp-main',
            'name': 'Dr. Robert Vance (Director)',
            'email': 'admin@smartcare.com',
            'password_hash': admin_pass,
            'role': 'MANAGEMENT',
            'account_status': 'Active',
            'created_at': '2026-08-19 00:00:00'
        }
    ]
    db.users.insert_many(users)

    staff = [
        {
            'id': 'st-1',
            'user_id': 'u-staff-1',
            'employee_code': 'EMP-8821',
            'department_name': 'Cardiology',
            'role_title': 'OPD Charge Nurse',
            'status': 'Active'
        }
    ]
    db.staff.insert_many(staff)

    patients = [
        {
            'id': 'pt-1',
            'user_id': 'u-patient-1',
            'patient_code': 'PAT-2026-904',
            'phone': '+1 (555) 234-5678',
            'dob': '1992-05-14',
            'blood_group': 'O+',
            'emergency_contact': '+1 (555) 999-0000'
        }
    ]
    db.patients.insert_many(patients)

    departments = [
        {'id': 'dept-1', 'name': 'Cardiology', 'floor': 'L2', 'room_number': 'Room 204', 'description': 'Cardiovascular diagnosis and heart care unit.', 'status': 'Active'},
        {'id': 'dept-2', 'name': 'Neurology', 'floor': 'L2', 'room_number': 'Room 210', 'description': 'Brain, nerve and spine care department.', 'status': 'Active'},
        {'id': 'dept-3', 'name': 'Emergency & Trauma', 'floor': 'L0', 'room_number': 'ER Desk 01', 'description': '24/7 Acute critical response care.', 'status': 'Active'},
        {'id': 'dept-4', 'name': 'Orthopedics', 'floor': 'L1', 'room_number': 'Room 112', 'description': 'Bone, joint and musculoskeletal care.', 'status': 'Active'},
        {'id': 'dept-5', 'name': 'Pediatrics', 'floor': 'L1', 'room_number': 'Room 105', 'description': 'Child healthcare and pediatric wellness.', 'status': 'Active'},
        {'id': 'dept-6', 'name': 'Radiology & X-Ray', 'floor': 'B1', 'room_number': 'Room B12', 'description': 'MRI, CT scan and diagnostic imaging.', 'status': 'Active'}
    ]
    db.departments.insert_many(departments)

    doctors = [
        {'id': 'doc-1', 'name': 'Dr. Elizabeth Warren, MD', 'department_name': 'Cardiology', 'room_number': 'Room 204', 'status': 'Consulting', 'avg_consult_time_mins': 5, 'is_active': True},
        {'id': 'doc-2', 'name': 'Dr. Marcus Vance, MD', 'department_name': 'Neurology', 'room_number': 'Room 210', 'status': 'Available', 'avg_consult_time_mins': 6, 'is_active': True},
        {'id': 'doc-3', 'name': 'Dr. Helena Roy, MD', 'department_name': 'Emergency & Trauma', 'room_number': 'ER Desk 01', 'status': 'In Emergency', 'avg_consult_time_mins': 3, 'is_active': True},
        {'id': 'doc-4', 'name': 'Dr. James Chen, MD', 'department_name': 'Orthopedics', 'room_number': 'Room 112', 'status': 'Consulting', 'avg_consult_time_mins': 7, 'is_active': True}
    ]
    db.doctors.insert_many(doctors)

    locations = [
        {'id': 'loc-reception-l0', 'name': 'Main Reception Desk', 'floor': 'L0', 'floor_name': 'Ground Floor (L0)', 'room_number': 'Desk 01', 'category': 'Reception', 'description': 'Primary patient check-in counter and main lobby entrance.', 'x': 400, 'y': 300, 'icon': 'reception', 'is_popular': True},
        {'id': 'loc-cardio-l2', 'name': 'Cardiology Department', 'floor': 'L2', 'floor_name': 'Level 2 (L2)', 'room_number': 'Room 204', 'category': 'Cardiology', 'description': 'Heart checkups, ECG, Echo & OPD consultations.', 'x': 620, 'y': 180, 'icon': 'heart', 'is_popular': True},
        {'id': 'loc-er-l0', 'name': 'Emergency & Trauma ER', 'floor': 'L0', 'floor_name': 'Ground Floor (L0)', 'room_number': 'ER-01', 'category': 'Emergency', 'description': '24/7 acute trauma center and ambulance entrance.', 'x': 180, 'y': 480, 'icon': 'alert', 'is_popular': True},
        {'id': 'loc-pharmacy-l0', 'name': 'Central Pharmacy', 'floor': 'L0', 'floor_name': 'Ground Floor (L0)', 'room_number': 'Pharm-01', 'category': 'Pharmacy', 'description': 'Dispensary for prescriptions and medical supplies.', 'x': 620, 'y': 450, 'icon': 'pill', 'is_popular': True},
        {'id': 'loc-neuro-l2', 'name': 'Neurology Clinic', 'floor': 'L2', 'floor_name': 'Level 2 (L2)', 'room_number': 'Room 210', 'category': 'Neurology', 'description': 'Brain, nerve and spine specialist OPD.', 'x': 250, 'y': 180, 'icon': 'brain', 'is_popular': True},
        {'id': 'loc-ortho-l1', 'name': 'Orthopedics Clinic', 'floor': 'L1', 'floor_name': 'Level 1 (L1)', 'room_number': 'Room 112', 'category': 'Orthopedics', 'description': 'Bone, joint fractures and sports injury OPD.', 'x': 300, 'y': 220, 'icon': 'bone', 'is_popular': True},
        {'id': 'loc-ped-l1', 'name': 'Pediatric Care Unit', 'floor': 'L1', 'floor_name': 'Level 1 (L1)', 'room_number': 'Room 105', 'category': 'Pediatrics', 'description': 'Child healthcare, vaccinations and infant care.', 'x': 550, 'y': 220, 'icon': 'baby', 'is_popular': True},
        {'id': 'loc-lab-b1', 'name': 'Diagnostic Radiology & Lab', 'floor': 'B1', 'floor_name': 'Basement (B1)', 'room_number': 'Lab-B04', 'category': 'Laboratory', 'description': 'Blood tests, MRI, CT scanning & diagnostic lab.', 'x': 400, 'y': 480, 'icon': 'microscope', 'is_popular': True},
        {'id': 'loc-cafe-l1', 'name': 'Hospital Cafeteria', 'floor': 'L1', 'floor_name': 'Level 1 (L1)', 'room_number': 'Caf-101', 'category': 'Cafeteria', 'description': 'Healthy meals, beverages and visitor lounge.', 'x': 620, 'y': 380, 'icon': 'coffee', 'is_popular': False},
        {'id': 'loc-icu-l3', 'name': 'Intensive Care Unit (ICU)', 'floor': 'L3', 'floor_name': 'Level 3 (L3)', 'room_number': 'ICU-301', 'category': 'ICU', 'description': 'Critical care monitoring for high-risk patients.', 'x': 400, 'y': 180, 'icon': 'activity', 'is_popular': False}
    ]
    db.hospital_locations.insert_many(locations)

    queues = [
        {'id': 'q-cardio', 'department_name': 'Cardiology', 'doctor_name': 'Dr. Elizabeth Warren, MD', 'room_number': 'Room 204', 'current_token': 24, 'total_tokens': 38, 'avg_consultation_minutes': 5, 'doctor_status': 'Consulting'},
        {'id': 'q-neuro', 'department_name': 'Neurology', 'doctor_name': 'Dr. Marcus Vance, MD', 'room_number': 'Room 210', 'current_token': 12, 'total_tokens': 20, 'avg_consultation_minutes': 6, 'doctor_status': 'Available'},
        {'id': 'q-er', 'department_name': 'Emergency & Trauma', 'doctor_name': 'Dr. Helena Roy, MD', 'room_number': 'ER Desk 01', 'current_token': 45, 'total_tokens': 52, 'avg_consultation_minutes': 3, 'doctor_status': 'In Emergency'}
    ]
    db.queues.insert_many(queues)

    queue_entries = [
        {'id': 'qe-22', 'queue_id': 'q-cardio', 'token_number': 22, 'patient_name': 'Maria Garcia', 'status': 'completed', 'estimated_time': 'Completed at 09:40 AM'},
        {'id': 'qe-23', 'queue_id': 'q-cardio', 'token_number': 23, 'patient_name': 'John Miller', 'status': 'completed', 'estimated_time': 'Completed at 09:50 AM'},
        {'id': 'qe-24', 'queue_id': 'q-cardio', 'token_number': 24, 'patient_name': 'Robert Taylor', 'status': 'consulting', 'estimated_time': 'Currently in examination room'},
        {'id': 'qe-25', 'queue_id': 'q-cardio', 'token_number': 25, 'patient_name': 'Emily Watson', 'status': 'waiting', 'estimated_time': 'Estimated ~5 mins'},
        {'id': 'qe-26', 'queue_id': 'q-cardio', 'token_number': 26, 'patient_name': 'James Anderson', 'status': 'waiting', 'estimated_time': 'Estimated ~10 mins'},
        {'id': 'qe-27', 'queue_id': 'q-cardio', 'token_number': 27, 'patient_name': 'Sophia Martinez', 'status': 'waiting', 'estimated_time': 'Estimated ~15 mins'},
        {'id': 'qe-28', 'queue_id': 'q-cardio', 'token_number': 28, 'patient_name': 'Daniel Thomas', 'status': 'waiting', 'estimated_time': 'Estimated ~20 mins'},
        {'id': 'qe-29', 'queue_id': 'q-cardio', 'token_number': 29, 'patient_name': 'Olivia Jackson', 'status': 'waiting', 'estimated_time': 'Estimated ~25 mins'},
        {'id': 'qe-30', 'queue_id': 'q-cardio', 'token_number': 30, 'patient_name': 'William White', 'status': 'waiting', 'estimated_time': 'Estimated ~30 mins'},
        {'id': 'qe-31', 'queue_id': 'q-cardio', 'token_number': 31, 'patient_name': 'Alex Morgan (You)', 'status': 'user', 'estimated_time': 'Your Token - Estimated ~35 mins'},
        {'id': 'qe-32', 'queue_id': 'q-cardio', 'token_number': 32, 'patient_name': 'Charlotte Harris', 'status': 'waiting', 'estimated_time': 'Estimated ~40 mins'}
    ]
    db.queue_entries.insert_many(queue_entries)

    appointments = [
        {'id': 'apt-1', 'patient_id': 'u-patient-1', 'patient_name': 'Alex Morgan', 'doctor_name': 'Dr. Elizabeth Warren, MD', 'department_name': 'Cardiology', 'appointment_date': '2026-08-19', 'appointment_time': '10:30 AM', 'status': 'In-Progress'},
        {'id': 'apt-2', 'patient_id': 'u-patient-1', 'patient_name': 'Alex Morgan', 'doctor_name': 'Dr. James Chen, MD', 'department_name': 'Orthopedics', 'appointment_date': '2026-08-22', 'appointment_time': '02:00 PM', 'status': 'Pending'},
        {'id': 'apt-3', 'patient_id': 'u-patient-2', 'patient_name': 'Maria Garcia', 'doctor_name': 'Dr. Marcus Vance, MD', 'department_name': 'Neurology', 'appointment_date': '2026-08-19', 'appointment_time': '09:15 AM', 'status': 'Completed'},
        {'id': 'apt-4', 'patient_id': 'u-patient-3', 'patient_name': 'John Miller', 'doctor_name': 'Dr. Helena Roy, MD', 'department_name': 'Emergency & Trauma', 'appointment_date': '2026-08-19', 'appointment_time': '08:45 AM', 'status': 'Completed'}
    ]
    db.appointments.insert_many(appointments)

    alerts = [
        {'id': 'alt-1', 'title': 'High OPD Queue Volume', 'message': 'Cardiology OPD has exceeded 12 waiting patients. Consider opening Counter 2.', 'severity': 'HIGH', 'category': 'QUEUE', 'created_at': '2026-08-19 09:00:00'},
        {'id': 'alt-2', 'title': 'Doctor On Emergency Duty', 'message': 'Dr. Helena Roy redirected to Acute ER Bay 3.', 'severity': 'MEDIUM', 'category': 'STAFF', 'created_at': '2026-08-19 09:15:00'},
        {'id': 'alt-3', 'title': 'Elevator Maintenance Bank B', 'message': 'Elevator Bank B on Level 1 scheduled for servicing 02:00 PM - 04:00 PM.', 'severity': 'LOW', 'category': 'FACILITY', 'created_at': '2026-08-19 08:30:00'}
    ]
    db.operational_alerts.insert_many(alerts)

    settings = [
        {'key': 'hospital_name', 'value': 'SmartCare General Hospital', 'description': 'Official facility name'},
        {'key': 'operating_hours', 'value': '24/7 ER & Emergency Care | OPD: 08:00 AM - 08:00 PM', 'description': 'General operating schedule'},
        {'key': 'queue_alert_threshold', 'value': '10', 'description': 'Number of patients ahead before triggering high load warning'},
        {'key': 'visitor_wifi_ssid', 'value': 'SmartCare-Guest', 'description': 'Public guest Wi-Fi Network Name'}
    ]
    db.hospital_settings.insert_many(settings)

if __name__ == '__main__':
    init_db()
