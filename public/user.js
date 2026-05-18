const token = localStorage.getItem("userToken");
const nav = document.getElementById("navLinks");
const API = "/api/students";
let profilePhotoData = "";
let announcementRefreshTimer;
let lastAnnouncementSignature = "";
let rulesRefreshTimer;
let lastRulesSignature = "";
let dashboardRefreshTimer;

const DEFAULT_STATS = {
  totalHours: "0hs",
  sessions: "0",
  averageDuration: "0 mins",
  longestSession: "0 mins"
};

if (!token) {
  window.location.href = "login-user.html";
}

function logout() {
  localStorage.removeItem("userToken");
  localStorage.removeItem("student_id");
  localStorage.removeItem("userStudentId");
  window.location.href = "login-user.html";
}

function getDefaultProfileImage() {
  return "./img/empty-pic.jpg";
}

function resizeProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => reject(new Error("Unable to read image file."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

async function parseJsonResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON but received ${contentType || "unknown content type"} (${res.status})`);
  }

  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Invalid JSON response (${res.status})`);
  }
}

function renderNav() {
  if (!nav) return;

  nav.innerHTML = `
    <button class="sidebar-link active" onclick="window.location.href='user.html'"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
    <button class="sidebar-link" onclick="window.location.href='reservation.html'"><i class="fa-solid fa-calendar-check"></i><span>Reservations</span></button>
    <button class="sidebar-link" onclick="window.location.href='sessions.html'"><i class="fa-solid fa-table-list"></i><span>My Sessions</span></button>
    <button class="sidebar-link" onclick="window.location.href='software-lab.html'"><i class="fa-solid fa-desktop"></i><span>Software / Lab</span></button>
  `;
}

function openProfileModal() {
  document.getElementById("profileModal").style.display = "block";
  document.getElementById("profileMessage").textContent = "";
}

function closeProfileModal() {
  document.getElementById("profileModal").style.display = "none";
  document.getElementById("profileMessage").textContent = "";
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLabAvailability(items = []) {
  const container = document.getElementById("labAvailability");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <article class="availability-card availability-empty">
        <div class="availability-top">
          <h4>No lab software uploaded</h4>
          <span class="status-chip limited">Empty</span>
        </div>
        <p>The admin can add software and lab availability from the dashboard upload tool.</p>
        <strong>Waiting for inventory</strong>
      </article>
    `;
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="availability-card">
      <div class="availability-top">
        <h4>${item.room}</h4>
        <span class="status-chip ${item.status.toLowerCase()}">${item.status}</span>
      </div>
      <p>${item.software}</p>
      <strong>${item.seats}</strong>
    </article>
  `).join("");
}

async function loadLabAvailability() {
  try {
    const res = await fetch("/api/software");
    const data = await res.json();
    renderLabAvailability(data.success && Array.isArray(data.items) ? data.items : []);
  } catch (err) {
    console.error("Failed to load lab availability:", err);
    renderLabAvailability([]);
  }
}

function renderStudentAnnouncements(items = []) {
  const container = document.getElementById("studentAnnouncements");
  if (!container) return;

  const signature = JSON.stringify(items.map((item) => [item.id, item.title, item.message, item.created_at]));
  if (signature === lastAnnouncementSignature) return;
  lastAnnouncementSignature = signature;

  if (!items.length) {
    container.innerHTML = `
      <article class="announcement-card announcement-empty">
        No announcements from admin yet.
      </article>
    `;
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="announcement-card">
      <div class="announcement-card-top">
        <strong>${item.title}</strong>
        <span>${new Date(item.created_at).toLocaleDateString()}</span>
      </div>
      <p>${item.message}</p>
    </article>
  `).join("");
}

async function loadAnnouncements() {
  if (!document.getElementById("studentAnnouncements")) return;

  try {
    const res = await fetch("/api/announcements");
    const data = await res.json();
    renderStudentAnnouncements(data.success && Array.isArray(data.announcements) ? data.announcements : []);
  } catch (err) {
    console.error("Failed to load announcements:", err);
    renderStudentAnnouncements([]);
  }
}

function startAnnouncementRefresh() {
  if (!document.getElementById("studentAnnouncements")) return;

  window.clearInterval(announcementRefreshTimer);
  announcementRefreshTimer = window.setInterval(loadAnnouncements, 15000);
}

function renderStudentRules(items = []) {
  const list = document.getElementById("studentRules");
  if (!list) return;

  const signature = JSON.stringify(items.map((item) => [item.id, item.title, item.description, item.rule_text, item.created_at]));
  if (signature === lastRulesSignature) return;
  lastRulesSignature = signature;

  if (!items.length) {
    list.innerHTML = `<li class="announcement-empty">No lab rules posted yet.</li>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <li>
      <strong>${item.title || "Lab Rule"}</strong>
      <p>${item.description || item.rule_text}</p>
    </li>
  `).join("");
}

async function loadRules() {
  if (!document.getElementById("studentRules")) return;

  try {
    const res = await fetch("/api/rules");
    const data = await res.json();
    renderStudentRules(data.success && Array.isArray(data.rules) ? data.rules : []);
  } catch (err) {
    console.error("Failed to load rules:", err);
    renderStudentRules([]);
  }
}

function startRulesRefresh() {
  if (!document.getElementById("studentRules")) return;

  window.clearInterval(rulesRefreshTimer);
  rulesRefreshTimer = window.setInterval(loadRules, 15000);
}

function getReservationEnabled() {
  return document.getElementById("reservationStatusBadge")?.dataset.enabled === "true";
}

function applyReservationState(enabled) {
  const badge = document.getElementById("reservationStatusBadge");
  const reserveNowBtn = document.getElementById("reserveNowBtn");
  const openReservationBtn = document.getElementById("openReservationBtn");

  if (badge) {
    badge.dataset.enabled = String(enabled);
    badge.textContent = enabled ? "Reservation is enabled" : "Reservation is currently disabled by admin";
    badge.className = `status-pill ${enabled ? "enabled" : "disabled"}`;
  }

  [reserveNowBtn, openReservationBtn].forEach((button) => {
    if (button) button.disabled = !enabled;
  });
}

async function loadReservationSetting() {
  try {
    const res = await fetch("/api/settings/reservation");
    const data = await res.json();
    applyReservationState(Boolean(data.enabled));
  } catch (err) {
    console.error("Failed to load reservation setting:", err);
    applyReservationState(true);
  }
}

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return "Pending";

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const totalMinutes = ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);

  if (Number.isNaN(totalMinutes) || totalMinutes <= 0) return "Pending";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function formatSummaryMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours && mins) return `${hours}h ${mins} mins`;
  if (hours) return `${hours}hs`;
  return `${mins} mins`;
}

function calculateStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_STATS;

  const durations = rows
    .map((row) => {
      const [startHour, startMinute] = String(row.start_time || "").split(":").map(Number);
      const [endHour, endMinute] = String(row.end_time || "").split(":").map(Number);
      const diff = ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);
      return Number.isNaN(diff) || diff <= 0 ? 0 : diff;
    })
    .filter(Boolean);

  if (durations.length === 0) return DEFAULT_STATS;

  const totalMinutes = durations.reduce((sum, value) => sum + value, 0);
  const averageMinutes = Math.round(totalMinutes / durations.length);
  const longestMinutes = Math.max(...durations);
  const totalHours = (totalMinutes / 60).toFixed(1).replace(".0", "");

  return {
    totalHours: `${totalHours}hs`,
    sessions: `${rows.length}`,
    averageDuration: formatSummaryMinutes(averageMinutes),
    longestSession: formatSummaryMinutes(longestMinutes)
  };
}

function renderStats(stats) {
  if (document.getElementById("totalSitHours")) document.getElementById("totalSitHours").textContent = stats.totalHours;
  if (document.getElementById("numSessions")) document.getElementById("numSessions").textContent = stats.sessions;
  if (document.getElementById("avgDuration")) document.getElementById("avgDuration").textContent = stats.averageDuration;
  if (document.getElementById("longestSession")) document.getElementById("longestSession").textContent = stats.longestSession;
}

function renderTopHours(rows) {
  const rank = document.getElementById("topHoursRank");
  const label = document.getElementById("topHoursLabel");
  const value = document.getElementById("topHoursValue");
  const breakdown = document.getElementById("topHoursBreakdown");

  if (!rank || !label || !value || !breakdown) return;

  if (!rows.length) {
    rank.textContent = "--";
    label.textContent = "No completed sit-in sessions yet";
    value.textContent = "Your activity highlights will appear here once sessions are completed.";
    breakdown.innerHTML = `<li><span>No activity yet</span><strong>--</strong></li>`;
    return;
  }

  const totalsByDate = rows.reduce((acc, row) => {
    const date = row.date || "Unknown";
    const [startHour, startMinute] = String(row.start_time || "").split(":").map(Number);
    const [endHour, endMinute] = String(row.end_time || "").split(":").map(Number);
    const diff = ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);
    const minutes = Number.isNaN(diff) || diff <= 0 ? 0 : diff;
    acc[date] = (acc[date] || 0) + minutes;
    return acc;
  }, {});

  const sortedDays = Object.entries(totalsByDate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const totalMinutes = rows.reduce((sum, row) => {
    const [startHour, startMinute] = String(row.start_time || "").split(":").map(Number);
    const [endHour, endMinute] = String(row.end_time || "").split(":").map(Number);
    const diff = ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);
    return sum + (Number.isNaN(diff) || diff <= 0 ? 0 : diff);
  }, 0);

  rank.textContent = "TOP";
  label.textContent = "Highest-activity days";
  value.textContent = `${(totalMinutes / 60).toFixed(1).replace(".0", "")} total hours logged`;
  breakdown.innerHTML = sortedDays.map(([date, minutes]) => `
    <li><span>${date}</span><strong>${formatSummaryMinutes(minutes)}</strong></li>
  `).join("");
}

function renderSessions(rows) {
  const table = document.getElementById("sessionsTable");
  if (!table) return;

  if (!rows.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center">No completed sessions found.</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${row.date || "-"}</td>
      <td>${row.start_time || "-"}</td>
      <td>${row.end_time || "-"}</td>
      <td>${formatDuration(row.start_time, row.end_time)}</td>
      <td>PC-${String((index % 18) + 1).padStart(2, "0")}</td>
      <td><span class="table-badge ${row.status === "terminated" ? "done" : "pending"}">${row.status || "Pending"}</span></td>
    </tr>
  `).join("");
}

async function fetchMyData() {
  try {
    const res = await fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) return logout();

    const data = await res.json();
    const fullName = `${data.first_name} ${data.last_name}`.trim();

    if (document.getElementById("studentName")) document.getElementById("studentName").textContent = fullName || "Student";
    if (document.getElementById("studentId")) document.getElementById("studentId").textContent = data.student_id || "-";
    if (document.getElementById("studentCourse")) document.getElementById("studentCourse").textContent = data.course || "-";
    if (document.getElementById("studentYear")) document.getElementById("studentYear").textContent = data.year_level || "-";
    if (document.getElementById("remainingSessions")) document.getElementById("remainingSessions").textContent = data.remaining_sessions ?? 0;
    if (document.getElementById("studentAddress")) document.getElementById("studentAddress").textContent = data.address || "-";
    if (document.getElementById("welcomeHeading")) document.getElementById("welcomeHeading").textContent = `Welcome back, ${data.first_name || "Student"}`;
    profilePhotoData = data.profile_photo || "";
    if (document.getElementById("profileImage")) document.getElementById("profileImage").src = profilePhotoData || getDefaultProfileImage();
    if (document.getElementById("profilePreview")) document.getElementById("profilePreview").src = profilePhotoData || getDefaultProfileImage();

    if (document.getElementById("editFirstName")) document.getElementById("editFirstName").value = data.first_name || "";
    if (document.getElementById("editLastName")) document.getElementById("editLastName").value = data.last_name || "";
    if (document.getElementById("editMiddleName")) document.getElementById("editMiddleName").value = data.middle_name || "";
    if (document.getElementById("editYearLevel")) document.getElementById("editYearLevel").value = data.year_level || "";
    if (document.getElementById("editCourse")) document.getElementById("editCourse").value = data.course || "";
    if (document.getElementById("editEmail")) document.getElementById("editEmail").value = data.email || "";
    if (document.getElementById("editAddress")) document.getElementById("editAddress").value = data.address || "";

    localStorage.setItem("student_id", data.student_id || "");
    localStorage.setItem("userStudentId", data.student_id || "");
  } catch (err) {
    console.error("Failed to load student profile:", err);
  }
}

async function loadSessionsAndStats() {
  const studentId = localStorage.getItem("student_id") || localStorage.getItem("userStudentId");

  if (!studentId) {
    renderSessions([]);
    renderStats(DEFAULT_STATS);
    renderTopHours([]);
    return;
  }

  try {
    const res = await fetch(`/api/reservations/terminated/${studentId}`);
    const rows = await res.json();
    const records = Array.isArray(rows) ? rows : [];

    renderSessions(records);
    renderStats(calculateStats(records));
    renderTopHours(records);
  } catch (err) {
    console.error("Failed to load sessions:", err);
    renderSessions([]);
    renderStats(DEFAULT_STATS);
    renderTopHours([]);
  }
}

async function refreshStudentDashboard() {
  await Promise.all([
    loadLabAvailability(),
    loadAnnouncements(),
    loadRules(),
    loadReservationSetting()
  ]);

  // Avoid overwriting in-progress edits while the profile modal is open.
  if (document.getElementById("profileModal")?.style.display !== "block") {
    await fetchMyData();
  }

  await loadSessionsAndStats();
}

function startDashboardRefresh() {
  window.clearInterval(dashboardRefreshTimer);
  dashboardRefreshTimer = window.setInterval(() => {
    refreshStudentDashboard().catch((err) => {
      console.error("Failed to refresh student dashboard:", err);
    });
  }, 15000);
}

function bindActions() {
  ["reserveNowBtn", "openReservationBtn"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      if (!getReservationEnabled()) return;
      window.location.href = "reservation.html";
    });
  });

  document.getElementById("editProfileBtn")?.addEventListener("click", openProfileModal);
  document.getElementById("closeProfileModal")?.addEventListener("click", closeProfileModal);
  document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);

  document.getElementById("profilePhotoInput")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const profileMessage = document.getElementById("profileMessage");

    try {
      profilePhotoData = await resizeProfilePhoto(file);
      document.getElementById("profilePreview").src = profilePhotoData || getDefaultProfileImage();
      if (profileMessage) profileMessage.textContent = "";
    } catch (err) {
      console.error("Failed to prepare profile photo:", err);
      profilePhotoData = "";
      document.getElementById("profilePreview").src = getDefaultProfileImage();
      if (profileMessage) profileMessage.textContent = "Unable to use that photo. Please choose another image.";
    }
  });
}

async function saveProfile() {
  const payload = {
    first_name: document.getElementById("editFirstName").value.trim(),
    last_name: document.getElementById("editLastName").value.trim(),
    middle_name: document.getElementById("editMiddleName").value.trim(),
    course_level: document.getElementById("editYearLevel").value,
    course: document.getElementById("editCourse").value,
    email: document.getElementById("editEmail").value.trim(),
    address: document.getElementById("editAddress").value.trim(),
    profile_photo: profilePhotoData
  };

  const profileMessage = document.getElementById("profileMessage");

  try {
    const res = await fetch(`${API}/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) return logout();

    const data = await parseJsonResponse(res);
    if (!data.success) {
      profileMessage.textContent = data.message || "Failed to save profile.";
      return;
    }

    profileMessage.textContent = "Profile updated successfully.";
    await fetchMyData();
    setTimeout(closeProfileModal, 800);
  } catch (err) {
    console.error("Failed to save profile:", err);
    profileMessage.textContent = "Failed to save profile.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNav();
  await refreshStudentDashboard();
  startAnnouncementRefresh();
  startRulesRefresh();
  startDashboardRefresh();
  bindActions();
});

window.addEventListener("click", (event) => {
  if (event.target === document.getElementById("profileModal")) {
    closeProfileModal();
  }
});
