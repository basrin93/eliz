// API базовый URL
const API_URL = 'http://localhost:5000/api';

// Текущее состояние
let currentDoctor = null;
let currentPatient = null;
let authToken = null;
let allPatients = [];

// ==================== УТИЛИТЫ ====================

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    notification.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
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

function updateNavigation(activeItem) {
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (activeItem) {
        activeItem.classList.add('active');
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

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Вход...';

    try {
        const data = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        authToken = data.access_token;
        currentDoctor = data.doctor;

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('doctor', JSON.stringify(currentDoctor));

        showSuccess('Добро пожаловать, ' + currentDoctor.full_name + '!');
        showMainScreen();
    } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Войти';
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const full_name = document.getElementById('reg-full-name').value;
    const specialization = document.getElementById('reg-specialization').value;
    const password = document.getElementById('reg-password').value;

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Регистрация...';

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

        // Очистить форму
        event.target.reset();
    } catch (error) {
        // Ошибка уже обработана
    } finally {
        btn.disabled = false;
        btn.textContent = 'Зарегистрироваться';
    }
}

function logout() {
    authToken = null;
    currentDoctor = null;
    currentPatient = null;
    allPatients = [];

    localStorage.removeItem('authToken');
    localStorage.removeItem('doctor');

    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
    showLogin();

    showSuccess('Вы успешно вышли из системы');
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
        allPatients = patients;
        renderPatients(patients);
    } catch (error) {
        // Ошибка уже обработана
    }
}

function renderPatients(patients) {
    const listContainer = document.getElementById('patients-list');
    listContainer.innerHTML = '';

    if (patients.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <h3>У вас пока нет пациентов</h3>
                <p>Добавьте первого пациента, чтобы начать работу</p>
            </div>
        `;
        return;
    }

    patients.forEach(patient => {
        const card = document.createElement('div');
        card.className = 'patient-card';
        card.onclick = () => showPatientDetails(patient.id);

        const initials = patient.full_name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

        const age = patient.date_of_birth
            ? calculateAge(patient.date_of_birth)
            : 'не указан';

        card.innerHTML = `
            <div class="patient-avatar">${initials}</div>
            <h3>${patient.full_name}</h3>
            <p><strong>Возраст:</strong> ${age}</p>
            <p><strong>📞 Телефон:</strong> ${patient.phone || 'Не указан'}</p>
            <p><strong>📧 Email:</strong> ${patient.email || 'Не указан'}</p>
        `;

        listContainer.appendChild(card);
    });
}

function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age + ' лет';
}

function filterPatients() {
    const searchTerm = document.getElementById('patient-search').value.toLowerCase();

    const filtered = allPatients.filter(patient => {
        return patient.full_name.toLowerCase().includes(searchTerm) ||
               (patient.phone && patient.phone.toLowerCase().includes(searchTerm)) ||
               (patient.email && patient.email.toLowerCase().includes(searchTerm));
    });

    renderPatients(filtered);
}

function showPatientsList() {
    document.getElementById('patients-list-view').classList.add('active');
    document.getElementById('add-patient-view').classList.remove('active');
    document.getElementById('patient-details-view').classList.remove('active');

    updateNavigation(document.querySelector('.sidebar .nav-item:first-child'));
    loadPatients();
}

function showAddPatient() {
    document.getElementById('patients-list-view').classList.remove('active');
    document.getElementById('add-patient-view').classList.add('active');
    document.getElementById('patient-details-view').classList.remove('active');

    updateNavigation(document.querySelector('.sidebar .nav-item:nth-child(2)'));

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

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Добавление...';

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

        showSuccess('Пациент успешно добавлен!');
        showPatientsList();
    } catch (error) {
        btn.disabled = false;
        btn.textContent = '💾 Добавить пациента';
    }
}

async function showPatientDetails(patientId) {
    try {
        const patient = await apiCall(`/patients/${patientId}`);
        currentPatient = patient;

        document.getElementById('patients-list-view').classList.remove('active');
        document.getElementById('add-patient-view').classList.remove('active');
        document.getElementById('patient-details-view').classList.add('active');

        updateNavigation(null);

        renderPatientDetails(patient);
    } catch (error) {
        // Ошибка уже обработана
    }
}

function renderPatientDetails(patient) {
    const container = document.getElementById('patient-details');

    const age = patient.date_of_birth
        ? calculateAge(patient.date_of_birth)
        : 'не указан';

    let html = `
        <div class="patient-details-header">
            <h2>👤 ${patient.full_name}</h2>
            <button onclick="showPatientsList()" class="btn btn-secondary">⬅ Назад к списку</button>
        </div>

        <div class="patient-info">
            <h3>📋 Информация о пациенте</h3>
            <p><strong>Возраст:</strong> ${age}</p>
            <p><strong>Дата рождения:</strong> ${patient.date_of_birth || 'Не указана'}</p>
            <p><strong>Телефон:</strong> ${patient.phone || 'Не указан'}</p>
            <p><strong>Email:</strong> ${patient.email || 'Не указан'}</p>
            <p><strong>Анамнез:</strong> ${patient.medical_history || 'Не указан'}</p>
        </div>

        <div class="section">
            <h3>
                <span>💊 Планы лечения</span>
                <button onclick="showAddTreatmentPlanModal()" class="btn btn-success btn-small">➕ Добавить план</button>
            </h3>
            <div id="treatment-plans-container">
    `;

    if (patient.treatment_plans && patient.treatment_plans.length > 0) {
        patient.treatment_plans.forEach(plan => {
            const statusEmoji = plan.status === 'active' ? '🟢' : plan.status === 'completed' ? '✅' : '❌';
            const statusText = plan.status === 'active' ? 'Активный' : plan.status === 'completed' ? 'Завершен' : 'Отменен';

            html += `
                <div class="treatment-plan-card ${plan.status}">
                    <h4>${plan.title}</h4>
                    <p><strong>Диагноз:</strong> ${plan.diagnosis || 'Не указан'}</p>
                    <p><strong>Описание:</strong> ${plan.description}</p>
                    <p><strong>Препараты:</strong> ${plan.medications || 'Не указаны'}</p>
                    <p><strong>Процедуры:</strong> ${plan.procedures || 'Не указаны'}</p>
                    <p><strong>Период:</strong> ${plan.start_date || 'Не указано'} - ${plan.end_date || 'Не указано'}</p>
                    <p><strong>Статус:</strong> ${statusEmoji} ${statusText}</p>
                    ${plan.notes ? `<p><strong>Заметки:</strong> ${plan.notes}</p>` : ''}
                    <div class="actions">
                        <button onclick="deleteTreatmentPlan(${plan.id})" class="btn btn-danger btn-small">🗑 Удалить</button>
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
            <h3>📷 Фотографии</h3>

            <div class="upload-zone" id="photo-upload-zone" onclick="document.getElementById('photo-file-input').click()">
                <div class="upload-icon">📤</div>
                <p>Перетащите фото сюда или нажмите для выбора</p>
                <small>Поддерживаются форматы: PNG, JPG, JPEG, GIF (макс. 16 МБ)</small>
                <input type="file" id="photo-file-input" accept="image/*" style="display: none;" onchange="handleFileSelect(event)">
            </div>

            <div class="photos-grid" id="photos-container">
    `;

    if (patient.photos && patient.photos.length > 0) {
        patient.photos.forEach(photo => {
            const uploadDate = new Date(photo.uploaded_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            html += `
                <div class="photo-card" onclick="viewPhotoModal('${API_URL}/uploads/${photo.filename}', '${photo.original_filename}')">
                    <img src="${API_URL}/uploads/${photo.filename}" alt="${photo.original_filename}">
                    <div class="photo-info">
                        <p><strong>${photo.original_filename}</strong></p>
                        ${photo.description ? `<p>${photo.description}</p>` : ''}
                        <p><small>📅 ${uploadDate}</small></p>
                    </div>
                    <div class="actions" onclick="event.stopPropagation()">
                        <button onclick="deletePhoto(${photo.id})" class="btn btn-danger btn-small">🗑 Удалить</button>
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

    // Настроить drag-and-drop
    setupDragAndDrop();
}

// ==================== ПЛАНЫ ЛЕЧЕНИЯ ====================

function showAddTreatmentPlanModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'treatment-plan-modal';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>➕ Добавить план лечения</h2>
                <span class="modal-close" onclick="closeModal('treatment-plan-modal')">×</span>
            </div>
            <form onsubmit="handleAddTreatmentPlan(event)">
                <div class="form-group">
                    <label for="plan-title">Название *</label>
                    <input type="text" id="plan-title" placeholder="Название плана лечения" required>
                </div>
                <div class="form-group">
                    <label for="plan-diagnosis">Диагноз</label>
                    <input type="text" id="plan-diagnosis" placeholder="Диагноз">
                </div>
                <div class="form-group">
                    <label for="plan-description">Описание *</label>
                    <textarea id="plan-description" rows="3" placeholder="Описание плана лечения" required></textarea>
                </div>
                <div class="form-group">
                    <label for="plan-medications">Препараты</label>
                    <textarea id="plan-medications" rows="2" placeholder="Список препаратов"></textarea>
                </div>
                <div class="form-group">
                    <label for="plan-procedures">Процедуры</label>
                    <textarea id="plan-procedures" rows="2" placeholder="Список процедур"></textarea>
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
                    <textarea id="plan-notes" rows="2" placeholder="Дополнительные заметки"></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeModal('treatment-plan-modal')" class="btn btn-secondary">Отмена</button>
                    <button type="submit" class="btn btn-success">💾 Добавить</button>
                </div>
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

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Добавление...';

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
        btn.disabled = false;
        btn.textContent = '💾 Добавить';
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

function setupDragAndDrop() {
    const uploadZone = document.getElementById('photo-upload-zone');

    if (!uploadZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('drag-over');
        }, false);
    });

    uploadZone.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        uploadPhoto(files[0]);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadPhoto(file);
    }
}

async function uploadPhoto(file) {
    // Проверка типа файла
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showError('Недопустимый тип файла. Используйте PNG, JPG, JPEG или GIF');
        return;
    }

    // Проверка размера файла (16 МБ)
    if (file.size > 16 * 1024 * 1024) {
        showError('Размер файла превышает 16 МБ');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', '');

    showNotification('Загрузка фото...', 'info');

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

function viewPhotoModal(photoUrl, filename) {
    const modal = document.createElement('div');
    modal.className = 'modal active photo-modal';
    modal.id = 'photo-view-modal';

    modal.innerHTML = `
        <span class="modal-close" onclick="closeModal('photo-view-modal')">×</span>
        <div class="modal-content">
            <img src="${photoUrl}" alt="${filename}">
        </div>
    `;

    document.body.appendChild(modal);

    // Закрытие по клику на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal('photo-view-modal');
        }
    });
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
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
