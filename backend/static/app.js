const API_URL = "/api/employees";

const REGEX = {
    name: /^[A-Za-z\s'\-]{2,80}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^\+?[0-9\s\-()]{10,18}$/
};

const ALLOWED_ROLES = ["AI/ML Engineer", "Software Engineer", "Frontend Developer", "Data Analyst", "Product Manager", "HR Specialist", "UI/UX Designer"];

document.addEventListener("DOMContentLoaded", () => {
    loadEmployees();
    
    document.getElementById("employeeForm").addEventListener("submit", handleRegister);
    document.getElementById("editForm").addEventListener("submit", handleUpdate);
    document.getElementById("closeModal").addEventListener("click", () => document.getElementById("editModal").classList.add("hidden"));
    
    // Address Character Counter
    document.getElementById("address").addEventListener("input", (e) => {
        document.getElementById("addressCounter").textContent = `${e.target.value.length} / 500`;
    });

    // Search input debouncer
    document.getElementById("searchInput").addEventListener("input", debounce(loadEmployees, 300));
    
    setupLiveValidation();
});

// Toast alert notification banner
function showToast(msg, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = `toast ${isError ? "error" : "success"}`;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3500);
}

// Validation Visual UI Modifier
function toggleError(fieldId, errorText = "") {
    const group = document.getElementById(`group-${fieldId}`);
    const errorSpan = document.getElementById(`err-${fieldId}`);
    if (!group || !errorSpan) return;

    if (errorText) {
        group.classList.add("has-error");
        errorSpan.textContent = errorText;
    } else {
        group.classList.remove("has-error");
        errorSpan.textContent = "";
    }
}

// DOB Age Evaluator
const getAge = (dobString) => {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    return (m < 0 || (m === 0 && today.getDate() < dob.getDate())) ? age - 1 : age;
};

// Input Gatekeeper validations
function validateField(id) {
    toggleError(id);
    const val = document.getElementById(id)?.value?.trim() || "";

    if (id === "fullName" && (!val || !REGEX.name.test(val))) {
        toggleError("fullName", "Name must be 2–80 letters (no numbers).");
        return false;
    }
    if (id === "email" && (!val || !REGEX.email.test(val))) {
        toggleError("email", "Please enter a valid work email address.");
        return false;
    }
    if (id === "phone" && (!val || val.replace(/\D/g, "").length < 10 || !REGEX.phone.test(val))) {
        toggleError("phone", "Enter a valid phone number (10–15 digits).");
        return false;
    }
    if (id === "dob") {
        if (!val) { toggleError("dob", "Date of birth is required."); return false; }
        const age = getAge(val);
        if (age < 18 || age > 75) { toggleError("dob", "Employee must be between 18 and 75 years old."); return false; }
    }
    if (id === "jobTitle" && (!val || !ALLOWED_ROLES.includes(val))) {
        toggleError("jobTitle", "Please select a valid job title.");
        return false;
    }
    if (id === "gender" && !document.querySelector('input[name="gender"]:checked')) {
        toggleError("gender", "Please select a gender option.");
        return false;
    }
    if (id === "termsAccepted" && !document.getElementById("termsAccepted").checked) {
        toggleError("termsAccepted", "Verification confirmation is mandatory.");
        return false;
    }
    return true;
}

function setupLiveValidation() {
    ["fullName", "email", "phone", "dob", "jobTitle", "address"].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener("blur", () => validateField(id));
        el.addEventListener("input", () => {
            if (document.getElementById(`group-${id}`)?.classList.contains("has-error")) validateField(id);
        });
    });
    document.querySelectorAll('input[name="gender"]').forEach(r => r.addEventListener("change", () => validateField("gender")));
    document.getElementById("termsAccepted").addEventListener("change", () => validateField("termsAccepted"));
}

function validateAll() {
    return ["fullName", "email", "phone", "dob", "jobTitle", "gender", "termsAccepted"].map(validateField).every(status => status === true);
}

// 1. CREATE (POST)
async function handleRegister(e) {
    e.preventDefault();
    if (!validateAll()) return showToast("Please correct highlighted fields.", true);

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;

    const payload = {
        full_name: document.getElementById("fullName").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        phone: document.getElementById("phone").value.trim(),
        date_of_birth: document.getElementById("dob").value,
        job_title: document.getElementById("jobTitle").value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        address: document.getElementById("address").value.trim() || null,
        terms_accepted: document.getElementById("termsAccepted").checked
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(" | ") : data.detail || "Registration failed");

        showToast("Employee registered successfully!");
        document.getElementById("employeeForm").reset();
        document.getElementById("addressCounter").textContent = "0 / 500";
        loadEmployees();
    } catch (err) {
        showToast(err.message, true);
    } finally {
        submitBtn.disabled = false;
    }
}

// 2. READ (GET)
async function loadEmployees() {
    const search = document.getElementById("searchInput").value.trim();
    const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
    try {
        const res = await fetch(url);
        const data = await res.json();
        renderTable(data);
    } catch (err) {
        showToast("Could not retrieve employee list.", true);
    }
}

function renderTable(employees) {
    const tbody = document.getElementById("employeeTableBody");
    if (!employees || employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">No employees found.</td></tr>`;
        return;
    }
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td><strong>${emp.full_name}</strong> <span class="badge badge-gender">${emp.gender}</span></td>
            <td><div>${emp.email}</div><small style="color: #64748b;">${emp.phone}</small></td>
            <td><span class="badge">${emp.job_title}</span></td>
            <td>${emp.date_of_birth}</td>
            <td>
                <button class="btn-edit" onclick="openEditModal(${emp.id})">Edit</button>
                <button class="btn-delete" onclick="deleteEmployee(${emp.id})">Delete</button>
            </td>
        </tr>
    `).join("");
}

// 3. READ SINGLE (Populate edit inputs)
async function openEditModal(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const emp = await res.json();
        document.getElementById("editEmpId").value = emp.id;
        document.getElementById("editFullName").value = emp.full_name;
        document.getElementById("editPhone").value = emp.phone;
        document.getElementById("editJobTitle").value = emp.job_title;
        document.getElementById("editModal").classList.remove("hidden");
    } catch (err) {
        showToast("Failed to load details.", true);
    }
}

// 4. UPDATE (PUT)
async function handleUpdate(e) {
    e.preventDefault();
    const id = document.getElementById("editEmpId").value;
    const payload = {
        full_name: document.getElementById("editFullName").value.trim(),
        phone: document.getElementById("editPhone").value.trim(),
        job_title: document.getElementById("editJobTitle").value
    };

    if (!REGEX.name.test(payload.full_name) || payload.phone.replace(/\D/g, "").length < 10) {
        return showToast("Please enter a valid name and phone number.", true);
    }

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Update failed");
        showToast("Details updated!");
        document.getElementById("editModal").classList.add("hidden");
        loadEmployees();
    } catch (err) {
        showToast(err.message, true);
    }
}

// 5. DELETE (DELETE)
async function deleteEmployee(id) {
    if (!confirm("Delete this record permanently?")) return;
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        showToast("Employee deleted.");
        loadEmployees();
    } catch (err) {
        showToast("Deletion failed.", true);
    }
}

// Debounce timer
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
