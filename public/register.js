const API = "http://localhost:3000/api/users/register";

async function register() {
  if (password.value !== repeat_password.value) {
    return alert("Passwords do not match");
  }

  const res = await fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      student_id: student_id.value,
      last_name: last_name.value,
      first_name: first_name.value,
      middle_name: middle_name.value,
      course_level: course_level.value,
      email: email.value,
      password: password.value,
      course: course.value,
      address: address.value
    })
  });

  const data = await res.json();
  localStorage.setItem("registerSuccess", "true");
  window.location.href = "login-user.html";
}