const table = document.getElementById("reservationTable");
const modal = document.getElementById("reservationModal");
const modalMessage = document.getElementById("modalMessage");
const historyTable = document.getElementById("historyTable");
const reservationStatusBadge = document.getElementById("reservationStatusBadge");
const reservationStatusText = document.getElementById("reservationStatusText");
const reserveSitInButton = document.getElementById("reserveSitInButton");
const purposeField = document.getElementById("purpose");
const roomField = document.getElementById("room");
const dateField = document.getElementById("date");
const timePeriodField = document.getElementById("time_period");
const startTimeField = document.getElementById("start_time");
const endTimeField = document.getElementById("end_time");

const token = localStorage.getItem("userToken");
let studentId = localStorage.getItem("userStudentId") || localStorage.getItem("student_id") || "";
let reservationEnabled = true;
let reservationsCache = [];
let scheduleSlotsCache = [];
const purposeRoomMap = {
  Research: ["524", "526"],
  "Project Development": ["526", "530", "544"],
  "Assignment / Lab Activity": ["524", "528", "530"],
  "Thesis / Capstone": ["542", "544"],
  "Programming Practice": ["526", "528", "542"]
};

localStorage.setItem("activeRole", "student");

if (!token) {
  window.location.href = "login-user.html";
}

async function loadCurrentStudent() {
  if (studentId) return studentId;

  try {
    const res = await fetch("/api/students/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return "";
    }

    const data = await res.json();
    studentId = data.student_id || "";

    if (studentId) {
      localStorage.setItem("userStudentId", studentId);
      localStorage.setItem("student_id", studentId);
    }

    return studentId;
  } catch (err) {
    console.error("Error loading student profile:", err);
    return "";
  }
}

function renderReservationState() {
  const hasActiveReservation = reservationsCache.some((reservation) =>
    ["pending", "approved", "ongoing"].includes(String(reservation.status || "").toLowerCase())
  );
  const canReserve = reservationEnabled && !hasActiveReservation;

  if (reservationStatusBadge) {
    reservationStatusBadge.textContent = canReserve
      ? "Reservation Open"
      : hasActiveReservation
        ? "Active Reservation Found"
        : "Reservation Closed";
    reservationStatusBadge.classList.toggle("enabled", canReserve);
    reservationStatusBadge.classList.toggle("disabled", !canReserve);
  }

  if (reservationStatusText) {
    reservationStatusText.textContent = !reservationEnabled
      ? "Reservations are temporarily disabled by the administrator. Please check back again later."
      : hasActiveReservation
        ? "You already have a pending or ongoing reservation. Finish or terminate that session before booking another one."
        : "Submit a sit-in request for software work, project tasks, or laboratory activities.";
  }

  if (reserveSitInButton) {
    reserveSitInButton.disabled = !canReserve;
    reserveSitInButton.textContent = !reservationEnabled
      ? "Reservations Disabled"
      : hasActiveReservation
        ? "Reservation Locked"
        : "Reserve Sit-in";
  }
}

async function loadReservationSetting() {
  try {
    const res = await fetch("/api/settings/reservation");
    const data = await res.json();
    reservationEnabled = Boolean(data.enabled);
  } catch (err) {
    console.error("Error loading reservation setting:", err);
    reservationEnabled = true;
  } finally {
    renderReservationState();
  }
}

async function loadScheduleSlots() {
  const purpose = purposeField?.value;
  const room = roomField?.value;
  const date = dateField?.value;

  if (!startTimeField) return;

  startTimeField.innerHTML = `<option value="">${date ? "Loading schedule..." : "Select date first"}</option>`;
  if (endTimeField) endTimeField.value = "";
  scheduleSlotsCache = [];
  modalMessage.innerText = "";

  if (!purpose || !room || !date) {
    startTimeField.innerHTML = `<option value="">Select purpose, room, and date first</option>`;
    return;
  }

  try {
    const params = new URLSearchParams({ purpose, room, date });
    const res = await fetch(`/api/reservations/schedule?${params.toString()}`);
    const data = await res.json();

    if (!data.success) {
      startTimeField.innerHTML = `<option value="">${data.message || "No schedule available"}</option>`;
      modalMessage.style.color = "red";
      modalMessage.innerText = data.message || "No schedule available.";
      return;
    }

    if (!Array.isArray(data.slots) || !data.slots.length) {
      startTimeField.innerHTML = `<option value="">${data.message || "No schedule available"}</option>`;
      modalMessage.style.color = "red";
      modalMessage.innerText = data.message || "No schedule available for the selected date.";
      return;
    }

    modalMessage.innerText = "";
    scheduleSlotsCache = data.slots;
    renderScheduleOptions();
  } catch (err) {
    console.error("Error loading schedule:", err);
    startTimeField.innerHTML = `<option value="">Unable to load schedule</option>`;
    modalMessage.style.color = "red";
    modalMessage.innerText = "Unable to load schedule.";
  }
}

function getSlotPeriod(startTime) {
  const [hours] = String(startTime || "").split(":").map(Number);
  if (Number.isNaN(hours)) return "";
  return hours < 12 ? "morning" : "afternoon";
}

function renderScheduleOptions() {
  if (!startTimeField) return;

  const selectedPeriod = timePeriodField?.value || "";
  if (!selectedPeriod) {
    startTimeField.innerHTML = `<option value="">Select morning or afternoon first</option>`;
    if (endTimeField) endTimeField.value = "";
    return;
  }

  const filteredSlots = scheduleSlotsCache.filter((slot) => getSlotPeriod(slot.start_time) === selectedPeriod);
  if (!filteredSlots.length) {
    startTimeField.innerHTML = `<option value="">No ${selectedPeriod} schedule available</option>`;
    if (endTimeField) endTimeField.value = "";
    return;
  }

  startTimeField.innerHTML = [
    `<option value="">Select ${selectedPeriod} time</option>`,
    ...filteredSlots.map((slot) => `<option value="${slot.start_time}" data-end-time="${slot.end_time}">${slot.label}</option>`)
  ].join("");

  if (endTimeField) endTimeField.value = "";
}

function getSelectedPeriodSlots() {
  const selectedPeriod = timePeriodField?.value || "";
  if (!selectedPeriod) return [];
  return scheduleSlotsCache.filter((slot) => getSlotPeriod(slot.start_time) === selectedPeriod);
}

function showSelectedPeriodSchedule() {
  const selectedPeriod = timePeriodField?.value || "";

  if (!selectedPeriod) return;

  if (!roomField?.value || !dateField?.value) {
    alert("Please select a room and date first.");
    return;
  }

  const filteredSlots = getSelectedPeriodSlots();
  if (!filteredSlots.length) {
    alert(`No ${selectedPeriod} schedule available for the selected room and date.`);
    return;
  }

  const scheduleLines = filteredSlots.map(
    (slot) => `${slot.start_time} - ${slot.end_time}`
  );

  alert(
    `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} schedule:\n${scheduleLines.join("\n")}`
  );
}

function applySelectedSchedule() {
  const selectedOption = startTimeField?.selectedOptions?.[0];
  const endTime = selectedOption?.dataset?.endTime || "";
  if (endTimeField) {
    endTimeField.value = endTime;
  }
}

function setMinimumReservationDate() {
  if (!dateField) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  dateField.min = `${year}-${month}-${day}`;
}

function resetScheduleSelection(message = "Select room, date, and session first") {
  if (timePeriodField) timePeriodField.value = "";
  if (startTimeField) startTimeField.innerHTML = `<option value="">${message}</option>`;
  if (endTimeField) endTimeField.value = "";
  scheduleSlotsCache = [];
}

function updateRoomOptions() {
  if (!roomField) return;

  const selectedPurpose = purposeField?.value || "";
  const allowedRooms = purposeRoomMap[selectedPurpose] || [];

  roomField.innerHTML = [
    `<option value="">${selectedPurpose ? "Select Recommended Room" : "Select Purpose First"}</option>`,
    ...allowedRooms.map((room) => `<option value="${room}">Lab ${room}</option>`)
  ].join("");

  resetScheduleSelection();
}

// Open/close modal
function openModal() {
  const hasActiveReservation = reservationsCache.some((reservation) =>
    ["pending", "approved", "ongoing"].includes(String(reservation.status || "").toLowerCase())
  );

  if (!reservationEnabled) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "Reservations are currently disabled by the admin.";
    return;
  }

  if (hasActiveReservation) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "You already have an active reservation.";
    return;
  }

  modal.style.display = "block";
  loadScheduleSlots();
}

function closeModal() {
  modal.style.display = "none";
  modalMessage.innerText = "";
  if (purposeField) purposeField.value = "";
  updateRoomOptions();
  if (dateField) dateField.value = "";
  resetScheduleSelection();
}

// Load reservations
async function loadReservations() {
  try {
    const currentStudentId = await loadCurrentStudent();
    if (!currentStudentId) {
      if (table) table.innerHTML = `<tr><td colspan="5" style="text-align:center">Unable to load student account</td></tr>`;
      return;
    }

    const res = await fetch(`/api/reservations/my/${currentStudentId}`);
    const data = await res.json();

    if (!table) return;

    table.innerHTML = "";
    reservationsCache = Array.isArray(data) ? data : [];
    renderReservationState();

    if (!data || data.length === 0) {
      table.innerHTML = `<tr><td colspan="5" style="text-align:center">No reservations yet</td></tr>`;
      return;
    }

    data.forEach((reservation) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${reservation.purpose}</td>
        <td>${reservation.room}</td>
        <td>${reservation.date}</td>
        <td>${reservation.start_time} - ${reservation.end_time}</td>
        <td>${reservation.status}</td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading reservations:", err);
  }
}

// Submit new reservation
async function submitReservation() {
  const currentStudentId = await loadCurrentStudent();
  const purpose = purposeField.value.trim();
  const room = roomField.value;
  const date = dateField.value;
  const start_time = startTimeField.value;
  const end_time = endTimeField.value;
  const hasActiveReservation = reservationsCache.some((reservation) =>
    ["pending", "approved", "ongoing"].includes(String(reservation.status || "").toLowerCase())
  );

  if (!currentStudentId) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "Unable to find your student account. Please log in again.";
    return;
  }

  if (!purpose || !room || !date || !start_time || !end_time) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "Please fill all fields";
    return;
  }

  if (!reservationEnabled) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "Reservations are currently disabled by the admin.";
    return;
  }

  if (hasActiveReservation) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "You already have an active reservation.";
    return;
  }

  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: currentStudentId,
        purpose,
        room,
        date,
        start_time,
        end_time,
      }),
    });

    const data = await res.json();

    if (data.success) {
      modalMessage.style.color = "green";
      modalMessage.innerText = data.message;
      loadReservations();
      setTimeout(closeModal, 1500);
    } else {
      modalMessage.style.color = "red";
      modalMessage.innerText = data.message; // Will show "Maximum sessions reached!" if no sessions left
    }
  } catch (err) {
    console.error(err);
    modalMessage.style.color = "red";
    modalMessage.innerText = "Server error";
  }
}

async function loadHistory() {
  try {
    const currentStudentId = await loadCurrentStudent();
    if (!currentStudentId) {
      if (historyTable) historyTable.innerHTML = `<tr><td colspan="4" style="text-align:center">Unable to load student account</td></tr>`;
      return;
    }

    const res = await fetch(`/api/reservations/terminated/${currentStudentId}`);
    const data = await res.json();

    if (!historyTable) return;

    historyTable.innerHTML = "";

    if (!data || data.length === 0) {
      historyTable.innerHTML = `<tr><td colspan="4" style="text-align:center">No history found</td></tr>`;
      return;
    }

    data.forEach(r => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${r.purpose}</td>
        <td>${r.room}</td>
        <td>${r.date}</td>
        <td>${r.start_time} - ${r.end_time}</td>
      `;

      historyTable.appendChild(row);
    });

  } catch (err) {
    console.error("Error loading history:", err);
  }
}



function logout() {
  // Remove stored token or student ID
  localStorage.removeItem("userToken");       
  localStorage.removeItem("student_id");       
  localStorage.removeItem("userStudentId");  
  window.location.href = "login-user.html";
}

// Close modal if clicked outside
window.onclick = (event) => {
  if (event.target === modal) closeModal();
};

// Load reservations on page load
document.addEventListener("DOMContentLoaded", () => {
  setMinimumReservationDate();
  updateRoomOptions();
  purposeField?.addEventListener("change", updateRoomOptions);
  roomField?.addEventListener("change", loadScheduleSlots);
  dateField?.addEventListener("change", loadScheduleSlots);
  timePeriodField?.addEventListener("change", () => {
    renderScheduleOptions();
    showSelectedPeriodSchedule();
  });
  startTimeField?.addEventListener("change", applySelectedSchedule);
  loadReservationSetting();
  loadCurrentStudent().then(() => {
    loadReservations();
    loadHistory();
  });
});
