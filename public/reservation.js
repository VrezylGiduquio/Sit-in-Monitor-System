const table = document.getElementById("reservationTable");
const modal = document.getElementById("reservationModal");
const modalMessage = document.getElementById("modalMessage");
const historyTable = document.getElementById("historyTable");
const reservationStatusBadge = document.getElementById("reservationStatusBadge");
const reservationStatusText = document.getElementById("reservationStatusText");
const reserveSitInButton = document.getElementById("reserveSitInButton");

const token = localStorage.getItem("userToken");
let studentId = localStorage.getItem("userStudentId") || localStorage.getItem("student_id") || "";
let reservationEnabled = true;
let reservationsCache = [];

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
}

function closeModal() {
  modal.style.display = "none";
  modalMessage.innerText = "";
  document.getElementById("purpose").value = "";
  document.getElementById("room").value = "";
  document.getElementById("date").value = "";
  document.getElementById("start_time").value = "";
  document.getElementById("end_time").value = "";
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
  const purpose = document.getElementById("purpose").value;
  const room = document.getElementById("room").value;
  const date = document.getElementById("date").value;
  const start_time = document.getElementById("start_time").value;
  const end_time = document.getElementById("end_time").value;
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

  if (start_time >= end_time) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "End time must be later than start time.";
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
  loadReservationSetting();
  loadCurrentStudent().then(() => {
    loadReservations();
    loadHistory();
  });
});
