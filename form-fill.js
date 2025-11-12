// Form Fill JavaScript
// Global variables
let currentFormData = null;
let currentFormId = null;
let currentUser = null;
let formStartTime = null;
let userData = null;

// Helper function to wait for Firebase initialization
async function waitForFirebase() {
    // Wait for module script to complete
    let attempts = 0;
    while (!window.firebaseReady && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
    }
    
    // Wait for auth to be available
    attempts = 0;
    while (!window.auth && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
    }
    
    if (!window.auth) {
        console.error('Firebase failed to initialize after waiting');
        // Try to initialize manually if not done
        if (window.initializeFirebase) {
            await window.initializeFirebase();
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for Firebase to be fully initialized first
    await waitForFirebase();
    
    // Check authentication
    if (!window.auth) {
        console.error('Firebase auth not initialized');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is already authenticated (avoid waiting for onAuthStateChanged)
    let user = window.auth.currentUser;
    
    // If not authenticated, wait for auth state change
    if (!user) {
        // Use a promise to wait for auth state
        user = await new Promise((resolve) => {
            const unsubscribe = window.onAuthStateChanged(window.auth, (authUser) => {
                unsubscribe(); // Unsubscribe after first call
                resolve(authUser);
            });
            
            // Timeout after 3 seconds
            setTimeout(() => {
                unsubscribe();
                resolve(null);
            }, 3000);
        });
    }

    if (!user) {
        console.log('No authenticated user found, redirecting to login');
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
    
    // Set up multiselect count updates
    setupMultiselectListeners();
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
    
    // Initialize multiselect count if it's a multiselect field
    if (field.type === 'multiselect') {
        const select = fieldDiv.querySelector('.form-multiselect');
        if (select) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                updateMultiselectCount(select);
            }, 0);
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
        <div class="multiselect-wrapper">
            <select 
                id="${field.id}" 
                name="${field.id}"
                class="form-select form-multiselect"
                multiple
                ${field.required ? 'required' : ''}
                ${field.readonly ? 'disabled' : ''}
                data-field-id="${field.id}"
            >
                ${options}
            </select>
            <div class="multiselect-selected-count" id="${field.id}_count">
                <span class="count-text">0 selected</span>
            </div>
        </div>
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

// Conditional Logic Functions
function setupConditionalLogicListeners() {
    document.querySelectorAll('.form-field input, .form-field select, .form-field textarea').forEach(input => {
        input.addEventListener('change', updateConditionalFields);
        input.addEventListener('input', updateConditionalFields);
    });
}

// Multiselect Functions
function setupMultiselectListeners() {
    document.querySelectorAll('.form-multiselect').forEach(select => {
        // Update count on load
        updateMultiselectCount(select);
        
        // Update count on change
        select.addEventListener('change', function() {
            updateMultiselectCount(this);
        });
    });
}

function updateMultiselectCount(select) {
    const selectedCount = select.selectedOptions.length;
    const countElement = document.getElementById(`${select.id}_count`);
    if (countElement) {
        const countText = countElement.querySelector('.count-text');
        if (countText) {
            if (selectedCount === 0) {
                countText.textContent = '0 selected';
                countElement.classList.remove('has-selection');
            } else {
                countText.textContent = `${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} selected`;
                countElement.classList.add('has-selection');
            }
        }
    }
}

function updateConditionalFields() {
    if (!currentFormData || !currentFormData.fields) return;
    
    currentFormData.fields.forEach(field => {
        const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
        if (!fieldElement) return;
        
        if (field.conditionalLogic?.enabled) {
            const shouldShow = evaluateConditionalLogic(field);
            fieldElement.style.display = shouldShow ? 'block' : 'none';
        }
    });
}

function evaluateConditionalLogic(field) {
    if (!field.conditionalLogic?.enabled || !field.conditionalLogic.conditions) {
        return true;
    }
    
    const conditions = field.conditionalLogic.conditions;
    return conditions.every(condition => {
        const targetFieldElement = document.querySelector(`[data-field-id="${condition.fieldId}"]`);
        if (!targetFieldElement) return true;
        
        const targetValue = getFieldValue(targetFieldElement);
        
        switch(condition.operator) {
            case 'equals':
                return targetValue === condition.value;
            case 'not_equals':
                return targetValue !== condition.value;
            case 'contains':
                if (Array.isArray(targetValue)) {
                    return targetValue.includes(condition.value);
                }
                return String(targetValue).includes(condition.value);
            default:
                return true;
        }
    });
}

function getFieldValue(fieldElement) {
    // Check for checkbox group (multiple checkboxes with same name)
    const checkboxes = fieldElement.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        return checked.length > 0 ? checked.map(cb => cb.value) : '';
    }
    
    // Check for radio group
    const radios = fieldElement.querySelectorAll('input[type="radio"]');
    if (radios.length > 0) {
        const checked = Array.from(radios).find(r => r.checked);
        return checked ? checked.value : '';
    }
    
    // Regular input, select, or textarea
    const input = fieldElement.querySelector('input, select, textarea');
    if (!input) return '';
    
    if (input.multiple) {
        return Array.from(input.selectedOptions).map(opt => opt.value);
    } else {
        return input.value || '';
    }
}

// Form Validation
function validateForm() {
    const form = document.getElementById('dynamicForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }
    
    // Additional custom validation
    const fields = currentFormData.fields || [];
    for (let field of fields) {
        const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
        if (!fieldElement || fieldElement.style.display === 'none') continue;
        
        const input = fieldElement.querySelector('input, select, textarea');
        if (!input) continue;
        
        // Check for multiselect
        if (input.multiple && field.required) {
            const selectedOptions = Array.from(input.selectedOptions);
            if (selectedOptions.length === 0) {
                input.focus();
                input.reportValidity();
                return false;
            }
        } else if (field.required && !input.value && !input.checked) {
            input.focus();
            input.reportValidity();
            return false;
        }
        
        // Custom validation rules
        if (field.validation) {
            const value = getFieldValue(fieldElement);
            
            if (field.validation.minLength && value.length < field.validation.minLength) {
                alert(`${field.label || 'Field'} must be at least ${field.validation.minLength} characters.`);
                input.focus();
                return false;
            }
            
            if (field.validation.maxLength && value.length > field.validation.maxLength) {
                alert(`${field.label || 'Field'} must be at most ${field.validation.maxLength} characters.`);
                input.focus();
                return false;
            }
            
            if (field.validation.min !== null && field.validation.min !== undefined && parseFloat(value) < field.validation.min) {
                alert(`${field.label || 'Field'} must be at least ${field.validation.min}.`);
                input.focus();
                return false;
            }
            
            if (field.validation.max !== null && field.validation.max !== undefined && parseFloat(value) > field.validation.max) {
                alert(`${field.label || 'Field'} must be at most ${field.validation.max}.`);
                input.focus();
                return false;
            }
        }
    }
    
    return true;
}

// Form Submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    try {
        // Collect form data
        const formData = {};
        const fields = currentFormData.fields || [];
        
        fields.forEach(field => {
            const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
            if (!fieldElement) return;
            
            const value = getFieldValue(fieldElement);
            if (value !== '' && value !== null && value !== undefined) {
                formData[field.id] = value;
            }
        });
        
        // Calculate completion time
        const completionTime = formStartTime ? Math.floor((Date.now() - formStartTime) / 1000) : 0;
        
        // Get user info
        const userInfo = {
            name: userData?.name || currentUser.displayName || '',
            email: userData?.email || currentUser.email || '',
            githubUsername: userData?.githubUsername || '',
            photoURL: currentUser.photoURL || null
        };
        
        // Save submission
        const submissionId = await saveSubmission(formData, userInfo, completionTime);
        
        // Update user tracking
        await updateUserSubmissionTracking(submissionId);
        
        // Show success and redirect
        showSuccessMessage();
        
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Failed to submit form. Please try again.');
    }
}

// Save submission to Firebase
async function saveSubmission(formData, userInfo, completionTime) {
    const submissionsRef = window.collection(window.db, 'form_submissions', currentFormId, 'submissions');
    const newSubmissionRef = window.doc(submissionsRef);
    
    const submissionData = {
        submittedAt: window.Timestamp.now(),
        submittedBy: currentUser.email || null,
        userId: currentUser.uid,
        userInfo: userInfo,
        data: formData,
        completionTime: completionTime
    };
    
    await window.setDoc(newSubmissionRef, submissionData);
    return newSubmissionRef.id;
}

// Update user submission tracking
async function updateUserSubmissionTracking(submissionId) {
    try {
        const userSubRef = window.doc(window.db, 'user_form_submissions', currentUser.uid);
        const userSubSnap = await window.getDoc(userSubRef);
        
        const existingData = userSubSnap.exists() ? userSubSnap.data() : { submissions: {} };
        const submissions = existingData.submissions || {};
        
        const formSubmission = submissions[currentFormId] || {
            count: 0,
            submissionIds: [],
            formName: currentFormData.name,
            canResubmit: currentFormData.settings?.allowMultipleSubmissions || false
        };
        
        formSubmission.count = (formSubmission.count || 0) + 1;
        formSubmission.lastSubmittedAt = window.Timestamp.now();
        formSubmission.submissionIds = [...(formSubmission.submissionIds || []), submissionId];
        
        submissions[currentFormId] = formSubmission;
        
        await window.setDoc(userSubRef, {
            submissions: submissions,
            lastUpdated: window.Timestamp.now()
        }, { merge: true });
        
    } catch (error) {
        console.error('Error updating user submission tracking:', error);
    }
}

// Show success message
function showSuccessMessage() {
    document.getElementById('dynamicForm').style.display = 'none';
    document.getElementById('formHeader').style.display = 'none';
    
    const confirmationText = currentFormData.settings?.confirmationMessage || 'Thank you for your submission!';
    document.getElementById('confirmationText').textContent = confirmationText;
    document.getElementById('successMessage').style.display = 'flex';
}

// Handle success redirect
function handleSuccessRedirect() {
    const redirectType = currentFormData.settings?.redirectType || 'dashboard';
    
    switch(redirectType) {
        case 'same-page':
            // Already showing success message, just reload form
            window.location.reload();
            break;
        case 'dashboard':
            window.location.href = 'dashboard.html';
            break;
        case 'custom':
            const redirectUrl = currentFormData.settings?.redirectUrl || 'dashboard.html';
            window.location.href = redirectUrl;
            break;
        default:
            window.location.href = 'dashboard.html';
    }
}

// Show submission history
async function showSubmissionHistory(formId, formName) {
    try {
        showLoading();
        
        currentFormId = formId;
        
        const submissionsRef = window.collection(window.db, 'form_submissions', formId, 'submissions');
        const q = window.query(submissionsRef, window.where('userId', '==', currentUser.uid), window.orderBy('submittedAt', 'desc'));
        const snapshot = await window.getDocs(q);
        
        const submissions = [];
        snapshot.forEach(doc => {
            submissions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        hideLoading();
        
        // Show history view
        document.getElementById('formHeader').style.display = 'none';
        document.getElementById('dynamicForm').style.display = 'none';
        document.getElementById('historyView').style.display = 'block';
        
        document.getElementById('historyTitle').textContent = `Submission History: ${formName || 'Form'}`;
        
        const historyList = document.getElementById('historyList');
        if (submissions.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-inbox"></i>
                    <p>No submissions found.</p>
                </div>
            `;
            return;
        }
        
        // Load form data to display field labels
        const formRef = window.doc(window.db, 'forms', formId);
        const formSnap = await window.getDoc(formRef);
        const formData = formSnap.exists() ? formSnap.data() : null;
        
        historyList.innerHTML = submissions.map((submission, index) => {
            const submittedDate = submission.submittedAt?.toDate ? submission.submittedAt.toDate() : new Date(submission.submittedAt);
            const dateStr = submittedDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const dataHTML = Object.entries(submission.data || {}).map(([fieldId, value]) => {
                const field = formData?.fields?.find(f => f.id === fieldId);
                const fieldLabel = field?.label || fieldId;
                const displayValue = Array.isArray(value) ? value.join(', ') : value;
                
                return `
                    <div class="history-field">
                        <strong>${fieldLabel}:</strong>
                        <span>${displayValue || '(empty)'}</span>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-date">
                            <i class="fas fa-calendar"></i> ${dateStr}
                        </span>
                        <span class="history-time">
                            <i class="fas fa-clock"></i> Completed in ${submission.completionTime || 0} seconds
                        </span>
                    </div>
                    <div class="history-data">
                        ${dataHTML}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading submission history:', error);
        showError('Failed to load submission history.');
    }
}

