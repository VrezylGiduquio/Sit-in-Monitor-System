const API = "http://localhost:3000/api/students";
const token = localStorage.getItem("token");
const table = document.getElementById("table");
const searchInput = document.getElementById("searchInput");

//  Redirect if not logged in
if (!token) {
  window.location.href = "login.html";
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// Fetch all students
async function fetchStudents() {
  try {
    const res = await fetch(API, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (res.status === 403 || res.status === 401) return logout();

    const data = await res.json();
    console.log("DATA:", data);

    // Store in a global variable for search/filter
    window.studentsData = data;

    renderTable(data);
  } catch (err) {
    console.error(err);
  }
}

// Render table
function renderTable(students) {
  table.innerHTML = students.map(s => `
    <tr>
      <td>${s.student_id}</td>
      <td>${s.name}</td>
      <td>${s.year_level}</td>
      <td>${s.course}</td>
      <td>${s.remaining_sessions}</td>
      <td>
        <button onclick="openEditModal('${s.student_id}')">Edit</button>
        <button onclick="deleteStudent('${s.student_id}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

// Add new student
async function addStudent() {
  const student_id = prompt("Enter Student ID:");

  if (!student_id) return;

  await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      student_id
    })
  });

  fetchStudents();
}

// Search function
function searchStudents() {
  const query = searchInput.value.toLowerCase();
  const filtered = window.studentsData.filter(s =>
    s.student_id.toLowerCase().includes(query) ||
    s.name?.toLowerCase().includes(query)
  );

  renderTable(filtered);
}


async function editStudent(student_id, currentSessions) {
  const newSessions = prompt("Enter new remaining sessions:", currentSessions);

  if (newSessions === null) return;

  await fetch(`${API}/${student_id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      remaining_sessions: newSessions
    })
  });

  fetchStudents();
}

async function deleteStudent(student_id) {
  const confirmDelete = confirm("Are you sure you want to delete this student?");

  if (!confirmDelete) return;

  await fetch(`${API}/${student_id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  fetchStudents();
}


const editModal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editForm = document.getElementById("editForm");

function openEditModal(student_id) {
  // Find student data
  const student = window.studentsData.find(s => s.student_id === student_id);
  if (!student) return;

  // Fill popup inputs
  document.getElementById("edit_student_id").value = student.student_id;
  document.getElementById("edit_first_name").value = student.first_name || "";
  document.getElementById("edit_last_name").value = student.last_name || "";
  document.getElementById("edit_middle_name").value = student.middle_name || "";
  document.getElementById("edit_course_level").value = student.year_level || "";
  document.getElementById("edit_course").value = student.course || "";
  document.getElementById("edit_email").value = student.email || "";
  document.getElementById("edit_remaining_sessions").value = student.remaining_sessions;

  // Show pop up
  editModal.style.display = "block";
}

// Close pop up
closeModal.onclick = () => editModal.style.display = "none";
window.onclick = (e) => {
  if (e.target === editModal) editModal.style.display = "none";
};

editForm.onsubmit = async (e) => {
  e.preventDefault();

  const student_id = document.getElementById("edit_student_id").value;
  const payload = {
    first_name: document.getElementById("edit_first_name").value,
    last_name: document.getElementById("edit_last_name").value,
    middle_name: document.getElementById("edit_middle_name").value,
    course_level: document.getElementById("edit_course_level").value,
    course: document.getElementById("edit_course").value,
    email: document.getElementById("edit_email").value,
    remaining_sessions: parseInt(document.getElementById("edit_remaining_sessions").value)
  };

  // Send PUT request
  const res = await fetch(`${API}/${student_id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Updated:", data);

  editModal.style.display = "none";
  fetchStudents(); // refresh table
};

// Initial load
fetchStudents();