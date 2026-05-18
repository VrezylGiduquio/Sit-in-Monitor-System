const token = localStorage.getItem("userToken");
const nav = document.getElementById("navLinks");
const content = document.getElementById("content");
const welcomeText = document.getElementById("welcomeText");

if (!token) {
  window.location.href = "login-user.html";
}

function logout() {
  localStorage.removeItem("userToken");
  window.location.href = "login-user.html";
}

function renderNav() {
  if (!nav) return;

  nav.innerHTML = `
    <button onclick="goTo('home')">Home</button>
    <button onclick="goTo('profile')">Profile</button>
    <button onclick="goTo('sessions')">My Sessions</button>
    <button onclick="goTo('reservation')">Reservation</button>
  `;
}

function goTo(page) {
    
     if (page === "reservation") {
    window.location.href = "reservation.html";
    return;
  }

  if (!content) return;

  if (page === "home") {
    content.innerHTML = "<h2>Dashboard Home</h2><p>Welcome to your dashboard.</p>";
  }

  if (page === "profile") {
    content.innerHTML = "<h2>Profile</h2><p>Your student details will appear here.</p>";
  }

  if (page === "sessions") {
    content.innerHTML = "<h2>My Sessions</h2><p>Your sit-in sessions will appear here.</p>";
  }

  if (page === "reservation") {
    console.log('asdasd')
      window.location.href = "reservation.html";
    ;
  }
}

const API = "http://localhost:3000/api/students";

async function fetchMyData() {
  try {
    const res = await fetch(`${API}/me`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (res.status === 401 || res.status === 403) {
      return logout();
    }

    const data = await res.json();
    console.log("MY DATA:", data);

    // Fill UI
    document.getElementById("studentName").textContent =
      data.first_name + " " + data.last_name;

    document.getElementById("studentId").textContent =
      data.student_id;

    document.getElementById("studentCourse").textContent =
      data.course;

    document.getElementById("studentYear").textContent =
      data.year_level;

    localStorage.setItem("student_id", data.student_id);   

  } catch (err) {
    console.error(err);
  }
}

async function loadRemainingSessions() {
  try {
    const token = localStorage.getItem("userToken"); // Get the saved token
    if (!token) return logout(); // No token, force logout

    const res = await fetch(`/api/students/me`, {
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (res.status === 401 || res.status === 403) {
      // Token invalid or expired
      return logout();
    }

    const data = await res.json();
    const remaining = data.remaining_sessions || 0;

    const elem = document.getElementById("remainingSessions");
    if (elem) {
      elem.innerText = `Remaining Sessions: ${remaining}`;
    }
  } catch (err) {
    console.error("Failed to load remaining sessions:", err);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  loadRemainingSessions();
});


renderNav();
goTo("home");
fetchMyData();