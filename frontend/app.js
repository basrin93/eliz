// API базовый URL
const API_URL = 'http://localhost:5000/api';

// Текущее состояние
let currentDoctor = null;
let currentPatient = null;
let authToken = null;

// ==================== УТИЛИТЫ ====================

function showError(message) {
    alert('Ошибка: ' + message);
}

function showSuccess(message) {
    alert(message);
}

async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken && !options.noAuth) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Произошла ошибка');
        }

        return data;
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

// ==================== АВТОРИЗАЦИЯ ====================

function showLogin() {
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
}

function showRegister() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const data = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        authToken = data.access_token;
        currentDoctor = data.doctor;

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('doctor', JSON.stringify(currentDoctor));

        showMainScreen();
    } catch (error) {
        // Ошибка уже обработана в apiCall
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const full_name = document.getElementById('reg-full-name').value;
    const specialization = document.getElementById('reg-specialization').value;
    const password = document.getElementById('reg-password').value;

    try {
        await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({
                username,
                email,
                full_name,
                specialization,
                password
            })
        });

        showSuccess('Регистрация успешна! Теперь вы можете войти.');
        showLogin();
    } catch (error) {
        // Ошибка уже обработана в apiCall
    }
}

function logout() {
    authToken = null;
    currentDoctor = null;
    currentPatient = null;

    localStorage.removeItem('authToken');
    localStorage.removeItem('doctor');

    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
    showLogin();
}

function showMainScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');

    document.getElementById('doctor-name').textContent = currentDoctor.full_name;

    loadPatients();
}

// ==================== ПАЦИЕНТЫ ====================

async function loadPatients() {
    try {
        const patients = await apiCall('/patients');

        const listContainer = document.getElementById('patients-list');
        listContainer.innerHTML = '';

        if (patients.length === 0) {
            listContainer.innerHTML = '<p>У вас пока нет пациентов</p>';
            return;
        }

        patients.forEach(patient => {
            const card = document.createElement('div');
            card.className = 'patient-card';
            card.onclick = () => showPatientDetails(patient.id);

            card.innerHTML = `
                <h3>${patient.full_name}</h3>
                <p><strong>Дата рождения:</strong> ${patient.date_of_birth || 'Не указана'}</p>
                <p><strong>Телефон:</strong> ${patient.phone || 'Не указан'}</p>
                <p><strong>Email:</strong> ${patient.email || 'Не указан'}</p>
            `;

            listContainer.appendChild(card);
        });
    } catch (error) {
        // Ошибка уже обработана
    }
}

function showPatientsList() {
    document.getElementById('patients-list-view').classList.add('active');
    document.getElementById('add-patient-view').classList.remove('active');
    document.getElementById('patient-details-view').classList.remove('active');

    loadPatients();
}

function showAddPatient() {
    document.getElementById('patients-list-view').classList.remove('active');
    document.getElementById('add-patient-view').classList.add('active');
    document.getElementById('patient-details-view').classList.remove('active');

    // Очистить форму
    document.getElementById('patient-name').value = '';
    document.getElementById('patient-dob').value = '';
    document.getElementById('patient-phone').value = '';
    document.getElementById('patient-email').value = '';
    document.getElementById('patient-history').value = '';
}

async function handleAddPatient(event) {
    event.preventDefault();

    const full_name = document.getElementById('patient-name').value;
    const date_of_birth = document.getElementById('patient-dob').value;
    const phone = document.getElementById('patient-phone').value;
    const email = document.getElementById('patient-email').value;
    const medical_history = document.getElementById('patient-history').value;

    try {
        await apiCall('/patients', {
            method: 'POST',
            body: JSON.stringify({
                full_name,
                date_of_birth,
                phone,
                email,
                medical_history
            })
        });

        showSuccess('Пациент добавлен!');
        showPatientsList();
    } catch (error) {
        // Ошибка уже обработана
    }
}

async function showPatientDetails(patientId) {
    try {
        const patient = await apiCall(`/patients/${patientId}`);
        currentPatient = patient;

        document.getElementById('patients-list-view').classList.remove('active');
        document.getElementById('add-patient-view').classList.remove('active');
        document.getElementById('patient-details-view').classList.add('active');

        renderPatientDetails(patient);
    } catch (error) {
        // Ошибка уже обработана
    }
}

function renderPatientDetails(patient) {
    const container = document.getElementById('patient-details');

    let html = `
        <div class="patient-details-header">
            <h2>${patient.full_name}</h2>
            <button onclick="showPatientsList()" class="btn btn-secondary">Назад к списку</button>
        </div>

        <div class="patient-info">
            <h3>Информация о пациенте</h3>
            <p><strong>Дата рождения:</strong> ${patient.date_of_birth || 'Не указана'}</p>
            <p><strong>Телефон:</strong> ${patient.phone || 'Не указан'}</p>
            <p><strong>Email:</strong> ${patient.email || 'Не указан'}</p>
            <p><strong>Анамнез:</strong> ${patient.medical_history || 'Не указан'}</p>
        </div>

        <div class="section">
            <h3>Планы лечения</h3>
            <button onclick="showAddTreatmentPlanModal()" class="btn btn-success">Добавить план лечения</button>
            <div id="treatment-plans-container">
    `;

    if (patient.treatment_plans && patient.treatment_plans.length > 0) {
        patient.treatment_plans.forEach(plan => {
            html += `
                <div class="treatment-plan-card ${plan.status}">
                    <h4>${plan.title}</h4>
                    <p><strong>Диагноз:</strong> ${plan.diagnosis || 'Не указан'}</p>
                    <p><strong>Описание:</strong> ${plan.description}</p>
                    <p><strong>Препараты:</strong> ${plan.medications || 'Не указаны'}</p>
                    <p><strong>Процедуры:</strong> ${plan.procedures || 'Не указаны'}</p>
                    <p><strong>Период:</strong> ${plan.start_date || 'Не указано'} - ${plan.end_date || 'Не указано'}</p>
                    <p><strong>Статус:</strong> ${plan.status}</p>
                    ${plan.notes ? `<p><strong>Заметки:</strong> ${plan.notes}</p>` : ''}
                    <div class="actions">
                        <button onclick="deleteTreatmentPlan(${plan.id})" class="btn btn-danger btn-small">Удалить</button>
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p>Нет планов лечения</p>';
    }

    html += `
            </div>
        </div>

        <div class="section">
            <h3>Фотографии</h3>
            <div class="upload-form">
                <form onsubmit="handleUploadPhoto(event)" id="photo-upload-form">
                    <div class="file-input-wrapper">
                        <label class="file-input-label">
                            Выбрать фото
                            <input type="file" id="photo-file" accept="image/*" required>
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="photo-description">Описание (необязательно)</label>
                        <input type="text" id="photo-description">
                    </div>
                    <button type="submit" class="btn btn-success">Загрузить</button>
                </form>
            </div>
            <div class="photos-grid" id="photos-container">
    `;

    if (patient.photos && patient.photos.length > 0) {
        patient.photos.forEach(photo => {
            html += `
                <div class="photo-card">
                    <img src="${API_URL}/uploads/${photo.filename}" alt="${photo.original_filename}">
                    <div class="photo-info">
                        <p><strong>${photo.original_filename}</strong></p>
                        ${photo.description ? `<p>${photo.description}</p>` : ''}
                        <p><small>${new Date(photo.uploaded_at).toLocaleString('ru-RU')}</small></p>
                    </div>
                    <div class="actions">
                        <button onclick="deletePhoto(${photo.id})" class="btn btn-danger btn-small">Удалить</button>
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p>Нет фотографий</p>';
    }

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ==================== ПЛАНЫ ЛЕЧЕНИЯ ====================

function showAddTreatmentPlanModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'treatment-plan-modal';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Добавить план лечения</h2>
                <span class="modal-close" onclick="closeModal('treatment-plan-modal')">&times;</span>
            </div>
            <form onsubmit="handleAddTreatmentPlan(event)">
                <div class="form-group">
                    <label for="plan-title">Название</label>
                    <input type="text" id="plan-title" required>
                </div>
                <div class="form-group">
                    <label for="plan-diagnosis">Диагноз</label>
                    <input type="text" id="plan-diagnosis">
                </div>
                <div class="form-group">
                    <label for="plan-description">Описание</label>
                    <textarea id="plan-description" rows="3" required></textarea>
                </div>
                <div class="form-group">
                    <label for="plan-medications">Препараты</label>
                    <textarea id="plan-medications" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label for="plan-procedures">Процедуры</label>
                    <textarea id="plan-procedures" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label for="plan-start-date">Дата начала</label>
                    <input type="date" id="plan-start-date">
                </div>
                <div class="form-group">
                    <label for="plan-end-date">Дата окончания</label>
                    <input type="date" id="plan-end-date">
                </div>
                <div class="form-group">
                    <label for="plan-status">Статус</label>
                    <select id="plan-status">
                        <option value="active">Активный</option>
                        <option value="completed">Завершен</option>
                        <option value="cancelled">Отменен</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="plan-notes">Заметки</label>
                    <textarea id="plan-notes" rows="2"></textarea>
                </div>
                <button type="submit" class="btn btn-success">Добавить</button>
                <button type="button" onclick="closeModal('treatment-plan-modal')" class="btn btn-secondary">Отмена</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

async function handleAddTreatmentPlan(event) {
    event.preventDefault();

    const title = document.getElementById('plan-title').value;
    const diagnosis = document.getElementById('plan-diagnosis').value;
    const description = document.getElementById('plan-description').value;
    const medications = document.getElementById('plan-medications').value;
    const procedures = document.getElementById('plan-procedures').value;
    const start_date = document.getElementById('plan-start-date').value;
    const end_date = document.getElementById('plan-end-date').value;
    const status = document.getElementById('plan-status').value;
    const notes = document.getElementById('plan-notes').value;

    try {
        await apiCall(`/patients/${currentPatient.id}/treatment-plans`, {
            method: 'POST',
            body: JSON.stringify({
                title,
                diagnosis,
                description,
                medications,
                procedures,
                start_date,
                end_date,
                status,
                notes
            })
        });

        showSuccess('План лечения добавлен!');
        closeModal('treatment-plan-modal');
        showPatientDetails(currentPatient.id);
    } catch (error) {
        // Ошибка уже обработана
    }
}

async function deleteTreatmentPlan(planId) {
    if (!confirm('Вы уверены, что хотите удалить этот план лечения?')) {
        return;
    }

    try {
        await apiCall(`/treatment-plans/${planId}`, {
            method: 'DELETE'
        });

        showSuccess('План лечения удален!');
        showPatientDetails(currentPatient.id);
    } catch (error) {
        // Ошибка уже обработана
    }
}

// ==================== ФОТОГРАФИИ ====================

async function handleUploadPhoto(event) {
    event.preventDefault();

    const fileInput = document.getElementById('photo-file');
    const description = document.getElementById('photo-description').value;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('description', description);

    try {
        const response = await fetch(`${API_URL}/patients/${currentPatient.id}/photos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки');
        }

        showSuccess('Фотография загружена!');
        document.getElementById('photo-upload-form').reset();
        showPatientDetails(currentPatient.id);
    } catch (error) {
        showError(error.message);
    }
}

async function deletePhoto(photoId) {
    if (!confirm('Вы уверены, что хотите удалить эту фотографию?')) {
        return;
    }

    try {
        await apiCall(`/photos/${photoId}`, {
            method: 'DELETE'
        });

        showSuccess('Фотография удалена!');
        showPatientDetails(currentPatient.id);
    } catch (error) {
        // Ошибка уже обработана
    }
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

window.addEventListener('DOMContentLoaded', () => {
    // Проверка сохраненного токена
    const savedToken = localStorage.getItem('authToken');
    const savedDoctor = localStorage.getItem('doctor');

    if (savedToken && savedDoctor) {
        authToken = savedToken;
        currentDoctor = JSON.parse(savedDoctor);
        showMainScreen();
    }
});
