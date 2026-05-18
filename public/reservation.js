const table = document.getElementById("reservationTable");
const modal = document.getElementById("reservationModal");
const modalMessage = document.getElementById("modalMessage");
const historyTable = document.getElementById("historyTable");

const studentId = localStorage.getItem("userStudentId") || "9999";

// Open/close modal
function openModal() {
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
    const res = await fetch(`/api/reservations/my/${studentId}`);
    const data = await res.json();

    if (!table) return;

    table.innerHTML = "";

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
  const purpose = document.getElementById("purpose").value;
  const room = document.getElementById("room").value;
  const date = document.getElementById("date").value;
  const start_time = document.getElementById("start_time").value;
  const end_time = document.getElementById("end_time").value;

  if (!purpose || !room || !date || !start_time || !end_time) {
    modalMessage.style.color = "red";
    modalMessage.innerText = "Please fill all fields";
    return;
  }

  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
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
    const res = await fetch(`/api/reservations/terminated/${studentId}`);
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
  localStorage.removeItem("userStudentId");  
  window.location.href = "login-user.html";
}

// Close modal if clicked outside
window.onclick = (event) => {
  if (event.target === modal) closeModal();
};

// Load reservations on page load
document.addEventListener("DOMContentLoaded", () => {
  loadReservations(); 
  loadHistory();      
});