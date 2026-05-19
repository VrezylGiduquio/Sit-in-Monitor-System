const adminToken = localStorage.getItem("token");
const studentToken = localStorage.getItem("userToken");
const roleFromUrl = new URLSearchParams(window.location.search).get("role");
const activeRole = localStorage.getItem("activeRole");
const resolvedRole = roleFromUrl === "student" || roleFromUrl === "admin"
  ? roleFromUrl
  : activeRole;
const isStudentView = resolvedRole === "student" ? true : resolvedRole === "admin" ? false : Boolean(studentToken && !adminToken);
const token = isStudentView ? studentToken : (adminToken || studentToken);
const currentStudentId = localStorage.getItem("userStudentId") || localStorage.getItem("student_id") || "";
let leaderboardEvents;
let leaderboardPollingTimer;

if (!token) {
  window.location.href = isStudentView ? "login-user.html" : "login.html";
}

function logout() {
  if (isStudentView) {
    localStorage.setItem("activeRole", "student");
    localStorage.removeItem("userToken");
    localStorage.removeItem("student_id");
    localStorage.removeItem("userStudentId");
    localStorage.removeItem("activeRole");
    window.location.href = "login-user.html";
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("activeRole");
  window.location.href = "login.html";
}

function goTo(page) {
  if (isStudentView) {
    const studentRoutes = {
      home: "user.html",
      reservation: "reservation.html",
      sessions: "sessions.html",
      software: "software-lab.html",
      leaderboard: "leaderboard.html?role=student"
    };

    window.location.href = studentRoutes[page] || "user.html";
    return;
  }

  if (page === "home") {
    window.location.href = "admin.html";
    return;
  }

  window.location.href = `${page}.html`;
}

async function parseJsonResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON but received ${contentType || "unknown content type"} (${res.status})`);
  }

  return JSON.parse(rawText);
}

function renderLayout() {
  const sidebar = document.getElementById("leaderboardSidebar");
  const panelTitle = document.getElementById("panelTitle");
  const nav = document.getElementById("leaderboardNav");
  const kicker = document.getElementById("leaderboardKicker");

  if (!nav) return;

  if (isStudentView) {
    if (sidebar) sidebar.classList.remove("sidebar-admin");
    if (panelTitle) panelTitle.textContent = "Student Panel";
    if (kicker) kicker.textContent = "Student Workspace";

    nav.innerHTML = `
      <button class="sidebar-link" onclick="goTo('home')"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
      <button class="sidebar-link" onclick="goTo('reservation')"><i class="fa-solid fa-calendar-check"></i><span>Reservations</span></button>
      <button class="sidebar-link" onclick="goTo('sessions')"><i class="fa-solid fa-table-list"></i><span>My Sessions</span></button>
      <button class="sidebar-link" onclick="goTo('software')"><i class="fa-solid fa-desktop"></i><span>Software / Lab</span></button>
      <button class="sidebar-link active" onclick="goTo('leaderboard')"><i class="fa-solid fa-trophy"></i><span>Leaderboard</span></button>
    `;
    return;
  }

  if (sidebar) sidebar.classList.add("sidebar-admin");
  if (panelTitle) panelTitle.textContent = "Admin Panel";
  if (kicker) kicker.textContent = "Administrator";

  nav.innerHTML = `
    <button class="sidebar-link" onclick="goTo('home')"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
    <button class="sidebar-link" onclick="goTo('students')"><i class="fa-solid fa-users"></i><span>Students</span></button>
    <button class="sidebar-link" onclick="goTo('sitin')"><i class="fa-solid fa-calendar-check"></i><span>Reservations</span></button>
    <button class="sidebar-link" onclick="goTo('view-records')"><i class="fa-solid fa-file-lines"></i><span>View Records</span></button>
    <button class="sidebar-link" onclick="goTo('reports')"><i class="fa-solid fa-file-export"></i><span>Reports</span></button>
    <button class="sidebar-link active" onclick="goTo('leaderboard')"><i class="fa-solid fa-trophy"></i><span>Leaderboard</span></button>
    <button class="sidebar-link" onclick="goTo('analytics')"><i class="fa-solid fa-chart-pie"></i><span>Analytics</span></button>
    <button class="sidebar-link" onclick="goTo('software')"><i class="fa-solid fa-upload"></i><span>Software</span></button>
    <button class="sidebar-link" onclick="goTo('ai-recommendation')"><i class="fa-solid fa-wand-magic-sparkles"></i><span>AI Recommendation</span></button>
  `;
}

function renderSummary(summary = {}) {
  const studentCount = document.getElementById("leaderboardStudentCount");
  const totalHours = document.getElementById("leaderboardTotalHours");
  const sessions = document.getElementById("leaderboardSessions");
  const averageHours = document.getElementById("leaderboardAverageHours");

  if (studentCount) studentCount.textContent = summary.rankedStudents ?? 0;
  if (totalHours) totalHours.textContent = summary.totalHoursLabel || "0h";
  if (sessions) sessions.textContent = summary.totalSessions ?? 0;
  if (averageHours) averageHours.textContent = summary.averageHoursLabel || "0h";
}

function renderPodium(podium = []) {
  const podiumRoot = document.getElementById("leaderboardPodium");
  if (!podiumRoot) return;

  if (!podium.length) {
    podiumRoot.innerHTML = `
      <article class="leaderboard-podium-card empty">
        <span class="podium-position">--</span>
        <strong>No students found</strong>
        <p>The leaderboard will appear once student accounts are available.</p>
      </article>
    `;
    return;
  }

  podiumRoot.innerHTML = podium.map((entry) => `
    <article class="leaderboard-podium-card place-${entry.rank}">
      <div class="podium-head">
        <span class="podium-position medal-${entry.rank}">#${entry.rank}</span>
        <span class="podium-hours">${entry.totalHoursLabel}</span>
      </div>
      <strong>${entry.name}</strong>
      <p>${entry.studentId}</p>
      <div class="podium-metrics">
        <span>${entry.sessions} session${entry.sessions === 1 ? "" : "s"}</span>
        <span>${entry.averageHoursLabel} avg</span>
      </div>
    </article>
  `).join("");
}

function renderLeaderboardTable(entries = []) {
  const table = document.getElementById("leaderboardTable");
  if (!table) return;

  if (!entries.length) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center">No students found</td></tr>`;
    return;
  }

  table.innerHTML = entries.map((entry) => {
    const isCurrentStudent = isStudentView && String(entry.studentId) === String(currentStudentId);

    return `
    <tr class="${isCurrentStudent ? "current-student-row" : ""}">
      <td><span class="leaderboard-table-rank medal-${entry.rank}">#${entry.rank}</span></td>
      <td>${entry.studentId}</td>
      <td class="leaderboard-name-cell">
        <strong>${entry.name}</strong>
        ${isCurrentStudent ? `<span class="current-student-badge">You</span>` : ""}
      </td>
      <td>${entry.sessions}</td>
      <td>${entry.totalHoursLabel}</td>
      <td>${entry.averageHoursLabel}</td>
    </tr>
  `;
  }).join("");
}

async function loadLeaderboard() {
  const table = document.getElementById("leaderboardTable");

  try {
    const res = await fetch("/api/admin/leaderboard", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    let data = await parseJsonResponse(res);
    if (!data.success && res.status === 404) {
      const fallbackRes = await fetch("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (fallbackRes.status === 401 || fallbackRes.status === 403) {
        logout();
        return;
      }

      const fallbackData = await parseJsonResponse(fallbackRes);
      data = {
        success: fallbackData.success,
        summary: {
          rankedStudents: fallbackData.stats?.totalStudents || 0,
          totalHoursLabel: fallbackData.stats?.totalSitInHours || "0h",
          totalSessions: fallbackData.stats?.completedSessions || 0,
          averageHoursLabel: fallbackData.stats?.averageSessionDuration || "0h"
        },
        podium: fallbackData.leaderboard || [],
        leaderboard: fallbackData.leaderboard || []
      };
    }

    if (!data.success) {
      throw new Error(data.message || "Failed to load leaderboard");
    }

    renderSummary(data.summary);
    renderPodium(Array.isArray(data.podium) ? data.podium : []);
    renderLeaderboardTable(Array.isArray(data.leaderboard) ? data.leaderboard : []);
  } catch (err) {
    console.error("Failed to load leaderboard:", err);
    renderSummary();
    renderPodium([]);
    if (table) {
      table.innerHTML = `<tr><td colspan="6" style="text-align:center">Unable to load leaderboard. ${err.message}</td></tr>`;
    }
  }
}

function startLeaderboardRealtime() {
  if (!token) return;

  const refresh = () => loadLeaderboard();

  if ("EventSource" in window) {
    leaderboardEvents = new EventSource(`/api/admin/leaderboard/events?token=${encodeURIComponent(token)}`);
    leaderboardEvents.addEventListener("leaderboard-changed", refresh);
    leaderboardEvents.onerror = () => {
      leaderboardEvents.close();
      if (!leaderboardPollingTimer) {
        leaderboardPollingTimer = window.setInterval(refresh, 10000);
      }
    };
    return;
  }

  leaderboardPollingTimer = window.setInterval(refresh, 10000);
}

window.addEventListener("beforeunload", () => {
  if (leaderboardEvents) leaderboardEvents.close();
  if (leaderboardPollingTimer) window.clearInterval(leaderboardPollingTimer);
});

document.addEventListener("DOMContentLoaded", () => {
  localStorage.setItem("activeRole", isStudentView ? "student" : "admin");
  renderLayout();
  loadLeaderboard();
  startLeaderboardRealtime();
});
