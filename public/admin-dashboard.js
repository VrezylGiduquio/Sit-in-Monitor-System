const token = localStorage.getItem("token");
let adminRefreshTimer;

localStorage.setItem("activeRole", "admin");

if (!token) {
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

function goTo(page) {
  localStorage.setItem("activeRole", "admin");

  if (page === "home") {
    window.location.href = "admin.html";
    return;
  }

  if (page === "leaderboard") {
    window.location.href = "leaderboard.html?role=admin";
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

  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Invalid JSON response (${res.status})`);
  }
}

function updateReservationUI(enabled) {
  const status = document.getElementById("adminReservationStatus");
  const toggle = document.getElementById("reservationToggle");

  if (toggle) toggle.checked = enabled;

  if (status) {
    status.textContent = enabled ? "Reservation is enabled" : "Reservation is disabled";
    status.className = `status-pill ${enabled ? "enabled" : "disabled"}`;
  }
}

function openSoftwareModal() {
  const modal = document.getElementById("softwareModal");
  const message = document.getElementById("softwareImportMessage");

  if (message) message.textContent = "";
  if (modal) modal.style.display = "block";
}

function closeSoftwareModal() {
  const modal = document.getElementById("softwareModal");
  if (modal) modal.style.display = "none";
}

function parseSoftwareRows(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [room, software, seats, status] = line.split("|").map((part) => part.trim());
      return {
        lineNumber: index + 1,
        room,
        software,
        seats,
        status,
        isValid: Boolean(room && software && seats && status)
      };
    });
}

function renderDashboard(data) {
  if (document.getElementById("adminTotalHours")) document.getElementById("adminTotalHours").textContent = data.stats.totalSitInHours;
  if (document.getElementById("adminSessionCount")) document.getElementById("adminSessionCount").textContent = data.stats.numberOfSessions;
  if (document.getElementById("adminAvgDuration")) document.getElementById("adminAvgDuration").textContent = data.stats.averageSessionDuration;
  if (document.getElementById("adminLongestSession")) document.getElementById("adminLongestSession").textContent = data.stats.longestSession;
  if (document.getElementById("adminRecommendation")) document.getElementById("adminRecommendation").textContent = data.recommendation;

  const leaderboard = document.getElementById("adminLeaderboard");
  if (leaderboard) {
    leaderboard.innerHTML = data.leaderboard.length
      ? data.leaderboard.map((entry) => `
        <li>
          <span>#${entry.rank} ${entry.studentId}</span>
          <strong>${entry.totalHoursLabel}</strong>
        </li>
      `).join("")
      : `<li><span>No completed sessions yet</span><strong>--</strong></li>`;
  }

  const topRooms = document.getElementById("topRoomsList");
  if (topRooms) {
    topRooms.innerHTML = data.analytics.topRooms.length
      ? data.analytics.topRooms.map((room) => `
        <li>
          <span>Lab ${room.room}</span>
          <strong>${room.reservations} res</strong>
        </li>
      `).join("")
      : `<li><span>No room data yet</span><strong>--</strong></li>`;
  }

  const recentActivity = document.getElementById("recentActivityList");
  if (recentActivity) {
    recentActivity.innerHTML = data.analytics.recentActivity.length
      ? data.analytics.recentActivity.map((entry) => `
        <li>
          <span>${entry.date}</span>
          <strong>${entry.reservations}</strong>
        </li>
      `).join("")
      : `<li><span>No recent activity</span><strong>--</strong></li>`;
  }
}

function renderAdminAnnouncements(items = []) {
  const list = document.getElementById("adminAnnouncementsList");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<li class="announcement-empty">No announcements posted yet.</li>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <li class="announcement-admin-item">
      <div>
        <strong>${item.title}</strong>
        <p>${item.message}</p>
        <span>${new Date(item.created_at).toLocaleString()}</span>
      </div>
      <button type="button" class="button-light" onclick="toggleAnnouncement(${item.id}, ${item.is_active ? 0 : 1})">
        ${item.is_active ? "Hide" : "Show"}
      </button>
    </li>
  `).join("");
}

function renderAdminRules(items = []) {
  const list = document.getElementById("adminRulesList");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<li class="announcement-empty">No rules added yet.</li>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <li class="announcement-admin-item">
      <div>
        <strong>${item.title || `Rule #${item.id}`}</strong>
        <p>${item.description || item.rule_text}</p>
        <span>${new Date(item.created_at).toLocaleString()}</span>
      </div>
      <button type="button" class="button-light" onclick="toggleRule(${item.id}, ${item.is_active ? 0 : 1})">
        ${item.is_active ? "Hide" : "Show"}
      </button>
    </li>
  `).join("");
}

async function loadReservationSetting() {
  try {
    const res = await fetch("/api/settings/reservation");
    const data = await parseJsonResponse(res);

    if (data.success) {
      updateReservationUI(Boolean(data.enabled));
    }
  } catch (err) {
    console.error("Failed to load reservation setting:", err);
  }
}

async function loadAdminAnnouncements() {
  const list = document.getElementById("adminAnnouncementsList");
  if (!list) return;

  try {
    const res = await fetch("/api/admin/announcements", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    renderAdminAnnouncements(data.success && Array.isArray(data.announcements) ? data.announcements : []);
  } catch (err) {
    console.error("Failed to load announcements:", err);
    list.innerHTML = `<li class="announcement-empty">Unable to load announcements. ${err.message}</li>`;
  }
}

async function loadAdminRules() {
  const list = document.getElementById("adminRulesList");
  if (!list) return;

  try {
    const res = await fetch("/api/admin/rules", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    renderAdminRules(data.success && Array.isArray(data.rules) ? data.rules : []);
  } catch (err) {
    console.error("Failed to load rules:", err);
    list.innerHTML = `<li class="announcement-empty">Unable to load rules. ${err.message}</li>`;
  }
}

async function loadDashboardData() {
  try {
    const res = await fetch("/api/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    if (data.success) {
      renderDashboard(data);
    }
  } catch (err) {
    console.error("Failed to load admin dashboard data:", err);
    showToast("Failed to load dynamic dashboard data.");
  }
}

async function submitRule() {
  const titleInput = document.getElementById("ruleTitle");
  const input = document.getElementById("ruleText");
  const status = document.getElementById("ruleMessageStatus");
  const title = titleInput?.value.trim() || "";
  const description = input?.value.trim() || "";
  const ruleText = [title, description].filter(Boolean).join(": ");

  if (!title || !description) {
    if (status) status.textContent = "Please enter both rule title and description.";
    return;
  }

  try {
    const res = await fetch("/api/admin/rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, rule_text: ruleText })
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    if (!data.success) {
      if (status) status.textContent = data.message || "Failed to add rule.";
      return;
    }

    if (titleInput) titleInput.value = "";
    if (input) input.value = "";
    if (status) status.textContent = "Rule added.";
    showToast("Rule added to student dashboard.");
    loadAdminRules();
  } catch (err) {
    console.error("Failed to add rule:", err);
    if (status) status.textContent = "Failed to add rule.";
  }
}

async function refreshAdminDashboard() {
  await Promise.all([
    loadReservationSetting(),
    loadDashboardData(),
    loadAdminAnnouncements(),
    loadAdminRules()
  ]);
}

function startAdminRefresh() {
  window.clearInterval(adminRefreshTimer);
  adminRefreshTimer = window.setInterval(() => {
    refreshAdminDashboard().catch((err) => {
      console.error("Failed to refresh admin dashboard:", err);
    });
  }, 15000);
}

async function toggleRule(id, isActive) {
  try {
    const res = await fetch(`/api/admin/rules/${id}/toggle`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ is_active: Boolean(isActive) })
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    if (data.success) {
      showToast(isActive ? "Rule shown." : "Rule hidden.");
      loadAdminRules();
    }
  } catch (err) {
    console.error("Failed to update rule:", err);
    showToast("Failed to update rule.");
  }
}

async function submitAnnouncement() {
  const titleInput = document.getElementById("announcementTitle");
  const messageInput = document.getElementById("announcementMessage");
  const status = document.getElementById("announcementMessageStatus");
  const title = titleInput?.value.trim() || "";
  const message = messageInput?.value.trim() || "";

  if (!title || !message) {
    if (status) status.textContent = "Please enter both title and message.";
    return;
  }

  try {
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, message })
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    if (!data.success) {
      if (status) status.textContent = data.message || "Failed to post announcement.";
      return;
    }

    if (titleInput) titleInput.value = "";
    if (messageInput) messageInput.value = "";
    if (status) status.textContent = "Announcement posted.";
    showToast("Announcement posted to student dashboard.");
    loadAdminAnnouncements();
  } catch (err) {
    console.error("Failed to post announcement:", err);
    if (status) status.textContent = "Failed to post announcement.";
  }
}

async function toggleAnnouncement(id, isActive) {
  try {
    const res = await fetch(`/api/admin/announcements/${id}/toggle`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ is_active: Boolean(isActive) })
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    if (data.success) {
      showToast(isActive ? "Announcement shown." : "Announcement hidden.");
      loadAdminAnnouncements();
    }
  } catch (err) {
    console.error("Failed to update announcement:", err);
    showToast("Failed to update announcement.");
  }
}

async function saveReservationSetting(enabled) {
  const res = await fetch("/api/settings/reservation", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ enabled })
  });

  if (res.status === 401 || res.status === 403) {
    logout();
    return false;
  }

  const data = await parseJsonResponse(res);
  return Boolean(data.success);
}

async function submitSoftwareImport() {
  const input = document.getElementById("softwareImportInput");
  const message = document.getElementById("softwareImportMessage");
  const rows = parseSoftwareRows(input?.value || "");
  const items = rows.filter((row) => row.isValid).map(({ room, software, seats, status }) => ({
    room,
    software,
    seats,
    status
  }));
  const invalidRows = rows.filter((row) => !row.isValid);

  if (!items.length) {
    if (message) {
      message.textContent = rows.length
        ? "Please complete each row using: Room | Software | Seats | Status."
        : "Please add at least one valid software row.";
    }
    return;
  }

  try {
    const res = await fetch("/api/software/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ items })
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await parseJsonResponse(res);
    if (message) {
      message.textContent = invalidRows.length
        ? `${data.message || "Upload completed."} ${invalidRows.length} incomplete row(s) were skipped.`
        : (data.message || "Upload completed.");
    }

    if (data.success) {
      showToast("Software inventory updated.");
      closeSoftwareModal();
      loadDashboardData();
      if (input) input.value = "";
    }
  } catch (err) {
    console.error("Failed to upload software inventory:", err);
    if (message) message.textContent = "Failed to upload software inventory.";
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("reservationToggle");
  refreshAdminDashboard().catch((err) => {
    console.error("Failed to initialize admin dashboard:", err);
  });
  startAdminRefresh();

  toggle?.addEventListener("change", (event) => {
    const isEnabled = event.target.checked;
    updateReservationUI(isEnabled);

    saveReservationSetting(isEnabled).then((success) => {
      if (success) {
        showToast(isEnabled ? "Student reservation has been enabled." : "Student reservation has been disabled.");
        return;
      }

      updateReservationUI(!isEnabled);
      showToast("Failed to update reservation setting.");
    });
  });
});

window.addEventListener("click", (event) => {
  const modal = document.getElementById("softwareModal");
  if (event.target === modal) {
    closeSoftwareModal();
  }
});

window.logout = logout;
window.goTo = goTo;
window.showToast = showToast;
window.openSoftwareModal = openSoftwareModal;
window.closeSoftwareModal = closeSoftwareModal;
window.submitSoftwareImport = submitSoftwareImport;
window.submitAnnouncement = submitAnnouncement;
window.toggleAnnouncement = toggleAnnouncement;
window.submitRule = submitRule;
window.toggleRule = toggleRule;
