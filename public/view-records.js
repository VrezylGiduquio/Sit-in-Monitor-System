const table = document.getElementById("recordsTable");

localStorage.setItem("activeRole", "admin");

function goTo(url) {
    localStorage.setItem("activeRole", "admin");
    // Navigate to the page
    if(url == "home"){ window.location.href = "admin.html";}
    else if(url == "leaderboard"){ window.location.href = "leaderboard.html?role=admin";}
    else{ window.location.href = url + ".html";}
}

// Load terminated records
async function loadRecords() {
  try {
    const res = await fetch("/admin/reservations?status=terminated");
    const data = await res.json();

    table.innerHTML = "";

    if (!data || data.length === 0) {
      table.innerHTML = `<tr><td colspan="6" style="text-align:center">No records found</td></tr>`;
      return;
    }

    data.forEach(r => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${r.student_id}</td>
        <td>${r.purpose}</td>
        <td>${r.room}</td>
        <td>${r.date}</td>
        <td>${r.start_time} - ${r.end_time}</td>
        <td style="color:red; font-weight:bold;">${r.status}</td>
      `;

      table.appendChild(row);
    });

  } catch (err) {
    console.error("Error loading records:", err);
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "login-admin.html";
}

// Load on start
document.addEventListener("DOMContentLoaded", loadRecords);
