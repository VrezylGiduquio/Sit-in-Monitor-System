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
    content.innerHTML = "<h2>Reservation</h2><p>Reserve your sit-in schedule here.</p>";
  }
}

renderNav();
goTo("home");