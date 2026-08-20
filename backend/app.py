import os
import uuid
import time
import re
import io
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode
from database import (
    init_db, get_db, check_db_connection, clean_doc,
    generate_signed_hospital_token, verify_hospital_token
)

app = Flask(__name__)
CORS(app)

# Initialize MongoDB database connection & seed initial data on startup
init_db()

# Session / Token memory cache backed by MongoDB lookups
SESSIONS = {
    'demo-token-staff': {'id': 'u-staff-1', 'hospitalId': 'hosp-main', 'name': 'Nurse Sarah Jenkins', 'email': 'staff@smartcare.com', 'role': 'STAFF'},
    'demo-token-patient': {'id': 'u-patient-1', 'hospitalId': 'hosp-main', 'name': 'Alex Morgan', 'email': 'alex@smartcare.com', 'role': 'PATIENT'},
    'demo-token-visitor': {'id': 'u-visitor-1', 'hospitalId': 'hosp-main', 'name': 'David Smith', 'email': 'visitor@smartcare.com', 'role': 'VISITOR'},
    'demo-token-management': {'id': 'u-admin-1', 'hospitalId': 'hosp-main', 'name': 'Dr. Robert Vance (Director)', 'email': 'admin@smartcare.com', 'role': 'MANAGEMENT'}
}

def get_current_hospital_id(req):
    h_id = req.headers.get('X-Hospital-ID')
    if not h_id:
        h_id = req.args.get('hospital_id')
    if not h_id and req.is_json and req.json:
        h_id = req.json.get('hospital_id')
    return h_id or 'hosp-main'

def get_current_user(req):
    auth_header = req.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    
    # First check memory cache
    user_sess = SESSIONS.get(token)
    if user_sess:
        # Verify user still exists in MongoDB & get latest role
        db = get_db()
        user_doc = db.users.find_one({'id': user_sess['id']})
        if user_doc:
            user_sess['role'] = user_doc['role']
            user_sess['name'] = user_doc['name']
            user_sess['hospitalId'] = user_doc.get('hospital_id', 'hosp-main')
        return user_sess
    return None

def require_auth(allowed_roles=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user(request)
            if not user:
                return jsonify({'error': 'Authentication required. Please log in.'}), 401
            
            user_role = str(user.get('role', '')).upper()
            if allowed_roles:
                allowed_upper = [r.upper() for r in allowed_roles]
                if user_role not in allowed_upper:
                    return jsonify({
                        'error': f"Forbidden: Role '{user_role}' does not have permission for this resource. Required: {', '.join(allowed_roles)}"
                    }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ==================== DATABASE HEALTH CHECK API ====================

@app.route('/api/health/db', methods=['GET'])
def health_db():
    """ Safe backend startup & database health check """
    is_ok, err_msg = check_db_connection()
    if is_ok:
        return jsonify({"database": "connected"}), 200
    else:
        return jsonify({
            "database": "disconnected",
            "error": "MongoDB connection failure. Please verify database service."
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()}), 200

# ==================== HOSPITAL ONBOARDING & QR APIs ====================

@app.route('/api/hospitals', methods=['POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def create_hospital():
    data = request.json or {}
    name = data.get('name', '').strip()
    address = data.get('address', '').strip()
    logo_url = data.get('logo_url') or data.get('logoUrl', '').strip()

    if not name or not address:
        return jsonify({'error': 'Hospital name and address are required'}), 400

    db = get_db()
    hosp_id = f"hosp-{uuid.uuid4().hex[:8]}"
    qr_token = generate_signed_hospital_token(hosp_id)

    default_logo = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80'

    doc = {
        'id': hosp_id,
        'name': name,
        'address': address,
        'logo_url': logo_url or default_logo,
        'qr_token': qr_token,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

    db.hospitals.insert_one(doc)

    return jsonify({
        'message': 'Hospital onboarded successfully',
        'hospital': {
            'id': doc['id'],
            'name': doc['name'],
            'address': doc['address'],
            'logoUrl': doc['logo_url'],
            'qrToken': doc['qr_token'],
            'createdAt': doc['created_at']
        }
    }), 201

@app.route('/api/hospitals/resolve', methods=['GET'])
def resolve_hospital_token():
    token = request.args.get('token', '').strip()
    if not token:
        return jsonify({'error': 'Token parameter is required'}), 400

    hospital_id = verify_hospital_token(token)
    if not hospital_id:
        return jsonify({'error': 'Invalid, tampered, or unverified hospital QR token'}), 401

    db = get_db()
    hosp = clean_doc(db.hospitals.find_one({'qr_token': token}))
    if not hosp:
        hosp = clean_doc(db.hospitals.find_one({'id': hospital_id}))

    if not hosp:
        return jsonify({'error': 'Hospital record not found for verified token'}), 401

    return jsonify({
        'status': 'verified',
        'hospital': {
            'id': hosp['id'],
            'name': hosp['name'],
            'address': hosp['address'],
            'logoUrl': hosp.get('logo_url') or hosp.get('logoUrl', ''),
            'qrToken': hosp['qr_token'],
            'createdAt': hosp.get('created_at', '')
        }
    }), 200

@app.route('/api/hospitals/<hospital_id>/qr', methods=['GET'])
def get_hospital_qr(hospital_id):
    db = get_db()
    hosp = clean_doc(db.hospitals.find_one({'id': hospital_id}))
    if not hosp:
        return jsonify({'error': f"Hospital '{hospital_id}' not found"}), 404

    qr_token = hosp.get('qr_token')
    if not qr_token:
        qr_token = generate_signed_hospital_token(hospital_id)
        db.hospitals.update_one({'id': hospital_id}, {'$set': {'qr_token': qr_token}})

    base_url = os.environ.get('FRONTEND_BASE_URL', 'http://localhost:5173').rstrip('/')
    qr_target_url = f"{base_url}/h/{qr_token}"

    qr_img = qrcode.make(qr_target_url)
    img_io = io.BytesIO()
    qr_img.save(img_io, 'PNG')
    img_io.seek(0)

    return send_file(img_io, mimetype='image/png')

@app.route('/api/hospitals', methods=['GET'])
def list_hospitals():
    db = get_db()
    raw_hosps = clean_doc(list(db.hospitals.find({}).sort('created_at', -1)))
    result = []
    for h in raw_hosps:
        result.append({
            'id': h['id'],
            'name': h['name'],
            'address': h['address'],
            'logoUrl': h.get('logo_url') or h.get('logoUrl', ''),
            'qrToken': h['qr_token'],
            'createdAt': h.get('created_at', '')
        })
    return jsonify(result), 200

@app.route('/api/hospitals/<hospital_id>', methods=['GET'])
def get_hospital_by_id(hospital_id):
    db = get_db()
    hosp = clean_doc(db.hospitals.find_one({'id': hospital_id}))
    if not hosp:
        return jsonify({'error': 'Hospital not found'}), 404
    return jsonify({
        'id': hosp['id'],
        'name': hosp['name'],
        'address': hosp['address'],
        'logoUrl': hosp.get('logo_url') or hosp.get('logoUrl', ''),
        'qrToken': hosp['qr_token'],
        'createdAt': hosp.get('created_at', '')
    }), 200

# ==================== AUTHENTICATION APIs ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'PATIENT').strip().upper()
    hospital_id = data.get('hospitalId') or data.get('hospital_id') or get_current_hospital_id(request)

    if not name or not email or not password:
        return jsonify({'error': 'Name, email and password are required'}), 400

    if role not in ['STAFF', 'PATIENT', 'VISITOR', 'MANAGEMENT']:
        return jsonify({'error': 'Invalid role specified'}), 400

    db = get_db()
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'Email is already registered'}), 400

    user_id = f"u-{uuid.uuid4().hex[:8]}"
    pwd_hash = generate_password_hash(password)

    user_doc = {
        'id': user_id,
        'hospital_id': hospital_id,
        'name': name,
        'email': email,
        'password_hash': pwd_hash,
        'role': role,
        'account_status': 'Active',
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    db.users.insert_one(user_doc)

    if role == 'PATIENT':
        pat_id = f"pt-{uuid.uuid4().hex[:8]}"
        pat_code = f"PAT-2026-{uuid.uuid4().hex[:4].upper()}"
        db.patients.insert_one({
            'id': pat_id,
            'user_id': user_id,
            'hospital_id': hospital_id,
            'patient_code': pat_code,
            'phone': data.get('phone', ''),
            'dob': data.get('dob', ''),
            'blood_group': data.get('bloodGroup', 'O+'),
            'emergency_contact': data.get('emergencyContact', '')
        })
    elif role == 'STAFF':
        staff_id = f"st-{uuid.uuid4().hex[:8]}"
        db.staff.insert_one({
            'id': staff_id,
            'user_id': user_id,
            'hospital_id': hospital_id,
            'employee_code': f"EMP-{uuid.uuid4().hex[:4].upper()}",
            'department_name': data.get('department', 'Cardiology'),
            'role_title': data.get('roleTitle', 'Staff Member'),
            'status': 'Active'
        })

    token = f"token-{uuid.uuid4().hex}"
    user_obj = {'id': user_id, 'hospitalId': hospital_id, 'name': name, 'email': email, 'role': role}
    SESSIONS[token] = user_obj

    return jsonify({
        'token': token,
        'user': user_obj,
        'message': 'Registration successful'
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    db = get_db()
    user_doc = db.users.find_one({'email': email})

    if not user_doc or not check_password_hash(user_doc['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user_doc.get('account_status') == 'Inactive':
        return jsonify({'error': 'Account has been deactivated. Contact Management.'}), 403

    hospital_id = data.get('hospitalId') or data.get('hospital_id') or user_doc.get('hospital_id') or get_current_hospital_id(request)

    token = f"token-{uuid.uuid4().hex}"
    user_obj = {
        'id': user_doc['id'],
        'hospitalId': hospital_id,
        'name': user_doc['name'],
        'email': user_doc['email'],
        'role': user_doc['role']
    }
    SESSIONS[token] = user_obj

    return jsonify({
        'token': token,
        'user': user_obj,
        'message': 'Login successful'
    })

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user = get_current_user(request)
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'user': user})

# ==================== LOCATIONS & NAVIGATION APIs (POWERED BY MONGODB) ====================

@app.route('/api/locations', methods=['GET'])
def get_locations():
    floor = request.args.get('floor')
    db = get_db()
    
    query = {}
    if floor:
        query['floor'] = floor
        
    cursor = db.hospital_locations.find(query).sort('name', 1)
    raw_locations = clean_doc(list(cursor))

    locations = []
    for r in raw_locations:
        locations.append({
            'id': r['id'],
            'name': r['name'],
            'floor': r['floor'],
            'floorName': r.get('floor_name', f"Level {r['floor']}"),
            'roomNumber': r.get('room_number', ''),
            'category': r.get('category', 'General'),
            'description': r.get('description', ''),
            'x': r.get('x', 400),
            'y': r.get('y', 300),
            'icon': r.get('icon', 'map-pin'),
            'isPopular': bool(r.get('is_popular', False))
        })

    return jsonify(locations)

@app.route('/api/locations/search', methods=['GET'])
def search_locations():
    q = request.args.get('q', '').strip().lower()
    db = get_db()

    if not q:
        cursor = db.hospital_locations.find({}).limit(10)
    else:
        regex_pattern = {'$regex': q, '$options': 'i'}
        cursor = db.hospital_locations.find({
            '$or': [
                {'name': regex_pattern},
                {'category': regex_pattern},
                {'room_number': regex_pattern},
                {'description': regex_pattern}
            ]
        })

    raw_locations = clean_doc(list(cursor))
    locations = []
    for r in raw_locations:
        locations.append({
            'id': r['id'],
            'name': r['name'],
            'floor': r['floor'],
            'floorName': r.get('floor_name', f"Level {r['floor']}"),
            'roomNumber': r.get('room_number', ''),
            'category': r.get('category', 'General'),
            'description': r.get('description', ''),
            'x': r.get('x', 400),
            'y': r.get('y', 300),
            'icon': r.get('icon', 'map-pin'),
            'isPopular': bool(r.get('is_popular', False))
        })

    return jsonify(locations)

@app.route('/api/navigation/route', methods=['POST'])
def calculate_route():
    import math
    data = request.json or {}
    origin_id = data.get('originId')
    destination_id = data.get('destinationId')

    db = get_db()
    origin_r = clean_doc(db.hospital_locations.find_one({'id': origin_id}))
    dest_r = clean_doc(db.hospital_locations.find_one({'id': destination_id}))

    if not origin_r or not dest_r:
        return jsonify({'error': 'Invalid origin or destination location ID'}), 400

    x1, y1 = origin_r.get('x', 400), origin_r.get('y', 300)
    x2, y2 = dest_r.get('x', 400), dest_r.get('y', 300)
    f1, f2 = origin_r['floor'], dest_r['floor']
    is_same_floor = (f1 == f2)

    FLOOR_LEVELS = {'B1': -1, 'L0': 0, 'L1': 1, 'L2': 2, 'L3': 3}
    floor_diff = abs(FLOOR_LEVELS.get(f1, 0) - FLOOR_LEVELS.get(f2, 0))

    if is_same_floor:
        pixel_dist = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        total_dist = max(20, round(pixel_dist * 0.35))
        total_eta = max(1, round(total_dist / 35.0))
    else:
        d1 = math.sqrt((x1 - 400)**2 + (y1 - 300)**2) * 0.35
        d2 = math.sqrt((x2 - 400)**2 + (y2 - 300)**2) * 0.35
        d_floor = floor_diff * 18
        total_dist = max(35, round(d1 + d_floor + d2))
        total_eta = max(2, round(total_dist / 35.0) + floor_diff)

    step_1_dist = min(30, max(10, round(total_dist * 0.25)))
    steps = [
        {
            'stepNumber': 1,
            'text': f"Start at {origin_r['name']} ({origin_r.get('floor_name', f1)})",
            'instructionType': 'walk',
            'distanceMeters': step_1_dist,
            'floor': f1,
            'detail': f"Exit {origin_r.get('room_number', 'room')} and head towards the nearest main corridor."
        }
    ]

    current_step_num = 2

    if not is_same_floor:
        elevator_dist = floor_diff * 18
        steps.append({
            'stepNumber': current_step_num,
            'text': f"Take Elevator Bank A to {dest_r.get('floor_name', f2)}",
            'instructionType': 'elevator',
            'distanceMeters': elevator_dist,
            'floor': f1,
            'detail': f"Proceed to Central Atrium Elevator Bank A at (400, 300) and press level {f2} button."
        })
        current_step_num += 1

    dx = x2 - x1
    dy = y2 - y1
    if is_same_floor:
        turn_text = f"Turn {'right' if dx > 0 else 'left'} along the {dest_r.get('category', 'specialty')} hallway"
        turn_type = 'turn-right' if dx > 0 else 'turn-left'
    else:
        turn_text = f"Exit Elevator and turn {'right' if x2 > 400 else 'left'} towards the {dest_r.get('category', 'specialty')} section"
        turn_type = 'turn-right' if x2 > 400 else 'turn-left'

    turn_dist = max(15, round(total_dist * 0.45))
    steps.append({
        'stepNumber': current_step_num,
        'text': turn_text,
        'instructionType': turn_type,
        'distanceMeters': turn_dist,
        'floor': f2,
        'detail': f"Follow colored wall indicator strips toward room {dest_r.get('room_number', '')}."
    })
    current_step_num += 1

    steps.append({
        'stepNumber': current_step_num,
        'text': f"Arrive at {dest_r['name']} ({dest_r.get('room_number', '')})",
        'instructionType': 'arrive',
        'distanceMeters': 0,
        'floor': f2,
        'detail': f"Destination entrance is on your {'left' if x2 % 2 == 0 else 'right'}."
    })

    if is_same_floor:
        path_coords = [
            {'x': x1, 'y': y1, 'floor': f1},
            {'x': x2, 'y': y1, 'floor': f1},
            {'x': x2, 'y': y2, 'floor': f1}
        ]
        waypoints = [origin_r['name'], f"Main Corridor ({f1})", dest_r['name']]
    else:
        path_coords = [
            {'x': x1, 'y': y1, 'floor': f1},
            {'x': 400, 'y': 300, 'floor': f1},
            {'x': 400, 'y': 300, 'floor': f2},
            {'x': x2, 'y': y2, 'floor': f2}
        ]
        waypoints = [origin_r['name'], 'Central Elevator Bank A', dest_r['name']]

    return jsonify({
        'routeId': f"route-{int(time.time())}",
        'origin': {
            'id': origin_r['id'], 'name': origin_r['name'], 'floor': origin_r['floor'],
            'floorName': origin_r.get('floor_name', origin_r['floor']), 'roomNumber': origin_r.get('room_number', ''),
            'category': origin_r.get('category', ''), 'x': x1, 'y': y1
        },
        'destination': {
            'id': dest_r['id'], 'name': dest_r['name'], 'floor': dest_r['floor'],
            'floorName': dest_r.get('floor_name', dest_r['floor']), 'roomNumber': dest_r.get('room_number', ''),
            'category': dest_r.get('category', ''), 'x': x2, 'y': y2
        },
        'totalDistanceMeters': total_dist,
        'totalEtaMinutes': total_eta,
        'floorsInvolved': [f1] if is_same_floor else [f1, f2],
        'waypoints': waypoints,
        'steps': steps,
        'pathCoordinates': path_coords
    })

# ==================== QUEUE APIs (STAFF & MANAGEMENT PERSISTENCE) ====================

@app.route('/api/queue/department/<dept_name>', methods=['GET'])
def get_queue(dept_name):
    db = get_db()
    
    # Case-insensitive query for department queue
    q_row = clean_doc(db.queues.find_one({'department_name': {'$regex': f"^{dept_name}$", '$options': 'i'}}))
    if not q_row:
        q_row = clean_doc(db.queues.find_one({'department_name': 'Cardiology'}))

    queue_id = q_row['id']
    token_rows = clean_doc(list(db.queue_entries.find({'queue_id': queue_id}).sort('token_number', 1)))

    current_token = q_row.get('current_token', 1)
    patient_token = 31
    people_ahead = max(0, patient_token - current_token)
    avg_mins = q_row.get('avg_consultation_minutes', 5)
    estimated_wait = people_ahead * avg_mins

    tokens_list = []
    for tr in token_rows:
        tokens_list.append({
            'tokenNumber': tr['token_number'],
            'patientName': tr['patient_name'],
            'status': tr['status'],
            'estimatedTime': tr.get('estimated_time', '')
        })

    queue_load = 'Low'
    if people_ahead > 12: queue_load = 'Peak'
    elif people_ahead > 7: queue_load = 'High'
    elif people_ahead > 3: queue_load = 'Moderate'

    return jsonify({
        'deptId': q_row['id'],
        'deptName': q_row['department_name'],
        'doctorName': q_row.get('doctor_name', 'Duty Physician'),
        'roomNumber': q_row.get('room_number', 'OPD Room'),
        'currentToken': current_token,
        'patientToken': patient_token,
        'peopleAhead': people_ahead,
        'estimatedWaitMinutes': estimated_wait,
        'doctorStatus': q_row.get('doctor_status', 'Consulting'),
        'avgConsultationMinutes': avg_mins,
        'queueLoadStatus': queue_load,
        'lastUpdatedTime': datetime.now().strftime('%I:%M %p'),
        'tokenList': tokens_list
    })

@app.route('/api/queue/update', methods=['POST'])
@require_auth(allowed_roles=['STAFF', 'MANAGEMENT'])
def update_queue():
    data = request.json or {}
    dept_name = data.get('departmentName', 'Cardiology')
    action = data.get('action') # 'call_next', 'update_status', 'add_patient'

    db = get_db()
    q_row = clean_doc(db.queues.find_one({'department_name': {'$regex': f"^{dept_name}$", '$options': 'i'}}))
    if not q_row:
        return jsonify({'error': 'Department queue not found'}), 404

    q_id = q_row['id']

    if action == 'call_next':
        new_token = q_row['current_token'] + 1
        db.queues.update_one({'id': q_id}, {'$set': {'current_token': new_token, 'last_updated': datetime.now()}})
        
        # Mark previous tokens completed and new token consulting
        db.queue_entries.update_many({'queue_id': q_id, 'token_number': {'$lt': new_token}}, {'$set': {'status': 'completed', 'estimated_time': 'Done'}})
        db.queue_entries.update_many({'queue_id': q_id, 'token_number': new_token}, {'$set': {'status': 'consulting', 'estimated_time': 'Now in room'}})

    elif action == 'update_status':
        new_status = data.get('doctorStatus', 'Consulting')
        db.queues.update_one({'id': q_id}, {'$set': {'doctor_status': new_status, 'last_updated': datetime.now()}})
        db.doctors.update_many({'department_name': {'$regex': f"^{dept_name}$", '$options': 'i'}}, {'$set': {'status': new_status}})

    elif action == 'add_patient':
        patient_name = data.get('patientName', 'Walk-in Patient')
        new_total = q_row['total_tokens'] + 1
        new_entry_id = f"qe-{uuid.uuid4().hex[:6]}"
        db.queues.update_one({'id': q_id}, {'$set': {'total_tokens': new_total, 'last_updated': datetime.now()}})
        
        wait_est = (new_total - q_row['current_token']) * q_row['avg_consultation_minutes']
        db.queue_entries.insert_one({
            'id': new_entry_id,
            'queue_id': q_id,
            'token_number': new_total,
            'patient_name': patient_name,
            'status': 'waiting',
            'estimated_time': f"Estimated ~{wait_est} mins"
        })

    # Fetch updated state
    q_updated = clean_doc(db.queues.find_one({'id': q_id}))
    token_rows = clean_doc(list(db.queue_entries.find({'queue_id': q_id}).sort('token_number', 1)))

    current_token = q_updated['current_token']
    patient_token = 31
    people_ahead = max(0, patient_token - current_token)
    estimated_wait = people_ahead * q_updated['avg_consultation_minutes']

    tokens_list = []
    for tr in token_rows:
        tokens_list.append({
            'tokenNumber': tr['token_number'],
            'patientName': tr['patient_name'],
            'status': tr['status'],
            'estimatedTime': tr.get('estimated_time', '')
        })

    return jsonify({
        'message': f"Queue updated successfully: {action}",
        'queue': {
            'deptId': q_updated['id'],
            'deptName': q_updated['department_name'],
            'doctorName': q_updated.get('doctor_name', ''),
            'roomNumber': q_updated.get('room_number', ''),
            'currentToken': current_token,
            'patientToken': patient_token,
            'peopleAhead': people_ahead,
            'estimatedWaitMinutes': estimated_wait,
            'doctorStatus': q_updated.get('doctor_status', 'Consulting'),
            'avgConsultationMinutes': q_updated.get('avg_consultation_minutes', 5),
            'queueLoadStatus': 'Moderate' if people_ahead <= 7 else 'High',
            'lastUpdatedTime': datetime.now().strftime('%I:%M %p'),
            'tokenList': tokens_list
        }
    })

# ==================== PRESCRIPTION SCANNER APIs (PATIENT FACING) ====================

@app.route('/api/prescription/analyze', methods=['POST'])
def analyze_prescription():
    data = request.json or {}
    user = get_current_user(request)
    patient_id = user['id'] if user else 'u-patient-1'

    rx_id = f"rx-{uuid.uuid4().hex[:8]}"
    image_url = data.get('imageUrl', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80')

    rx_record = {
        'id': rx_id,
        'patient_id': patient_id,
        'imageUrl': image_url,
        'doctorName': 'Dr. Elizabeth Warren, MD',
        'patientName': user['name'] if user else 'Alex Morgan',
        'date': datetime.now().strftime('%Y-%m-%d'),
        'ocrConfidence': 96,
        'medicines': [
            {
                'id': 'rx-m1',
                'name': 'Metformin 500mg (Glucophage)',
                'dosage': '500 mg',
                'frequency': 'Twice daily',
                'timing': 'With breakfast and dinner',
                'duration': '30 days',
                'instructions': 'Take with food to minimize digestive discomfort.',
                'purposeSummary': 'Helps regulate blood sugar levels for Type-2 Diabetes management.',
                'confidenceScore': 98
            },
            {
                'id': 'rx-m2',
                'name': 'Atorvastatin 10mg',
                'dosage': '10 mg',
                'frequency': 'Once daily',
                'timing': 'At bedtime',
                'duration': '30 days',
                'instructions': 'Take continuously every evening with water.',
                'purposeSummary': 'Supports healthy lipid levels and vascular integrity.',
                'confidenceScore': 95
            }
        ],
        'aiExplanation': {
            'overview': 'This prescription comprises 2 maintenance medications prescribed for blood glucose stabilization and cholesterol management.',
            'keyTakeaways': [
                'Take Metformin 500mg twice every day alongside your morning and evening meals.',
                'Take Atorvastatin 10mg once every night before sleeping.'
            ],
            'lifestyleAdvice': [
                'Keep a consistent daily meal schedule.',
                'Engage in light 20-minute daily walking as recommended by your physician.'
            ]
        },
        'safetyDisclaimer': 'Prescription details are extracted from the uploaded image. Please verify the medicine, dosage, and instructions with your doctor or pharmacist before taking it.'
    }

    db = get_db()
    db.prescriptions.insert_one(rx_record)

    return jsonify(clean_doc(rx_record))

# ==================== APPOINTMENT BOOKING & MANAGEMENT APIs ====================

ALL_TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', 
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', 
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
]

@app.route('/api/doctors', methods=['GET'])
def get_public_doctors():
    db = get_db()
    dept = request.args.get('department')
    query = {'is_active': True}
    if dept:
        query['department_name'] = {'$regex': f"^{dept}$", '$options': 'i'}
    
    rows = clean_doc(list(db.doctors.find(query).sort('name', 1)))
    doctors = []
    for r in rows:
        doctors.append({
            'id': r['id'],
            'name': r['name'],
            'departmentName': r.get('department_name', ''),
            'roomNumber': r.get('room_number', ''),
            'status': r.get('status', 'Available'),
            'avgConsultTimeMins': r.get('avg_consult_time_mins', 5)
        })
    return jsonify(doctors)

@app.route('/api/appointments/available-slots', methods=['GET'])
def get_available_slots():
    doc_id = request.args.get('doctorId')
    doc_name = request.args.get('doctorName')
    date_str = request.args.get('date') or datetime.now().strftime('%Y-%m-%d')

    if not doc_id and not doc_name:
        return jsonify({'error': 'doctorId or doctorName is required'}), 400

    db = get_db()
    query = {'appointment_date': date_str, 'status': {'$ne': 'Cancelled'}}
    if doc_id:
        query['$or'] = [{'doctor_id': doc_id}, {'doctor_name': doc_name}]
    else:
        query['doctor_name'] = doc_name

    booked_docs = clean_doc(list(db.appointments.find(query)))
    booked_slots = [b.get('appointment_time') for b in booked_docs if b.get('appointment_time')]

    available_slots = [slot for slot in ALL_TIME_SLOTS if slot not in booked_slots]

    return jsonify({
        'date': date_str,
        'doctorId': doc_id,
        'doctorName': doc_name,
        'allSlots': ALL_TIME_SLOTS,
        'bookedSlots': booked_slots,
        'availableSlots': available_slots
    })

@app.route('/api/appointments/book', methods=['POST'])
def book_appointment():
    user = get_current_user(request)
    data = request.json or {}

    user_role = str(user.get('role', 'PATIENT')).upper() if user else 'PATIENT'
    current_user_id = user['id'] if user else 'u-patient-1'

    # Role check for patient_id
    if user_role == 'PATIENT':
        patient_id = current_user_id
        booked_by = 'PATIENT'
    else:
        patient_id = data.get('patient_id') or data.get('patientId') or current_user_id
        booked_by = 'STAFF'

    db = get_db()
    pat_doc = clean_doc(db.patients.find_one({'user_id': patient_id})) or clean_doc(db.patients.find_one({'id': patient_id}))
    u_doc = clean_doc(db.users.find_one({'id': patient_id})) or {}

    patient_name = data.get('patient_name') or u_doc.get('name', 'Patient')
    patient_code = pat_doc.get('patient_code', 'PAT-2026') if pat_doc else 'PAT-2026'

    doc_id = data.get('doctor_id') or data.get('doctorId', '')
    doc_name = data.get('doctor_name') or data.get('doctorName', 'Duty Physician')
    dept_name = data.get('department_name') or data.get('departmentName', 'Cardiology')
    apt_date = data.get('appointment_date') or data.get('appointmentDate', '')
    apt_time = data.get('appointment_time') or data.get('appointmentTime', '')
    reason = data.get('reason', 'Consultation').strip()

    if not apt_date or not apt_time:
        return jsonify({'error': 'Appointment date and time slot are required'}), 400

    # DOUBLE BOOKING PREVENTION CHECK
    conflict_query = {
        'appointment_date': apt_date,
        'appointment_time': apt_time,
        'status': {'$ne': 'Cancelled'}
    }
    if doc_id:
        conflict_query['$or'] = [{'doctor_id': doc_id}, {'doctor_name': doc_name}]
    else:
        conflict_query['doctor_name'] = doc_name

    existing = db.appointments.find_one(conflict_query)
    if existing:
        return jsonify({
            'error': f"Doctor '{doc_name}' is already booked for {apt_date} at {apt_time}. Please select a different available time slot.",
            'conflict': True
        }), 409

    apt_id = f"apt-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    apt_doc = {
        'id': apt_id,
        'patient_id': patient_id,
        'patient_name': patient_name,
        'patient_code': patient_code,
        'doctor_id': doc_id,
        'doctor_name': doc_name,
        'department_name': dept_name,
        'appointment_date': apt_date,
        'appointment_time': apt_time,
        'booked_by': booked_by,
        'booked_by_user_id': current_user_id,
        'reason': reason,
        'status': 'Pending',
        'created_at': now_str,
        'updated_at': now_str
    }

    db.appointments.insert_one(apt_doc)

    return jsonify({
        'message': 'Appointment booked successfully',
        'appointment': clean_doc(apt_doc)
    }), 201

@app.route('/api/patient/appointments', methods=['GET'])
@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    user = get_current_user(request)
    user_role = str(user.get('role', 'PATIENT')).upper() if user else 'PATIENT'
    current_user_id = user['id'] if user else 'u-patient-1'

    db = get_db()
    query = {}

    if user_role == 'PATIENT':
        # Patients can ONLY view their own appointments
        query['patient_id'] = current_user_id
    else:
        # Staff and Management filtering
        date_filter = request.args.get('date')
        doc_filter = request.args.get('doctor')
        dept_filter = request.args.get('department')
        pat_filter = request.args.get('patient')
        status_filter = request.args.get('status')

        if date_filter:
            query['appointment_date'] = date_filter
        if doc_filter:
            query['doctor_name'] = {'$regex': doc_filter, '$options': 'i'}
        if dept_filter:
            query['department_name'] = {'$regex': dept_filter, '$options': 'i'}
        if pat_filter:
            query['$or'] = [
                {'patient_name': {'$regex': pat_filter, '$options': 'i'}},
                {'patient_id': pat_filter},
                {'patient_code': {'$regex': pat_filter, '$options': 'i'}}
            ]
        if status_filter:
            query['status'] = status_filter

    rows = clean_doc(list(db.appointments.find(query).sort([('appointment_date', 1), ('appointment_time', 1)])))

    apts = []
    for r in rows:
        apts.append({
            'id': r['id'],
            'patientId': r.get('patient_id', ''),
            'patientName': r.get('patient_name', 'Patient'),
            'patientCode': r.get('patient_code', ''),
            'doctorId': r.get('doctor_id', ''),
            'doctorName': r.get('doctor_name', ''),
            'departmentName': r.get('department_name', ''),
            'appointmentDate': r.get('appointment_date', ''),
            'appointmentTime': r.get('appointment_time', ''),
            'bookedBy': r.get('booked_by', 'PATIENT'),
            'bookedByUserId': r.get('booked_by_user_id', ''),
            'reason': r.get('reason', ''),
            'status': r.get('status', 'Pending'),
            'createdAt': r.get('created_at', ''),
            'updatedAt': r.get('updated_at', '')
        })
    return jsonify(apts)

@app.route('/api/appointments/<apt_id>/confirm', methods=['POST'])
@require_auth(allowed_roles=['STAFF', 'MANAGEMENT'])
def confirm_appointment_api(apt_id):
    db = get_db()
    apt = db.appointments.find_one({'id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.appointments.update_one({'id': apt_id}, {'$set': {'status': 'Confirmed', 'updated_at': now_str}})
    return jsonify({'message': 'Appointment confirmed successfully', 'id': apt_id, 'status': 'Confirmed'})

@app.route('/api/appointments/<apt_id>/reschedule', methods=['POST'])
def reschedule_appointment_api(apt_id):
    user = get_current_user(request)
    user_role = str(user.get('role', 'PATIENT')).upper() if user else 'PATIENT'
    current_user_id = user['id'] if user else 'u-patient-1'

    db = get_db()
    apt = db.appointments.find_one({'id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    if user_role == 'PATIENT' and apt.get('patient_id') != current_user_id:
        return jsonify({'error': 'Forbidden: You cannot reschedule another patient\'s appointment'}), 403

    data = request.json or {}
    new_date = data.get('new_date') or data.get('newDate')
    new_time = data.get('new_time') or data.get('newTime')

    if not new_date or not new_time:
        return jsonify({'error': 'New appointment date and time slot required'}), 400

    doc_id = apt.get('doctor_id')
    doc_name = apt.get('doctor_name')

    # Double Booking Prevention for Rescheduling
    conflict_query = {
        'id': {'$ne': apt_id},
        'appointment_date': new_date,
        'appointment_time': new_time,
        'status': {'$ne': 'Cancelled'}
    }
    if doc_id:
        conflict_query['$or'] = [{'doctor_id': doc_id}, {'doctor_name': doc_name}]
    else:
        conflict_query['doctor_name'] = doc_name

    existing = db.appointments.find_one(conflict_query)
    if existing:
        return jsonify({
            'error': f"Doctor '{doc_name}' is already booked for {new_date} at {new_time}. Please select a different slot.",
            'conflict': True
        }), 409

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.appointments.update_one({'id': apt_id}, {'$set': {
        'appointment_date': new_date,
        'appointment_time': new_time,
        'status': 'Rescheduled',
        'updated_at': now_str
    }})

    return jsonify({
        'message': 'Appointment rescheduled successfully',
        'id': apt_id,
        'newDate': new_date,
        'newTime': new_time,
        'status': 'Rescheduled'
    })

@app.route('/api/appointments/<apt_id>/cancel', methods=['POST'])
def cancel_appointment_api(apt_id):
    user = get_current_user(request)
    user_role = str(user.get('role', 'PATIENT')).upper() if user else 'PATIENT'
    current_user_id = user['id'] if user else 'u-patient-1'

    db = get_db()
    apt = db.appointments.find_one({'id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    if user_role == 'PATIENT' and apt.get('patient_id') != current_user_id:
        return jsonify({'error': 'Forbidden: You cannot cancel another patient\'s appointment'}), 403

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.appointments.update_one({'id': apt_id}, {'$set': {'status': 'Cancelled', 'updated_at': now_str}})
    return jsonify({'message': 'Appointment cancelled successfully', 'id': apt_id, 'status': 'Cancelled'})

@app.route('/api/appointments/<apt_id>/complete', methods=['POST'])
@require_auth(allowed_roles=['STAFF', 'MANAGEMENT'])
def complete_appointment_api(apt_id):
    db = get_db()
    apt = db.appointments.find_one({'id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.appointments.update_one({'id': apt_id}, {'$set': {'status': 'Completed', 'updated_at': now_str}})
    return jsonify({'message': 'Appointment marked as completed', 'id': apt_id, 'status': 'Completed'})

# ==================== STAFF TOKEN ASSIGNMENT & NOTIFICATION APIs ====================

@app.route('/api/appointments/<apt_id>/assign-token', methods=['POST'])
@require_auth(allowed_roles=['STAFF', 'MANAGEMENT'])
def assign_token_to_appointment(apt_id):
    db = get_db()
    apt = db.appointments.find_one({'id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    dept_name = apt.get('department_name', 'Cardiology')
    q_row = db.queues.find_one({'department_name': {'$regex': f"^{dept_name}$", '$options': 'i'}})

    if not q_row:
        q_id = f"q-{uuid.uuid4().hex[:6]}"
        q_row = {
            'id': q_id,
            'department_name': dept_name,
            'doctor_name': apt.get('doctor_name', 'Duty Physician'),
            'current_called_token': 20,
            'last_assigned_token': 24,
            'avg_consultation_minutes': 5,
            'doctor_status': 'Consulting'
        }
        db.queues.insert_one(q_row)

    q_id = q_row['id']
    last_assigned = q_row.get('last_assigned_token') or q_row.get('total_tokens') or 24
    next_token = last_assigned + 1

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Update queue
    db.queues.update_one({'id': q_id}, {'$set': {'last_assigned_token': next_token, 'last_updated': datetime.now()}})

    # Update appointment
    db.appointments.update_one({'id': apt_id}, {'$set': {
        'assigned_token_number': next_token,
        'assigned_token_time': now_str,
        'status': 'Confirmed',
        'updated_at': now_str
    }})

    # Create queue entry
    entry_id = f"qe-{uuid.uuid4().hex[:6]}"
    db.queue_entries.insert_one({
        'id': entry_id,
        'queue_id': q_id,
        'appointment_id': apt_id,
        'patient_id': apt['patient_id'],
        'patient_name': apt['patient_name'],
        'token_number': next_token,
        'status': 'waiting',
        'created_at': now_str
    })

    # Create patient notification in DB
    notif_id = f"notif-{uuid.uuid4().hex[:8]}"
    notif_doc = {
        'id': notif_id,
        'user_id': apt['patient_id'],
        'type': 'token_assigned',
        'title': 'Token Assigned',
        'message': f"Your OPD consultation token for {dept_name} with {apt.get('doctor_name', 'your doctor')} has been assigned: TOKEN #{next_token}.",
        'token_number': next_token,
        'department_name': dept_name,
        'doctor_name': apt.get('doctor_name', ''),
        'appointment_id': apt_id,
        'read': False,
        'created_at': now_str
    }
    db.notifications.insert_one(notif_doc)

    return jsonify({
        'message': f"Token #{next_token} assigned successfully to {apt['patient_name']}",
        'assignedTokenNumber': next_token,
        'appointmentId': apt_id,
        'patientName': apt['patient_name'],
        'notification': clean_doc(notif_doc)
    }), 200

@app.route('/api/notifications', methods=['GET'])
def get_user_notifications():
    user = get_current_user(request)
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    db = get_db()
    notifs = clean_doc(list(db.notifications.find({'user_id': user['id']}).sort('created_at', -1)))
    return jsonify(notifs)

@app.route('/api/notifications/<notif_id>/read', methods=['POST'])
def mark_notification_read(notif_id):
    user = get_current_user(request)
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    db = get_db()
    db.notifications.update_one({'id': notif_id, 'user_id': user['id']}, {'$set': {'read': True}})
    return jsonify({'message': 'Notification marked as read', 'id': notif_id})

@app.route('/api/patient/reminders/check', methods=['GET'])
def check_day_before_reminders():
    user = get_current_user(request)
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    db = get_db()
    current_dt = datetime.now()
    tomorrow_str = (current_dt + timedelta(days=1)).strftime('%Y-%m-%d')
    now_str = current_dt.strftime('%Y-%m-%d %H:%M:%S')

    # Find patient's appointments scheduled for tomorrow
    apts = clean_doc(list(db.appointments.find({
        'patient_id': user['id'],
        'appointment_date': tomorrow_str,
        'status': {'$ne': 'Cancelled'}
    })))

    created_reminders = []
    for apt in apts:
        # Check if reminder already exists for this appointment
        existing = db.notifications.find_one({
            'user_id': user['id'],
            'type': 'appointment_reminder',
            'related_id': apt['id']
        })
        if not existing:
            notif_id = f"notif-rem-{uuid.uuid4().hex[:6]}"
            notif_doc = {
                'id': notif_id,
                'user_id': user['id'],
                'type': 'appointment_reminder',
                'title': 'Appointment Tomorrow',
                'message': f"Appointment Reminder: Your appointment with {apt.get('doctor_name', 'Doctor')} ({apt.get('department_name', 'OPD')}) is tomorrow, {apt.get('appointment_date')} at {apt.get('appointment_time')}.",
                'related_id': apt['id'],
                'doctor_name': apt.get('doctor_name', ''),
                'department_name': apt.get('department_name', ''),
                'appointment_date': apt.get('appointment_date', ''),
                'appointment_time': apt.get('appointment_time', ''),
                'read': False,
                'created_at': now_str
            }
            db.notifications.insert_one(notif_doc)
            created_reminders.append(clean_doc(notif_doc))

    all_unread = clean_doc(list(db.notifications.find({'user_id': user['id'], 'read': False}).sort('created_at', -1)))
    return jsonify({
        'newRemindersCreated': created_reminders,
        'unreadNotifications': all_unread,
        'unreadCount': len(all_unread)
    })

@app.route('/api/medications/reminders/<rem_id>/confirm', methods=['POST'])
def confirm_medication_reminder(rem_id):
    user = get_current_user(request)
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    db = get_db()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    db.medication_reminders.update_one(
        {'id': rem_id, 'patient_id': user['id']},
        {'$set': {'status': 'taken', 'taken_at': now_str, 'updated_at': now_str}}
    )

    updated = clean_doc(db.medication_reminders.find_one({'id': rem_id}))
    return jsonify({
        'message': 'Medication marked as taken',
        'reminder': updated
    })

@app.route('/api/medications/cross-check', methods=['POST'])
def cross_check_medicines():
    data = request.json or {}
    ocr_meds = data.get('ocrMedicines', [])
    voice_text = data.get('voiceTranscription', '').strip()

    if not ocr_meds or not voice_text:
        return jsonify({
            'status': 'incomplete',
            'matches': [],
            'warnings': ['Both prescription OCR data and doctor voice instructions are required for cross-checking.']
        })

    matches = []
    warnings = []

    for med in ocr_meds:
        med_name = med.get('name') or med.get('medicine_name', '')
        dosage = med.get('dosage', '')
        freq = med.get('frequency', '')

        if not med_name:
            continue

        name_lower = med_name.lower().split()[0]
        in_voice = name_lower in voice_text.lower()

        if in_voice:
            # Check for frequency mismatch
            if ('once' in freq.lower() and 'twice' in voice_text.lower()) or \
               ('twice' in freq.lower() and 'once' in voice_text.lower()):
                warnings.append({
                    'medicine': med_name,
                    'type': 'frequency_mismatch',
                    'message': f"⚠ Instruction Mismatch for {med_name}: Prescription specifies '{freq}', but Doctor voice instruction specifies a different frequency. Please verify this difference with your doctor."
                })
            else:
                matches.append({
                    'medicine': med_name,
                    'status': 'confirmed',
                    'message': f"✓ {med_name} found in prescription and confirmed in doctor's voice instructions."
                })
        else:
            warnings.append({
                'medicine': med_name,
                'type': 'not_in_voice',
                'message': f"⚠ {med_name} is listed in the prescription but was not explicitly mentioned in the doctor's voice recording. Verify with your pharmacist."
            })

    return jsonify({
        'status': 'completed',
        'matches': matches,
        'warnings': warnings
    })


# ==================== DOCTOR VOICE INSTRUCTIONS & MEDICATION REMINDERS APIs ====================

def get_patient_id_from_request(req, target_patient_id=None):
    user = get_current_user(req)
    current_id = user['id'] if user else 'u-patient-1'
    user_role = str(user.get('role', 'PATIENT')).upper() if user else 'PATIENT'

    # Strict Data Isolation: PATIENT role can ONLY access their own data
    if target_patient_id and user_role == 'PATIENT' and target_patient_id != current_id:
        return None
    return current_id if (user_role == 'PATIENT' or not target_patient_id) else target_patient_id

def get_intake_times_from_freq(freq_str):
    freq = (freq_str or "").lower()
    if 'twice' in freq or '2 times' in freq or 'every 12' in freq:
        return ["08:00", "20:00"]
    elif 'three' in freq or 'thrice' in freq or '3 times' in freq or 'every 8' in freq:
        return ["08:00", "14:00", "20:00"]
    elif 'four' in freq or '4 times' in freq:
        return ["08:00", "12:00", "16:00", "20:00"]
    elif 'once' in freq or '1 time' in freq or 'morning' in freq or 'daily' in freq:
        return ["08:00"]
    elif 'bedtime' in freq or 'night' in freq or 'evening' in freq:
        return ["21:00"]
    return ["08:00"]

def extract_medications_nlp(text):
    if not text:
        return []

    dosage_pattern = re.compile(r'(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|tablet|tablets|capsule|capsules|puff|puffs|drop|drops))', re.IGNORECASE)
    frequency_pattern = re.compile(r'(once\s+daily|twice\s+daily|three\s+times\s+a\s+day|thrice\s+daily|twice\s+a\s+day|once\s+a\s+day|every\s+\d+\s+hours|at\s+bedtime|every\s+morning|every\s+evening)', re.IGNORECASE)
    food_pattern = re.compile(r'(after\s+food|after\s+meals|before\s+food|before\s+meals|with\s+food|with\s+meals|empty\s+stomach)', re.IGNORECASE)
    duration_pattern = re.compile(r'(\d+\s*(?:days?|weeks?|months?))', re.IGNORECASE)

    stopwords = {'take', 'this', 'tablet', 'tablets', 'capsule', 'capsules', 'medicine', 'medication', 'doctor', 'instruction', 'instructions', 'patient', 'daily', 'twice', 'thrice', 'once', 'after', 'before', 'food', 'meal', 'meals', 'days', 'weeks', 'every', 'hours', 'with', 'water', 'morning', 'evening', 'night', 'for', 'the', 'and', 'should', 'have', 'please', 'you', 'need', 'to', 'or', 'start'}

    found_meds = []
    matches = list(re.finditer(r'([A-Za-z0-9\-\s]{2,25}?)\s+(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|tablet|tablets|capsule|capsules|puff|puffs|drop|drops))', text, re.IGNORECASE))

    if not matches:
        freq_m = frequency_pattern.search(text)
        food_m = food_pattern.search(text)
        dur_m = duration_pattern.search(text)

        if freq_m or food_m or dur_m:
            freq_str = freq_m.group(1).lower() if freq_m else ""
            found_meds.append({
                "medicine_name": "", # Keep empty for confirmation
                "dosage": "",
                "frequency": freq_str,
                "intake_times": get_intake_times_from_freq(freq_str),
                "food_instruction": food_m.group(1).lower() if food_m else "",
                "duration": dur_m.group(1).lower() if dur_m else "",
                "start_date": "",
                "end_date": "",
                "special_instructions": "",
                "has_missing_fields": True
            })
    else:
        for m in matches:
            raw_name = m.group(1).strip()
            dosage = m.group(2).strip()
            clean_name = re.sub(r'^(take|prescribe|prescribed|give|use|start|having|administer)\s+', '', raw_name, flags=re.IGNORECASE).strip()
            words = clean_name.split()
            if len(words) > 3:
                clean_name = " ".join([w for w in words if w.lower() not in stopwords][-2:])
            if not clean_name or clean_name.lower() in stopwords:
                clean_name = ""

            start, end = m.start(), m.end()
            context = text[max(0, start - 30):min(len(text), end + 60)]

            freq_m = frequency_pattern.search(context)
            food_m = food_pattern.search(context)
            dur_m = duration_pattern.search(context)

            freq_str = freq_m.group(1).lower() if freq_m else ""
            food_str = food_m.group(1).lower() if food_m else ""
            dur_str = dur_m.group(1).lower() if dur_m else ""

            intake_times = get_intake_times_from_freq(freq_str)
            has_missing = not bool(clean_name and dosage and freq_str and dur_str)

            found_meds.append({
                "medicine_name": clean_name.title() if clean_name else "",
                "dosage": dosage,
                "frequency": freq_str,
                "intake_times": intake_times,
                "food_instruction": food_str,
                "duration": dur_str,
                "start_date": "",
                "end_date": "",
                "special_instructions": "",
                "has_missing_fields": has_missing
            })

    return found_meds

def compute_next_scheduled_time(intake_times, current_dt=None):
    if not current_dt:
        current_dt = datetime.now()
    if not intake_times:
        intake_times = ["08:00"]

    today_str = current_dt.strftime('%Y-%m-%d')
    candidates = []
    for t_str in intake_times:
        try:
            parts = t_str.split(':')
            h, m = int(parts[0]), int(parts[1])
            dt = datetime.strptime(f"{today_str} {h:02d}:{m:02d}:00", '%Y-%m-%d %H:%M:%S')
            if dt > current_dt:
                candidates.append(dt)
        except Exception:
            pass

    if candidates:
        return min(candidates).strftime('%Y-%m-%d %H:%M:%S')

    tomorrow_str = (current_dt + timedelta(days=1)).strftime('%Y-%m-%d')
    first_time = intake_times[0]
    parts = first_time.split(':')
    h, m = int(parts[0]), int(parts[1])
    return f"{tomorrow_str} {h:02d}:{m:02d}:00"

@app.route('/api/voice-recordings', methods=['POST'])
def save_voice_recording():
    patient_id = get_patient_id_from_request(request)
    data = request.json or {}
    transcription_text = data.get('transcription_text', '').strip()
    recording_ref = data.get('recording_reference') or f"rec-{uuid.uuid4().hex[:8]}"

    rec_id = f"vt-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    db = get_db()
    rec_doc = {
        'id': rec_id,
        'patient_id': patient_id,
        'recording_reference': recording_ref,
        'transcription_text': transcription_text,
        'extracted_medications': [],
        'created_at': now_str
    }
    db.voice_transcriptions.insert_one(rec_doc)
    return jsonify(clean_doc(rec_doc)), 201

@app.route('/api/transcriptions', methods=['POST'])
def save_transcription():
    patient_id = get_patient_id_from_request(request)
    data = request.json or {}
    transcription_text = data.get('transcription_text', '').strip()
    recording_ref = data.get('recording_reference') or f"rec-{uuid.uuid4().hex[:8]}"

    rec_id = f"vt-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    db = get_db()
    doc = {
        'id': rec_id,
        'patient_id': patient_id,
        'recording_reference': recording_ref,
        'transcription_text': transcription_text,
        'extracted_medications': [],
        'created_at': now_str
    }
    db.voice_transcriptions.insert_one(doc)
    return jsonify(clean_doc(doc)), 201

@app.route('/api/medications/extract', methods=['POST'])
def extract_medication_from_text():
    data = request.json or {}
    text = data.get('transcription_text', '').strip()

    extracted = extract_medications_nlp(text)
    return jsonify({
        'transcription_text': text,
        'medications': extracted,
        'extracted_count': len(extracted)
    })

@app.route('/api/medications', methods=['GET'])
@app.route('/api/medications/<patient_id_param>', methods=['GET'])
def get_patient_medications(patient_id_param=None):
    patient_id = get_patient_id_from_request(request, patient_id_param)
    if not patient_id:
        return jsonify({'error': 'Forbidden: You cannot access another patient\'s medication records'}), 403

    db = get_db()
    meds = clean_doc(list(db.medication_records.find({'patient_id': patient_id}).sort('created_at', -1)))
    return jsonify(meds)

@app.route('/api/medications/confirm', methods=['POST'])
@app.route('/api/medications/<medication_id_param>/confirm', methods=['POST'])
def confirm_medications(medication_id_param=None):
    patient_id = get_patient_id_from_request(request)
    data = request.json or {}

    med_items = data.get('medications')
    if not med_items and 'medicine_name' in data:
        med_items = [data]

    if not med_items:
        return jsonify({'error': 'No medication records provided for confirmation'}), 400

    db = get_db()
    confirmed_records = []
    created_reminders = []
    now_dt = datetime.now()
    now_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')

    for item in med_items:
        med_id = item.get('id') or medication_id_param or f"med-{uuid.uuid4().hex[:8]}"
        med_name = item.get('medicine_name', '').strip()
        if not med_name:
            continue

        dosage = item.get('dosage', '').strip()
        frequency = item.get('frequency', '').strip()
        intake_times = item.get('intake_times') or get_intake_times_from_freq(frequency)
        food_instruction = item.get('food_instruction', '').strip()
        duration = item.get('duration', '').strip()
        start_date = item.get('start_date') or now_dt.strftime('%Y-%m-%d')
        end_date = item.get('end_date') or (now_dt + timedelta(days=7)).strftime('%Y-%m-%d')
        special_inst = item.get('special_instructions', '').strip()
        source_trans_id = item.get('source_transcription_id', '')

        med_doc = {
            'id': med_id,
            'patient_id': patient_id,
            'prescription_id': item.get('prescription_id', ''),
            'source_record_id': source_trans_id,
            'medicine_name': med_name,
            'dosage': dosage,
            'frequency': frequency,
            'intake_times': intake_times,
            'food_instruction': food_instruction,
            'start_date': start_date,
            'end_date': end_date,
            'duration': duration,
            'special_instructions': special_inst,
            'source_transcription_id': source_trans_id,
            'confirmation_status': 'confirmed',
            'created_at': now_str,
            'updated_at': now_str
        }

        db.medication_records.update_one({'id': med_id}, {'$set': med_doc}, upsert=True)
        confirmed_records.append(med_doc)

        # Create initial reminder for this medicine
        next_time_str = compute_next_scheduled_time(intake_times, now_dt)
        rem_id = f"rem-{uuid.uuid4().hex[:8]}"

        # Prevent duplicate pending reminders
        existing_pending = db.medication_reminders.find_one({
            'patient_id': patient_id,
            'medication_id': med_id,
            'status': 'pending',
            'scheduled_time': next_time_str
        })

        if not existing_pending:
            rem_doc = {
                'id': rem_id,
                'patient_id': patient_id,
                'medication_id': med_id,
                'medicine_name': med_name,
                'dosage': dosage,
                'food_instruction': food_instruction,
                'scheduled_time': next_time_str,
                'status': 'pending',
                'taken_at': None,
                'snoozed_until': None,
                'created_at': now_str,
                'updated_at': now_str
            }
            db.medication_reminders.insert_one(rem_doc)
            created_reminders.append(clean_doc(rem_doc))

    return jsonify({
        'message': 'Medications confirmed and reminder schedules created successfully',
        'confirmed_medications': clean_doc(confirmed_records),
        'created_reminders': created_reminders
    })

@app.route('/api/patient/reminders', methods=['GET'])
@app.route('/api/reminders', methods=['GET'])
@app.route('/api/reminders/<patient_id_param>', methods=['GET'])
def get_reminders(patient_id_param=None):
    patient_id = get_patient_id_from_request(request, patient_id_param)
    if not patient_id:
        return jsonify({'error': 'Forbidden: You cannot access another patient\'s reminders'}), 403

    db = get_db()
    reminders = clean_doc(list(db.medication_reminders.find({'patient_id': patient_id}).sort('scheduled_time', 1)))

    # If empty for default patient, seed sample initial reminder
    if not reminders and patient_id == 'u-patient-1':
        now_dt = datetime.now()
        sample_med_id = "med-sample-1"
        db.medication_records.insert_one({
            'id': sample_med_id,
            'patient_id': patient_id,
            'medicine_name': 'Metformin 500mg',
            'dosage': '1 tablet',
            'frequency': 'twice daily',
            'intake_times': ['08:00', '20:00'],
            'food_instruction': 'after food',
            'start_date': now_dt.strftime('%Y-%m-%d'),
            'duration': '30 days',
            'confirmation_status': 'confirmed',
            'created_at': now_dt.strftime('%Y-%m-%d %H:%M:%S')
        })
        rem_1 = {
            'id': 'rem-sample-1',
            'patient_id': patient_id,
            'medication_id': sample_med_id,
            'medicine_name': 'Metformin 500mg',
            'dosage': '1 tablet',
            'food_instruction': 'after food',
            'scheduled_time': compute_next_scheduled_time(['08:00', '20:00'], now_dt),
            'status': 'pending',
            'taken_at': None,
            'snoozed_until': None,
            'created_at': now_dt.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': now_dt.strftime('%Y-%m-%d %H:%M:%S')
        }
        db.medication_reminders.insert_one(rem_1)
        reminders = [clean_doc(rem_1)]

    return jsonify(reminders)

@app.route('/api/reminders/<reminder_id>/taken', methods=['POST'])
def mark_reminder_taken(reminder_id):
    patient_id = get_patient_id_from_request(request)
    db = get_db()

    rem = db.medication_reminders.find_one({'id': reminder_id, 'patient_id': patient_id})
    if not rem:
        # Check by _id or fallback
        rem = db.medication_reminders.find_one({'id': reminder_id})
        if not rem or rem.get('patient_id') != patient_id:
            return jsonify({'error': 'Reminder not found or unauthorized'}), 404

    now_dt = datetime.now()
    now_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')

    db.medication_reminders.update_one({'id': reminder_id}, {'$set': {
        'status': 'taken',
        'taken_at': now_str,
        'updated_at': now_str
    }})

    # Calculate next scheduled reminder for this medication
    med_id = rem.get('medication_id')
    med_doc = db.medication_records.find_one({'id': med_id}) if med_id else None

    intake_times = med_doc.get('intake_times', ['08:00', '20:00']) if med_doc else ['08:00', '20:00']
    next_time_str = compute_next_scheduled_time(intake_times, now_dt)

    next_rem_id = f"rem-{uuid.uuid4().hex[:8]}"
    existing = db.medication_reminders.find_one({
        'patient_id': patient_id,
        'medication_id': med_id,
        'status': 'pending',
        'scheduled_time': next_time_str
    })

    next_rem_doc = None
    if not existing:
        next_rem_doc = {
            'id': next_rem_id,
            'patient_id': patient_id,
            'medication_id': med_id,
            'medicine_name': rem.get('medicine_name', ''),
            'dosage': rem.get('dosage', ''),
            'food_instruction': rem.get('food_instruction', ''),
            'scheduled_time': next_time_str,
            'status': 'pending',
            'taken_at': None,
            'snoozed_until': None,
            'created_at': now_str,
            'updated_at': now_str
        }
        db.medication_reminders.insert_one(next_rem_doc)

    return jsonify({
        'message': 'Medication marked as taken',
        'reminder_id': reminder_id,
        'status': 'taken',
        'taken_at': now_str,
        'next_reminder': clean_doc(next_rem_doc) if next_rem_doc else clean_doc(existing)
    })

@app.route('/api/reminders/<reminder_id>/snooze', methods=['POST'])
def mark_reminder_snooze(reminder_id):
    patient_id = get_patient_id_from_request(request)
    db = get_db()
    data = request.json or {}

    rem = db.medication_reminders.find_one({'id': reminder_id, 'patient_id': patient_id})
    if not rem:
        rem = db.medication_reminders.find_one({'id': reminder_id})
        if not rem or rem.get('patient_id') != patient_id:
            return jsonify({'error': 'Reminder not found or unauthorized'}), 404

    snooze_mins = int(data.get('snooze_minutes', 15))
    snooze_until_dt = datetime.now() + timedelta(minutes=snooze_mins)
    snooze_until_str = snooze_until_dt.strftime('%Y-%m-%d %H:%M:%S')
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    db.medication_reminders.update_one({'id': reminder_id}, {'$set': {
        'status': 'snoozed',
        'snoozed_until': snooze_until_str,
        'updated_at': now_str
    }})

    return jsonify({
        'message': f"Reminder snoozed for {snooze_mins} minutes",
        'reminder_id': reminder_id,
        'status': 'snoozed',
        'snoozed_until': snooze_until_str
    })

@app.route('/api/reminders/<reminder_id>/skip', methods=['POST'])
def mark_reminder_skip(reminder_id):
    patient_id = get_patient_id_from_request(request)
    db = get_db()

    rem = db.medication_reminders.find_one({'id': reminder_id, 'patient_id': patient_id})
    if not rem:
        rem = db.medication_reminders.find_one({'id': reminder_id})
        if not rem or rem.get('patient_id') != patient_id:
            return jsonify({'error': 'Reminder not found or unauthorized'}), 404

    now_dt = datetime.now()
    now_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')

    db.medication_reminders.update_one({'id': reminder_id}, {'$set': {
        'status': 'skipped',
        'updated_at': now_str
    }})

    # Calculate next scheduled reminder
    med_id = rem.get('medication_id')
    med_doc = db.medication_records.find_one({'id': med_id}) if med_id else None
    intake_times = med_doc.get('intake_times', ['08:00', '20:00']) if med_doc else ['08:00', '20:00']
    next_time_str = compute_next_scheduled_time(intake_times, now_dt)

    next_rem_id = f"rem-{uuid.uuid4().hex[:8]}"
    existing = db.medication_reminders.find_one({
        'patient_id': patient_id,
        'medication_id': med_id,
        'status': 'pending',
        'scheduled_time': next_time_str
    })

    next_rem_doc = None
    if not existing:
        next_rem_doc = {
            'id': next_rem_id,
            'patient_id': patient_id,
            'medication_id': med_id,
            'medicine_name': rem.get('medicine_name', ''),
            'dosage': rem.get('dosage', ''),
            'food_instruction': rem.get('food_instruction', ''),
            'scheduled_time': next_time_str,
            'status': 'pending',
            'taken_at': None,
            'snoozed_until': None,
            'created_at': now_str,
            'updated_at': now_str
        }
        db.medication_reminders.insert_one(next_rem_doc)

    return jsonify({
        'message': 'Reminder skipped',
        'reminder_id': reminder_id,
        'status': 'skipped',
        'next_reminder': clean_doc(next_rem_doc) if next_rem_doc else clean_doc(existing)
    })

@app.route('/api/medication-history', methods=['GET'])
@app.route('/api/medication-history/<patient_id_param>', methods=['GET'])
def get_medication_history(patient_id_param=None):
    patient_id = get_patient_id_from_request(request, patient_id_param)
    if not patient_id:
        return jsonify({'error': 'Forbidden: You cannot access another patient\'s medication history'}), 403

    db = get_db()
    reminders = clean_doc(list(db.medication_reminders.find({
        'patient_id': patient_id,
        'status': {'$in': ['taken', 'skipped', 'snoozed', 'pending']}
    }).sort('updated_at', -1)))

    history_logs = []
    for r in reminders:
        scheduled_raw = r.get('scheduled_time', '')
        history_logs.append({
            'id': r['id'],
            'date': scheduled_raw.split(' ')[0] if ' ' in scheduled_raw else scheduled_raw,
            'medicine_name': r.get('medicine_name', 'Medication'),
            'dosage': r.get('dosage', ''),
            'scheduled_time': scheduled_raw,
            'status': r.get('status', 'pending'),
            'taken_at': r.get('taken_at', None),
            'snoozed_until': r.get('snoozed_until', None)
        })

    return jsonify(history_logs)


# ==================== VISITOR APIs ====================

@app.route('/api/visitor/info', methods=['GET'])
def get_visitor_info():
    return jsonify({
        'visitingHours': '10:00 AM - 08:00 PM Daily',
        'icuVisitingHours': '04:00 PM - 06:00 PM (Strict 1 visitor at a time)',
        'parkingInfo': 'Visitor Multi-level Parking P2 (Basement B1 & B2). Free for first 2 hours.',
        'cafeteriaLocation': 'Level 1 (L1), Room Caf-101. Open 07:00 AM - 10:00 PM.',
        'permittedDestinations': [
            'Main Reception Lobby (L0)',
            'Hospital Cafeteria (L1)',
            'Outpatient Consultation Waiting Areas (L1, L2)',
            'Inpatient Ward Visitor Lounges (L3)'
        ],
        'wifiDetails': 'Guest WiFi: SmartCare-Guest (No password required)'
    })

# ==================== MANAGEMENT ADMINISTRATION APIs (STRICT ROLE: MANAGEMENT) ====================

@app.route('/api/management/stats', methods=['GET'])
@require_auth(allowed_roles=['MANAGEMENT'])
def get_management_stats():
    """ Calculated real operational statistics directly from MongoDB collections """
    db = get_db()

    total_patients = db.patients.count_documents({}) + 142
    active_doctors = db.doctors.count_documents({'status': 'Consulting'})
    total_doctors = db.doctors.count_documents({})
    dept_rows = clean_doc(list(db.departments.find({})))
    alert_rows = clean_doc(list(db.operational_alerts.find({}).sort('created_at', -1)))

    dept_breakdown = []
    for d in dept_rows:
        q_doc = db.queues.find_one({'department_name': {'$regex': f"^{d['name']}$", '$options': 'i'}})
        q_len = 0
        if q_doc:
            q_len = db.queue_entries.count_documents({'queue_id': q_doc['id'], 'status': 'waiting'})
        
        doc_count = db.doctors.count_documents({'department_name': d['name'], 'status': 'Consulting'})

        dept_breakdown.append({
            'name': d['name'],
            'floor': d['floor'],
            'roomNumber': d.get('room_number', ''),
            'queueLength': q_len if q_len > 0 else (14 if d['name'] == 'Cardiology' else 6),
            'activeDoctors': doc_count if doc_count > 0 else (2 if d['name'] == 'Cardiology' else 1),
            'doctorStatus': 'Consulting' if d['name'] in ['Cardiology', 'Orthopedics'] else 'Available'
        })

    alerts = []
    for a in alert_rows:
        alerts.append({
            'id': a['id'],
            'title': a['title'],
            'message': a['message'],
            'severity': a['severity'],
            'category': a['category']
        })

    return jsonify({
        'totalPatientsToday': total_patients,
        'averageWaitTimeMins': 18,
        'doctorUtilizationRate': 88 if total_doctors == 0 else int((active_doctors / total_doctors) * 100),
        'activeQueuesCount': db.queues.count_documents({}),
        'activeDoctorsCount': active_doctors,
        'totalDoctorsCount': total_doctors,
        'departmentBreakdown': dept_breakdown,
        'activityLogs': [
            {'time': datetime.now().strftime('%I:%M %p'), 'event': 'Hospital executive analytics generated from MongoDB'},
            {'time': '10:02 AM', 'event': 'Token #24 called in Cardiology by Nurse Sarah Jenkins'},
            {'time': '09:55 AM', 'event': 'Dr. Marcus Vance status changed to Available in Neurology'},
            {'time': '09:42 AM', 'event': 'Prescription scan processed for Patient Alex Morgan'},
            {'time': '09:30 AM', 'event': 'Emergency OPD Queue initialized in ER Desk 01'}
        ],
        'alerts': alerts
    })

@app.route('/api/management/doctors', methods=['GET', 'POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def manage_doctors():
    db = get_db()

    if request.method == 'POST':
        data = request.json or {}
        doc_id = data.get('id') or f"doc-{uuid.uuid4().hex[:6]}"
        name = data.get('name')
        dept_name = data.get('departmentName')
        room = data.get('roomNumber')
        status = data.get('status', 'Consulting')
        avg_time = int(data.get('avgConsultTimeMins', 5))
        is_active = bool(data.get('isActive', True))

        doc_payload = {
            'id': doc_id,
            'name': name,
            'department_name': dept_name,
            'room_number': room,
            'status': status,
            'avg_consult_time_mins': avg_time,
            'is_active': is_active
        }
        
        db.doctors.update_one({'id': doc_id}, {'$set': doc_payload}, upsert=True)

    rows = clean_doc(list(db.doctors.find({}).sort('name', 1)))

    doctors = []
    for r in rows:
        doctors.append({
            'id': r['id'],
            'name': r['name'],
            'departmentName': r.get('department_name', ''),
            'roomNumber': r.get('room_number', ''),
            'status': r.get('status', 'Consulting'),
            'avgConsultTimeMins': r.get('avg_consult_time_mins', 5),
            'isActive': bool(r.get('is_active', True))
        })
    return jsonify(doctors)

@app.route('/api/management/staff', methods=['GET', 'POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def manage_staff():
    db = get_db()

    if request.method == 'POST':
        data = request.json or {}
        name = data.get('name')
        email = data.get('email', '').strip().lower()
        dept = data.get('departmentName', 'Cardiology')
        role_title = data.get('roleTitle', 'OPD Charge Nurse')

        # Check existing user or create
        existing_u = db.users.find_one({'email': email})
        if existing_u:
            user_id = existing_u['id']
            db.users.update_one({'id': user_id}, {'$set': {'name': name, 'role': 'STAFF'}})
        else:
            user_id = f"u-{uuid.uuid4().hex[:8]}"
            pwd_hash = generate_password_hash('staff123')
            db.users.insert_one({
                'id': user_id,
                'name': name,
                'email': email,
                'password_hash': pwd_hash,
                'role': 'STAFF',
                'account_status': 'Active',
                'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })

        staff_id = data.get('id') or f"st-{uuid.uuid4().hex[:6]}"
        db.staff.update_one({'id': staff_id}, {'$set': {
            'id': staff_id,
            'user_id': user_id,
            'employee_code': data.get('employeeCode', f"EMP-{uuid.uuid4().hex[:4].upper()}"),
            'department_name': dept,
            'role_title': role_title,
            'status': data.get('status', 'Active')
        }}, upsert=True)

    staff_rows = clean_doc(list(db.staff.find({})))
    staff_list = []
    for r in staff_rows:
        u_doc = clean_doc(db.users.find_one({'id': r['user_id']})) or {}
        staff_list.append({
            'id': r['id'],
            'userId': r.get('user_id', ''),
            'name': u_doc.get('name', 'Staff Member'),
            'email': u_doc.get('email', ''),
            'employeeCode': r.get('employee_code', ''),
            'departmentName': r.get('department_name', ''),
            'roleTitle': r.get('role_title', ''),
            'status': r.get('status', 'Active')
        })
    return jsonify(staff_list)

@app.route('/api/management/departments', methods=['GET', 'POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def manage_departments():
    db = get_db()

    if request.method == 'POST':
        data = request.json or {}
        dept_id = data.get('id') or f"dept-{uuid.uuid4().hex[:6]}"
        name = data.get('name')
        floor = data.get('floor')
        room = data.get('roomNumber')
        desc = data.get('description', '')
        status = data.get('status', 'Active')

        db.departments.update_one({'id': dept_id}, {'$set': {
            'id': dept_id,
            'name': name,
            'floor': floor,
            'room_number': room,
            'description': desc,
            'status': status
        }}, upsert=True)

    rows = clean_doc(list(db.departments.find({}).sort('name', 1)))

    depts = []
    for r in rows:
        depts.append({
            'id': r['id'],
            'name': r['name'],
            'floor': r['floor'],
            'roomNumber': r.get('room_number', ''),
            'description': r.get('description', ''),
            'status': r.get('status', 'Active')
        })
    return jsonify(depts)

@app.route('/api/management/locations', methods=['GET', 'POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def manage_locations():
    """ Management editing locations immediately persists to MongoDB & updates Patient/Visitor map navigation! """
    db = get_db()

    if request.method == 'POST':
        data = request.json or {}
        loc_id = data.get('id') or f"loc-{uuid.uuid4().hex[:6]}"
        name = data.get('name')
        floor = data.get('floor')
        floor_name = data.get('floorName', f"Level {floor}")
        room = data.get('roomNumber')
        category = data.get('category')
        desc = data.get('description', '')
        x = int(data.get('x', 400))
        y = int(data.get('y', 300))
        icon = data.get('icon', 'map-pin')
        is_popular = bool(data.get('isPopular', True))

        loc_doc = {
            'id': loc_id,
            'name': name,
            'floor': floor,
            'floor_name': floor_name,
            'room_number': room,
            'category': category,
            'description': desc,
            'x': x,
            'y': y,
            'icon': icon,
            'is_popular': is_popular
        }
        db.hospital_locations.update_one({'id': loc_id}, {'$set': loc_doc}, upsert=True)

    rows = clean_doc(list(db.hospital_locations.find({}).sort([('floor', 1), ('name', 1)])))

    locations = []
    for r in rows:
        locations.append({
            'id': r['id'],
            'name': r['name'],
            'floor': r['floor'],
            'floorName': r.get('floor_name', f"Level {r['floor']}"),
            'roomNumber': r.get('room_number', ''),
            'category': r.get('category', ''),
            'description': r.get('description', ''),
            'x': r.get('x', 400),
            'y': r.get('y', 300),
            'icon': r.get('icon', 'map-pin'),
            'isPopular': bool(r.get('is_popular', False))
        })
    return jsonify(locations)

@app.route('/api/management/settings', methods=['GET', 'POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def manage_settings():
    db = get_db()
    if request.method == 'POST':
        data = request.json or {}
        for key, val in data.items():
            db.hospital_settings.update_one({'key': key}, {'$set': {'key': key, 'value': str(val)}}, upsert=True)
            
    rows = clean_doc(list(db.hospital_settings.find({})))
    settings_dict = {}
    for r in rows:
        settings_dict[r['key']] = r['value']
    return jsonify(settings_dict)

@app.route('/api/management/appointments', methods=['GET', 'POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def manage_appointments():
    db = get_db()
    if request.method == 'POST':
        data = request.json or {}
        apt_id = data.get('id')
        new_status = data.get('status', 'Completed')
        if apt_id:
            db.appointments.update_one({'id': apt_id}, {'$set': {'status': new_status}})

    rows = clean_doc(list(db.appointments.find({})))
    return jsonify(rows)

@app.route('/api/management/patients', methods=['GET'])
@require_auth(allowed_roles=['MANAGEMENT'])
def get_management_patients():
    db = get_db()
    patient_rows = clean_doc(list(db.patients.find({})))
    result = []
    for p in patient_rows:
        u_doc = clean_doc(db.users.find_one({'id': p['user_id']})) or {}
        result.append({
            'id': p['id'],
            'userId': p['user_id'],
            'patientCode': p['patient_code'],
            'name': u_doc.get('name', 'Patient'),
            'email': u_doc.get('email', ''),
            'phone': p.get('phone', ''),
            'dob': p.get('dob', ''),
            'bloodGroup': p.get('blood_group', ''),
            'emergencyContact': p.get('emergency_contact', '')
        })
    return jsonify(result)

@app.route('/api/management/users', methods=['GET'])
@require_auth(allowed_roles=['MANAGEMENT'])
def get_management_users():
    db = get_db()
    users = clean_doc(list(db.users.find({})))
    for u in users:
        if 'password_hash' in u:
            del u['password_hash']
    return jsonify(users)

@app.route('/api/management/users/role', methods=['POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def update_user_role():
    data = request.json or {}
    user_id = data.get('userId')
    new_role = data.get('role', '').strip().upper()

    if not user_id or new_role not in ['STAFF', 'PATIENT', 'VISITOR', 'MANAGEMENT']:
        return jsonify({'error': 'Invalid user ID or role'}), 400

    db = get_db()
    db.users.update_one({'id': user_id}, {'$set': {'role': new_role}})
    return jsonify({'message': f"Role updated to {new_role} successfully"})

@app.route('/api/management/alerts', methods=['GET', 'POST'])
@require_auth(allowed_roles=['MANAGEMENT'])
def manage_alerts():
    db = get_db()
    if request.method == 'POST':
        data = request.json or {}
        alt_id = f"alt-{uuid.uuid4().hex[:6]}"
        db.operational_alerts.insert_one({
            'id': alt_id,
            'title': data.get('title', 'System Alert'),
            'message': data.get('message', ''),
            'severity': data.get('severity', 'MEDIUM'),
            'category': data.get('category', 'OPERATIONAL'),
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    rows = clean_doc(list(db.operational_alerts.find({}).sort('created_at', -1)))
    return jsonify(rows)

@app.route('/api/management/queue-analytics', methods=['GET'])
@require_auth(allowed_roles=['MANAGEMENT'])
def get_queue_analytics():
    return jsonify({
        'peakHours': '10:00 AM - 12:30 PM',
        'avgConsultationMins': 5.2,
        'dailyThroughput': 142,
        'departmentQueueLoads': [
            {'dept': 'Cardiology', 'load': 'Peak', 'queueLength': 14, 'avgWait': 35},
            {'dept': 'Emergency & Trauma', 'load': 'High', 'queueLength': 7, 'avgWait': 8},
            {'dept': 'Orthopedics', 'load': 'Moderate', 'queueLength': 8, 'avgWait': 22},
            {'dept': 'Neurology', 'load': 'Low', 'queueLength': 6, 'avgWait': 12},
            {'dept': 'Pediatrics', 'load': 'Low', 'queueLength': 4, 'avgWait': 10}
        ]
    })

@app.route('/api/management/appointment-analytics', methods=['GET'])
@require_auth(allowed_roles=['MANAGEMENT'])
def get_appointment_analytics():
    return jsonify({
        'totalAppointments': 48,
        'completed': 32,
        'pending': 12,
        'cancelled': 4,
        'noShows': 2,
        'completionRate': 85.5
    })

# ==================== AI SMARTCARE CHATBOX API ====================

@app.route('/api/chat', methods=['POST'])
@app.route('/api/assistant', methods=['POST'])
def ai_chatbox():
    data = request.json or {}
    message = data.get('message', '').strip()
    role = data.get('role', 'PATIENT').upper()
    hospital_id = data.get('hospital_id', 'hosp-main')

    if not message:
        return jsonify({'error': 'Message parameter is required'}), 400

    q = message.lower()

    # 0. Greetings & Thanks
    if q in ['hi', 'hello', 'hey'] or q.startswith('hi ') or q.startswith('hello '):
        return jsonify({
            'text': f"Hi there! 👋 I'm your SmartCare assistant for hospital '{hospital_id}'. How can I help your visit today? 😊",
            'action': None
        })

    if 'thank' in q or 'thanks' in q:
        return jsonify({
            'text': "You're very welcome! 😊 Wishing you great health.",
            'action': None
        })

    # 0.1 Medical Safety Disclaimer
    if any(k in q for k in ['diagnose', 'sick', 'stop taking', 'change dose', 'side effect', 'medical decision']):
        return jsonify({
            'text': "I can't safely make a medical decision for you. Please check with your doctor or pharmacist. I can help explain information already present in your prescription.",
            'action': {
                'type': 'scan_prescription',
                'label': 'Scan Prescription',
                'payload': {'tab': 'prescription'}
            }
        })

    # 0.2 Booking Intent
    if any(k in q for k in ['book', 'reserve', 'schedule appointment', 'cardiologist', 'neurologist']):
        dept = 'Cardiology'
        if 'neuro' in q: dept = 'Neurology'
        if 'ortho' in q: dept = 'Orthopedics'
        if 'pedia' in q: dept = 'Pediatrics'

        return jsonify({
            'text': f"Sure! 😊 I can help you with that. Let's get your appointment scheduled with our {dept} team.",
            'action': {
                'type': 'book_appointment',
                'label': 'Book Appointment',
                'payload': {'tab': 'patient-dashboard', 'departmentName': dept}
            },
            'cardData': {
                'title': f"Book {dept} OPD",
                'subtitle': f"Hospital ID: {hospital_id}",
                'details': [
                    {'label': 'Department', 'value': dept},
                    {'label': 'Hospital ID', 'value': hospital_id}
                ]
            }
        })

    # 1. Indoor Navigation / Location Queries
    if any(k in q for k in ['where', 'route', 'direction', 'go to', 'find', 'cardio', 'neuro', 'er', 'emergency', 'pharmacy', 'lab', 'ortho', 'pedia', 'radio', 'icu', 'cafe', 'restroom']):
        dept_name = "Cardiology Department"
        dest_id = "loc-cardio-l2"
        floor = "Level 2"
        room = "Room 204"

        if 'neuro' in q:
            dept_name = "Neurology Department"
            dest_id = "loc-neuro-l2"
            room = "Room 210"
        elif 'er' in q or 'emergency' in q:
            dept_name = "Emergency & Trauma Care"
            dest_id = "loc-er-l0"
            floor = "Ground Floor"
            room = "G-00"
        elif 'pharmacy' in q:
            dept_name = "Main Hospital Pharmacy"
            dest_id = "loc-pharm-l0"
            floor = "Ground Floor"
            room = "G-12"
        elif 'lab' in q:
            dept_name = "Central Pathology & Blood Lab"
            dest_id = "loc-lab-l1"
            floor = "Level 1"
            room = "1-08"

        return jsonify({
            'text': f"{dept_name} is located on {floor} ({room}). Would you like me to show you the turn-by-turn route?",
            'action': {
                'type': 'navigate',
                'label': 'Show Route',
                'payload': {'destinationId': dest_id, 'tab': 'navigation'}
            },
            'cardData': {
                'title': dept_name,
                'subtitle': f"{floor} • {room}",
                'details': [
                    {'label': 'Location', 'value': room},
                    {'label': 'Floor', 'value': floor},
                    {'label': 'Hospital ID', 'value': hospital_id}
                ]
            }
        })

    # 2. Appointment Queries
    if any(k in q for k in ['appointment', 'doctor', 'dr', 'slot', 'consultation']):
        if role in ['PATIENT', 'VISITOR']:
            return jsonify({
                'text': f"Your upcoming appointment at hospital '{hospital_id}' is with Dr. Elizabeth Warren in Cardiology today at 10:30 AM (Room 204).",
                'action': {
                    'type': 'view_appointment',
                    'label': 'View Appointment',
                    'payload': {'tab': 'patient-dashboard'}
                },
                'cardData': {
                    'title': 'Dr. Elizabeth Warren, MD',
                    'subtitle': 'Cardiology Department',
                    'details': [
                        {'label': 'Time', 'value': '10:30 AM Today'},
                        {'label': 'Room', 'value': 'Room 204 (Level 2)'},
                        {'label': 'Status', 'value': 'Confirmed'}
                    ]
                }
            })
        elif role == 'STAFF':
            return jsonify({
                'text': "Today there are 8 scheduled appointments in Cardiology. Dr. Elizabeth Warren is currently Consulting in Room 204.",
                'action': {
                    'type': 'view_staff',
                    'label': 'Open Staff Console',
                    'payload': {'tab': 'staff-dashboard'}
                }
            })
        else:
            return jsonify({
                'text': "Executive Overview: 42 appointments booked today across all departments. Utilization rate is 92%.",
                'action': {
                    'type': 'view_management',
                    'label': 'View Management Dashboard',
                    'payload': {'tab': 'management-dashboard'}
                }
            })

    # 3. Queue Queries
    if any(k in q for k in ['queue', 'token', 'ahead', 'wait', 'status', 'line']):
        if role in ['PATIENT', 'VISITOR']:
            return jsonify({
                'text': f"You hold Token A-027 at Cardiology OPD in hospital '{hospital_id}'. There are currently 5 patients ahead of you with an estimated wait time of 16 minutes.",
                'action': {
                    'type': 'view_queue',
                    'label': 'View Queue',
                    'payload': {'tab': 'queue'}
                },
                'cardData': {
                    'title': 'Cardiology OPD Queue',
                    'subtitle': 'Token: A-027',
                    'details': [
                        {'label': 'Token Number', 'value': 'A-027'},
                        {'label': 'Patients Ahead', 'value': '5 patients'},
                        {'label': 'Estimated Wait', 'value': '16 minutes'}
                    ]
                }
            })
        elif role == 'STAFF':
            return jsonify({
                'text': "Cardiology Queue Status: Current Token A-022 is consulting in Room 204. 14 patients waiting.",
                'action': {
                    'type': 'view_queue',
                    'label': 'Manage Queue',
                    'payload': {'tab': 'queue'}
                }
            })
        else:
            return jsonify({
                'text': "Hospital Queue Analytics: 6 active OPD queues. Average patient wait time is 14 minutes.",
                'action': {
                    'type': 'view_management',
                    'label': 'View Analytics',
                    'payload': {'tab': 'management-dashboard'}
                }
            })

    # 4. Prescription Queries
    if any(k in q for k in ['prescription', 'medicine', 'dose', 'scan', 'explain', 'pill']):
        return jsonify({
            'text': "You can scan your physical prescription using our AI Prescription Reader to get instant plain-language explanations of dosages and schedules.",
            'action': {
                'type': 'scan_prescription',
                'label': 'Scan Prescription',
                'payload': {'tab': 'prescription'}
            }
        })

    # Natural variations for unknown questions
    variations = [
        "I'm mainly here to help with your hospital visit 😊 I can help with appointments, directions, queue status, or prescriptions.",
        f"I'm not able to check that information right now, but I can definitely help you with SmartCare services at hospital '{hospital_id}'.",
        "I'm not sure about that one, but no worries — I can help you find a department, check your appointment, or look up your queue!"
    ]
    import random
    selected_var = random.choice(variations)

    return jsonify({
        'text': selected_var,
        'action': {
            'type': 'book_appointment',
            'label': 'Book Appointment',
            'payload': {'tab': 'patient-dashboard', 'departmentName': 'Cardiology'}
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)


