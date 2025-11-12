// Form Fill JavaScript
// Global variables
let currentFormData = null;
let currentFormId = null;
let currentUser = null;
let formStartTime = null;
let userData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!window.auth) {
        console.error('Firebase auth not initialized');
        window.location.href = 'login.html';
        return;
    }

    // Wait for auth state
    window.onAuthStateChanged(window.auth, async function(user) {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = user;
        await loadUserData(user.uid);
        
        // Get formId from URL
        const urlParams = new URLSearchParams(window.location.search);
        const formId = urlParams.get('formId');
        const viewHistory = urlParams.get('viewHistory') === 'true';
        const formName = urlParams.get('formName');

        if (!formId) {
            showError('No form ID provided');
            return;
        }

        currentFormId = formId;

        if (viewHistory) {
            await showSubmissionHistory(formId, formName);
        } else {
            await loadFormFromFirebase(formId);
        }
    });
});

// Load user data from Firestore
async function loadUserData(userId) {
    try {
        const memberDoc = await window.getDoc(window.doc(window.db, 'Members', userId));
        if (memberDoc.exists()) {
            const data = memberDoc.data();
            userData = {
                name: data.name || data.displayName || '',
                email: data.email || '',
                phone: data.phone || '',
                whatsapp: data.whatsapp || '',
                githubUsername: data.githubUsername || data.github?.username || ''
            };
        } else {
            // Fallback to auth user
            userData = {
                name: currentUser.displayName || '',
                email: currentUser.email || '',
                phone: '',
                whatsapp: '',
                githubUsername: ''
            };
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        userData = {
            name: currentUser.displayName || '',
            email: currentUser.email || '',
            phone: '',
            whatsapp: '',
            githubUsername: ''
        };
    }
}

// Load form from Firebase
async function loadFormFromFirebase(formId) {
    try {
        showLoading();
        
        const formRef = window.doc(window.db, 'forms', formId);
        const formSnap = await window.getDoc(formRef);
        
        if (!formSnap.exists()) {
            showError('Form not found');
            return;
        }
        
        const data = formSnap.data();
        
        // Convert Firestore Timestamps to Dates
        currentFormData = {
            id: formSnap.id,
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            tags: data.tags || [],
            status: data.status || 'draft',
            settings: {
                ...data.settings,
                startDate: data.settings?.startDate?.toDate ? data.settings.startDate.toDate() : (data.settings?.startDate ? new Date(data.settings.startDate) : null),
                endDate: data.settings?.endDate?.toDate ? data.settings.endDate.toDate() : (data.settings?.endDate ? new Date(data.settings.endDate) : null)
            },
            fields: data.fields || [],
            sections: data.sections || []
        };
        
        // Check if form is available
        const now = new Date();
        if (currentFormData.settings.startDate && new Date(currentFormData.settings.startDate) > now) {
            showError('This form is not available yet.');
            return;
        }
        if (currentFormData.settings.endDate && new Date(currentFormData.settings.endDate) < now) {
            showError('This form has expired.');
            return;
        }
        if (currentFormData.status !== 'active') {
            showError('This form is not currently active.');
            return;
        }
        
        // Render form
        renderForm();
        formStartTime = Date.now();
        
    } catch (error) {
        console.error('Error loading form:', error);
        showError('Failed to load form. Please try again.');
    }
}

// Render form
function renderForm() {
    hideLoading();
    
    // Update header
    document.getElementById('formTitle').textContent = currentFormData.name || 'Untitled Form';
    document.getElementById('formDescription').textContent = currentFormData.description || '';
    document.getElementById('formHeader').style.display = 'block';
    
    // Render fields
    const container = document.getElementById('formFieldsContainer');
    container.innerHTML = '';
    
    // Sort fields by order
    const sortedFields = [...currentFormData.fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Group fields by sections
    const fieldsBySection = {};
    const fieldsWithoutSection = [];
    
    sortedFields.forEach(field => {
        if (field.sectionId) {
            if (!fieldsBySection[field.sectionId]) {
                fieldsBySection[field.sectionId] = [];
            }
            fieldsBySection[field.sectionId].push(field);
        } else {
            fieldsWithoutSection.push(field);
        }
    });
    
    // Render sections
    const sortedSections = [...(currentFormData.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    sortedSections.forEach(section => {
        const sectionFields = fieldsBySection[section.id] || [];
        if (sectionFields.length > 0) {
            renderSection(section, sectionFields, container);
        }
    });
    
    // Render fields without sections
    fieldsWithoutSection.forEach(field => {
        const fieldElement = renderField(field);
        container.appendChild(fieldElement);
    });
    
    // Show form
    document.getElementById('dynamicForm').style.display = 'block';
    
    // Apply conditional logic
    updateConditionalFields();
    
    // Set up event listeners for conditional logic
    setupConditionalLogicListeners();
}

// Render section
function renderSection(section, fields, container) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'form-section';
    sectionDiv.dataset.sectionId = section.id;
    
    if (section.backgroundStyle === 'card') {
        sectionDiv.classList.add('section-card');
    } else if (section.backgroundStyle === 'light') {
        sectionDiv.classList.add('section-light');
    }
    
    // Section header
    if (section.title) {
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            ${section.icon ? `<i class="${section.icon}"></i>` : ''}
            <h3>${section.showSectionNumber ? `${section.order + 1}. ` : ''}${section.title}</h3>
        `;
        sectionDiv.appendChild(header);
    }
    
    // Section description
    if (section.description) {
        const desc = document.createElement('p');
        desc.className = 'section-description';
        desc.textContent = section.description;
        sectionDiv.appendChild(desc);
    }
    
    // Section fields
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'section-fields';
    fields.forEach(field => {
        const fieldElement = renderField(field);
        fieldsContainer.appendChild(fieldElement);
    });
    sectionDiv.appendChild(fieldsContainer);
    
    container.appendChild(sectionDiv);
}

// Show loading state
function showLoading() {
    document.getElementById('formLoading').style.display = 'flex';
    document.getElementById('formHeader').style.display = 'none';
    document.getElementById('dynamicForm').style.display = 'none';
    document.getElementById('historyView').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Hide loading state
function hideLoading() {
    document.getElementById('formLoading').style.display = 'none';
}

// Show error
function showError(message) {
    hideLoading();
    const container = document.getElementById('formFieldsContainer');
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Error</h3>
            <p>${message}</p>
            <button class="btn-primary" onclick="window.location.href='dashboard.html'">
                Go to Dashboard
            </button>
        </div>
    `;
    document.getElementById('dynamicForm').style.display = 'block';
}

// Go back function
function goBack() {
    window.location.href = 'dashboard.html';
}

// Go back to form from history
function goBackToForm() {
    window.location.href = `form-fill.html?formId=${currentFormId}`;
}

// Render individual field
function renderField(field) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = `form-field field-${field.type} field-width-${field.width || 12}`;
    fieldDiv.dataset.fieldId = field.id;
    
    if (field.hidden) {
        fieldDiv.style.display = 'none';
    }
    
    // Handle auto-fetch
    let fieldValue = field.defaultValue || '';
    if (field.autoFetch?.enabled && userData) {
        const autoValue = getUserDataForField(field.autoFetch.field);
        if (autoValue) {
            if (field.autoFetch.mode === 'prefilled') {
                fieldValue = autoValue;
            } else if (field.autoFetch.mode === 'readonly') {
                fieldValue = autoValue;
            } else if (field.autoFetch.mode === 'hidden') {
                fieldDiv.style.display = 'none';
            }
        }
    }
    
    // Render based on field type
    let fieldHTML = '';
    switch(field.type) {
        case 'text':
        case 'email':
        case 'number':
        case 'tel':
        case 'url':
        case 'password':
            fieldHTML = renderTextInput(field, fieldValue);
            break;
        case 'textarea':
            fieldHTML = renderTextarea(field, fieldValue);
            break;
        case 'dropdown':
            fieldHTML = renderDropdown(field, fieldValue);
            break;
        case 'multiselect':
            fieldHTML = renderMultiselect(field, fieldValue);
            break;
        case 'checkbox':
            fieldHTML = renderCheckbox(field, fieldValue);
            break;
        case 'radio':
            fieldHTML = renderRadio(field, fieldValue);
            break;
        case 'date':
            fieldHTML = renderDate(field, fieldValue);
            break;
        case 'time':
            fieldHTML = renderTime(field, fieldValue);
            break;
        case 'rating':
            fieldHTML = renderRating(field, fieldValue);
            break;
        case 'scale':
            fieldHTML = renderScale(field, fieldValue);
            break;
        case 'pagebreak':
            fieldHTML = renderPagebreak();
            break;
        case 'hidden':
            fieldHTML = renderHidden(field, fieldValue);
            break;
        default:
            fieldHTML = renderTextInput(field, fieldValue);
    }
    
    fieldDiv.innerHTML = fieldHTML;
    
    // Apply readonly if needed
    if (field.autoFetch?.mode === 'readonly' || field.readonly) {
        const input = fieldDiv.querySelector('input, textarea, select');
        if (input) {
            input.readOnly = true;
            input.classList.add('readonly');
        }
    }
    
    return fieldDiv;
}

// Get user data for auto-fetch
function getUserDataForField(fieldName) {
    if (!userData) return '';
    
    switch(fieldName) {
        case 'name':
            return userData.name || '';
        case 'email':
            return userData.email || '';
        case 'phone':
            return userData.phone || '';
        case 'whatsapp':
            return userData.whatsapp || '';
        case 'githubUsername':
            return userData.githubUsername || '';
        default:
            return '';
    }
}

// Render text input
function renderTextInput(field, value) {
    const inputType = field.inputType || field.type;
    return `
        <label for="${field.id}" class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </label>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <input 
            type="${inputType}" 
            id="${field.id}" 
            name="${field.id}"
            class="form-input"
            placeholder="${field.placeholder || ''}"
            value="${value}"
            ${field.required ? 'required' : ''}
            ${field.readonly ? 'readonly' : ''}
            ${field.validation?.minLength ? `minlength="${field.validation.minLength}"` : ''}
            ${field.validation?.maxLength ? `maxlength="${field.validation.maxLength}"` : ''}
            ${field.validation?.pattern ? `pattern="${field.validation.pattern}"` : ''}
            ${field.validation?.min ? `min="${field.validation.min}"` : ''}
            ${field.validation?.max ? `max="${field.validation.max}"` : ''}
        />
    `;
}

// Render textarea
function renderTextarea(field, value) {
    return `
        <label for="${field.id}" class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </label>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <textarea 
            id="${field.id}" 
            name="${field.id}"
            class="form-textarea"
            rows="${field.rows || 3}"
            placeholder="${field.placeholder || ''}"
            ${field.required ? 'required' : ''}
            ${field.readonly ? 'readonly' : ''}
            ${field.validation?.minLength ? `minlength="${field.validation.minLength}"` : ''}
            ${field.validation?.maxLength ? `maxlength="${field.validation.maxLength}"` : ''}
        >${value}</textarea>
    `;
}

// Render dropdown
function renderDropdown(field, value) {
    const options = (field.options || []).map(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        return `<option value="${optValue}" ${value === optValue ? 'selected' : ''}>${optLabel}</option>`;
    }).join('');
    
    return `
        <label for="${field.id}" class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </label>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <select 
            id="${field.id}" 
            name="${field.id}"
            class="form-select"
            ${field.required ? 'required' : ''}
            ${field.readonly ? 'disabled' : ''}
        >
            <option value="">-- Select --</option>
            ${options}
        </select>
    `;
}

// Render multiselect
function renderMultiselect(field, value) {
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
    const options = (field.options || []).map(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        return `<option value="${optValue}" ${selectedValues.includes(optValue) ? 'selected' : ''}>${optLabel}</option>`;
    }).join('');
    
    return `
        <label for="${field.id}" class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </label>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <select 
            id="${field.id}" 
            name="${field.id}"
            class="form-select form-multiselect"
            multiple
            ${field.required ? 'required' : ''}
            ${field.readonly ? 'disabled' : ''}
        >
            ${options}
        </select>
    `;
}

// Render checkbox
function renderCheckbox(field, value) {
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
    const options = (field.options || []).map((opt, index) => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        const checkboxId = `${field.id}_${index}`;
        return `
            <label class="checkbox-label">
                <input 
                    type="checkbox" 
                    name="${field.id}" 
                    value="${optValue}"
                    id="${checkboxId}"
                    ${selectedValues.includes(optValue) ? 'checked' : ''}
                    ${field.readonly ? 'disabled' : ''}
                />
                <span>${optLabel}</span>
            </label>
        `;
    }).join('');
    
    return `
        <div class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </div>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <div class="checkbox-group">
            ${options}
        </div>
    `;
}

// Render radio
function renderRadio(field, value) {
    const options = (field.options || []).map((opt, index) => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        const radioId = `${field.id}_${index}`;
        return `
            <label class="radio-label">
                <input 
                    type="radio" 
                    name="${field.id}" 
                    value="${optValue}"
                    id="${radioId}"
                    ${value === optValue ? 'checked' : ''}
                    ${field.required ? 'required' : ''}
                    ${field.readonly ? 'disabled' : ''}
                />
                <span>${optLabel}</span>
            </label>
        `;
    }).join('');
    
    return `
        <div class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </div>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <div class="radio-group">
            ${options}
        </div>
    `;
}

// Render date
function renderDate(field, value) {
    let dateValue = '';
    if (value) {
        const date = new Date(value);
        dateValue = date.toISOString().split('T')[0];
    }
    
    return `
        <label for="${field.id}" class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </label>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <input 
            type="date" 
            id="${field.id}" 
            name="${field.id}"
            class="form-input"
            value="${dateValue}"
            ${field.required ? 'required' : ''}
            ${field.readonly ? 'readonly' : ''}
        />
    `;
}

// Render time
function renderTime(field, value) {
    return `
        <label for="${field.id}" class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </label>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <input 
            type="time" 
            id="${field.id}" 
            name="${field.id}"
            class="form-input"
            value="${value}"
            ${field.required ? 'required' : ''}
            ${field.readonly ? 'readonly' : ''}
        />
    `;
}

// Render rating
function renderRating(field, value) {
    const starCount = field.starCount || 5;
    const rating = parseInt(value) || 0;
    
    let starsHTML = '';
    for (let i = 1; i <= starCount; i++) {
        starsHTML += `
            <input type="radio" name="${field.id}" value="${i}" id="${field.id}_${i}" ${rating === i ? 'checked' : ''} ${field.required ? 'required' : ''} ${field.readonly ? 'disabled' : ''} />
            <label for="${field.id}_${i}" class="star-label">
                <i class="fas fa-star ${rating >= i ? 'active' : ''}"></i>
            </label>
        `;
    }
    
    return `
        <div class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
        </div>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <div class="rating-group">
            ${starsHTML}
        </div>
    `;
}

// Render scale
function renderScale(field, value) {
    const min = field.validation?.min || 0;
    const max = field.validation?.max || 10;
    const step = field.step || 1;
    const scaleValue = value || min;
    
    return `
        <label for="${field.id}" class="field-label">
            ${field.label || ''}
            ${field.required ? '<span class="required">*</span>' : ''}
            <span class="scale-value">${scaleValue}</span>
        </label>
        ${field.helpText ? `<p class="field-help">${field.helpText}</p>` : ''}
        <div class="scale-container">
            <span class="scale-min">${min}</span>
            <input 
                type="range" 
                id="${field.id}" 
                name="${field.id}"
                class="form-scale"
                min="${min}"
                max="${max}"
                step="${step}"
                value="${scaleValue}"
                ${field.required ? 'required' : ''}
                ${field.readonly ? 'disabled' : ''}
                oninput="updateScaleValue('${field.id}', this.value)"
            />
            <span class="scale-max">${max}</span>
        </div>
    `;
}

// Update scale value display
function updateScaleValue(fieldId, value) {
    const label = document.querySelector(`label[for="${fieldId}"] .scale-value`);
    if (label) {
        label.textContent = value;
    }
}

// Render pagebreak
function renderPagebreak() {
    return '<div class="pagebreak"></div>';
}

// Render hidden field
function renderHidden(field, value) {
    return `<input type="hidden" id="${field.id}" name="${field.id}" value="${value}" />`;
}

