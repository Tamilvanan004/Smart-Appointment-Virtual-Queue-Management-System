"use strict";



// ==================================================
// SCRIPT INDEX
// Search for an HTML filename to find its related section.
// Major sections use three blank lines; code blocks use one.
// Search for BLOCK: to find a function, action or update area.
// 1. SHARED INTERFACE: Safe DOM creation and feedback
// 2. BACKEND DATA: Server-provided records and form actions
// 3. SHARED RULES: Booking validation, queues and attendance
// 4. SHARED NAVIGATION: Public and portal shells
// 5. PUBLIC HOME: Services and account access
// 6. PATIENT BOOKING: Booking and rescheduling
// 7. PATIENT RECORDS: Dashboard, appointments and queue
// 8. STAFF OPERATIONS: Appointments and attendance
// 9. ADMIN MANAGEMENT: Services, slots and people
// 10. ADMIN REPORTING: Attendance and daily reports
// 11. APPLICATION LIFECYCLE: Events and page initialisation
// ==================================================



// ==================================================
// SHARED INTERFACE: Safe DOM creation and feedback
// HTML: All 21 templates (shared code)
// HTML literals contain developer markup. Interpolated
// values become text nodes or attributes, never raw HTML.
// ==================================================

// BLOCK: html - Build safe HTML fragments from markup and values.
function html(strings, ...values) {
    const template = document.createElement("template");
    const startIndex = html.valueIndex;
    let markup = strings[0];

    // BLOCK: Create a safe placeholder for each interpolated value.
    values.forEach((value, index) => {
        const placeholder = `__value_${html.valueIndex++}__`;
        const insideTag = markup.lastIndexOf("<") > markup.lastIndexOf(">");
        const insideTextArea = markup.lastIndexOf("<textarea") > markup.lastIndexOf("</textarea");
        // Comment placeholders stay inside table rows. Plain text
        // placeholders would be moved outside tables by the parser.
        markup += insideTag || insideTextArea ? placeholder : `<!--${placeholder}-->`;
        markup += strings[index + 1];
    });

    // BLOCK: Parse the static markup and collect DOM nodes.
    template.innerHTML = markup;
    const marker = /__value_(\d+)__/g;
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT);
    const nodes = [];
    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }

    // BLOCK: Replace placeholders with safe text or nodes.
    nodes.forEach(node => {
        if (node.nodeType === Node.COMMENT_NODE) {
            const match = /^__value_(\d+)__$/.exec(node.textContent);
            if (match) {
                const replacement = document.createDocumentFragment();
                appendSafeValue(replacement, values[Number(match[1]) - startIndex]);
                node.replaceWith(replacement);
            }
            return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.attributes).forEach(attribute => {
                if (attribute.value.includes("__value_")) {
                    node.setAttribute(attribute.name, attribute.value.replace(marker, (match, index) => String(values[Number(index) - startIndex] ?? "")));
                }
            });
            return;
        }
        if (!node.textContent.includes("__value_")) {
            return;
        }
        const parts = node.textContent.split(/(__value_\d+__)/g);
        const replacement = document.createDocumentFragment();
        parts.forEach(part => {
            const match = /^__value_(\d+)__$/.exec(part);
            if (match) {
                appendSafeValue(replacement, values[Number(match[1]) - startIndex]);
            } else {
                replacement.append(document.createTextNode(part));
            }
        });
        node.replaceWith(replacement);
    });
    return template.content;
}

// BLOCK: HTML interpolation marker counter.
html.valueIndex = 0;

// BLOCK: appendSafeValue - Insert text, nodes or arrays safely.
function appendSafeValue(parent, value) {
    if (Array.isArray(value)) {
        value.forEach(item => appendSafeValue(parent, item));
    } else if (value instanceof Node) {
        parent.append(value);
    } else if (value !== null && value !== undefined && value !== false) {
        parent.append(document.createTextNode(String(value)));
    }
}

// BLOCK: iconPaths - Shared SVG icon definitions.
const iconPaths = {
    cross: ["M12 3v18M3 12h18"],
    grid: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
    calendar: ["M8 2v4M16 2v4M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z", "m8 15 3 3 5-5"],
    scan: ["M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8M12 8v8"],
    clock: ["M12 8v5l3 2", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
    arrow: ["M4 12h16m-6-6 6 6-6 6"],
    chevron: ["m9 5 7 7-7 7"],
    check: ["m5 12 4 4L19 6"],
    shield: ["M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z", "m8 12 3 3 5-5"],
    user: ["M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M4 21v-2a8 8 0 0 1 16 0v2"],
    users: ["M15 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a8 8 0 0 1 16 0v2M17 4a4 4 0 0 1 0 8M21 21v-3a6 6 0 0 0-3-5"],
    queue: ["M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"],
    logout: ["M9 4H4v16h5M9 12h12m-4-4 4 4-4 4"],
    info: ["M12 11v6M12 7h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
    heart: ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"],
    print: ["M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h.01"],
    report: ["M5 3h10l4 4v14H5zM14 3v5h5M9 17v-3M12 17v-6M15 17v-4"],
    attendance: ["M8 3H4v18h16V3h-4M8 2h8v4H8z", "m8 13 3 3 5-6"],
    menu: ["M4 6h16M4 12h16M4 18h16"],
    close: ["m6 6 12 12M18 6 6 18"],
};

// BLOCK: icon - Build an SVG icon from the shared icon paths.
function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");

    // BLOCK: Add the selected icon paths.
    (iconPaths[name] || iconPaths.scan).forEach(pathData => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        svg.append(path);
    });
    return svg;
}

// BLOCK: byId - Find a page element by its ID.
function byId(id) {
    return document.getElementById(id);
}

// BLOCK: mount - Replace the contents of a page area.
function mount(id, content) {
    const target = byId(id);
    if (target) {
        target.replaceChildren(content);
    }
}

// BLOCK: showFeedback - Show a page message or validation error.
function showFeedback(message, isError = false) {
    const feedback = byId("page-feedback");
    if (feedback) {
        feedback.textContent = message;
        feedback.classList.toggle("has-error", isError);
        feedback.hidden = false;
        feedback.scrollIntoView({ block: "nearest" });
    } else {
        showToast(message, isError);
    }
}

// BLOCK: Notification dismissal timer.
let toastTimeout;

// BLOCK: showToast - Show a temporary notification.
function showToast(message, isError = false) {
    const toast = byId("app-toast");
    toast.textContent = message;
    toast.classList.toggle("has-error", isError);
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.hidden = true; }, 6000);
}

// BLOCK: setFieldError - Mark a field and show its validation message.
function setFieldError(id, message) {
    const control = byId(id);
    const error = byId(`${id}-error`);
    if (control) {
        control.classList.toggle("has-error", Boolean(message));
        control.setAttribute("aria-invalid", String(Boolean(message)));
    }
    if (error) {
        error.textContent = message || "";
    }
}

// BLOCK: clearFormErrors - Clear the previous errors in a form.
function clearFormErrors(form) {
    form.querySelectorAll("[aria-invalid]").forEach(control => {
        setFieldError(control.id, "");
    });
}

// BLOCK: field - Build a labelled input and validation message.
function field(id, name, label, type = "text", value = "", options = {}) {
    const fragment = html`
        <div class="field">
            <label for="${id}">${label} ${options.required === false ? "" : html`<span class="required" aria-hidden="true">*</span>`}</label>
            <input class="form-input" id="${id}" name="${name}" type="${type}"
                value="${value}" aria-describedby="${id}-error" autocomplete="${options.autocomplete || "off"}">
            <p class="field-error" id="${id}-error" aria-live="polite"></p>
        </div>`;

    // BLOCK: Apply field requirements and input limits.
    const input = fragment.querySelector("input");
    input.required = options.required !== false;
    if (options.min !== undefined) { input.min = options.min; }
    if (options.max !== undefined) { input.max = options.max; }
    if (options.maxLength) { input.maxLength = options.maxLength; }
    if (type === "tel") { input.pattern = "[0-9]{10}"; input.inputMode = "numeric"; input.maxLength = 10; }
    if (type === "password") { input.minLength = 8; }
    return fragment;
}

// BLOCK: selectField - Build a labelled dropdown and its choices.
function selectField(id, name, label, choices, value = "", options = {}) {
    const fragment = html`
        <div class="field">
            <label for="${id}">${label}</label>
            <select class="form-input" id="${id}" name="${name}" aria-describedby="${id}-error">
                ${choices.map(choice => html`<option value="${choice.value}">${choice.label}</option>`)}
            </select>
            <p class="field-error" id="${id}-error" aria-live="polite"></p>
        </div>`;

    // BLOCK: Apply the selected value and required state.
    const select = fragment.querySelector("select");
    select.value = value;
    select.required = options.required !== false;
    return fragment;
}

// BLOCK: textAreaField - Build a labelled multiline input.
function textAreaField(id, name, label, value = "", required = true) {
    const fragment = html`
        <div class="field field-full">
            <label for="${id}">${label}</label>
            <textarea class="form-input" id="${id}" name="${name}" maxlength="500" aria-describedby="${id}-error">${value}</textarea>
            <p class="field-error" id="${id}-error" aria-live="polite"></p>
        </div>`;
    fragment.querySelector("textarea").required = required;
    return fragment;
}

// BLOCK: emptyState - Build a message for a page with no records.
function emptyState(title, description, link = "", label = "Book an appointment") {
    return html`
        <div class="empty-state">
            <span class="icon-box">${icon("calendar")}</span>
            <h3>${title}</h3>
            <p>${description}</p>
            ${link ? html`<a class="button button-primary" href="${link}">${label}${icon("arrow")}</a>` : ""}
        </div>`;
}

// BLOCK: statusBadge - Build the coloured appointment status label.
function statusBadge(status) {
    const classes = {
        "Booked": "", "Checked In": "badge-amber", "In Progress": "",
        "Completed": "badge-green", "Cancelled": "badge-pink", "No-show": "badge-gray"
    };
    return html`<span class="badge ${classes[status] || ""}">${status}</span>`;
}

// BLOCK: openModal - Open a dialog and handle its form submission.
function openModal(title, content, onSubmit) {
    const dialog = byId("app-dialog");
    dialog.replaceChildren(html`
        <div class="card-header">
            <h2 id="dialog-heading">${title}</h2>
            <button class="modal-close" id="dialog-close-button" type="button" aria-label="Close dialog">${icon("close")}</button>
        </div>
        <div class="modal-body">
            <div class="feedback is-hidden" id="dialog-feedback" role="alert"></div>
            ${content}
        </div>`);

    // BLOCK: Connect dialog controls and validate submissions.
    byId("dialog-close-button").addEventListener("click", () => dialog.close());
    const form = byId("record-form");
    if (form && onSubmit) {
        form.addEventListener("submit", event => {
            event.preventDefault();
            try {
                onSubmit(new FormData(form), form);
            } catch (error) {
                const feedback = byId("dialog-feedback");
                feedback.textContent = error.message;
                feedback.classList.remove("is-hidden");
                feedback.classList.add("has-error");
            }
        });
    }

    // BLOCK: Display the dialog and move focus inside.
    dialog.showModal();
}

// BLOCK: modalSaveActions - Build the dialog cancel and submit buttons.
function modalSaveActions(label = "Save changes") {
    return html`<div class="modal-actions">
        <button class="button button-secondary" type="button" data-action="close-dialog">Cancel</button>
        <button class="button button-primary" type="submit">${label}</button>
    </div>`;
}



// ==================================================
// BACKEND DATA: Server-provided records and form actions
// HTML: All 21 templates (shared code)
// The page-data JSON contains records, currentUser and
// formActions. Records start empty; no browser data is saved.
// Flask must supply only authorised records and enforce all
// authentication, reservations, tokens and database changes.
// ==================================================

// BLOCK: Allowed appointment status labels.
const statuses = ["Booked", "Checked In", "In Progress", "Completed", "Cancelled", "No-show"];

// BLOCK: Backend collection names.
const recordCollections = ["patients", "staff", "services", "slots", "appointments", "attendance"];

// BLOCK: Current backend page records and user profile.
let pageData = {};
let appData = getPageRecords({});
let currentUser = null;

// BLOCK: getPageRecords - Read backend collections with empty-array defaults.
// Input: backend JSON records. Return the same collections
// with empty arrays for any collection not supplied yet.
function getPageRecords(records) {
    const collections = {};
    recordCollections.forEach(name => {
        collections[name] = Array.isArray(records?.[name]) ? records[name] : [];
    });
    return collections;
}

// BLOCK: readPageData - Parse and validate the backend page-data JSON.
function readPageData() {
    const container = byId("page-data");
    if (!container || !container.textContent.trim()) { return {}; }
    const data = JSON.parse(container.textContent);
    if (!data || Array.isArray(data) || typeof data !== "object") {
        throw new Error("The page information could not be loaded.");
    }
    return data;
}

// BLOCK: getCurrentUser - Read the current backend user.
function getCurrentUser() {
    return currentUser;
}

// BLOCK: getCurrentPatient - Find the current patient profile.
function getCurrentPatient(data = appData) {
    return data.patients.find(patient => patient.id === currentUser?.patientId);
}

// BLOCK: getCurrentStaff - Find the current staff profile.
function getCurrentStaff(data = appData) {
    return data.staff.find(staff => staff.id === currentUser?.staffId);
}

// BLOCK: setHiddenField - Add or update a hidden form value.
function setHiddenField(form, name, value) {
    let input = Array.from(form.elements).find(control => control.name === name && !control.disabled);
    if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.id = form.id + "-" + name.replaceAll("_", "-");
        input.name = name;
        form.append(input);
    }
    input.value = String(value ?? "");
}

// BLOCK: submitBackendForm - Validate the action URL and submit a backend form.
// Input: a validated form and its action key. Submit only to
// a URL provided by Flask in pageData.formActions. An absent
// URL shows feedback without claiming the action succeeded.
// The server must validate CSRF, roles and all submitted IDs.
function submitBackendForm(form, actionName) {
    const endpoint = pageData.formActions?.[actionName] || form.getAttribute("action");

    // BLOCK: Handle a missing backend action URL.
    if (!endpoint) {
        const feedback = byId("app-dialog")?.open ? byId("dialog-feedback") : byId("page-feedback");
        if (feedback) {
            feedback.textContent = "This action is not available yet.";
            feedback.classList.remove("is-hidden");
            feedback.classList.add("has-error");
            feedback.hidden = false;
        } else {
            showToast("This action is not available yet.", true);
        }
        return false;
    }

    // BLOCK: Parse and validate the backend destination.
    let destination;
    try {
        destination = new URL(endpoint, window.location.href);
    } catch (error) {
        showToast("The form service is unavailable.", true);
        return false;
    }
    if (!["http:", "https:"].includes(destination.protocol) || destination.origin !== window.location.origin) {
        showToast("The form service is unavailable.", true);
        return false;
    }

    // BLOCK: Prepare the POST request and include the CSRF token.
    form.action = destination.href;
    form.method = "post";
    if (pageData.csrfToken) { setHiddenField(form, "csrf_token", pageData.csrfToken); }
    HTMLFormElement.prototype.submit.call(form);
    return true;
}

// BLOCK: submitRecordAction - Submit a record action using a temporary POST form.
function submitRecordAction(actionName, fields = {}) {
    byId("server-action-form")?.remove();
    const form = document.createElement("form");
    form.id = "server-action-form";
    form.method = "post";
    Object.entries(fields).forEach(([name, value]) => setHiddenField(form, name, value));
    document.body.append(form);
    if (!submitBackendForm(form, actionName)) { form.remove(); }
}

// BLOCK: confirmRecordAction - Request confirmation before submitting a record action.
function confirmRecordAction(title, message, actionName, fields) {
    openModal(title, html`<p>${message}</p>
        <form id="record-form" method="post">${modalSaveActions("Confirm")}</form>`, (values, form) => {
        Object.entries(fields).forEach(([name, value]) => setHiddenField(form, name, value));
        submitBackendForm(form, actionName);
    });
}

// BLOCK: localDate - Format a local date as YYYY-MM-DD.
// Input: a local Date. Return YYYY-MM-DD without a UTC
// conversion, so midnight bookings keep the intended date.
function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// BLOCK: relativeDate - Find a local date relative to today.
function relativeDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return localDate(date);
}

// BLOCK: formatDate - Format an appointment date for display.
function formatDate(date, short = false) {
    if (!date) { return "—"; }
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) { return "Unavailable date"; }
    return parsed.toLocaleDateString(undefined, {
        day: "numeric", month: short ? "short" : "long", year: "numeric"
    });
}

// BLOCK: formatTime - Format a scheduled scan time.
function formatTime(time) {
    if (!time) { return "—"; }
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// BLOCK: formatTimestamp - Format an attendance timestamp.
function formatTimestamp(timestamp) {
    if (!timestamp) { return "—"; }
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}



// ==================================================
// SHARED RULES: Booking validation, queues and attendance
// HTML: book_appointment.html, reschedule_appointment.html, queue_tracking.html, staff_appointments.html
//       admin_appointments.html, admin_reports.html
// These helpers validate and display backend records only.
// Flask must recheck availability and persist every change.
// ==================================================

// BLOCK: getAppointmentContext - Find the slot and service for an appointment.
function getAppointmentContext(appointment, data = appData) {
    const slot = data.slots.find(record => record.id === appointment?.slotId);
    const service = data.services.find(record => record.id === slot?.serviceId);
    return { slot, service };
}

// BLOCK: getSlotAvailability - Calculate slot reservations and remaining capacity.
// Input: server-provided records and the selected slot ID.
// Output: availability, reason, reserved and remaining places.
function getSlotAvailability(data, slotId) {
    const slot = data.slots.find(record => record.id === slotId);
    if (!slot) { return { available: false, reason: "Slot unavailable", reserved: 0, remaining: 0 }; }
    const service = data.services.find(record => record.id === slot.serviceId);
    const reserved = Number.isInteger(slot.reservedCount) ? slot.reservedCount : data.appointments.filter(record => record.slotId === slot.id && record.status !== "Cancelled").length;
    const remaining = Math.max(0, slot.capacity - reserved);
    let reason = "Available";
    if (!service?.active) { reason = "Service inactive"; }
    else if (!slot.open) { reason = "Closed"; }
    else if (new Date(`${slot.date}T${slot.time}`) <= new Date()) { reason = "Time passed"; }
    else if (remaining <= 0) { reason = "Full"; }
    return { available: reason === "Available", reason, reserved, remaining };
}

// BLOCK: isFutureBooked - Check whether a booking can still be changed.
function isFutureBooked(appointment, data = appData) {
    const { slot } = getAppointmentContext(appointment, data);
    return Boolean(slot && appointment.status === "Booked" && new Date(`${slot.date}T${slot.time}`) > new Date());
}

// BLOCK: requireAppointmentAccess - Check which appointment the current profile can view.
function requireAppointmentAccess(data, appointmentId, management = false) {
    const appointment = data.appointments.find(record => record.id === appointmentId);
    const user = getCurrentUser();
    if (!appointment) { throw new Error("Appointment unavailable. Please choose an appointment from your list."); }
    if (getPageRole() === "patient" && (!user || user.patientId !== appointment.patientId)) {
        throw new Error("Access unavailable. You can view only your own appointments.");
    }
    if (getPageRole() === "staff") {
        const staff = getCurrentStaff(data);
        const { slot } = getAppointmentContext(appointment, data);
        if (!staff?.active || !staff.serviceIds.includes(slot?.serviceId)) {
            throw new Error("This appointment is not assigned to your staff profile.");
        }
        if (management) { throw new Error("Use patient arrival and scan progress controls for assigned appointments."); }
    }
    return appointment;
}

// BLOCK: validateBooking - Validate patient details and the selected slot.
// Input: submitted booking fields and fresh shared records.
// Return field-ID/error pairs; an empty object means valid.
function validateBooking(details, data) {
    const errors = {};
    if (details.patientName.trim().length < 2 || details.patientName.length > 80) { errors["booking-patient-name"] = "Enter a name with 2–80 characters."; }
    if (!/^\d+$/.test(String(details.age)) || Number(details.age) < 1 || Number(details.age) > 120) { errors["booking-age"] = "Enter an age between 1 and 120."; }
    if (!/^\d{10}$/.test(details.contact)) { errors["booking-contact"] = "Enter a 10-digit contact number."; }
    if (!details.bodyPart.trim() || details.bodyPart.length > 100) { errors["booking-body-part"] = "Enter the body part to be scanned (up to 100 characters)."; }

    // BLOCK: Validate scan service and referral requirements.
    const service = data.services.find(record => record.id === details.serviceId);
    if (!service?.active) { errors["booking-service"] = "Choose an active scan service."; }
    if (service?.referralRequired && !details.referral.trim()) { errors["booking-referral"] = "Referral details are required for this scan."; }

    // BLOCK: Validate the selected appointment date and available slot.
    const slot = data.slots.find(record => record.id === details.slotId);
    if (!slot || slot.serviceId !== details.serviceId || slot.date !== details.date) { errors["booking-slot"] = "Choose a time slot for this scan and date."; }
    else if (!getSlotAvailability(data, slot.id).available) { errors["booking-slot"] = "This slot is no longer available. Choose another time."; }
    if (details.date < localDate()) { errors["booking-date"] = "Choose today or a future date."; }
    return errors;
}

// BLOCK: getTransitionReason - Check whether an appointment status change is allowed.
// Input: record, target status and shared model. Return an
// explanation for an invalid transition, or an empty string.
function getTransitionReason(appointment, nextStatus, data = appData) {
    const { slot } = getAppointmentContext(appointment, data);
    if (!slot) { return "The appointment slot is unavailable."; }
    const normalTransitions = { "Booked": "Checked In", "Checked In": "In Progress", "In Progress": "Completed" };
    if (nextStatus === "No-show") {
        if (appointment.status !== "Booked") { return "Only a patient who has not arrived can be marked No-show."; }
        return new Date(`${slot.date}T${slot.time}`) < new Date() ? "" : "No-show is available after the scheduled time.";
    }
    if (normalTransitions[appointment.status] !== nextStatus) { return "Follow Booked → Checked In → In Progress → Completed."; }
    if (slot.date !== localDate()) { return "Patient arrival and scan progress can be recorded only on the appointment date."; }
    if (nextStatus === "In Progress") {
        const inProgress = data.appointments.some(record => {
            const otherSlot = getAppointmentContext(record, data).slot;
            return record.id !== appointment.id && record.status === "In Progress" && otherSlot?.serviceId === slot.serviceId && otherSlot.date === slot.date;
        });
        if (inProgress) { return "Complete the scan currently in progress for this service before starting another."; }
    }
    return "";
}

// BLOCK: calculateQueue - Order active tokens and count patients ahead.
// Input: fresh records and the patient's appointment. Return
// current token, active membership and active patients ahead.
// Booked, Completed, Cancelled and No-show records never wait.
function calculateQueue(data, appointment) {
    const { slot } = getAppointmentContext(appointment, data);
    if (!slot) { return { current: null, ahead: 0, active: false }; }
    const active = data.appointments.filter(record => {
        const otherSlot = getAppointmentContext(record, data).slot;
        return ["Checked In", "In Progress"].includes(record.status) && otherSlot?.serviceId === slot.serviceId && otherSlot.date === slot.date;
    });

    // BLOCK: Order patients by scan progress, scheduled time and token.
    active.sort((first, second) => {
        if (first.status !== second.status) { return first.status === "In Progress" ? -1 : 1; }
        const firstSlot = getAppointmentContext(first, data).slot;
        const secondSlot = getAppointmentContext(second, data).slot;
        return firstSlot.time.localeCompare(secondSlot.time) || first.tokenSequence - second.tokenSequence || first.token.localeCompare(second.token);
    });

    // BLOCK: Find the current patient position.
    const position = active.findIndex(record => record.id === appointment.id);
    return { current: active.find(record => record.status === "In Progress") || null, ahead: Math.max(0, position), active: position >= 0 };
}

// BLOCK: validateAttendance - Validate check-in and check-out timestamps.
// Input: local/ISO timestamps and attendance date. Return an
// error or an empty string. Future and reversed times fail.
function validateAttendance(checkIn, checkOut, date) {
    if (!checkIn || Number.isNaN(new Date(checkIn).getTime())) { return "A valid check-in time is required."; }
    if (localDate(new Date(checkIn)) !== date) { return "Check-in must fall on the attendance date."; }
    if (new Date(checkIn) > new Date()) { return "Check-in cannot be in the future."; }
    if (checkOut) {
        if (Number.isNaN(new Date(checkOut).getTime())) { return "Enter a valid check-out time."; }
        if (localDate(new Date(checkOut)) !== date) { return "Check-out must fall on the attendance date."; }
        if (new Date(checkOut) < new Date(checkIn)) { return "Check-out cannot be before check-in."; }
        if (new Date(checkOut) > new Date()) { return "Check-out cannot be in the future."; }
    }
    return "";
}

// BLOCK: getDashboardTotals - Calculate booking and attendance totals.
// Input: records, date and optional service/staff filters.
// Return derived booking counts and centre-wide attendance.
function getDashboardTotals(data, date, serviceId = "", staffId = "") {
    const appointments = data.appointments.filter(record => {
        const { slot } = getAppointmentContext(record, data);
        const staff = data.staff.find(item => item.id === staffId);
        return slot?.date === date && (!serviceId || slot.serviceId === serviceId) && (!staffId || staff?.serviceIds.includes(slot.serviceId));
    });
    const attendance = data.attendance.filter(record => record.date === date);
    return {
        bookings: appointments.length,
        waiting: appointments.filter(record => record.status === "Checked In").length,
        inProgress: appointments.filter(record => record.status === "In Progress").length,
        completed: appointments.filter(record => record.status === "Completed").length,
        cancelled: appointments.filter(record => record.status === "Cancelled").length,
        noShow: appointments.filter(record => record.status === "No-show").length,
        attendance: attendance.length,
        onDuty: attendance.filter(record => !record.checkOut).length
    };
}



// ==================================================
// SHARED NAVIGATION: Public and portal shells
// HTML: All 21 templates (shared code)
// Navigation reflects page context and server-provided profile data.
// Protected routes and authorisation must be enforced by Flask.
// ==================================================

// BLOCK: Current HTML page identifier.
const pageName = document.body.dataset.page;

// BLOCK: Patient, staff and administrator navigation links.
const navigation = {
    patient: [
        ["patient_dashboard", "Dashboard", "grid"],
        ["scan_services", "Scan services", "scan"],
        ["book_appointment", "Book appointment", "calendar"],
        ["my_appointments", "My appointments", "attendance"],
        ["queue_tracking", "Track my queue", "queue"]
    ],
    staff: [
        ["staff_dashboard", "Dashboard", "grid"],
        ["staff_appointments", "Assigned appointments", "calendar"],
        ["staff_attendance", "My attendance", "attendance"]
    ],
    admin: [
        ["admin_dashboard", "Centre overview", "grid"],
        ["admin_scan_services", "Scan services", "scan"],
        ["admin_slots", "Time slots", "clock"],
        ["admin_appointments", "All appointments", "calendar"],
        ["admin_patients", "Patient records", "users"],
        ["admin_staff", "Staff profiles", "user"],
        ["admin_attendance", "Staff attendance", "attendance"],
        ["admin_reports", "Daily reports", "report"]
    ]
};

// BLOCK: brand - Build the Scanova logo and home link.
function brand() {
    return html`<a class="brand" href="index.html" aria-label="Scanova home">
        <span class="brand-mark">${icon("cross")}</span>
        <span>scanova<span class="brand-subtitle">A little clarity. A lot of care.</span></span>
    </a>`;
}

// BLOCK: renderPublicNavigation - Build the public header and footer.
function renderPublicNavigation() {
    byId("main-content").className = "public-content";
    mount("app-navigation", html`<header class="public-header">
        ${brand()}
        <nav class="public-nav" aria-label="Main navigation">
            <a class="${pageName === "index" ? "is-active" : ""}" href="index.html">Home</a>
            <a class="${pageName === "scan_services" ? "is-active" : ""}" href="scan_services.html">Our scans</a>
            <a href="index.html#how-it-works">How it works</a>
        </nav>
        <div class="nav-actions">
            <a class="text-link" href="${currentUser ? `${currentUser.role}_dashboard.html` : "login.html"}">${currentUser ? "My dashboard" : "Log in"}</a>
            <a class="button button-primary" href="${currentUser?.role === "patient" ? "book_appointment.html" : "register.html"}">${currentUser?.role === "patient" ? "Book a scan" : "Get started"}${icon("arrow")}</a>
        </div>
    </header>`);
    mount("page-footer", html`<span class="footer-title">Smart Appointment &amp; Virtual Queue Management System</span>
        <span>One scanning centre. Care that fits your day.</span>`);
    byId("page-footer").className = "public-footer";
}

// BLOCK: getPageRole - Choose the portal role for the current page.
function getPageRole() {
    if (pageName.startsWith("admin_")) { return "admin"; }
    if (pageName.startsWith("staff_")) { return "staff"; }
    return ["patient", "staff", "admin"].includes(currentUser?.role) ? currentUser.role : "patient";
}

// BLOCK: renderPortalNavigation - Build the sidebar, top bar and profile display.
function renderPortalNavigation() {
    const role = getPageRole();
    const user = getCurrentUser();
    const person = role === "patient" ? getCurrentPatient() : role === "staff" ? getCurrentStaff() : user;
    const displayName = person?.name || (role === "admin" ? "Administrator" : role === "staff" ? "Staff" : "Patient");
    const initials = displayName.split(" ").map(part => part.charAt(0)).slice(0, 2).join("");
    byId("app-main").className = "portal-main";

    // BLOCK: Build the portal sidebar.
    mount("app-navigation", html`<aside class="sidebar" id="portal-sidebar">
        ${brand()}
        <button class="modal-close sidebar-close" id="close-navigation-button" type="button" aria-label="Close navigation">${icon("close")}</button>
        <p class="nav-label">${role === "admin" ? "Administration" : `${role} portal`}</p>
        <nav class="side-nav" aria-label="Portal navigation">
            ${navigation[role].map(([page, label, iconName]) => html`
                <a class="side-link ${pageName === page ? "is-active" : ""}" href="${page}.html" aria-current="${pageName === page ? "page" : "false"}">${icon(iconName)}${label}</a>`)}
        </nav>
        <div class="sidebar-bottom">
            <div class="sidebar-tip">
                ${icon("heart")}<h3>Your visit, made easier.</h3>
                <p>${role === "patient" ? "Book ahead, keep your token handy, and check in when you arrive." : "Small updates keep every patient’s visit moving smoothly."}</p>
                <a href="index.html">About the centre →</a>
            </div>
            <button class="side-link logout-button" id="logout-button" type="button">${icon("logout")}Log out</button>
        </div>
    </aside>`);

    // BLOCK: Build the portal header and footer.
    mount("app-topbar", html`<header class="topbar">
        <button class="button button-secondary menu-toggle" id="menu-toggle-button" type="button" aria-controls="portal-sidebar" aria-expanded="false" aria-label="Open navigation">${icon("menu")}</button>
        <p class="topbar-breadcrumb">${role === "admin" ? "Administrator" : role === "staff" ? "Staff portal" : "Patient portal"}<span>/ &nbsp; ${byId("page-title").textContent}</span></p>
        <div class="profile"><span class="avatar">${initials}</span>
            <div><span class="profile-name">${displayName}</span><span class="muted small">${role === "admin" ? "Administrator" : role === "staff" ? "Scan technician" : "Patient"}</span></div>
        </div>
    </header>`);
    mount("page-footer", html`<span>© ${new Date().getFullYear()} Scanova · Smart Appointment &amp; Virtual Queue Management System</span><span>Single scanning centre</span>`);

    // BLOCK: Connect logout and mobile navigation controls.
    byId("logout-button").addEventListener("click", () => {
        submitRecordAction("logout");
    });
    byId("menu-toggle-button").addEventListener("click", () => {
        const open = byId("portal-sidebar").classList.toggle("is-open");
        byId("portal-sidebar").inert = false;
        byId("menu-toggle-button").setAttribute("aria-expanded", String(open));
        byId("menu-toggle-button").setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        if (open) { byId("close-navigation-button").focus(); }
        else { syncSidebarVisibility(); }
    });
    byId("close-navigation-button").addEventListener("click", closeMobileNavigation);
    window.matchMedia("(max-width: 700px)").addEventListener("change", syncSidebarVisibility);
    syncSidebarVisibility();
}

// BLOCK: syncSidebarVisibility - Disable hidden mobile navigation controls.
function syncSidebarVisibility() {
    const sidebar = byId("portal-sidebar");
    if (sidebar) {
        sidebar.inert = window.matchMedia("(max-width: 700px)").matches && !sidebar.classList.contains("is-open");
    }
}

// BLOCK: closeMobileNavigation - Close the mobile sidebar and restore button focus.
function closeMobileNavigation() {
    byId("portal-sidebar")?.classList.remove("is-open");
    byId("menu-toggle-button")?.setAttribute("aria-expanded", "false");
    byId("menu-toggle-button")?.setAttribute("aria-label", "Open navigation");
    byId("menu-toggle-button")?.focus();
    syncSidebarVisibility();
}

// BLOCK: headingAction - Add controls beside the page heading.
function headingAction(content) {
    mount("page-heading-actions", content);
}



// ==================================================
// PUBLIC HOME: Services and account access
// HTML: index.html, scan_services.html, login.html, register.html
// Account forms validate input and submit to the server action.
// Authentication and patient-only registration belong to Flask.
// ==================================================



// ==================================================
// HTML: index.html
// Home page introduction and scan workflow
// ==================================================

// BLOCK: renderHome - Build the home introduction, services and booking steps.
function renderHome() {
    byId("page-heading").hidden = true;
    const bookingLink = currentUser?.role === "patient" ? "book_appointment.html" : "login.html";
    mount("page-body", html`
        <!-- PUBLIC HOME: Centre introduction -->
        <section class="hero" aria-labelledby="hero-title">
            <div>
                <div class="hero-label">${icon("heart")}Thoughtful care. Less waiting.</div>
                <h1 id="hero-title">Your scan.<br>Your time.<br><span>Simplified.</span></h1>
                <p class="hero-description">Book your scan, get a digital token, and follow your queue. A calmer visit starts before you step into our centre.</p>
                <div class="hero-actions">
                    <a class="button button-primary" href="${bookingLink}">Book an appointment${icon("arrow")}</a>
                    <a class="button button-secondary" href="scan_services.html">Explore our scans</a>
                </div>
                <p class="hero-note">${icon("shield")}One scanning centre. One simple experience.</p>
            </div>
            <div class="hero-art" role="img" aria-label="An illustrated MRI scanner with a digital appointment token">
                <div class="art-grid"></div>
                <div class="scanner"><div class="scanner-light"></div><div class="scanner-ring"></div><div class="scanner-bed"></div></div>
                <div class="floating-note floating-booking"><span class="icon-box green">${icon("check")}</span><div><strong>A little less waiting</strong><p>Book a time that suits you</p></div></div>
                <div class="floating-note floating-token"><span class="icon-box">${icon("queue")}</span><div><p>Your digital token</p><span class="token-mini">Your turn</span><p>Easy to keep. Easy to track.</p></div></div>
            </div>
        </section>
        <div class="trust-strip">
            <div class="trust-item">${icon("calendar")}<div><strong>Simple online booking</strong><p>Choose your scan and slot</p></div></div>
            <div class="trust-item">${icon("queue")}<div><strong>Your place, on your screen</strong><p>Digital tokens & queue updates</p></div></div>
            <div class="trust-item">${icon("heart")}<div><strong>One centre, connected care</strong><p>MRI, CT & other scan services</p></div></div>
        </div>
        <!-- PUBLIC HOME: Available scan services -->
        <section class="home-section" aria-labelledby="home-scans-heading">
            <div class="section-heading"><div><p class="eyebrow">Our scan services</p><h2 id="home-scans-heading">Clarity starts here.</h2><p>Explore the scans available at our centre.</p></div><a class="text-link" href="scan_services.html">View all services${icon("arrow")}</a></div>
            <div class="grid-three" id="home-services">${appData.services.some(service => service.active) ? appData.services.filter(service => service.active).slice(0, 3).map(service => serviceCard(service, true)) : emptyState("Scan services", "MRI, CT and other scan availability will appear here.", "scan_services.html", "View scan services")}</div>
        </section>
        <!-- PUBLIC HOME: Appointment workflow -->
        <section class="home-section" id="how-it-works" aria-labelledby="how-heading">
            <div class="section-heading"><div><p class="eyebrow">A simpler visit</p><h2 id="how-heading">Three steps. More peace of mind.</h2></div></div>
            <div class="steps-grid">
                <div class="step-item"><span class="step-number">01</span><h3>Choose your scan</h3><p>Explore our services and tell us a little about the scan you need.</p></div>
                <div class="step-item"><span class="step-number">02</span><h3>Book your time</h3><p>Pick an available slot and receive your unique digital token.</p></div>
                <div class="step-item"><span class="step-number">03</span><h3>Keep track of your turn</h3><p>Check in at the centre, then follow the active queue from your screen.</p></div>
            </div>
        </section>
        <section class="home-cta"><div><h2>A smoother scan visit starts here.</h2><p>Book your appointment and keep track of your visit.</p></div><a class="button button-primary" href="login.html">Get started${icon("arrow")}</a></section>`);
}



// ==================================================
// HTML: index.html, scan_services.html
// Shared scan service cards
// ==================================================

// BLOCK: serviceCard - Build one scan service card.
function serviceCard(service, compact = false) {
    const link = currentUser?.role === "patient" ? `book_appointment.html?service=${encodeURIComponent(service.id)}` : "login.html";
    return html`<article class="card service-card">
        <div class="service-card-top"><span class="icon-box ${service.code === "CT" ? "pink" : ""}">${icon("scan")}</span>
            <span class="badge ${service.active ? "badge-green" : "badge-gray"}">${service.active ? "Available" : "Inactive"}</span>
        </div>
        <h3>${service.name}</h3><p class="service-description">${service.description}</p>
        <p class="service-meta">${service.referralRequired ? "Referral details required" : "Referral details optional"}</p>
        ${service.active ? html`<a class="${compact ? "text-link" : "button button-secondary"}" href="${link}">Book this scan${icon("arrow")}</a>` : html`<p class="small muted">Currently unavailable for booking.</p>`}
    </article>`;
}



// ==================================================
// HTML: scan_services.html
// Scan service availability
// ==================================================

// BLOCK: renderServices - Show the available scan services.
function renderServices() {
    mount("page-body", html`<div class="stack">
        ${appData.services.length && !appData.services.some(service => service.active) ? html`<div class="notice">${icon("info")}<p>No scan services are currently available for new bookings. Existing service information is shown below.</p></div>` : ""}
        ${appData.services.length ? html`<div class="grid-three">${appData.services.map(service => serviceCard(service))}</div>` : emptyState("No services available", "The centre has no scan services listed at the moment. Please check again later.")}
        <div class="notice">${icon("info")}<p>All scans take place at our single centre. Bring any relevant referral information with you. A scheduled appointment does not guarantee the exact scan start time.</p></div>
    </div>`);
}



// ==================================================
// HTML: login.html, register.html
// Account forms, password visibility and validation
// ==================================================

// BLOCK: passwordField - Build a password field with a visibility button.
function passwordField(id, name, label, autocomplete) {
    const fragment = field(id, name, label, "password", "", { autocomplete, maxLength: 128 });
    const input = fragment.querySelector("input");
    const wrapper = document.createElement("div");
    wrapper.className = "password-wrap";
    input.replaceWith(wrapper);
    wrapper.append(input, html`<button class="password-toggle" id="${id}-toggle" type="button" data-action="toggle-password" data-target="${id}" aria-label="Show ${label.toLowerCase()}" aria-pressed="false">Show</button>`);
    return fragment;
}

// BLOCK: renderAccountPage - Build the login or registration form.
function renderAccountPage() {
    const registration = pageName === "register";
    const setup = pageData.accountMode === "setup";
    mount("app-main", html`<div class="auth-layout">
        <aside class="auth-aside">${brand()}
            <div class="auth-intro"><p class="eyebrow">Welcome to a calmer visit</p><h2>A little planning.<br>A lot less waiting.</h2><p>Your scan appointments and queue updates, together in one simple place.</p>
                <div class="auth-points">
                    <div class="auth-point"><span class="icon-box">${icon("calendar")}</span><span>Book an available scan appointment</span></div>
                    <div class="auth-point"><span class="icon-box">${icon("queue")}</span><span>Keep your digital token close by</span></div>
                    <div class="auth-point"><span class="icon-box">${icon("heart")}</span><span>Follow your turn after checking in</span></div>
                </div>
            </div><p class="small muted">Smart Appointment &amp; Virtual Queue Management System<br>One scanning centre</p>
        </aside>
        <section class="auth-main" id="main-content" tabindex="-1"><div class="auth-panel">
            <a class="text-link" href="index.html">← Back to home</a>
            <h1>${setup ? "Set up your centre." : registration ? "Let’s get you started." : "Good to see you."}</h1><p>${setup ? "Create the first administrator account. This setup is available only once." : registration ? "Create your patient account in a few simple steps." : "Log in to manage your appointments."}</p>
            <div class="feedback" id="page-feedback" role="status" hidden></div>
            <form id="account-form" method="post" novalidate>
                ${registration ? field("account-full-name", "patient_name", "Full name", "text", "", { autocomplete: "name", maxLength: 80 }) : ""}
                ${field("account-email", "email", "Email address", "email", "", { autocomplete: "email", maxLength: 120 })}
                ${registration ? field("account-contact", "contact_number", "Contact number", "tel", "", { autocomplete: "tel" }) : ""}
                ${passwordField("account-password", "password", "Password", registration ? "new-password" : "current-password")}
                ${registration ? passwordField("account-confirm-password", "confirm_password", "Confirm password", "new-password") : ""}
                <button class="button button-primary button-wide" id="account-submit-button" type="submit">${setup ? "Create administrator account" : registration ? "Create account" : "Log in"}${icon("arrow")}</button>
            </form>
            ${setup ? html`<p class="auth-bottom">Use these details to manage your centre after setup.</p>` : html`<p class="auth-bottom">${registration ? "Already have an account?" : "New to Scanova?"} <a class="text-link" href="${registration ? "login.html" : "register.html"}">${registration ? "Log in" : "Create an account"}</a></p>`}
        </div></section>
    </div>`);
    byId("account-form").addEventListener("submit", submitAccountForm);
}

// BLOCK: submitAccountForm - Validate account fields before submitting to the backend.
function submitAccountForm(event) {
    event.preventDefault();
    const registration = pageName === "register";
    const form = event.currentTarget;
    clearFormErrors(form);
    const values = new FormData(form);
    const errors = {};
    const email = String(values.get("email")).trim().toLowerCase();
    const password = String(values.get("password"));

    // BLOCK: Validate email, password and registration fields.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors["account-email"] = "Enter a valid email address."; }
    if (password.length < 8 || password.length > 128) { errors["account-password"] = "Use 8–128 characters."; }
    if (registration) {
        if (String(values.get("patient_name")).trim().length < 2) { errors["account-full-name"] = "Enter your full name."; }
        if (!/^\d{10}$/.test(String(values.get("contact_number")))) { errors["account-contact"] = "Enter a 10-digit contact number."; }
        if (!values.get("confirm_password")) { errors["account-confirm-password"] = "Confirm your password."; }
        else if (password !== values.get("confirm_password")) { errors["account-confirm-password"] = "The passwords do not match."; }
    }

    // BLOCK: Show inline validation errors before submitting.
    if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([id, message]) => setFieldError(id, message));
        byId(Object.keys(errors)[0]).focus();
        return;
    }

    // BLOCK: Submit one-time setup, patient registration or account login.
    submitBackendForm(form, pageData.accountMode === "setup" ? "setup" : registration ? "register" : "login");
}



// ==================================================
// PATIENT BOOKING: Booking and rescheduling
// HTML: book_appointment.html, reschedule_appointment.html
// Validate visible slot information before submitting to Flask.
// Only the backend can reserve a place and issue a token.
// ==================================================

// BLOCK: Current booking and submission state.
let bookingAppointment = null;
let bookingPending = false;

// BLOCK: renderBooking - Build the booking or rescheduling form.
function renderBooking() {
    const rescheduling = pageName === "reschedule_appointment";
    bookingAppointment = null;

    // BLOCK: Load and validate the appointment being rescheduled.
    if (rescheduling) {
        try {
            bookingAppointment = requireAppointmentAccess(appData, new URLSearchParams(location.search).get("id"), true);
            if (!isFutureBooked(bookingAppointment)) { throw new Error("Only future Booked appointments can be rescheduled. The existing booking has been preserved."); }
        } catch (error) {

            // BLOCK: Build the booking form and visit summary.
            mount("page-body", emptyState("Rescheduling unavailable", error.message, getPageRole() === "admin" ? "admin_appointments.html" : "my_appointments.html", "View appointments"));
            return;
        }
    }

    // BLOCK: Choose the initial patient, service and appointment date.
    const patient = getCurrentPatient();
    const currentContext = getAppointmentContext(bookingAppointment);
    const queryService = new URLSearchParams(location.search).get("service");
    const initialService = currentContext.slot?.serviceId || (appData.services.some(service => service.id === queryService && service.active) ? queryService : appData.services.find(service => service.active)?.id) || "";
    const initialDate = currentContext.slot?.date || relativeDate(1);
    mount("page-body", html`<div class="grid-two">
        <section class="card card-padding">
            ${rescheduling ? html`<div class="notice">${icon("calendar")}<p>Current booking: <strong>${currentContext.service.name}</strong><br>${formatDate(currentContext.slot.date)} at ${formatTime(currentContext.slot.time)} · ${bookingAppointment.tokenLabel}<br>Your current booking stays in place until the new slot is confirmed.</p></div><br>` : ""}
            <form id="patient-booking-form" method="post" novalidate>
                ${rescheduling ? "" : html`<section class="form-section"><h2 class="form-section-title"><span class="icon-box">01</span>Patient details</h2>
                    <div class="form-grid">
                        ${field("booking-patient-name", "patient_name", "Patient name", "text", patient?.name || "", { autocomplete: "name", maxLength: 80 })}
                        ${field("booking-age", "age", "Age", "number", patient?.age || "", { min: 1, max: 120 })}
                        ${field("booking-contact", "contact_number", "Contact number", "tel", patient?.contact || "", { autocomplete: "tel" })}
                        ${field("booking-body-part", "body_part", "Body part", "text", "", { maxLength: 100 })}
                    </div>
                </section>`}
                <section class="form-section"><h2 class="form-section-title"><span class="icon-box">${rescheduling ? "01" : "02"}</span>${rescheduling ? "Choose a new appointment" : "Scan & appointment"}</h2>
                    <div class="form-grid">
                        ${selectField("booking-service", "scan_service_id", "Scan service", appData.services.filter(service => service.active || service.id === initialService).map(service => ({ value: service.id, label: service.name })), initialService)}
                        ${field("booking-date", "appointment_date", "Appointment date", "date", initialDate, { min: localDate() })}
                        ${rescheduling ? "" : html`<div class="field-full" id="booking-referral-field">${textAreaField("booking-referral", "referral_details", "Referral details", "", true)}</div>`}
                    </div>
                    <div class="field"><label for="booking-slot">Available time slots</label>
                        <select class="form-input" id="booking-slot" name="slot_id" required aria-describedby="booking-slot-error"></select>
                        <div class="slot-grid" id="booking-slot-grid"></div>
                        <p class="field-error" id="booking-slot-error" aria-live="polite"></p>
                        <p class="field-help">Places shown are remaining / total capacity. Unavailable times cannot be selected.</p>
                    </div>
                </section>
                <div class="form-actions"><a class="text-link" href="${getPageRole() === "admin" ? "admin_appointments.html" : "my_appointments.html"}">← Back to appointments</a>
                    <button class="button button-primary" id="confirm-booking-button" type="submit">${rescheduling ? "Confirm new time" : "Confirm appointment"}${icon("arrow")}</button>
                </div>
            </form>
        </section>
        <aside class="card card-padding summary-card"><p class="eyebrow">Your visit, at a glance</p><h2>Appointment summary</h2><div id="booking-summary"></div>
            <div class="notice">${icon("info")}<p>Your appointment time helps organise your visit. The exact scan start time may vary. Check in at the centre to join the active queue.</p></div>
        </aside>
    </div>`);

    // BLOCK: Connect service, date and slot changes.
    byId("booking-service").disabled = rescheduling;
    byId("booking-date").addEventListener("change", updateBookingSlots);
    byId("booking-service").addEventListener("change", updateBookingSlots);
    byId("booking-slot").addEventListener("change", updateBookingSummary);
    byId("patient-booking-form").addEventListener("submit", submitBookingForm);
    updateBookingSlots();
}

// BLOCK: updateBookingSlots - Refresh available times for the selected service and date.
function updateBookingSlots() {
    const serviceId = byId("booking-service").value;
    const date = byId("booking-date").value;
    const service = appData.services.find(record => record.id === serviceId);
    const referralField = byId("booking-referral-field");
    if (referralField) {
        referralField.hidden = !service?.referralRequired;
        byId("booking-referral").required = Boolean(service?.referralRequired);
    }

    // BLOCK: Find the scheduled times and fill the slot dropdown.
    const slots = appData.slots.filter(slot => slot.serviceId === serviceId && slot.date === date).sort((first, second) => first.time.localeCompare(second.time));
    const select = byId("booking-slot");
    select.replaceChildren(html`<option value="">Select an available time</option>`);
    slots.forEach(slot => {
        const availability = getSlotAvailability(appData, slot.id);
        const option = document.createElement("option");
        option.value = slot.id;
        const isCurrent = slot.id === bookingAppointment?.slotId;
        option.textContent = `${formatTime(slot.time)} · ${isCurrent ? "Current booking" : availability.available ? `${availability.remaining} / ${slot.capacity} places` : availability.reason}`;
        option.disabled = !availability.available || isCurrent;
        select.append(option);
    });

    // BLOCK: Build selectable slot buttons and refresh the summary.
    mount("booking-slot-grid", slots.length ? html`${slots.map(slot => {
        const availability = getSlotAvailability(appData, slot.id);
        const current = slot.id === bookingAppointment?.slotId;
        const fragment = html`<button class="slot-option" id="slot-button-${slot.id}" type="button" data-action="select-slot" data-id="${slot.id}" aria-pressed="false">
            <strong>${formatTime(slot.time)}</strong><small>${current ? "Current booking" : availability.available ? `${availability.remaining} / ${slot.capacity} places` : availability.reason}</small>
        </button>`;
        fragment.querySelector("button").disabled = !availability.available || current;
        return fragment;
    })}` : html`<p class="muted small">No slots scheduled for this date. Try another date.</p>`);
    updateBookingSummary();
}

// BLOCK: updateBookingSummary - Refresh the visit summary and selected slot button.
function updateBookingSummary() {
    const service = appData.services.find(record => record.id === byId("booking-service").value);
    const slot = appData.slots.find(record => record.id === byId("booking-slot").value);
    mount("booking-summary", html`<div class="summary-visual"><span class="icon-box">${icon("scan")}</span><div><h3>${service?.name || "Choose a scan"}</h3><p class="small muted">Scanova · Single scanning centre</p></div></div>
        <dl class="detail-list">
            <div><dt>Date</dt><dd>${formatDate(byId("booking-date").value, true)}</dd></div>
            <div><dt>Time</dt><dd>${slot ? formatTime(slot.time) : "Choose a slot"}</dd></div>
            <div><dt>Referral</dt><dd>${service?.referralRequired ? "Required" : "Optional"}</dd></div>
            <div><dt>Digital token</dt><dd>On confirmation</dd></div>
        </dl>`);
    document.querySelectorAll(".slot-option").forEach(button => {
        const active = button.dataset.id === slot?.id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

// BLOCK: submitBookingForm - Validate and submit a booking or replacement slot.
function submitBookingForm(event) {
    event.preventDefault();
    if (bookingPending) { return; }
    const form = event.currentTarget;
    clearFormErrors(form);
    const values = new FormData(form);

    // BLOCK: Validate a replacement slot or a new booking.
    if (bookingAppointment) {
        const slotId = String(values.get("slot_id") || "");
        const replacement = appData.slots.find(slot => slot.id === slotId);
        const current = getAppointmentContext(bookingAppointment).slot;
        if (!replacement || replacement.id === current?.id || replacement.serviceId !== current?.serviceId || !getSlotAvailability(appData, slotId).available) {
            setFieldError("booking-slot", "Choose an available replacement slot for the same scan.");
            return;
        }
        setHiddenField(form, "appointment_id", bookingAppointment.id);
        setHiddenField(form, "scan_service_id", current.serviceId);
    } else {
        const errors = validateBooking({
            patientName: String(values.get("patient_name") || ""), age: String(values.get("age") || ""),
            contact: String(values.get("contact_number") || ""), bodyPart: String(values.get("body_part") || ""),
            serviceId: String(values.get("scan_service_id") || ""), referral: String(values.get("referral_details") || ""),
            date: String(values.get("appointment_date") || ""), slotId: String(values.get("slot_id") || "")
        }, appData);
        if (Object.keys(errors).length) {
            Object.entries(errors).forEach(([id, message]) => setFieldError(id, message));
            byId(Object.keys(errors)[0])?.focus();
            return;
        }
    }

    // BLOCK: Submit the validated booking and prevent duplicate clicks.
    bookingPending = submitBackendForm(form, bookingAppointment ? "rescheduleAppointment" : "bookAppointment");
    byId("confirm-booking-button").disabled = bookingPending;
}



// ==================================================
// PATIENT RECORDS: Dashboard, appointments and queue
// HTML: patient_dashboard.html, my_appointments.html, appointment_details.html, queue_tracking.html
// Patient lists are scoped by patient ID. Queue markup
// contains anonymous tokens only, never other profiles.
// ==================================================

// BLOCK: statCard - Build one dashboard statistic card.
function statCard(label, value, note, iconName, colour = "") {
    return html`<article class="card stat-card"><div class="stat-top"><p>${label}</p><span class="icon-box ${colour}">${icon(iconName)}</span></div><strong class="stat-number">${value}</strong><p class="stat-note">${note}</p></article>`;
}

// BLOCK: sortedAppointments - Sort appointments by their scheduled date and time.
function sortedAppointments(records, data = appData) {
    return [...records].sort((first, second) => {
        const firstSlot = getAppointmentContext(first, data).slot;
        const secondSlot = getAppointmentContext(second, data).slot;
        return `${firstSlot?.date}${firstSlot?.time}`.localeCompare(`${secondSlot?.date}${secondSlot?.time}`) || first.tokenSequence - second.tokenSequence;
    });
}

// BLOCK: patientAppointments - Select appointments belonging to the current patient.
function patientAppointments() {
    return appData.appointments.filter(record => record.patientId === getCurrentPatient()?.id);
}



// ==================================================
// HTML: patient_dashboard.html
// Patient dashboard and next appointment
// ==================================================

// BLOCK: renderPatientDashboard - Build patient totals, upcoming visit and recent records.
function renderPatientDashboard() {
    const patient = getCurrentPatient();
    const records = patientAppointments();
    const upcoming = sortedAppointments(records.filter(record => {
        const { slot } = getAppointmentContext(record);
        return ["Booked", "Checked In", "In Progress"].includes(record.status) && slot?.date >= localDate();
    }));
    const next = upcoming[0];
    byId("page-heading").hidden = true;
    mount("page-body", html`
        <section class="welcome-card"><div><p class="eyebrow">Your patient dashboard</p><h2>${patient?.name ? `Hi ${patient.name.split(" ")[0]}, welcome back.` : "Welcome to your dashboard."}</h2><p>A little planning today. A smoother visit tomorrow.</p></div><a class="button button-primary" href="book_appointment.html">${icon("cross")}Book an appointment</a></section>
        <div class="stats-grid">
            ${statCard("Upcoming scans", upcoming.length, "Your next visits", "calendar")}
            ${statCard("Completed scans", records.filter(record => record.status === "Completed").length, "Your scan history", "check", "green")}
            ${statCard("Active queue", records.filter(record => ["Checked In", "In Progress"].includes(record.status)).length, "After centre check-in", "queue", "pink")}
            ${statCard("Total appointments", records.length, "Including past bookings", "attendance")}
        </div>
        <div class="grid-two"><section class="card"><div class="card-header"><div><h2>Your next appointment</h2><p>Everything you need for your upcoming visit.</p></div><span class="icon-box">${icon("calendar")}</span></div>
            ${next ? nextAppointmentCard(next) : emptyState("Your next visit starts here", "Book a scan to see your appointment and digital token here.", "book_appointment.html")}
        </section><aside class="card card-padding"><h2>Quick links</h2>
            <a class="quick-link" href="scan_services.html"><span class="icon-box">${icon("scan")}</span><span><strong>Explore scan services</strong><small>Find the scan you need</small></span>${icon("chevron")}</a>
            <a class="quick-link" href="my_appointments.html"><span class="icon-box pink">${icon("attendance")}</span><span><strong>My appointments</strong><small>View and manage your visits</small></span>${icon("chevron")}</a>
            <a class="quick-link" href="queue_tracking.html"><span class="icon-box">${icon("queue")}</span><span><strong>Track my queue</strong><small>Your token and live progress</small></span>${icon("chevron")}</a>
        </aside></div>
        <section class="card record-history"><div class="card-header"><h2>Recent appointments</h2><a class="text-link" href="my_appointments.html">View all${icon("arrow")}</a></div><div id="dashboard-appointments">${appointmentTable(sortedAppointments(records).reverse().slice(0, 4), "patient", true)}</div></section>`);
}

// BLOCK: nextAppointmentCard - Build the upcoming appointment card.
function nextAppointmentCard(appointment) {
    const { service, slot } = getAppointmentContext(appointment);
    return html`<div class="next-appointment"><div class="next-top"><div class="next-service"><span class="icon-box">${icon("scan")}</span><div><h3>${service?.name || "Unavailable service"}</h3><p>${appointment.bodyPart} · Scanova centre</p></div></div>${statusBadge(appointment.status)}</div>
        <dl class="detail-list"><div><dt>Appointment date</dt><dd>${formatDate(slot?.date, true)}</dd></div><div><dt>Scheduled time</dt><dd>${formatTime(slot?.time)}</dd></div></dl>
        <div class="token-strip"><div><p>Your digital token</p><strong>${appointment.tokenLabel}</strong></div><a class="text-link" href="appointment_details.html?id=${appointment.id}">View token${icon("arrow")}</a></div>
        <div class="row-actions"><a class="button button-primary" href="queue_tracking.html?id=${appointment.id}">${icon("queue")}Track my queue</a><a class="button button-secondary" href="appointment_details.html?id=${appointment.id}">View details</a></div>
    </div>`;
}



// ==================================================
// HTML: patient_dashboard.html, my_appointments.html, appointment_details.html, staff_dashboard.html
//       staff_appointments.html, admin_dashboard.html, admin_appointments.html, admin_patients.html
// Shared appointment tables and booking actions
// ==================================================

// BLOCK: appointmentTable - Build the appointment table and row controls.
function appointmentTable(records, mode = "patient", compact = false) {
    if (!records.length) { return emptyState("No appointments to show", "Try another filter, or book an appointment to get started.", mode === "patient" ? "book_appointment.html" : "", "Book an appointment"); }
    return html`<div class="table-wrap"><table><thead><tr>
        ${mode !== "patient" ? html`<th scope="col">Patient</th>` : ""}
        <th scope="col">Scan service</th><th scope="col">Date & time</th><th scope="col">Token</th><th scope="col">Status</th><th scope="col">Actions</th>
    </tr></thead><tbody>${records.map(appointment => {
        const { slot, service } = getAppointmentContext(appointment);
        return html`<tr>
            ${mode !== "patient" ? html`<td><strong>${appointment.patientName}</strong><p class="muted">${appointment.contact} · Age ${appointment.age}</p><p class="muted">${appointment.bodyPart}</p></td>` : ""}
            <td><div class="table-service"><span class="icon-box">${icon("scan")}</span><div><strong>${service?.name || "Unavailable"}</strong><p class="muted">${appointment.bodyPart}</p></div></div></td>
            <td>${formatDate(slot?.date, true)}<p class="muted">${formatTime(slot?.time)}</p></td>
            <td><strong>${appointment.tokenLabel}</strong><p class="muted">${slot?.time || ""}</p></td>
            <td>${statusBadge(appointment.status)}</td>
            <td><div class="row-actions"><a class="button button-secondary button-small" href="appointment_details.html?id=${appointment.id}" aria-label="View ${appointment.tokenLabel} on ${formatDate(slot?.date)}">Details</a>
                ${compact ? "" : appointmentActions(appointment, mode)}
            </div></td>
        </tr>`;
    })}</tbody></table></div>`;
}

// BLOCK: appointmentActions - Build appointment controls for the selected portal.
function appointmentActions(appointment, mode) {
    if (mode === "staff" || mode === "admin") {
        const next = { "Booked": "Checked In", "Checked In": "In Progress", "In Progress": "Completed" }[appointment.status];
        const label = { "Checked In": "Check in patient", "In Progress": "Start scan", "Completed": "Complete scan" }[next];
        const controls = document.createDocumentFragment();
        if (next) {
            const reason = getTransitionReason(appointment, next);
            const button = html`<button class="button button-soft button-small" type="button" id="status-${appointment.id}" data-action="status" data-id="${appointment.id}" data-status="${next}" title="${reason || label}">${label}</button>`;
            button.querySelector("button").disabled = Boolean(reason);
            controls.append(button);
            if (reason) { controls.append(html`<span class="record-meta">${reason}</span>`); }
        }
        if (appointment.status === "Booked") {
            const reason = getTransitionReason(appointment, "No-show");
            const button = html`<button class="button button-secondary button-small" type="button" id="no-show-${appointment.id}" data-action="status" data-id="${appointment.id}" data-status="No-show" title="${reason || "Record absence"}">No-show</button>`;
            button.querySelector("button").disabled = Boolean(reason);
            controls.append(button);
            if (reason) { controls.append(html`<span class="record-meta">${reason}</span>`); }
        }
        if (mode === "staff") { return controls; }
        controls.append(manageBookingActions(appointment));
        return controls;
    }
    return html`<a class="button button-soft button-small" href="queue_tracking.html?id=${appointment.id}">Queue</a>${manageBookingActions(appointment)}`;
}

// BLOCK: manageBookingActions - Build reschedule and cancellation controls.
function manageBookingActions(appointment) {
    if (!isFutureBooked(appointment)) {
        return html`<span class="record-meta">Changes available only for future Booked appointments.</span>`;
    }
    return html`<a class="button button-secondary button-small" href="reschedule_appointment.html?id=${appointment.id}">Reschedule</a>
        <button class="button button-danger button-small" type="button" id="cancel-${appointment.id}" data-action="cancel-appointment" data-id="${appointment.id}">Cancel</button>`;
}



// ==================================================
// HTML: my_appointments.html, staff_appointments.html, admin_appointments.html
// Appointment filters and lists
// ==================================================

// BLOCK: appointmentFilterControls - Build search, date, service and status filters.
function appointmentFilterControls(mode) {
    return html`<div class="filters">
        ${mode === "patient" ? selectField("filter-period", "appointment_period", "Show appointments", [{ value: "all", label: "All appointments" }, { value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }], "all", { required: false }) : field("filter-search", "search", "Search patient or token", "search", "", { required: false })}
        ${mode !== "patient" ? field("filter-date", "appointment_date", "Appointment date", "date", mode === "staff" ? localDate() : "", { required: false }) : ""}
        ${selectField("filter-service", "scan_service_id", "Scan service", serviceChoices(true, mode === "staff" ? getCurrentStaff()?.serviceIds : null), "", { required: false })}
        ${selectField("filter-status", "status", "Status", [{ value: "", label: "All statuses" }, ...statuses.map(status => ({ value: status, label: status }))], "", { required: false })}
    </div>`;
}

// BLOCK: serviceChoices - Build scan service options for dropdowns.
function serviceChoices(includeAll = false, assignedIds = null) {
    const choices = appData.services.filter(service => !assignedIds || assignedIds.includes(service.id)).map(service => ({ value: service.id, label: `${service.name}${service.active ? "" : " (inactive)"}` }));
    return includeAll ? [{ value: "", label: "All scans" }, ...choices] : choices;
}

// BLOCK: renderAppointmentList - Build the appointment filters and results area.
function renderAppointmentList(mode = "patient") {
    if (mode === "patient") { headingAction(html`<a class="button button-primary" href="book_appointment.html">${icon("cross")}Book an appointment</a>`); }
    mount("page-body", html`<section class="card">${appointmentFilterControls(mode)}<div id="appointment-list"></div></section>`);

    // BLOCK: Connect appointment filter changes.
    ["filter-period", "filter-search", "filter-date", "filter-service", "filter-status"].forEach(id => {
        byId(id)?.addEventListener(id === "filter-search" ? "input" : "change", () => updateAppointmentList(mode));
    });
    updateAppointmentList(mode);
}

// BLOCK: updateAppointmentList - Apply the selected appointment filters.
function updateAppointmentList(mode) {
    let records = mode === "patient" ? patientAppointments() : appData.appointments;
    if (mode === "staff") {
        const staff = getCurrentStaff();

        // BLOCK: Apply search, date, service, status and period filters.
        records = records.filter(appointment => staff?.serviceIds.includes(getAppointmentContext(appointment).slot?.serviceId));
    }

    // BLOCK: Read the active search and filter values.
    const query = byId("filter-search")?.value.trim().toLowerCase() || "";
    const date = byId("filter-date")?.value;
    const serviceId = byId("filter-service").value;
    const status = byId("filter-status").value;
    const period = byId("filter-period")?.value;
    records = records.filter(appointment => {
        const { slot } = getAppointmentContext(appointment);
        const text = `${appointment.patientName} ${appointment.token} ${appointment.tokenLabel}`.toLowerCase();
        const timestamp = slot ? new Date(`${slot.date}T${slot.time}`) : null;
        const upcoming = timestamp && timestamp >= new Date() && !["Completed", "Cancelled", "No-show"].includes(appointment.status);
        const past = timestamp && timestamp < new Date();
        return (!query || text.includes(query)) && (!date || slot?.date === date) && (!serviceId || slot?.serviceId === serviceId) && (!status || appointment.status === status) && (period !== "upcoming" || upcoming) && (period !== "past" || past);
    });
    mount("appointment-list", appointmentTable(sortedAppointments(records), mode));
}



// ==================================================
// HTML: appointment_details.html
// Appointment information and printable token
// ==================================================

// BLOCK: renderAppointmentDetails - Build appointment information and the printable token.
function renderAppointmentDetails() {
    const query = new URLSearchParams(location.search);
    let appointment;
    try {
        appointment = requireAppointmentAccess(appData, query.get("id"));
    } catch (error) {
        mount("page-body", emptyState("Appointment unavailable", error.message, `${getPageRole() === "patient" ? "my" : getPageRole()}_appointments.html`, "View appointments"));
        return;
    }
    const { slot, service } = getAppointmentContext(appointment);
    headingAction(html`<button class="button button-secondary" id="print-token-button" type="button" data-action="print">${icon("print")}Print token</button>`);
    mount("page-body", html`<div class="grid-two"><section class="card">
        <div class="card-header"><h2>Patient & appointment details</h2>${statusBadge(appointment.status)}</div>
        <div class="card-padding"><dl class="detail-list">
            <div><dt>Patient name</dt><dd>${appointment.patientName}</dd></div><div><dt>Age</dt><dd>${appointment.age} years</dd></div>
            <div><dt>Contact number</dt><dd>${appointment.contact}</dd></div><div><dt>Scan service</dt><dd>${service?.name || "Unavailable service"}</dd></div>
            <div><dt>Body part</dt><dd>${appointment.bodyPart}</dd></div><div><dt>Appointment date</dt><dd>${formatDate(slot?.date)}</dd></div>
            <div><dt>Scheduled time</dt><dd>${formatTime(slot?.time)}</dd></div><div><dt>Centre</dt><dd>Scanova · Single scanning centre</dd></div>
            <div class="detail-full"><dt>Referral details</dt><dd>${appointment.referral || "Not required / not provided"}</dd></div>
        </dl>
        <div class="form-actions no-print"><div class="row-actions">${getPageRole() === "staff" ? appointmentActions(appointment, "staff") : manageBookingActions(appointment)}</div></div>
        ${appointment.history.length ? html`<section class="record-history"><h3>Booking history</h3>${appointment.history.map(item => html`<p class="record-meta">${item.action} · ${new Date(item.at).toLocaleString()}${item.token ? ` · Previous token: ${item.token}` : ""}</p>`)}</section>` : ""}
        </div>
    </section><aside class="card"><div class="queue-hero"><p class="eyebrow">Your digital token</p><div class="token-large">${appointment.tokenLabel}</div><p>${service?.name}</p><p class="small muted">${formatDate(slot?.date, true)} · ${formatTime(slot?.time)}</p><p class="token-reference">${appointment.token}</p>${statusBadge(appointment.status)}</div>
        <div class="card-padding"><div class="notice">${icon("info")}<p>Keep the full token reference handy. Check in at the centre to join the active queue. Your scheduled time is not a guaranteed scan start time.</p></div>
            ${getPageRole() === "patient" ? html`<br><a class="button button-primary button-wide no-print" href="queue_tracking.html?id=${appointment.id}">${icon("queue")}Track my queue</a>` : ""}
        </div></aside></div>`);
}



// ==================================================
// HTML: queue_tracking.html
// Queue selection, token display and progress
// ==================================================

// BLOCK: renderQueuePage - Build the appointment selector for queue tracking.
function renderQueuePage() {
    headingAction(html`<button class="button button-secondary" id="refresh-queue-button" type="button" data-action="refresh-page">Refresh queue</button>`);
    const records = sortedAppointments(patientAppointments());
    const requestedId = new URLSearchParams(location.search).get("id");

    // BLOCK: Check access to an explicitly requested appointment.
    if (requestedId) {
        try { requireAppointmentAccess(appData, requestedId); }
        catch (error) { mount("page-body", emptyState("Queue unavailable", error.message, "my_appointments.html", "My appointments")); return; }
    }
    if (!records.length) { mount("page-body", emptyState("Your queue will appear here", "Book a scan to get your token, then check in when you arrive.", "book_appointment.html")); return; }

    // BLOCK: Choose the current or next appointment for queue tracking.
    const next = records.find(appointment => {
        const { slot } = getAppointmentContext(appointment);
        return slot?.date >= localDate() && ["Booked", "Checked In", "In Progress"].includes(appointment.status);
    });
    const selected = requestedId || next?.id || records[records.length - 1].id;

    // BLOCK: Build the appointment selector and queue display.
    mount("page-body", html`<div class="card filters no-print">${selectField("queue-appointment", "appointment_id", "Select your appointment", records.map(record => {
        const { slot, service } = getAppointmentContext(record);
        return { value: record.id, label: `${service?.name} · ${formatDate(slot?.date, true)} · ${formatTime(slot?.time)} · ${record.tokenLabel}` };
    }), selected)}</div><br><div id="queue-content" aria-live="polite"></div>`);
    byId("queue-appointment").addEventListener("change", updateQueueDisplay);
    updateQueueDisplay();
}

// BLOCK: updateQueueDisplay - Refresh the current token, queue position and visit stages.
function updateQueueDisplay() {
    const selectedId = byId("queue-appointment")?.value;
    if (!selectedId) { return; }
    const appointment = requireAppointmentAccess(appData, selectedId);
    const { slot, service } = getAppointmentContext(appointment);
    const queue = calculateQueue(appData, appointment);
    const stageIndex = ["Booked", "Checked In", "In Progress", "Completed"].indexOf(appointment.status);
    const descriptions = ["Your appointment and token are confirmed.", "Staff verify your arrival at the centre.", "Your scan is being carried out.", "Your scan visit is complete."];
    mount("queue-content", html`<div class="grid-two"><section class="card"><div class="card-header"><h2>Your place in the queue</h2><span class="small muted">Queue status</span></div>
        <div class="queue-hero"><p class="eyebrow">Your token</p><div class="token-large">${appointment.tokenLabel}</div><p>${service?.name} · ${formatDate(slot?.date, true)}</p><p class="small muted">Scheduled at ${formatTime(slot?.time)}</p><p class="token-reference">${appointment.token}</p>${statusBadge(appointment.status)}</div>
        <div class="queue-stats"><div class="queue-stat"><p>Currently being served</p>${queue.current ? html`<strong>${queue.current.tokenLabel}</strong><p>${formatTime(getAppointmentContext(queue.current).slot.time)}</p>` : html`<strong class="queue-none">No token currently being served</strong>`}</div>
            <div class="queue-stat"><p>Active patients ahead</p><strong>${queue.active ? queue.ahead : "—"}</strong><p>${queue.active ? "In your scan queue" : "Not in active queue"}</p></div>
        </div><div class="card-padding"><div class="notice">${icon("info")}<p>${appointment.status === "Booked" ? "Check in at the centre to join the active queue." : appointment.status === "Completed" ? "Your scan is complete. This token is no longer in the active queue." : ["Cancelled", "No-show"].includes(appointment.status) ? "This appointment is not part of the active queue." : "The queue follows checked-in patients by scheduled time and token order. Your exact scan start time may vary."}</p></div><p class="record-meta">Last updated: ${pageData.updatedAt ? new Date(pageData.updatedAt).toLocaleString() : "When this page loaded"}</p></div>
    </section><aside class="card card-padding"><h2>Your visit, step by step</h2><ol class="progress-list">${["Booked", "Checked In", "In Progress", "Completed"].map((stage, index) => html`<li class="progress-step ${index <= stageIndex ? "is-active" : ""}"><span class="progress-dot">${index < stageIndex ? icon("check") : index + 1}</span><div><strong>${stage}</strong><p>${descriptions[index]}</p></div></li>`)}</ol>
        <div class="notice">${icon("shield")}<p>Only tokens appear in this queue. Other patients’ personal details are not shown.</p></div>
    </aside></div>`);
}



// ==================================================
// HTML: my_appointments.html, appointment_details.html, admin_appointments.html
// Shared cancellation confirmation
// ==================================================

// BLOCK: confirmCancellation - Check cancellation eligibility and open confirmation.
function confirmCancellation(appointmentId) {
    const appointment = requireAppointmentAccess(appData, appointmentId, true);
    if (!isFutureBooked(appointment)) { throw new Error("Only future Booked appointments can be cancelled."); }
    confirmRecordAction("Cancel this appointment?", "The booking will remain in your appointment history after cancellation.", "cancelAppointment", { appointment_id: appointmentId });
}



// ==================================================
// STAFF OPERATIONS: Appointments and attendance
// HTML: staff_dashboard.html, staff_appointments.html, staff_attendance.html
// Service assignments determine visible appointments.
// Staff attendance is separate from patient arrival.
// ==================================================



// ==================================================
// HTML: staff_dashboard.html
// Staff dashboard and assigned activity
// ==================================================

// BLOCK: renderStaffDashboard - Build assigned scan totals and staff shortcuts.
function renderStaffDashboard() {
    const staff = getCurrentStaff() || { id: "", name: "Staff", serviceIds: [] };
    const totals = getDashboardTotals(appData, localDate(), "", staff.id || "unassigned");
    const attendance = appData.attendance.find(record => record.staffId === staff.id && record.date === localDate());
    const appointments = sortedAppointments(appData.appointments.filter(record => {
        const { slot } = getAppointmentContext(record);
        return slot?.date === localDate() && staff.serviceIds.includes(slot.serviceId);
    }));
    headingAction(html`<span class="welcome-date">${icon("calendar")}${formatDate(localDate())}</span>`);
    mount("page-body", html`<section class="welcome-card"><div><p class="eyebrow">Ready for the day</p><h2>Hello, ${staff.name.split(" ")[0]}.</h2><p>Your assigned services: ${staff.serviceIds.map(id => appData.services.find(service => service.id === id)?.name).filter(Boolean).join(", ") || "No services assigned"}.</p></div><a class="button button-primary" href="staff_appointments.html">View appointments${icon("arrow")}</a></section>
        <div class="stats-grid">
            ${statCard("Assigned today", totals.bookings, "Across your assigned scans", "calendar")}
            ${statCard("Waiting patients", totals.waiting, "Arrived and checked in", "queue", "pink")}
            ${statCard("In progress", totals.inProgress, "Scans currently underway", "scan")}
            ${statCard("Completed", totals.completed, "Scans completed today", "check", "green")}
        </div>
        <div class="grid-two"><section class="card"><div class="card-header"><h2>Today’s assigned appointments</h2><a class="text-link" href="staff_appointments.html">View all${icon("arrow")}</a></div>${appointmentTable(appointments, "staff", true)}</section>
            <aside class="card card-padding"><p class="eyebrow">Your workday</p><h2>Staff attendance</h2><div class="summary-visual"><span class="icon-box">${icon("attendance")}</span><div><h3>${attendance ? attendance.checkOut ? "Checked out" : "On duty" : "Not checked in"}</h3><p class="small muted">${formatDate(localDate(), true)}</p></div></div>
                <dl class="detail-list"><div><dt>Staff check-in</dt><dd>${formatTimestamp(attendance?.checkIn)}</dd></div><div><dt>Staff check-out</dt><dd>${formatTimestamp(attendance?.checkOut)}</dd></div></dl>
                <br><a class="button button-secondary button-wide" href="staff_attendance.html">Manage my attendance</a>
            </aside>
        </div>`);
}



// ==================================================
// HTML: staff_attendance.html
// Workday check-in, check-out and personal history
// ==================================================

// BLOCK: renderStaffAttendance - Build workday controls and attendance history.
function renderStaffAttendance() {
    const staff = getCurrentStaff() || { id: "" };
    const today = appData.attendance.find(record => record.staffId === staff.id && record.date === localDate());
    const history = appData.attendance.filter(record => record.staffId === staff.id).sort((first, second) => second.date.localeCompare(first.date));
    mount("page-body", html`<div class="stack"><section class="card"><div class="attendance-clock"><p class="eyebrow">${formatDate(localDate())}</p><div class="clock-value" id="attendance-clock">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        ${statusBadge(today ? today.checkOut ? "Completed" : "Checked In" : "Not checked in")}
        <p class="small muted">Record your staff workday here. Patient arrivals are handled in Assigned appointments.</p>
        <div class="attendance-actions"><button class="button button-primary" id="staff-check-in-button" type="button" data-action="staff-check-in">${icon("attendance")}Check in to work</button><button class="button button-secondary" id="staff-check-out-button" type="button" data-action="staff-check-out">${icon("logout")}Check out of work</button></div>
        <p class="record-meta">${today ? today.checkOut ? "Your workday is recorded. Only one check-in and check-out are allowed per day." : "Your check-in is recorded. You can check out when your workday ends." : "Check in first to enable check-out. Times are recorded when your request is processed."}</p>
        </div><div class="card-padding"><dl class="detail-list"><div><dt>Today’s check-in</dt><dd>${formatTimestamp(today?.checkIn)}</dd></div><div><dt>Today’s check-out</dt><dd>${formatTimestamp(today?.checkOut)}</dd></div></dl></div></section>
        <section class="card"><div class="card-header"><h2>My attendance history</h2><span class="small muted">${history.length} records</span></div>${attendanceTable(history, false)}</section>
    </div>`);
    byId("staff-check-in-button").disabled = Boolean(today);
    byId("staff-check-out-button").disabled = !today || Boolean(today.checkOut);
}



// ==================================================
// HTML: staff_attendance.html, admin_attendance.html
// Shared attendance history table
// ==================================================

// BLOCK: attendanceTable - Build staff attendance rows and correction controls.
function attendanceTable(records, administrative = true) {
    if (!records.length) { return emptyState("No attendance records yet", administrative ? "Staff workday check-ins will appear here. Try another date or staff filter." : "Your attendance history will appear after your first workday check-in."); }
    return html`<div class="table-wrap"><table><thead><tr>${administrative ? html`<th scope="col">Staff member</th>` : ""}<th scope="col">Date</th><th scope="col">Check-in</th><th scope="col">Check-out</th><th scope="col">Status</th><th scope="col">${administrative ? "Corrections" : "Notes"}</th></tr></thead>
        <tbody>${records.map(record => {
            const staff = appData.staff.find(person => person.id === record.staffId);
            return html`<tr>${administrative ? html`<td><strong>${staff?.name || "Unavailable profile"}</strong></td>` : ""}<td>${formatDate(record.date, true)}</td><td>${formatTimestamp(record.checkIn)}</td><td>${formatTimestamp(record.checkOut)}</td><td><span class="badge ${record.checkOut ? "badge-gray" : "badge-green"}">${record.checkOut ? "Checked out" : "Checked in"}</span></td>
                <td>${administrative ? html`<button class="button button-secondary button-small" type="button" id="attendance-edit-${record.id}" data-action="edit-attendance" data-id="${record.id}">Review / correct</button>` : ""}${record.corrections.length ? html`<p class="record-meta">${record.corrections.length} correction(s) · ${record.corrections[record.corrections.length - 1].reason}</p>` : html`<span class="record-meta">Original record</span>`}</td>
            </tr>`;
        })}</tbody></table></div>`;
}



// ==================================================
// ADMIN MANAGEMENT: Services, slots and people
// HTML: admin_scan_services.html, admin_slots.html, admin_patients.html, admin_staff.html
// Referenced services and slots remain in history.
// Editors validate fields and submit changes to backend forms.
// ==================================================



// ==================================================
// HTML: admin_patients.html, admin_staff.html
// Shared patient and staff profile validation
// ==================================================

// BLOCK: validateProfile - Validate patient and staff contact details.
function validateProfile(values) {
    const name = String(values.get("patient_name") || values.get("staff_name") || "").trim();
    const email = String(values.get("email") || "").trim().toLowerCase();
    const contact = String(values.get("contact_number") || "").trim();
    if (name.length < 2 || name.length > 80) { throw new Error("Enter a name with 2–80 characters."); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { throw new Error("Enter a valid email address."); }
    if (!/^\d{10}$/.test(contact)) { throw new Error("Enter a 10-digit contact number."); }
}



// ==================================================
// HTML: admin_scan_services.html
// Scan service management
// ==================================================

// BLOCK: renderAdminServices - Build the scan service management table.
function renderAdminServices() {
    headingAction(html`<button class="button button-primary" id="add-service-button" type="button" data-action="add-service">${icon("cross")}Add scan service</button>`);
    mount("page-body", html`<section class="card"><div class="card-header"><div><h2>Centre scan services</h2><p>Inactive scans keep their history and cannot accept new bookings.</p></div><span class="badge">${appData.services.length} services</span></div>
        ${appData.services.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Service</th><th scope="col">Description</th><th scope="col">Referral</th><th scope="col">Availability</th><th scope="col">Actions</th></tr></thead><tbody>${appData.services.map(service => html`
            <tr><td><strong>${service.name}</strong><p class="muted">${service.code}</p></td><td>${service.description}</td><td>${service.referralRequired ? "Required" : "Optional"}</td><td><span class="badge ${service.active ? "badge-green" : "badge-gray"}">${service.active ? "Active" : "Inactive"}</span></td><td><div class="row-actions"><button class="button button-secondary button-small" id="edit-service-${service.id}" type="button" data-action="edit-service" data-id="${service.id}">Edit</button><button class="button button-soft button-small" id="toggle-service-${service.id}" type="button" data-action="toggle-service" data-id="${service.id}">${service.active ? "Deactivate" : "Activate"}</button></div></td></tr>`)}
        </tbody></table></div>` : emptyState("Add your first scan service", "Use Add scan service to make a scan available at your centre.")}
    </section>`);
}

// BLOCK: editService - Open and validate the scan service editor.
function editService(serviceId = "") {
    const service = appData.services.find(record => record.id === serviceId);
    if (serviceId && !service) { throw new Error("This service is unavailable."); }
    openModal(service ? "Edit scan service" : "Add scan service", html`<form id="record-form" method="post">
        ${field("service-name", "service_name", "Service name", "text", service?.name || "", { maxLength: 80 })}
        ${service ? html`<p class="field-help">Token code: ${service.code}. Existing token references stay unchanged.</p><br>` : field("service-code", "service_code", "Short token code (2–6 letters)", "text", "", { maxLength: 6 })}
        ${textAreaField("service-description", "description", "Service description", service?.description || "")}
        ${selectField("service-referral", "referral_required", "Referral details", [{ value: "yes", label: "Required" }, { value: "no", label: "Optional" }], service?.referralRequired === false ? "no" : "yes")}
        ${selectField("service-active", "active_status", "Availability", [{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }], service?.active === false ? "no" : "yes")}
        ${modalSaveActions(service ? "Save service" : "Add service")}
    </form>`, (values, form) => {
        const name = String(values.get("service_name") || "").trim();
        const description = String(values.get("description") || "").trim();
        const code = service?.code || String(values.get("service_code") || "").trim().toUpperCase();
        if (name.length < 2 || !description) { throw new Error("Enter a service name and description."); }
        if (!/^[A-Z]{2,6}$/.test(code)) { throw new Error("Use 2-6 letters for the token code."); }
        setHiddenField(form, "scan_service_id", serviceId);
        submitBackendForm(form, "saveService");
    });

}

// BLOCK: toggleService - Submit a service activation or deactivation request.
function toggleService(serviceId) {
    const service = appData.services.find(record => record.id === serviceId);
    if (!service) { throw new Error("This service is unavailable."); }
    submitRecordAction("setServiceActive", { scan_service_id: serviceId, active_status: service.active ? "no" : "yes" });
}



// ==================================================
// HTML: admin_slots.html
// Time slot management
// ==================================================

// BLOCK: renderAdminSlots - Build time slot filters and scheduling controls.
function renderAdminSlots() {
    headingAction(html`<button class="button button-primary" id="add-slot-button" type="button" data-action="add-slot">${icon("cross")}Add time slot</button>`);
    mount("page-body", html`<section class="card"><div class="filters">
        ${selectField("slot-filter-service", "scan_service_id", "Scan service", serviceChoices(), appData.services[0]?.id || "")}
        ${field("slot-filter-date", "appointment_date", "Appointment date", "date", localDate())}
    </div><div id="slot-list"></div></section><br><div class="notice">${icon("info")}<p>Reservations are calculated from appointment records. Slots with any appointment history cannot be deleted or have their scheduled time changed.</p></div>`);
    byId("slot-filter-service").addEventListener("change", updateSlotList);
    byId("slot-filter-date").addEventListener("change", updateSlotList);
    updateSlotList();
}

// BLOCK: updateSlotList - Refresh slot capacity, availability and history controls.
function updateSlotList() {
    const serviceId = byId("slot-filter-service").value;
    const date = byId("slot-filter-date").value;
    const slots = appData.slots.filter(record => record.serviceId === serviceId && record.date === date).sort((first, second) => first.time.localeCompare(second.time));
    mount("slot-list", slots.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Scheduled time</th><th scope="col">Capacity</th><th scope="col">Reserved</th><th scope="col">Remaining</th><th scope="col">Availability</th><th scope="col">Actions</th></tr></thead><tbody>${slots.map(slot => {
        const availability = getSlotAvailability(appData, slot.id);
        const hasHistory = appData.appointments.some(record => record.slotId === slot.id || record.history.some(item => item.slotId === slot.id));
        const controls = html`<div class="row-actions"><button class="button button-secondary button-small" type="button" id="edit-slot-${slot.id}" data-action="edit-slot" data-id="${slot.id}">Edit</button><button class="button button-danger button-small" type="button" id="delete-slot-${slot.id}" data-action="delete-slot" data-id="${slot.id}" title="${hasHistory ? "Appointment history must be preserved" : "Delete unused slot"}">Delete</button>${hasHistory ? html`<span class="record-meta">Has appointment history</span>` : ""}</div>`;
        controls.querySelector("[data-action='delete-slot']").disabled = hasHistory;
        return html`<tr><td><strong>${formatTime(slot.time)}</strong></td><td>${slot.capacity}</td><td>${availability.reserved}</td><td>${availability.remaining}</td><td><span class="badge ${availability.available ? "badge-green" : "badge-gray"}">${availability.reason}</span></td><td>${controls}</td></tr>`;
    })}</tbody></table></div>` : emptyState("No time slots for this selection", "Choose another date or add a time slot for this service."));
}

// BLOCK: editSlot - Open and validate the time slot editor.
function editSlot(slotId = "") {
    const slot = appData.slots.find(record => record.id === slotId);
    if (slotId && !slot) { throw new Error("This slot is unavailable."); }
    const serviceId = slot?.serviceId || byId("slot-filter-service").value;
    const date = slot?.date || byId("slot-filter-date").value;
    if (!serviceId || !date) { throw new Error("Choose a scan service and date first."); }
    const service = appData.services.find(record => record.id === serviceId);
    const hasHistory = slot && appData.appointments.some(record => record.slotId === slot.id || record.history.some(item => item.slotId === slot.id));
    openModal(slot ? "Edit time slot" : "Add time slot", html`<p class="small muted">${service?.name} · ${formatDate(date)}</p><br><form id="record-form" method="post">
        <div class="form-grid">${field("slot-time", "scheduled_time", "Scheduled time", "time", slot?.time || "09:00")}${field("slot-capacity", "capacity", "Booking capacity", "number", slot?.capacity || 3, { min: 1, max: 100 })}</div>
        ${hasHistory ? html`<p class="field-help">The time is fixed because this slot has appointment history.</p><br>` : ""}
        ${selectField("slot-open", "open_status", "Booking availability", [{ value: "yes", label: "Open" }, { value: "no", label: "Closed" }], slot?.open === false ? "no" : "yes")}
        ${modalSaveActions(slot ? "Save slot" : "Create slot")}
    </form>`, (values, form) => {
        const time = String(values.get("scheduled_time") || "");
        const capacity = Number(values.get("capacity"));
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { throw new Error("Enter a valid scheduled time."); }
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) { throw new Error("Capacity must be between 1 and 100."); }
        if (!slotId && new Date(date + "T" + time) <= new Date()) { throw new Error("Choose a future date and time."); }
        if (appData.slots.some(record => record.id !== slotId && record.serviceId === serviceId && record.date === date && record.time === time)) { throw new Error("A slot already exists for this service, date and time."); }
        if (slot && capacity < getSlotAvailability(appData, slotId).reserved) { throw new Error("Capacity cannot be lower than the existing reservations."); }
        if (hasHistory && time !== slot.time) { throw new Error("The scheduled time is fixed because this slot has appointment history."); }
        setHiddenField(form, "slot_id", slotId);
        setHiddenField(form, "scan_service_id", serviceId);
        setHiddenField(form, "appointment_date", date);
        submitBackendForm(form, "saveSlot");
    });
    byId("slot-time").readOnly = Boolean(hasHistory);
}

// BLOCK: deleteSlot - Protect slot history and confirm deletion.
function deleteSlot(slotId) {
    if (appData.appointments.some(record => record.slotId === slotId || record.history?.some(item => item.slotId === slotId))) {
        throw new Error("Slots containing appointment history cannot be deleted.");
    }
    confirmRecordAction("Delete this unused slot?", "This removes the unused time slot from the schedule.", "deleteSlot", { slot_id: slotId });
}



// ==================================================
// HTML: admin_patients.html
// Patient records and appointment history
// ==================================================

// BLOCK: renderAdminPatients - Build the patient search and results area.
function renderAdminPatients() {
    mount("page-body", html`<section class="card"><div class="filters">${field("patient-search", "patient_search", "Search patients by name, email or contact", "search", "", { required: false })}</div><div id="patient-list"></div></section>`);
    byId("patient-search").addEventListener("input", updatePatientList);
    updatePatientList();
}

// BLOCK: updatePatientList - Filter patients by name, email or contact.
function updatePatientList() {
    const query = byId("patient-search").value.trim().toLowerCase();
    const patients = appData.patients.filter(patient => `${patient.name} ${patient.email} ${patient.contact}`.toLowerCase().includes(query));
    mount("patient-list", patients.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Patient</th><th scope="col">Email</th><th scope="col">Contact</th><th scope="col">Appointments</th><th scope="col">Actions</th></tr></thead><tbody>${patients.map(patient => html`<tr><td><strong>${patient.name}</strong><p class="muted">${patient.age ? `Age ${patient.age}` : "Age not provided"}</p></td><td>${patient.email}</td><td>${patient.contact}</td><td>${appData.appointments.filter(record => record.patientId === patient.id).length}</td><td><div class="row-actions"><button class="button button-secondary button-small" type="button" id="edit-patient-${patient.id}" data-action="edit-patient" data-id="${patient.id}">Edit profile</button><button class="button button-soft button-small" type="button" id="history-patient-${patient.id}" data-action="patient-history" data-id="${patient.id}">View history</button></div></td></tr>`)}</tbody></table></div>` : emptyState("No matching patients", "Try another name, email or contact number."));
}

// BLOCK: editPatient - Open and validate the patient profile editor.
function editPatient(patientId) {
    const patient = appData.patients.find(record => record.id === patientId);
    if (!patient) { throw new Error("This patient profile is unavailable."); }
    openModal("Edit patient profile", html`<form id="record-form" method="post">
        ${field("patient-edit-name", "patient_name", "Full name", "text", patient.name, { maxLength: 80 })}
        ${field("patient-edit-email", "email", "Email address", "email", patient.email)}
        <div class="form-grid">${field("patient-edit-contact", "contact_number", "Contact number", "tel", patient.contact)}${field("patient-edit-age", "age", "Age", "number", patient.age, { min: 1, max: 120, required: false })}</div>
        <p class="field-help">Existing bookings keep their submitted details and appointment history.</p>${modalSaveActions()}
    </form>`, (values, form) => {
        validateProfile(values);
        const age = String(values.get("age") || "");
        if (age && (!/^\d+$/.test(age) || Number(age) < 1 || Number(age) > 120)) { throw new Error("Age must be between 1 and 120."); }
        setHiddenField(form, "patient_id", patientId);
        submitBackendForm(form, "savePatient");
    });

}

// BLOCK: showPatientHistory - Show a patient appointment history dialog.
function showPatientHistory(patientId) {
    const patient = appData.patients.find(record => record.id === patientId);
    if (!patient) { throw new Error("This patient profile is unavailable."); }
    const records = sortedAppointments(appData.appointments.filter(record => record.patientId === patientId));
    openModal(`${patient.name} · Appointment history`, html`<p class="small muted">${patient.email} · ${patient.contact}</p><br>${appointmentTable(records, "admin", true)}`);
}



// ==================================================
// HTML: admin_staff.html
// Staff profiles and scan assignments
// ==================================================

// BLOCK: renderAdminStaff - Build staff profiles and service assignments.
function renderAdminStaff() {
    headingAction(html`<button class="button button-primary" id="add-staff-button" type="button" data-action="add-staff">${icon("cross")}Add staff profile</button>`);
    mount("page-body", html`<section class="card"><div class="card-header"><div><h2>Your centre team</h2><p>Service assignments determine which appointments a staff member can manage.</p></div></div>
        ${appData.staff.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Staff member</th><th scope="col">Contact</th><th scope="col">Assigned services</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>${appData.staff.map(staff => html`<tr><td><strong>${staff.name}</strong><p class="muted">${staff.email}</p></td><td>${staff.contact}</td><td>${staff.serviceIds.map(id => appData.services.find(service => service.id === id)?.name).filter(Boolean).join(", ") || "No services assigned"}</td><td><span class="badge ${staff.active ? "badge-green" : "badge-gray"}">${staff.active ? "Active" : "Inactive"}</span></td><td><div class="row-actions"><button class="button button-secondary button-small" type="button" id="edit-staff-${staff.id}" data-action="edit-staff" data-id="${staff.id}">Edit</button><button class="button button-soft button-small" type="button" id="toggle-staff-${staff.id}" data-action="toggle-staff" data-id="${staff.id}">${staff.active ? "Deactivate" : "Activate"}</button></div></td></tr>`)}</tbody></table></div>` : emptyState("No staff profiles yet", "Add a staff profile and assign its scan services.")}
    </section>`);
}

// BLOCK: editStaff - Open and validate the staff profile editor.
function editStaff(staffId = "") {
    const staff = appData.staff.find(record => record.id === staffId);
    if (staffId && !staff) { throw new Error("This staff profile is unavailable."); }
    openModal(staff ? "Edit staff profile" : "Add staff profile", html`<form id="record-form" method="post">
        ${field("staff-edit-name", "staff_name", "Full name", "text", staff?.name || "", { maxLength: 80 })}
        ${field("staff-edit-email", "email", "Email address", "email", staff?.email || "")}
        ${field("staff-edit-contact", "contact_number", "Contact number", "tel", staff?.contact || "")}
        ${field("staff-edit-password", "password", staff ? "New password (leave blank to keep current)" : "Staff login password", "password", "", { required: !staff, autocomplete: "new-password", maxLength: 128 })}
        <fieldset class="field"><legend class="field-label">Assigned scan services</legend><div class="service-assignment">${appData.services.map(service => {
            const fragment = html`<label class="checkbox-label" for="staff-service-${service.id}"><input type="checkbox" id="staff-service-${service.id}" name="scan_service_ids" value="${service.id}">${service.name}</label>`;
            fragment.querySelector("input").checked = Boolean(staff?.serviceIds.includes(service.id));
            return fragment;
        })}</div></fieldset>
        ${selectField("staff-edit-active", "active_status", "Profile status", [{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }], staff?.active === false ? "no" : "yes")}
        ${modalSaveActions(staff ? "Save profile" : "Add profile")}
    </form>`, (values, form) => {
        validateProfile(values);

        // BLOCK: Validate staff credentials before saving scan assignments.
        const password = String(values.get("password") || "");
        if ((!staff && !password) || (password && (password.length < 8 || password.length > 128))) { throw new Error("Use a staff password with 8–128 characters."); }
        const serviceIds = values.getAll("scan_service_ids").map(String);
        if (!serviceIds.length || serviceIds.some(id => !appData.services.some(service => service.id === id))) { throw new Error("Assign at least one scan service."); }
        setHiddenField(form, "staff_id", staffId);
        submitBackendForm(form, "saveStaff");
    });

}

// BLOCK: toggleStaff - Submit a staff activation or deactivation request.
function toggleStaff(staffId) {
    const staff = appData.staff.find(record => record.id === staffId);
    if (!staff) { throw new Error("This staff profile is unavailable."); }
    submitRecordAction("setStaffActive", { staff_id: staffId, active_status: staff.active ? "no" : "yes" });
}



// ==================================================
// ADMIN REPORTING: Attendance and daily reports
// HTML: admin_dashboard.html, admin_attendance.html, admin_reports.html
// Corrections preserve original timestamps and a reason.
// Reports and dashboards share getDashboardTotals().
// ==================================================



// ==================================================
// HTML: admin_dashboard.html
// Centre overview and date summaries
// ==================================================

// BLOCK: renderAdminDashboard - Build the centre overview and date control.
function renderAdminDashboard() {
    headingAction(field("summary-date", "summary_date", "Overview date", "date", localDate()));
    mount("page-body", html`<div id="admin-summary"></div><div class="grid-two"><section class="card"><div class="card-header"><div><h2>Activity by scan service</h2><p>Appointments and patient progress for the selected day.</p></div><a class="text-link" href="admin_reports.html">Daily reports${icon("arrow")}</a></div><div id="admin-service-summary"></div></section>
        <aside class="card card-padding"><h2>Manage your centre</h2>
            <a class="quick-link" href="admin_appointments.html"><span class="icon-box">${icon("calendar")}</span><span><strong>All appointments</strong><small>Review bookings and scan progress</small></span>${icon("chevron")}</a>
            <a class="quick-link" href="admin_slots.html"><span class="icon-box pink">${icon("clock")}</span><span><strong>Time slots</strong><small>Schedules and booking capacity</small></span>${icon("chevron")}</a>
            <a class="quick-link" href="admin_attendance.html"><span class="icon-box">${icon("attendance")}</span><span><strong>Staff attendance</strong><small>Review workday records</small></span>${icon("chevron")}</a>
        </aside></div>
        <section class="card record-history"><div class="card-header"><h2>Appointments for this date</h2><a class="text-link" href="admin_appointments.html">Manage appointments${icon("arrow")}</a></div><div id="admin-day-appointments"></div></section>`);
    byId("summary-date").addEventListener("change", updateAdminDashboard);
    updateAdminDashboard();
}

// BLOCK: adminStatCards - Build centre booking and attendance cards.
function adminStatCards(totals) {
    return html`<div class="stats-grid stats-six">
        ${statCard("Total bookings", totals.bookings, "All appointment statuses", "calendar")}
        ${statCard("Waiting patients", totals.waiting, "Checked in at the centre", "queue", "pink")}
        ${statCard("In progress", totals.inProgress, "Scans currently underway", "scan")}
        ${statCard("Completed scans", totals.completed, "Completed on this date", "check", "green")}
        ${statCard("Cancellations", totals.cancelled, "Preserved in booking history", "calendar", "pink")}
        ${statCard("Staff attendance", totals.attendance, `${totals.onDuty} currently checked in`, "attendance", "green")}
    </div>`;
}

// BLOCK: updateAdminDashboard - Refresh the overview for the selected date.
function updateAdminDashboard() {
    const date = byId("summary-date").value;
    mount("admin-summary", adminStatCards(getDashboardTotals(appData, date)));
    mount("admin-service-summary", serviceSummaryTable(date));
    mount("admin-day-appointments", appointmentTable(sortedAppointments(appData.appointments.filter(appointment => getAppointmentContext(appointment).slot?.date === date)), "admin", true));
}



// ==================================================
// HTML: admin_dashboard.html, admin_reports.html
// Shared scan service totals
// ==================================================

// BLOCK: serviceSummaryTable - Build booking totals for each scan service.
function serviceSummaryTable(date, selectedService = "") {
    const services = appData.services.filter(service => !selectedService || service.id === selectedService);
    if (!services.length) { return emptyState("No scan services", "Add a service to begin tracking daily scan activity."); }
    return html`<div class="table-wrap"><table><thead><tr><th scope="col">Scan service</th><th scope="col">Bookings</th><th scope="col">Waiting</th><th scope="col">In progress</th><th scope="col">Completed</th><th scope="col">Cancelled</th></tr></thead><tbody>${services.map(service => {
        const totals = getDashboardTotals(appData, date, service.id);
        return html`<tr><td><strong>${service.name}</strong></td><td>${totals.bookings}</td><td>${totals.waiting}</td><td>${totals.inProgress}</td><td>${totals.completed}</td><td>${totals.cancelled}</td></tr>`;
    })}</tbody></table></div>`;
}



// ==================================================
// HTML: admin_attendance.html
// Attendance review and timestamp corrections
// ==================================================

// BLOCK: renderAdminAttendance - Build staff and date attendance filters.
function renderAdminAttendance() {
    mount("page-body", html`<section class="card"><div class="filters">
        ${selectField("attendance-filter-staff", "staff_id", "Staff member", [{ value: "", label: "All staff" }, ...appData.staff.map(staff => ({ value: staff.id, label: staff.name }))], "", { required: false })}
        ${field("attendance-filter-date", "attendance_date", "Attendance date", "date", "", { required: false })}
    </div><div id="attendance-list"></div></section>`);
    byId("attendance-filter-staff").addEventListener("change", updateAttendanceList);
    byId("attendance-filter-date").addEventListener("change", updateAttendanceList);
    updateAttendanceList();
}

// BLOCK: updateAttendanceList - Filter and sort the attendance records.
function updateAttendanceList() {
    const staffId = byId("attendance-filter-staff").value;
    const date = byId("attendance-filter-date").value;
    const records = appData.attendance.filter(record => (!staffId || record.staffId === staffId) && (!date || record.date === date)).sort((first, second) => second.date.localeCompare(first.date));
    mount("attendance-list", attendanceTable(records));
}

// BLOCK: localDateTimeValue - Convert a timestamp for a local datetime input.
function localDateTimeValue(timestamp) {
    if (!timestamp) { return ""; }
    const date = new Date(timestamp);
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(number => String(number).padStart(2, "0")).join(":");
    return `${localDate(date)}T${time}`;
}

// BLOCK: editAttendance - Open and validate an attendance correction.
function editAttendance(attendanceId) {
    const attendance = appData.attendance.find(record => record.id === attendanceId);
    if (!attendance) { throw new Error("This attendance record is unavailable."); }
    const staff = appData.staff.find(record => record.id === attendance.staffId);
    openModal("Review staff attendance", html`<p class="small muted">${staff?.name} · ${formatDate(attendance.date)}</p><br>
        <form id="record-form" method="post">
            ${field("attendance-edit-check-in", "check_in", "Check-in time", "datetime-local", localDateTimeValue(attendance.checkIn))}
            ${field("attendance-edit-check-out", "check_out", "Check-out time", "datetime-local", localDateTimeValue(attendance.checkOut), { required: false })}
            ${textAreaField("attendance-edit-reason", "correction_reason", "Reason for correction")}
            <p class="field-help">Use local times on the attendance date. Corrections preserve previous timestamps.</p>
            ${modalSaveActions("Save correction")}
        </form>
        ${attendance.corrections.length ? html`<section class="record-history"><h3>Correction history</h3>${attendance.corrections.map(correction => html`<p class="record-meta"><strong>${correction.reason}</strong><br>${new Date(correction.at).toLocaleString()} · Previous: ${formatTimestamp(correction.previousCheckIn)} – ${formatTimestamp(correction.previousCheckOut)}<br>Corrected: ${formatTimestamp(correction.checkIn)} – ${formatTimestamp(correction.checkOut)}</p>`)}</section>` : ""}`, (values, form) => {
        const checkIn = String(values.get("check_in") || "");
        const checkOut = String(values.get("check_out") || "");
        const reason = String(values.get("correction_reason") || "").trim();
        if (reason.length < 5) { throw new Error("Give a correction reason with at least 5 characters."); }
        const validation = validateAttendance(checkIn, checkOut, attendance.date);
        if (validation) { throw new Error(validation); }
        setHiddenField(form, "attendance_id", attendanceId);
        setHiddenField(form, "attendance_date", attendance.date);
        submitBackendForm(form, "correctAttendance");
    });
    byId("attendance-edit-check-in").step = "1";
    byId("attendance-edit-check-out").step = "1";
}



// ==================================================
// HTML: admin_reports.html
// Daily summary and print report
// ==================================================

// BLOCK: renderReports - Build daily report filters and print control.
function renderReports() {
    headingAction(html`<button class="button button-secondary" id="print-report-button" type="button" data-action="print">${icon("print")}Print daily report</button>`);
    mount("page-body", html`<section class="card no-print"><div class="filters">
        ${field("report-date", "report_date", "Report date", "date", localDate())}
        ${selectField("report-service", "scan_service_id", "Scan service", serviceChoices(true), "", { required: false })}
    </div></section><br><div id="report-content"></div>`);
    byId("report-date").addEventListener("change", updateReports);
    byId("report-service").addEventListener("change", updateReports);
    updateReports();
}

// BLOCK: updateReports - Refresh the daily scan and attendance report.
function updateReports() {
    const date = byId("report-date").value;
    const serviceId = byId("report-service").value;
    const service = appData.services.find(record => record.id === serviceId);
    const totals = getDashboardTotals(appData, date, serviceId);
    const attendance = appData.attendance.filter(record => record.date === date);
    mount("report-content", html`<section class="card card-padding"><div class="section-heading"><div><p class="eyebrow">Scanova · Daily activity report</p><h2>${formatDate(date)}</h2><p>${service ? service.name : "All scan services"} · Single scanning centre</p></div><span class="badge">Daily summary</span></div>
        <div class="grid-three">
            <div><div class="report-line"><span>Total bookings</span><strong>${totals.bookings}</strong></div><div class="report-line"><span>Waiting patients</span><strong>${totals.waiting}</strong></div></div>
            <div><div class="report-line"><span>Scans in progress</span><strong>${totals.inProgress}</strong></div><div class="report-line"><span>Completed scans</span><strong>${totals.completed}</strong></div></div>
            <div><div class="report-line"><span>Cancellations</span><strong>${totals.cancelled}</strong></div><div class="report-line"><span>No-shows</span><strong>${totals.noShow}</strong></div></div>
        </div><p class="record-meta">Total bookings include every status. Waiting counts Checked In appointments only.</p>
    </section><br><section class="card"><div class="card-header"><h2>Scan service summary</h2></div>${serviceSummaryTable(date, serviceId)}</section>
    <br><section class="card"><div class="card-header"><div><h2>Centre staff attendance</h2><p>${totals.attendance} staff checked in · ${totals.onDuty} without check-out · Attendance is centre-wide, independent of the scan filter.</p></div></div>${attendanceTableForReport(attendance)}</section>
    <p class="record-meta">Generated ${new Date().toLocaleString()}</p>`);
}

// BLOCK: attendanceTableForReport - Build the printable staff attendance table.
function attendanceTableForReport(records) {
    if (!records.length) { return emptyState("No staff attendance for this date", "No staff check-ins have been recorded for the selected day."); }
    return html`<div class="table-wrap"><table><thead><tr><th scope="col">Staff member</th><th scope="col">Check-in</th><th scope="col">Check-out</th><th scope="col">Corrections</th></tr></thead><tbody>${records.map(record => html`<tr><td>${appData.staff.find(staff => staff.id === record.staffId)?.name || "Unavailable profile"}</td><td>${formatTimestamp(record.checkIn)}</td><td>${formatTimestamp(record.checkOut)}</td><td>${record.corrections.length}</td></tr>`)}</tbody></table></div>`;
}



// ==================================================
// APPLICATION LIFECYCLE: Events and page initialisation
// HTML: All 21 templates (shared code)
// Initialise views from server records. No timers or browser
// storage simulate account access, saved records or scan activity.
// ==================================================

// BLOCK: handleSharedAction - Handle buttons through their data-action values.
function handleSharedAction(event) {
    const control = event.target.closest("[data-action]");
    if (!control || control.disabled) { return; }
    const action = control.dataset.action;
    const recordId = control.dataset.id;
    try {
        switch (action) {

            // BLOCK: toggle-password - Show or hide a password.
            case "toggle-password": {
                const input = byId(control.dataset.target);
                const visible = input.type === "password";
                input.type = visible ? "text" : "password";
                control.textContent = visible ? "Hide" : "Show";
                control.setAttribute("aria-pressed", String(visible));
                control.setAttribute("aria-label", (visible ? "Hide" : "Show") + " password");
                break;
            }

            // BLOCK: close-dialog - Close the active dialog.
            case "close-dialog": byId("app-dialog").close(); break;

            // BLOCK: select-slot - Select a booking time slot.
            case "select-slot":
                byId("booking-slot").value = recordId;
                setFieldError("booking-slot", "");
                updateBookingSummary();
                break;

            // BLOCK: cancel-appointment - Confirm appointment cancellation.
            case "cancel-appointment": confirmCancellation(recordId); break;

            // BLOCK: status - Submit an appointment status change.
            case "status": {
                const appointment = appData.appointments.find(record => record.id === recordId);
                if (!appointment) { throw new Error("Appointment unavailable."); }
                const reason = getTransitionReason(appointment, control.dataset.status);
                if (reason) { throw new Error(reason); }
                submitRecordAction("updateAppointmentStatus", { appointment_id: recordId, status: control.dataset.status });
                break;
            }

            // BLOCK: staff-check-in - Submit staff workday check-in.
            case "staff-check-in": submitRecordAction("staffCheckIn"); break;

            // BLOCK: staff-check-out - Submit staff workday check-out.
            case "staff-check-out": submitRecordAction("staffCheckOut"); break;

            // BLOCK: add-service - Open a new scan service form.
            case "add-service": editService(); break;

            // BLOCK: edit-service - Open an existing scan service.
            case "edit-service": editService(recordId); break;

            // BLOCK: toggle-service - Change scan service availability.
            case "toggle-service": toggleService(recordId); break;

            // BLOCK: add-slot - Open a new time slot form.
            case "add-slot": editSlot(); break;

            // BLOCK: edit-slot - Open an existing time slot.
            case "edit-slot": editSlot(recordId); break;

            // BLOCK: delete-slot - Confirm deletion of an unused slot.
            case "delete-slot": deleteSlot(recordId); break;

            // BLOCK: edit-patient - Open the patient profile editor.
            case "edit-patient": editPatient(recordId); break;

            // BLOCK: patient-history - Open patient appointment history.
            case "patient-history": showPatientHistory(recordId); break;

            // BLOCK: add-staff - Open a new staff profile form.
            case "add-staff": editStaff(); break;

            // BLOCK: edit-staff - Open an existing staff profile.
            case "edit-staff": editStaff(recordId); break;

            // BLOCK: toggle-staff - Change staff profile status.
            case "toggle-staff": toggleStaff(recordId); break;

            // BLOCK: edit-attendance - Review an attendance correction.
            case "edit-attendance": editAttendance(recordId); break;

            // BLOCK: refresh-page - Reload queue data from the server.
            case "refresh-page": window.location.reload(); break;

            // BLOCK: print - Print the token or report.
            case "print": window.print(); break;
        }
    } catch (error) {
        showToast(error.message, true);
    }
}

// BLOCK: initialisePage - Load backend data and render the selected HTML page.
function initialisePage() {
    try {
        pageData = readPageData();
        appData = getPageRecords(pageData.records);
        currentUser = pageData.currentUser || null;

        // BLOCK: Choose the account or portal page renderer.
        if (["login", "register"].includes(pageName)) {
            renderAccountPage();
        } else {
            if (pageName === "index" || (pageName === "scan_services" && !currentUser)) {
                renderPublicNavigation();
            } else {
                renderPortalNavigation();
            }
            const pageInitialisers = {
                index: renderHome,
                patient_dashboard: renderPatientDashboard,
                scan_services: renderServices,
                book_appointment: renderBooking,
                reschedule_appointment: renderBooking,
                my_appointments: () => renderAppointmentList("patient"),
                appointment_details: renderAppointmentDetails,
                queue_tracking: renderQueuePage,
                staff_dashboard: renderStaffDashboard,
                staff_appointments: () => renderAppointmentList("staff"),
                staff_attendance: renderStaffAttendance,
                admin_dashboard: renderAdminDashboard,
                admin_scan_services: renderAdminServices,
                admin_slots: renderAdminSlots,
                admin_appointments: () => renderAppointmentList("admin"),
                admin_patients: renderAdminPatients,
                admin_staff: renderAdminStaff,
                admin_attendance: renderAdminAttendance,
                admin_reports: renderReports
            };
            pageInitialisers[pageName]?.();
        }
        byId("page-body")?.setAttribute("aria-busy", "false");
        if (pageData.feedback?.message) { showFeedback(pageData.feedback.message, Boolean(pageData.feedback.isError)); }
    } catch (error) {
        showFeedback(error.message, true);
        mount("page-body", emptyState("This page could not load", "Please reload the page or return to the home page.", "index.html", "Back to home"));
        byId("page-body")?.setAttribute("aria-busy", "false");
    }
}

// BLOCK: Shared button click listener.
document.addEventListener("click", handleSharedAction);

// BLOCK: Escape key listener for mobile navigation.
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && byId("portal-sidebar")?.classList.contains("is-open")) {
        closeMobileNavigation();
    }
});

// BLOCK: Start the page after the deferred script loads.
initialisePage();
