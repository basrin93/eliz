from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class Doctor(db.Model):
    """Модель врача"""
    __tablename__ = 'doctors'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    specialization = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Связь с пациентами
    patients = db.relationship('Patient', backref='doctor', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        """Установить пароль"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Проверить пароль"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Преобразовать в словарь"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'specialization': self.specialization,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Patient(db.Model):
    """Модель пациента"""
    __tablename__ = 'patients'

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    date_of_birth = db.Column(db.Date)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    medical_history = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связь с планами лечения и фотографиями
    treatment_plans = db.relationship('TreatmentPlan', backref='patient', lazy=True, cascade='all, delete-orphan')
    photos = db.relationship('Photo', backref='patient', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        """Преобразовать в словарь"""
        return {
            'id': self.id,
            'doctor_id': self.doctor_id,
            'full_name': self.full_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'phone': self.phone,
            'email': self.email,
            'medical_history': self.medical_history,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TreatmentPlan(db.Model):
    """Модель плана лечения"""
    __tablename__ = 'treatment_plans'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    diagnosis = db.Column(db.String(200))
    medications = db.Column(db.Text)
    procedures = db.Column(db.Text)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(50), default='active')  # active, completed, cancelled
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Преобразовать в словарь"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'title': self.title,
            'description': self.description,
            'diagnosis': self.diagnosis,
            'medications': self.medications,
            'procedures': self.procedures,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Photo(db.Model):
    """Модель фотографии"""
    __tablename__ = 'photos'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Преобразовать в словарь"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'description': self.description,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }
