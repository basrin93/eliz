import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
from config import Config
from models import db, Doctor, Patient, TreatmentPlan, Photo

app = Flask(__name__)
app.config.from_object(Config)

# Инициализация расширений
CORS(app)
jwt = JWTManager(app)
db.init_app(app)

# Создание папки для загрузок
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """Проверка допустимого расширения файла"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


# ==================== АВТОРИЗАЦИЯ ====================

@app.route('/api/register', methods=['POST'])
def register():
    """Регистрация нового врача"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({'error': 'Необходимо указать username, email и password'}), 400

    if Doctor.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Пользователь с таким именем уже существует'}), 400

    if Doctor.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email уже используется'}), 400

    doctor = Doctor(
        username=data['username'],
        email=data['email'],
        full_name=data.get('full_name', ''),
        specialization=data.get('specialization', '')
    )
    doctor.set_password(data['password'])

    db.session.add(doctor)
    db.session.commit()

    return jsonify({'message': 'Врач успешно зарегистрирован', 'doctor': doctor.to_dict()}), 201


@app.route('/api/login', methods=['POST'])
def login():
    """Вход врача"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Необходимо указать username и password'}), 400

    doctor = Doctor.query.filter_by(username=data['username']).first()

    if not doctor or not doctor.check_password(data['password']):
        return jsonify({'error': 'Неверное имя пользователя или пароль'}), 401

    access_token = create_access_token(identity=doctor.id)

    return jsonify({
        'access_token': access_token,
        'doctor': doctor.to_dict()
    }), 200


@app.route('/api/me', methods=['GET'])
@jwt_required()
def get_current_doctor():
    """Получить данные текущего врача"""
    doctor_id = get_jwt_identity()
    doctor = Doctor.query.get(doctor_id)

    if not doctor:
        return jsonify({'error': 'Врач не найден'}), 404

    return jsonify(doctor.to_dict()), 200


# ==================== ПАЦИЕНТЫ ====================

@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_patients():
    """Получить список пациентов врача"""
    doctor_id = get_jwt_identity()
    patients = Patient.query.filter_by(doctor_id=doctor_id).all()

    return jsonify([patient.to_dict() for patient in patients]), 200


@app.route('/api/patients/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    """Получить данные пациента"""
    doctor_id = get_jwt_identity()
    patient = Patient.query.filter_by(id=patient_id, doctor_id=doctor_id).first()

    if not patient:
        return jsonify({'error': 'Пациент не найден'}), 404

    patient_data = patient.to_dict()
    patient_data['treatment_plans'] = [plan.to_dict() for plan in patient.treatment_plans]
    patient_data['photos'] = [photo.to_dict() for photo in patient.photos]

    return jsonify(patient_data), 200


@app.route('/api/patients', methods=['POST'])
@jwt_required()
def create_patient():
    """Создать нового пациента"""
    doctor_id = get_jwt_identity()
    data = request.get_json()

    if not data or not data.get('full_name'):
        return jsonify({'error': 'Необходимо указать имя пациента'}), 400

    patient = Patient(
        doctor_id=doctor_id,
        full_name=data['full_name'],
        date_of_birth=datetime.fromisoformat(data['date_of_birth']) if data.get('date_of_birth') else None,
        phone=data.get('phone', ''),
        email=data.get('email', ''),
        medical_history=data.get('medical_history', '')
    )

    db.session.add(patient)
    db.session.commit()

    return jsonify(patient.to_dict()), 201


@app.route('/api/patients/<int:patient_id>', methods=['PUT'])
@jwt_required()
def update_patient(patient_id):
    """Обновить данные пациента"""
    doctor_id = get_jwt_identity()
    patient = Patient.query.filter_by(id=patient_id, doctor_id=doctor_id).first()

    if not patient:
        return jsonify({'error': 'Пациент не найден'}), 404

    data = request.get_json()

    if data.get('full_name'):
        patient.full_name = data['full_name']
    if data.get('date_of_birth'):
        patient.date_of_birth = datetime.fromisoformat(data['date_of_birth'])
    if 'phone' in data:
        patient.phone = data['phone']
    if 'email' in data:
        patient.email = data['email']
    if 'medical_history' in data:
        patient.medical_history = data['medical_history']

    db.session.commit()

    return jsonify(patient.to_dict()), 200


@app.route('/api/patients/<int:patient_id>', methods=['DELETE'])
@jwt_required()
def delete_patient(patient_id):
    """Удалить пациента"""
    doctor_id = get_jwt_identity()
    patient = Patient.query.filter_by(id=patient_id, doctor_id=doctor_id).first()

    if not patient:
        return jsonify({'error': 'Пациент не найден'}), 404

    db.session.delete(patient)
    db.session.commit()

    return jsonify({'message': 'Пациент удален'}), 200


# ==================== ПЛАНЫ ЛЕЧЕНИЯ ====================

@app.route('/api/patients/<int:patient_id>/treatment-plans', methods=['GET'])
@jwt_required()
def get_treatment_plans(patient_id):
    """Получить планы лечения пациента"""
    doctor_id = get_jwt_identity()
    patient = Patient.query.filter_by(id=patient_id, doctor_id=doctor_id).first()

    if not patient:
        return jsonify({'error': 'Пациент не найден'}), 404

    plans = TreatmentPlan.query.filter_by(patient_id=patient_id).all()

    return jsonify([plan.to_dict() for plan in plans]), 200


@app.route('/api/patients/<int:patient_id>/treatment-plans', methods=['POST'])
@jwt_required()
def create_treatment_plan(patient_id):
    """Создать план лечения"""
    doctor_id = get_jwt_identity()
    patient = Patient.query.filter_by(id=patient_id, doctor_id=doctor_id).first()

    if not patient:
        return jsonify({'error': 'Пациент не найден'}), 404

    data = request.get_json()

    if not data or not data.get('title') or not data.get('description'):
        return jsonify({'error': 'Необходимо указать название и описание плана лечения'}), 400

    plan = TreatmentPlan(
        patient_id=patient_id,
        title=data['title'],
        description=data['description'],
        diagnosis=data.get('diagnosis', ''),
        medications=data.get('medications', ''),
        procedures=data.get('procedures', ''),
        start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
        end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None,
        status=data.get('status', 'active'),
        notes=data.get('notes', '')
    )

    db.session.add(plan)
    db.session.commit()

    return jsonify(plan.to_dict()), 201


@app.route('/api/treatment-plans/<int:plan_id>', methods=['PUT'])
@jwt_required()
def update_treatment_plan(plan_id):
    """Обновить план лечения"""
    doctor_id = get_jwt_identity()
    plan = TreatmentPlan.query.join(Patient).filter(
        TreatmentPlan.id == plan_id,
        Patient.doctor_id == doctor_id
    ).first()

    if not plan:
        return jsonify({'error': 'План лечения не найден'}), 404

    data = request.get_json()

    if data.get('title'):
        plan.title = data['title']
    if data.get('description'):
        plan.description = data['description']
    if 'diagnosis' in data:
        plan.diagnosis = data['diagnosis']
    if 'medications' in data:
        plan.medications = data['medications']
    if 'procedures' in data:
        plan.procedures = data['procedures']
    if data.get('start_date'):
        plan.start_date = datetime.fromisoformat(data['start_date'])
    if data.get('end_date'):
        plan.end_date = datetime.fromisoformat(data['end_date'])
    if 'status' in data:
        plan.status = data['status']
    if 'notes' in data:
        plan.notes = data['notes']

    db.session.commit()

    return jsonify(plan.to_dict()), 200


@app.route('/api/treatment-plans/<int:plan_id>', methods=['DELETE'])
@jwt_required()
def delete_treatment_plan(plan_id):
    """Удалить план лечения"""
    doctor_id = get_jwt_identity()
    plan = TreatmentPlan.query.join(Patient).filter(
        TreatmentPlan.id == plan_id,
        Patient.doctor_id == doctor_id
    ).first()

    if not plan:
        return jsonify({'error': 'План лечения не найден'}), 404

    db.session.delete(plan)
    db.session.commit()

    return jsonify({'message': 'План лечения удален'}), 200


# ==================== ФОТОГРАФИИ ====================

@app.route('/api/patients/<int:patient_id>/photos', methods=['GET'])
@jwt_required()
def get_photos(patient_id):
    """Получить фотографии пациента"""
    doctor_id = get_jwt_identity()
    patient = Patient.query.filter_by(id=patient_id, doctor_id=doctor_id).first()

    if not patient:
        return jsonify({'error': 'Пациент не найден'}), 404

    photos = Photo.query.filter_by(patient_id=patient_id).all()

    return jsonify([photo.to_dict() for photo in photos]), 200


@app.route('/api/patients/<int:patient_id>/photos', methods=['POST'])
@jwt_required()
def upload_photo(patient_id):
    """Загрузить фотографию"""
    doctor_id = get_jwt_identity()
    patient = Patient.query.filter_by(id=patient_id, doctor_id=doctor_id).first()

    if not patient:
        return jsonify({'error': 'Пациент не найден'}), 404

    if 'file' not in request.files:
        return jsonify({'error': 'Файл не найден'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Недопустимый тип файла'}), 400

    # Создание уникального имени файла
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    original_filename = secure_filename(file.filename)
    filename = f"{patient_id}_{timestamp}_{original_filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    file.save(file_path)

    photo = Photo(
        patient_id=patient_id,
        filename=filename,
        original_filename=original_filename,
        description=request.form.get('description', '')
    )

    db.session.add(photo)
    db.session.commit()

    return jsonify(photo.to_dict()), 201


@app.route('/api/photos/<int:photo_id>', methods=['DELETE'])
@jwt_required()
def delete_photo(photo_id):
    """Удалить фотографию"""
    doctor_id = get_jwt_identity()
    photo = Photo.query.join(Patient).filter(
        Photo.id == photo_id,
        Patient.doctor_id == doctor_id
    ).first()

    if not photo:
        return jsonify({'error': 'Фотография не найдена'}), 404

    # Удаление файла
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], photo.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(photo)
    db.session.commit()

    return jsonify({'message': 'Фотография удалена'}), 200


@app.route('/api/uploads/<filename>')
@jwt_required()
def get_upload(filename):
    """Получить загруженный файл"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ==================== ИНИЦИАЛИЗАЦИЯ БД ====================

@app.before_request
def create_tables():
    """Создание таблиц в базе данных"""
    db.create_all()


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("База данных инициализирована")

    app.run(debug=True, host='0.0.0.0', port=5000)
