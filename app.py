from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from urllib.parse import urlsplit
import os
import re
import secrets

from flask import (Flask, abort, flash, get_flashed_messages, redirect,
                   render_template, request, session, url_for)
from flask_sqlalchemy import SQLAlchemy
from flask_login import (LoginManager, UserMixin, current_user, login_required,
                         login_user, logout_user)
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash



# ==================================================
# BACKEND INDEX
# Search for an HTML filename or BLOCK: to find its code.
# Major sections use three blank lines; code blocks use one.
# 1. APP SETTINGS: Flask, SQLite and LoginManager
# 2. DATABASE MODELS: Classes and db.Column definitions
# 3. ACCOUNT LOADER: Reload the signed-in User
# 4. SHARED HELPERS: Validation, sessions and access rules
# 5. PAGE DATA: Records supplied to the existing JavaScript
# 6. ACCOUNT ACCESS: First admin setup, login and registration
# 7. PATIENT BOOKINGS: Reservations, tokens and changes
# 8. STAFF OPERATIONS: Scan progress and work attendance
# 9. ADMIN MANAGEMENT: Services, slots and people
# 10. ADMIN ATTENDANCE: Corrections with preserved history
# 11. APPLICATION START: db.create_all() and Flask startup
# ==================================================



# ==================================================
# APP SETTINGS: Flask, SQLite and LoginManager
# HTML: All 21 templates (shared code)
# The database stays beside app.py, rather than in an instance folder.
# ==================================================

# BLOCK: Create the Flask application and SQLite connection settings.
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + Path(__file__).with_name('database.db').as_posix()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'connect_args': {'timeout': 30}}
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024

# BLOCK: Initialize SQLAlchemy and Flask-Login like the reference project.
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# BLOCK: Shared portal names and the centre's local timezone.
CENTRE_TIME = timezone(timedelta(hours=5, minutes=30))
PATIENT_PAGES = {'patient_dashboard', 'book_appointment', 'my_appointments', 'queue_tracking'}
STAFF_PAGES = {'staff_dashboard', 'staff_appointments', 'staff_attendance'}
ADMIN_PAGES = {'admin_dashboard', 'admin_scan_services', 'admin_slots', 'admin_appointments',
               'admin_patients', 'admin_staff', 'admin_attendance', 'admin_reports'}
SHARED_PAGES = {'appointment_details', 'reschedule_appointment'}
PUBLIC_PAGES = {'index', 'scan_services', 'login', 'register'}

# BLOCK: Enable SQLite foreign keys for every SQLAlchemy connection.
@event.listens_for(Engine, 'connect')
def enable_sqlite_foreign_keys(connection, connection_record):
    cursor = connection.cursor()
    cursor.execute('PRAGMA foreign_keys = ON')
    cursor.close()



# ==================================================
# DATABASE MODELS: Classes and db.Column definitions
# Existing table and column names preserve database.db records.
# Add or update model fields here when developing features.
# ==================================================

# BLOCK: Setting - Persistent application settings and the session signing secret.
class Setting(db.Model):
    __tablename__ = 'settings'
    name = db.Column(db.String(80), primary_key=True)
    value = db.Column(db.Text, nullable=False)

# BLOCK: User - Patient, staff and administrator accounts.
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120, collation='NOCASE'), unique=True, nullable=False)
    contact = db.Column(db.String(10), nullable=False)
    age = db.Column(db.Integer)
    password_hash = db.Column(db.String(256), nullable=False)
    active = db.Column(db.Boolean, nullable=False, default=True)
    __table_args__ = (
        db.CheckConstraint("role IN ('patient', 'staff', 'admin')"),
        db.CheckConstraint('age IS NULL OR age BETWEEN 1 AND 120'),
    )

    # BLOCK: Flask-Login must reject accounts disabled by the administrator.
    @property
    def is_active(self):
        return self.active

# BLOCK: Service - Scan names, token codes and referral requirements.
class Service(db.Model):
    __tablename__ = 'services'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    code = db.Column(db.String(6, collation='NOCASE'), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    referral_required = db.Column(db.Boolean, nullable=False)
    active = db.Column(db.Boolean, nullable=False)

# BLOCK: StaffService - Scan services assigned to each staff member.
class StaffService(db.Model):
    __tablename__ = 'staff_services'
    staff_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), primary_key=True)

# BLOCK: Slot - Scheduled scan times and booking capacity.
class Slot(db.Model):
    __tablename__ = 'slots'
    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    time = db.Column(db.String(5), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    open = db.Column(db.Boolean, nullable=False)
    __table_args__ = (
        db.UniqueConstraint('service_id', 'date', 'time'),
        db.CheckConstraint('capacity BETWEEN 1 AND 100'),
    )

# BLOCK: TokenCounter - Last token number issued for a scan service and date.
class TokenCounter(db.Model):
    __tablename__ = 'token_counters'
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), primary_key=True)
    date = db.Column(db.String(10), primary_key=True)
    last_number = db.Column(db.Integer, nullable=False)

# BLOCK: Appointment - Patient booking details, status and issued token.
class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey('slots.id'), nullable=False)
    patient_name = db.Column(db.String(80), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    contact = db.Column(db.String(10), nullable=False)
    body_part = db.Column(db.String(100), nullable=False)
    referral = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    token = db.Column(db.String(40), unique=True, nullable=False)
    token_label = db.Column(db.String(20), nullable=False)
    token_sequence = db.Column(db.Integer, nullable=False)
    __table_args__ = (
        db.CheckConstraint('age BETWEEN 1 AND 120'),
        db.CheckConstraint("status IN ('Booked', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No-show')"),
        db.Index('appointment_slot_status', 'slot_id', 'status'),
        db.Index('appointment_patient', 'patient_id'),
    )

# BLOCK: AppointmentHistory - Previous slots, tokens and status changes.
class AppointmentHistory(db.Model):
    __tablename__ = 'appointment_history'
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey('slots.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    at = db.Column(db.String(40), nullable=False)
    token = db.Column(db.String(40), nullable=False)
    __table_args__ = (db.Index('history_appointment', 'appointment_id'),)

# BLOCK: Attendance - One check-in and check-out per staff workday.
class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    check_in = db.Column(db.String(40), nullable=False)
    check_out = db.Column(db.String(40))
    __table_args__ = (db.UniqueConstraint('staff_id', 'date'),)

# BLOCK: AttendanceCorrection - Attendance edits and their original timestamps.
class AttendanceCorrection(db.Model):
    __tablename__ = 'attendance_corrections'
    id = db.Column(db.Integer, primary_key=True)
    attendance_id = db.Column(db.Integer, db.ForeignKey('attendance.id'), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    at = db.Column(db.String(40), nullable=False)
    previous_check_in = db.Column(db.String(40), nullable=False)
    previous_check_out = db.Column(db.String(40))
    check_in = db.Column(db.String(40), nullable=False)
    check_out = db.Column(db.String(40))
    __table_args__ = (db.Index('corrections_attendance', 'attendance_id'),)



# ==================================================
# ACCOUNT LOADER: Reload the signed-in User
# HTML: All protected templates (shared code)
# Flask-Login stores the user ID and calls this function each request.
# ==================================================

# BLOCK: load_user - Restore an active account from the Flask-Login session.
@login_manager.user_loader
def load_user(user_id):
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    if not 0 < user_id < 2 ** 63:
        return None
    return User.query.filter_by(id=user_id, active=True).first()



# ==================================================
# SHARED HELPERS: Validation, sessions and access rules
# HTML: All 21 templates (shared code)
# Every change is a POST protected by a session CSRF token.
# Write transactions serialize capacity checks and token allocation.
# ==================================================

# BLOCK: centre_now - Use Indian local time on every computer.
def centre_now():
    return datetime.now(CENTRE_TIME)

# BLOCK: require - Stop a submission when a business rule fails.
def require(condition, message):
    if not condition:
        raise ValueError(message)

# BLOCK: text_value - Read a trimmed field within its length limits.
def text_value(name, label, minimum=1, maximum=80):
    value = request.form.get(name, "").strip()
    require(minimum <= len(value) <= maximum, f"{label} must contain {minimum}–{maximum} characters.")
    return value

# BLOCK: number_value - Read a whole number in the allowed range.
def number_value(name, label, minimum, maximum, optional=False):
    value = request.form.get(name, "").strip()
    if optional and not value:
        return None
    require(bool(re.fullmatch(r"[0-9]+", value)), f"Enter a valid {label.lower()}.")
    number = int(value)
    require(minimum <= number <= maximum, f"{label} must be between {minimum} and {maximum}.")
    return number

# BLOCK: yes_no - Validate a yes/no dropdown value.
def yes_no(name):
    value = request.form.get(name)
    require(value in ("yes", "no"), "Choose a valid availability option.")
    return int(value == "yes")

# BLOCK: profile_values - Validate name, email and contact details.
def profile_values(name_field):
    name = text_value(name_field, "Full name", 2, 80)
    email = text_value("email", "Email address", 3, 120).lower()
    contact = text_value("contact_number", "Contact number", 10, 10)
    require(bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)), "Enter a valid email address.")
    require(bool(re.fullmatch(r"[0-9]{10}", contact)), "Enter a 10-digit contact number.")
    return name, email, contact

# BLOCK: password_value - Validate a password before hashing it.
def password_value(optional=False):
    password = request.form.get("password", "")
    if optional and not password:
        return ""
    require(8 <= len(password) <= 128, "Use a password with 8–128 characters.")
    return password

# BLOCK: find_record - Read one existing SQLAlchemy model record.
def find_record(model, record_id):
    record = model.query.filter_by(id=record_id).first()
    require(record is not None, "This record is unavailable. Reload the page and try again.")
    return record

# BLOCK: role_required - Protect patient, staff and administrator actions.
def role_required(*roles):
    def decorate(view):
        @wraps(view)
        def protected(*args, **kwargs):
            if current_user.role not in roles:
                abort(403, description="This page is not available for your account.")
            return view(*args, **kwargs)
        return protected
    return decorate

# BLOCK: dashboard_page - Choose the current user's landing page.
def dashboard_page():
    return f"{current_user.role}_dashboard" if current_user.is_authenticated else "login"

# BLOCK: finish - Commit changes and return feedback to an existing page.
def finish(message, page_name=None, **query):
    db.session.commit()
    flash(message, "success")
    return redirect(url_for("page", page_name=page_name or dashboard_page(), **query), code=303)

# BLOCK: form_error - Roll back failed edits and return to a safe page.
@app.errorhandler(ValueError)
def form_error(error):
    db.session.rollback()
    flash(str(error), "error")
    target = url_for("page", page_name=dashboard_page())
    if request.endpoint == "setup":
        target = url_for("setup")
    elif request.referrer:
        previous, current = urlsplit(request.referrer), urlsplit(request.host_url)
        known = PUBLIC_PAGES | PATIENT_PAGES | STAFF_PAGES | ADMIN_PAGES | SHARED_PAGES
        if (previous.scheme, previous.netloc) == (current.scheme, current.netloc):
            if previous.path.lstrip("/").removesuffix(".html") in known:
                target = previous.path + ("?" + previous.query if previous.query else "")
    return redirect(target, code=303)

# BLOCK: duplicate_record - Explain duplicate emails, scan codes or slot times.
@app.errorhandler(IntegrityError)
def duplicate_record(error):
    return form_error(ValueError("That email, scan code or scheduled time is already in use. Check the details and try again."))

# BLOCK: prepare_request - Load the account, validate CSRF and start write transactions.
@app.before_request
def prepare_request():
    if request.endpoint == 'static' or request.endpoint is None:
        return
    if request.method == 'POST':
        expected, supplied = session.get('csrf_token', ''), request.form.get('csrf_token', '')
        if not expected or not secrets.compare_digest(expected.encode(), supplied.encode()):
            abort(400, description='Your form session expired. Reload the page and try again.')
        # Lock before reading availability so simultaneous requests cannot overbook.
        db.session.execute(db.text('BEGIN IMMEDIATE'))

    # BLOCK: Keep existing signed-in sessions after switching to Flask-Login.
    if session.get('user_id') and not session.get('_user_id'):
        previous_user = load_user(session.pop('user_id'))
        if previous_user:
            login_user(previous_user)
    if session.get('_user_id') and not current_user.is_authenticated:
        logout_user()
        session.clear()
    if request.endpoint != 'setup' and not User.query.filter_by(role='admin').first():
        return redirect(url_for('setup'))

# BLOCK: response_headers - Keep personal records out of shared browser caches.
@app.after_request
def response_headers(response):
    if request.endpoint != "static":
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

# BLOCK: appointment_for_user - Check ownership or the staff member's scan assignment.
def appointment_for_user(appointment_id, allow_staff=False):
    appointment = find_record(Appointment, appointment_id)
    if current_user.role == 'patient':
        require(appointment.patient_id == current_user.id, 'You can access only your own appointments.')
    elif current_user.role == 'staff':
        require(allow_staff, 'Only patients and administrators can change bookings.')
        slot = find_record(Slot, appointment.slot_id)
        assigned = StaffService.query.filter_by(staff_id=current_user.id, service_id=slot.service_id).first()
        require(assigned is not None, 'This scan is not assigned to your staff profile.')
    return appointment

# BLOCK: slot_datetime - Read the local date and time of a slot.
def slot_datetime(slot):
    return datetime.fromisoformat(f"{slot.date}T{slot.time}").replace(tzinfo=CENTRE_TIME)

# BLOCK: slot_reservations - Count all reservations except cancelled bookings.
def slot_reservations(slot_id):
    return Appointment.query.filter(Appointment.slot_id == slot_id, Appointment.status != 'Cancelled').count()

# BLOCK: available_slot - Check service, date, open status and remaining capacity.
def available_slot(slot_id):
    slot = find_record(Slot, slot_id)
    service = find_record(Service, slot.service_id)
    require(service.active and slot.open, "This scan or time slot is not open for booking.")
    require(slot_datetime(slot) > centre_now(), "Choose a future appointment time.")
    require(slot_reservations(slot.id) < slot.capacity, "This time slot is full. Choose another time.")
    return slot, service

# BLOCK: next_token - Allocate a unique service/date token without reusing cancellations.
def next_token(service, date):
    counter = TokenCounter.query.filter_by(service_id=service.id, date=date).first()
    if counter is None:
        counter = TokenCounter(service_id=service.id, date=date, last_number=0)
        db.session.add(counter)
    counter.last_number += 1
    number = counter.last_number
    label = f"{service.code}-{number:03d}"
    return f"{service.code}-{date.replace('-', '')}-{number:03d}", label, number

# BLOCK: record_history - Preserve booking slots, tokens and status changes.
def record_history(appointment, action):
    history = AppointmentHistory(
        appointment_id=appointment.id, slot_id=appointment.slot_id,
        action=action, at=centre_now().isoformat(), token=appointment.token,
    )
    db.session.add(history)



# ==================================================
# PAGE DATA: Records supplied to the existing JavaScript
# HTML: All 21 templates (shared code)
# IDs use strings to match HTML form values.
# Password hashes never enter the browser's page-data JSON.
# ==================================================

# BLOCK: profile_record - Convert a user row into the visible profile format.
def profile_record(row):
    return {"id": str(row.id), "name": row.name, "email": row.email,
            "contact": row.contact, "age": row.age, "active": bool(row.active)}

# BLOCK: records_for_page - Supply only records authorised for the current account.
def records_for_page():
    records = {name: [] for name in ('patients', 'staff', 'services', 'slots', 'appointments', 'attendance')}
    user = current_user if current_user.is_authenticated else None
    role = user.role if user else 'public'
    services = Service.query.order_by(Service.name).all()
    assignments = StaffService.query.all()
    assigned_ids = {row.service_id for row in assignments if user and row.staff_id == user.id}
    if role == 'public':
        services = [row for row in services if row.active]
    elif role == 'staff':
        services = [row for row in services if row.id in assigned_ids]
    records['services'] = [
        {'id': str(row.id), 'name': row.name, 'code': row.code, 'description': row.description,
         'referralRequired': row.referral_required, 'active': row.active} for row in services
    ]
    if role == 'public':
        return records

    # BLOCK: Read the appropriate patient and staff profile collections.
    users = User.query.filter(User.role != 'admin').order_by(User.name).all() if role == 'admin' else [user]
    for row in users:
        profile = profile_record(row)
        if row.role == 'staff':
            profile['serviceIds'] = [str(item.service_id) for item in assignments if item.staff_id == row.id]
            records['staff'].append(profile)
        elif row.role == 'patient':
            records['patients'].append(profile)

    # BLOCK: Scope full appointment details to the owner, assigned staff or administrator.
    if role == 'patient':
        appointments = Appointment.query.filter_by(patient_id=user.id).all()
    elif role == 'staff':
        appointments = Appointment.query.join(Slot, Appointment.slot_id == Slot.id).filter(
            Slot.service_id.in_(assigned_ids)
        ).all()
    else:
        appointments = Appointment.query.all()
    all_slots = Slot.query.order_by(Slot.date, Slot.time).all()
    slots_by_id = {row.id: row for row in all_slots}
    for row in appointments:
        history = AppointmentHistory.query.filter_by(appointment_id=row.id).order_by(AppointmentHistory.id).all()
        records['appointments'].append({
            'id': str(row.id), 'patientId': str(row.patient_id), 'slotId': str(row.slot_id),
            'patientName': row.patient_name, 'age': row.age, 'contact': row.contact,
            'bodyPart': row.body_part, 'referral': row.referral, 'status': row.status,
            'token': row.token, 'tokenLabel': row.token_label, 'tokenSequence': row.token_sequence,
            'history': [{'slotId': str(item.slot_id), 'action': item.action,
                         'at': item.at, 'token': item.token} for item in history],
        })

    # BLOCK: Add anonymous active tokens only for the patient's own service/date queues.
    if role == 'patient':
        queues = {(slots_by_id[row.slot_id].service_id, slots_by_id[row.slot_id].date) for row in appointments}
        queue_rows = Appointment.query.filter(
            Appointment.patient_id != user.id, Appointment.status.in_(['Checked In', 'In Progress'])
        ).all()
        for row in queue_rows:
            slot = slots_by_id[row.slot_id]
            if (slot.service_id, slot.date) in queues:
                records['appointments'].append({
                    'id': f'queue-{row.id}', 'patientId': '', 'slotId': str(row.slot_id), 'status': row.status,
                    'token': row.token, 'tokenLabel': row.token_label, 'tokenSequence': row.token_sequence, 'history': [],
                })
    relevant_slots = {record['slotId'] for record in records['appointments']}
    for row in all_slots:
        include = role == 'admin' or (role == 'staff' and row.service_id in assigned_ids)
        if role == 'patient':
            include = row.date >= centre_now().date().isoformat() or str(row.id) in relevant_slots
        if include:
            records['slots'].append({
                'id': str(row.id), 'serviceId': str(row.service_id), 'date': row.date, 'time': row.time,
                'capacity': row.capacity, 'open': row.open, 'reservedCount': slot_reservations(row.id),
            })

    # BLOCK: Include only the current staff member's attendance unless an admin is viewing.
    if role in ('staff', 'admin'):
        attendance = Attendance.query.filter_by(staff_id=user.id).all() if role == 'staff' else Attendance.query.all()
        for row in attendance:
            corrections = AttendanceCorrection.query.filter_by(attendance_id=row.id).order_by(AttendanceCorrection.id).all()
            records['attendance'].append({
                'id': str(row.id), 'staffId': str(row.staff_id), 'date': row.date,
                'checkIn': row.check_in, 'checkOut': row.check_out or '',
                'corrections': [
                    {'reason': item.reason, 'at': item.at, 'previousCheckIn': item.previous_check_in,
                     'previousCheckOut': item.previous_check_out or '', 'checkIn': item.check_in,
                     'checkOut': item.check_out or ''} for item in corrections
                ],
            })
    return records

# BLOCK: render_page - Serialize records, form URLs and feedback into an existing template.
def render_page(page_name, setup_mode=False):
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)
    user = None
    if current_user.is_authenticated:
        user = {"id": str(current_user.id), "name": current_user.name, "role": current_user.role}
        if current_user.role in ("patient", "staff"):
            user[current_user.role + "Id"] = str(current_user.id)
    actions = {
        "setup": "setup", "login": "login", "register": "register", "logout": "logout",
        "bookAppointment": "book_appointment", "rescheduleAppointment": "reschedule_appointment",
        "cancelAppointment": "cancel_appointment", "updateAppointmentStatus": "update_appointment_status",
        "staffCheckIn": "staff_check_in", "staffCheckOut": "staff_check_out", "saveService": "save_service",
        "setServiceActive": "set_service_active", "saveSlot": "save_slot", "deleteSlot": "delete_slot",
        "savePatient": "save_patient", "saveStaff": "save_staff", "setStaffActive": "set_staff_active",
        "correctAttendance": "correct_attendance",
    }
    messages = get_flashed_messages(with_categories=True)
    page_data = {"records": records_for_page(), "currentUser": user,
        "formActions": {key: url_for(endpoint) for key, endpoint in actions.items()},
        "csrfToken": session["csrf_token"], "updatedAt": centre_now().isoformat(),
        "accountMode": "setup" if setup_mode else ""}
    if messages:
        page_data["feedback"] = {"message": " ".join(message for category, message in messages),
            "isError": any(category == "error" for category, message in messages)}
    return render_template(page_name + ".html", page_data=page_data)

# BLOCK: home - Open the public home page.
@app.route("/")
def home():
    return render_page("index")

# BLOCK: page - Serve existing HTML names with server-enforced portal access.
@app.route("/<page_name>.html")
def page(page_name):
    known = PUBLIC_PAGES | PATIENT_PAGES | STAFF_PAGES | ADMIN_PAGES | SHARED_PAGES
    if page_name not in known:
        abort(404)
    if page_name not in PUBLIC_PAGES:
        if not current_user.is_authenticated:
            return redirect(url_for("page", page_name="login"))
        required_role = None
        if page_name in PATIENT_PAGES:
            required_role = "patient"
        elif page_name in STAFF_PAGES:
            required_role = "staff"
        elif page_name in ADMIN_PAGES:
            required_role = "admin"
        if required_role and current_user.role != required_role:
            abort(403, description="This page is not available for your account.")
        if page_name == "reschedule_appointment" and current_user.role == "staff":
            abort(403)
    if page_name in ("login", "register") and current_user.is_authenticated:
        return redirect(url_for("page", page_name=dashboard_page()))
    if page_name in SHARED_PAGES:
        appointment_for_user(request.args.get("id"), allow_staff=page_name == "appointment_details")
    if page_name == "queue_tracking" and request.args.get("id"):
        appointment_for_user(request.args["id"])
    return render_page(page_name)



# ==================================================
# ACCOUNT ACCESS: First admin setup, login and registration
# HTML: register.html, login.html, admin_staff.html
# Public registration always creates a patient account.
# The first administrator is created once through /setup.
# ==================================================

# BLOCK: setup - Create the first admin using the existing registration template.
@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if User.query.filter_by(role='admin').first():
        if request.method == 'POST':
            abort(403, description='The administrator account has already been set up.')
        return redirect(url_for('page', page_name=dashboard_page()))
    if request.method == 'POST':
        name, email, contact = profile_values('patient_name')
        password = password_value()
        require(password == request.form.get('confirm_password'), 'The passwords do not match.')
        user = User(role='admin', name=name, email=email, contact=contact,
                    password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        session.clear()
        login_user(user)
        flash('Administrator account created. Add your scan services, time slots and staff profiles.', 'success')
        return redirect(url_for('page', page_name='admin_dashboard'), code=303)
    return render_page('register', setup_mode=True)

# BLOCK: register - Create a real patient account with a hashed password.
@app.route('/register', methods=['POST'])
def register():
    name, email, contact = profile_values('patient_name')
    password = password_value()
    require(password == request.form.get('confirm_password'), 'The passwords do not match.')
    user = User(role='patient', name=name, email=email, contact=contact,
                password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    session.clear()
    login_user(user)
    flash('Your patient account is ready.', 'success')
    return redirect(url_for('page', page_name='patient_dashboard'), code=303)

# BLOCK: login - Verify credentials and open the correct role dashboard.
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        if current_user.is_authenticated:
            return redirect(url_for('page', page_name=dashboard_page()))
        return render_page('login')
    email, password = request.form.get('email', '').strip().lower(), request.form.get('password', '')
    require(len(email) <= 120 and len(password) <= 128, 'Enter valid login details.')
    user = User.query.filter_by(email=email).first()
    require(user is not None and user.active and check_password_hash(user.password_hash, password),
            'Email or password is incorrect, or this account is inactive.')
    db.session.commit()
    session.clear()
    login_user(user)
    return redirect(url_for('page', page_name=f'{user.role}_dashboard'), code=303)

# BLOCK: logout - End the account session through a protected POST request.
@app.route('/logout', methods=['POST'])
@login_required
def logout():
    db.session.commit()
    logout_user()
    session.clear()
    return redirect(url_for('page', page_name='login'), code=303)



# ==================================================
# PATIENT BOOKINGS: Reservations, tokens and changes
# HTML: book_appointment.html, reschedule_appointment.html,
#       my_appointments.html, appointment_details.html, queue_tracking.html
# Availability is checked inside the SQLite write transaction.
# Cancelled and rescheduled bookings keep their history.
# ==================================================

# BLOCK: book_appointment - Reserve a future slot and issue a unique digital token.
@app.route('/appointments/book', methods=['POST'])
@login_required
@role_required('patient')
def book_appointment():
    name = text_value('patient_name', 'Patient name', 2, 80)
    age = number_value('age', 'Age', 1, 120)
    contact = text_value('contact_number', 'Contact number', 10, 10)
    require(bool(re.fullmatch(r'[0-9]{10}', contact)), 'Enter a 10-digit contact number.')
    body_part = text_value('body_part', 'Body part', 1, 100)
    referral = text_value('referral_details', 'Referral details', 0, 500)
    slot, service = available_slot(request.form.get('slot_id'))
    require(str(service.id) == request.form.get('scan_service_id') and slot.date == request.form.get('appointment_date'),
            'Choose a time slot for the selected scan and date.')
    require(not service.referral_required or bool(referral), 'Referral details are required for this scan.')
    token, label, sequence = next_token(service, slot.date)
    appointment = Appointment(
        patient_id=current_user.id, slot_id=slot.id, patient_name=name, age=age, contact=contact,
        body_part=body_part, referral=referral, status='Booked',
        token=token, token_label=label, token_sequence=sequence,
    )
    db.session.add(appointment)
    db.session.flush()
    record_history(appointment, 'Appointment booked')
    return finish('Appointment confirmed. Your digital token is ready.', 'appointment_details', id=appointment.id)

# BLOCK: reschedule_appointment - Replace a future booking without losing its history.
@app.route('/appointments/reschedule', methods=['POST'])
@login_required
@role_required('patient', 'admin')
def reschedule_appointment():
    appointment = appointment_for_user(request.form.get('appointment_id'))
    current = find_record(Slot, appointment.slot_id)
    require(appointment.status == 'Booked' and slot_datetime(current) > centre_now(),
            'Only future Booked appointments can be rescheduled.')
    replacement, service = available_slot(request.form.get('slot_id'))
    require(replacement.id != current.id and replacement.service_id == current.service_id,
            'Choose a different available slot for the same scan.')
    require(str(service.id) == request.form.get('scan_service_id') and replacement.date == request.form.get('appointment_date'),
            'The replacement slot must match the selected scan and date.')
    token, label, sequence = next_token(service, replacement.date)
    record_history(appointment, 'Rescheduled from this slot')
    appointment.slot_id = replacement.id
    appointment.token = token
    appointment.token_label = label
    appointment.token_sequence = sequence
    record_history(appointment, 'Rescheduled to this slot')
    return finish('Your appointment has been rescheduled. Use the updated token.', 'appointment_details', id=appointment.id)

# BLOCK: cancel_appointment - Release a future reservation and preserve the cancelled record.
@app.route('/appointments/cancel', methods=['POST'])
@login_required
@role_required('patient', 'admin')
def cancel_appointment():
    appointment = appointment_for_user(request.form.get('appointment_id'))
    slot = find_record(Slot, appointment.slot_id)
    require(appointment.status == 'Booked' and slot_datetime(slot) > centre_now(),
            'Only future Booked appointments can be cancelled.')
    record_history(appointment, 'Appointment cancelled')
    appointment.status = 'Cancelled'
    destination = 'admin_appointments' if current_user.role == 'admin' else 'my_appointments'
    return finish('Appointment cancelled. The booking remains in your history.', destination)



# ==================================================
# STAFF OPERATIONS: Scan progress and work attendance
# HTML: staff_appointments.html, staff_attendance.html,
#       staff_dashboard.html, admin_appointments.html
# Queue membership comes directly from saved appointment statuses.
# ==================================================

# BLOCK: update_appointment_status - Enforce arrival, scan progress and no-show rules.
@app.route('/appointments/status', methods=['POST'])
@login_required
@role_required('staff', 'admin')
def update_appointment_status():
    appointment = appointment_for_user(request.form.get('appointment_id'), allow_staff=True)
    slot = find_record(Slot, appointment.slot_id)
    next_status = request.form.get('status', '')
    if next_status == 'No-show':
        require(appointment.status == 'Booked' and slot_datetime(slot) < centre_now(),
                'Only a patient who has not arrived after the scheduled time can be marked No-show.')
    else:
        transitions = {'Booked': 'Checked In', 'Checked In': 'In Progress', 'In Progress': 'Completed'}
        require(transitions.get(appointment.status) == next_status, 'Follow Booked → Checked In → In Progress → Completed.')
        require(slot.date == centre_now().date().isoformat(), 'Arrival and scan progress can be updated only on the appointment date.')
        if next_status == 'In Progress':
            busy = Appointment.query.join(Slot, Appointment.slot_id == Slot.id).filter(
                Appointment.status == 'In Progress', Slot.service_id == slot.service_id,
                Slot.date == slot.date, Appointment.id != appointment.id,
            ).first()
            require(busy is None, 'Complete the scan currently in progress before starting another for this service.')
    record_history(appointment, f'Status changed to {next_status}')
    appointment.status = next_status
    return finish(f'Appointment updated to {next_status}.', f'{current_user.role}_appointments')

# BLOCK: staff_check_in - Save one workday check-in for the current staff member.
@app.route('/attendance/check-in', methods=['POST'])
@login_required
@role_required('staff')
def staff_check_in():
    today = centre_now().date().isoformat()
    existing = Attendance.query.filter_by(staff_id=current_user.id, date=today).first()
    require(existing is None, 'Your check-in has already been recorded for today.')
    attendance = Attendance(staff_id=current_user.id, date=today, check_in=centre_now().isoformat())
    db.session.add(attendance)
    return finish('Your workday check-in has been recorded.', 'staff_attendance')

# BLOCK: staff_check_out - Complete today's workday without overwriting saved times.
@app.route('/attendance/check-out', methods=['POST'])
@login_required
@role_required('staff')
def staff_check_out():
    attendance = Attendance.query.filter_by(staff_id=current_user.id, date=centre_now().date().isoformat()).first()
    require(attendance is not None, 'Check in before checking out.')
    require(not attendance.check_out, 'Your check-out has already been recorded.')
    attendance.check_out = centre_now().isoformat()
    return finish('Your workday check-out has been recorded.', 'staff_attendance')



# ==================================================
# ADMIN MANAGEMENT: Services, slots and people
# HTML: admin_scan_services.html, admin_slots.html,
#       admin_patients.html, admin_staff.html
# Deactivation preserves existing referenced records.
# ==================================================

# BLOCK: save_service - Create or update a scan while preserving its token code.
@app.route('/admin/services/save', methods=['POST'])
@login_required
@role_required('admin')
def save_service():
    service_id = request.form.get('scan_service_id', '')
    name = text_value('service_name', 'Service name', 2, 80)
    description = text_value('description', 'Description', 1, 500)
    referral, active = yes_no('referral_required'), yes_no('active_status')
    if service_id:
        service = find_record(Service, service_id)
        service.name = name
        service.description = description
        service.referral_required = referral
        service.active = active
    else:
        code = text_value('service_code', 'Token code', 2, 6).upper()
        require(bool(re.fullmatch(r'[A-Z]{2,6}', code)), 'Use 2–6 letters for the token code.')
        service = Service(name=name, code=code, description=description, referral_required=referral, active=active)
        db.session.add(service)
    return finish('Scan service saved.', 'admin_scan_services')

# BLOCK: set_service_active - Open or close a service to new bookings.
@app.route('/admin/services/active', methods=['POST'])
@login_required
@role_required('admin')
def set_service_active():
    service = find_record(Service, request.form.get('scan_service_id'))
    service.active = yes_no('active_status')
    return finish('Scan service availability updated.', 'admin_scan_services')

# BLOCK: slot_has_history - Protect current and previous rescheduled slots.
def slot_has_history(slot_id):
    current = Appointment.query.filter_by(slot_id=slot_id).first()
    previous = AppointmentHistory.query.filter_by(slot_id=slot_id).first()
    return current is not None or previous is not None

# BLOCK: save_slot - Validate dates, duplicate times, capacity and saved history.
@app.route('/admin/slots/save', methods=['POST'])
@login_required
@role_required('admin')
def save_slot():
    slot_id = request.form.get('slot_id', '')
    service = find_record(Service, request.form.get('scan_service_id'))
    date, time = request.form.get('appointment_date', ''), request.form.get('scheduled_time', '')
    require(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', date)) and bool(re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', time)),
            'Choose a valid appointment date and scheduled time.')
    scheduled = datetime.fromisoformat(date + 'T' + time).replace(tzinfo=CENTRE_TIME)
    capacity, open_status = number_value('capacity', 'Capacity', 1, 100), yes_no('open_status')
    if slot_id:
        slot = find_record(Slot, slot_id)
        require(slot.service_id == service.id and slot.date == date, 'The slot service and date cannot be changed.')
        require(not slot_has_history(slot_id) or slot.time == time, 'Slots with appointment history cannot have their time changed.')
        require(capacity >= slot_reservations(slot_id), 'Capacity cannot be lower than the existing reservations.')
        require(slot.time == time or scheduled > centre_now(), 'Choose a future scheduled time.')
        slot.time = time
        slot.capacity = capacity
        slot.open = open_status
    else:
        require(scheduled > centre_now(), 'Choose a future date and time.')
        slot = Slot(service_id=service.id, date=date, time=time, capacity=capacity, open=open_status)
        db.session.add(slot)
    return finish('Time slot saved.', 'admin_slots')

# BLOCK: delete_slot - Delete only a slot that has never held an appointment.
@app.route('/admin/slots/delete', methods=['POST'])
@login_required
@role_required('admin')
def delete_slot():
    slot = find_record(Slot, request.form.get('slot_id'))
    require(not slot_has_history(slot.id), 'Slots containing appointment history cannot be deleted.')
    db.session.delete(slot)
    return finish('Unused time slot deleted.', 'admin_slots')

# BLOCK: save_patient - Update a profile without rewriting existing booking details.
@app.route('/admin/patients/save', methods=['POST'])
@login_required
@role_required('admin')
def save_patient():
    patient = find_record(User, request.form.get('patient_id'))
    require(patient.role == 'patient', 'Choose a patient profile.')
    name, email, contact = profile_values('patient_name')
    patient.name = name
    patient.email = email
    patient.contact = contact
    patient.age = number_value('age', 'Age', 1, 120, optional=True)
    return finish('Patient profile saved. Existing appointment details are preserved.', 'admin_patients')

# BLOCK: save_staff - Create staff credentials or update profiles and scan assignments.
@app.route('/admin/staff/save', methods=['POST'])
@login_required
@role_required('admin')
def save_staff():
    staff_id = request.form.get('staff_id', '')
    name, email, contact = profile_values('staff_name')
    active, password = yes_no('active_status'), password_value(optional=bool(staff_id))
    services = [find_record(Service, value) for value in set(request.form.getlist('scan_service_ids'))]
    require(bool(services), 'Assign at least one scan service.')
    if staff_id:
        staff = find_record(User, staff_id)
        require(staff.role == 'staff', 'Choose a staff profile.')
        staff.name = name
        staff.email = email
        staff.contact = contact
        staff.active = active
        if password:
            staff.password_hash = generate_password_hash(password)
    else:
        staff = User(role='staff', name=name, email=email, contact=contact,
                     password_hash=generate_password_hash(password), active=active)
        db.session.add(staff)
        db.session.flush()
    StaffService.query.filter_by(staff_id=staff.id).delete()
    for service in services:
        db.session.add(StaffService(staff_id=staff.id, service_id=service.id))
    return finish('Staff profile and scan assignments saved.', 'admin_staff')

# BLOCK: set_staff_active - Disable or restore staff access without deleting history.
@app.route('/admin/staff/active', methods=['POST'])
@login_required
@role_required('admin')
def set_staff_active():
    staff = find_record(User, request.form.get('staff_id'))
    require(staff.role == 'staff', 'Choose a staff profile.')
    staff.active = yes_no('active_status')
    return finish('Staff profile status updated.', 'admin_staff')



# ==================================================
# ADMIN ATTENDANCE: Corrections with preserved history
# HTML: admin_attendance.html, admin_reports.html
# Staff workday times stay separate from patient arrival times.
# ==================================================

# BLOCK: attendance_time - Read a local form timestamp in the centre's timezone.
def attendance_time(value):
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise ValueError("Enter a valid attendance time.") from None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=CENTRE_TIME)
    return parsed.astimezone(CENTRE_TIME)

# BLOCK: correct_attendance - Keep previous timestamps and save the reason for correction.
@app.route('/admin/attendance/correct', methods=['POST'])
@login_required
@role_required('admin')
def correct_attendance():
    attendance = find_record(Attendance, request.form.get('attendance_id'))
    require(request.form.get('attendance_date') == attendance.date, 'The attendance date cannot be changed.')
    reason = text_value('correction_reason', 'Correction reason', 5, 500)
    check_in = attendance_time(request.form.get('check_in', ''))
    raw_out = request.form.get('check_out', '')
    check_out = attendance_time(raw_out) if raw_out else None
    now = centre_now()
    require(check_in.date().isoformat() == attendance.date and check_in <= now,
            'Check-in must be on the attendance date and cannot be in the future.')
    if check_out:
        require(check_out.date().isoformat() == attendance.date and check_in <= check_out <= now,
                'Check-out must be on the same date, after check-in, and cannot be in the future.')
    in_value, out_value = check_in.isoformat(), check_out.isoformat() if check_out else None
    correction = AttendanceCorrection(
        attendance_id=attendance.id, admin_id=current_user.id, reason=reason, at=now.isoformat(),
        previous_check_in=attendance.check_in, previous_check_out=attendance.check_out,
        check_in=in_value, check_out=out_value,
    )
    db.session.add(correction)
    attendance.check_in = in_value
    attendance.check_out = out_value
    return finish('Attendance corrected. The previous timestamps are preserved.', 'admin_attendance')



# ==================================================
# APPLICATION START: db.create_all() and Flask startup
# Run: py -3.13 app.py
# Open: http://127.0.0.1:5000
# Existing records are kept; first admin setup is available only once.
# ==================================================

# BLOCK: Create missing tables and preserve the existing session signing secret.
with app.app_context():
    db.create_all()
    setting = Setting.query.filter_by(name='session_secret').first()
    if setting is None:
        db.session.add(Setting(name='session_secret', value=secrets.token_hex(32)))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
        setting = Setting.query.filter_by(name='session_secret').first()
    app.secret_key = os.environ.get('SECRET_KEY') or setting.value
    db.session.remove()

# BLOCK: Run the local Flask server when app.py is started directly.
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
