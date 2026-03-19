const API = "http://localhost:3000/api/users/login";

async function login() {
  const res = await fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      student_id: student_id.value,
      password: password.value
    })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("userToken", data.token);
    window.location.href = "user.html";
  } else {
    alert("Login failed");
  }
}

window.onload = function () {
  const successEl = document.getElementById("successMessage");
  
  if (!successEl) return;

  successEl.style.display = "none";

  if (localStorage.getItem("registerSuccess")) {
    successEl.innerText = "Registration successful! Please login.";
    successEl.style.display = "block"; 
    localStorage.removeItem("registerSuccess"); 
  }
};