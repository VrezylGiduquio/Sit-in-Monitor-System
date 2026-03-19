const API = "http://localhost:3000/api/auth/login";

async function login() {
  const res = await fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = "admin.html";
  } else {
    alert("Login failed");
  }
}

