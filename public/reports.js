const reportsTable = document.getElementById("reportsTable");
let reportRows = [];

function goTo(url) {
  if (url === "home") {
    window.location.href = "admin.html";
    return;
  }
  window.location.href = `${url}.html`;
}

async function loadReports() {
  try {
    const res = await fetch("/admin/reservations?status=terminated");
    reportRows = await res.json();

    reportsTable.innerHTML = "";

    if (!Array.isArray(reportRows) || reportRows.length === 0) {
      reportsTable.innerHTML = `<tr><td colspan="6" style="text-align:center">No completed records available for reports</td></tr>`;
      return;
    }

    reportRows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.student_id}</td>
        <td>${row.purpose}</td>
        <td>${row.room}</td>
        <td>${row.date}</td>
        <td>${row.start_time} - ${row.end_time}</td>
        <td>${row.status}</td>
      `;
      reportsTable.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading reports:", err);
    reportsTable.innerHTML = `<tr><td colspan="6" style="text-align:center">Unable to load reports</td></tr>`;
  }
}

function downloadReportCsv() {
  if (!Array.isArray(reportRows) || reportRows.length === 0) {
    alert("No records to export yet.");
    return;
  }

  const headers = ["Student ID", "Purpose", "Room", "Date", "Time", "Status"];
  const rows = reportRows.map((row) => [
    row.student_id,
    row.purpose,
    row.room,
    row.date,
    `${row.start_time} - ${row.end_time}`,
    row.status
  ]);

  const csv = [headers, ...rows]
    .map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sit-in-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function logout() {
  localStorage.clear();
  window.location.href = "login-admin.html";
}

document.addEventListener("DOMContentLoaded", loadReports);
