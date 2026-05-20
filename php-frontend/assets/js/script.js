(function () {
  const toastTitles = { success: 'Success', error: 'Error', info: 'Info' };
  const toastIcons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
  };

  window.showAppToast = function showAppToast(message, type = 'success') {
    document.querySelector('.app-toast')?.remove();

    const safeType = toastTitles[type] ? type : 'info';
    const toast = document.createElement('div');
    toast.className = `app-toast ${safeType}`;
    toast.innerHTML =
      `<i class="fa-solid ${toastIcons[safeType]} app-toast-icon"></i>` +
      '<div class="app-toast-body">' +
        `<div class="app-toast-title">${toastTitles[safeType]}</div>` +
        `<div class="app-toast-message">${message}</div>` +
      '</div>' +
      '<button class="app-toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>';

    document.body.appendChild(toast);

    toast.querySelector('.app-toast-close')?.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 220);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 220);
    }, 3600);
  };

  function setError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message || '';
  }

  function clearErrors() {
    [
      'idNumberError',
      'lastNameError',
      'firstNameError',
      'courseError',
      'courseLevelError',
      'emailError',
      'passwordError',
      'repeatPasswordError',
    ].forEach((id) => setError(id, ''));
  }

  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye', !isHidden);
        icon.classList.toggle('fa-eye-slash', isHidden);
      }
    });
  });

  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const idNumber = document.getElementById('idNumber').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const firstName = document.getElementById('firstName').value.trim();
    const course = document.getElementById('course').value.trim();
    const courseLevel = document.getElementById('courseLevel').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeatPassword').value;

    let valid = true;
    if (!idNumber) { setError('idNumberError', 'ID number is required.'); valid = false; }
    if (!lastName) { setError('lastNameError', 'Last name is required.'); valid = false; }
    if (!firstName) { setError('firstNameError', 'First name is required.'); valid = false; }
    if (!course) { setError('courseError', 'Course is required.'); valid = false; }
    if (!courseLevel || Number(courseLevel) < 1) { setError('courseLevelError', 'Enter a valid year level.'); valid = false; }
    if (!email) { setError('emailError', 'Email is required.'); valid = false; }
    if (password.length < 8) { setError('passwordError', 'Password must be at least 8 characters.'); valid = false; }
    if (password !== repeatPassword) { setError('repeatPasswordError', 'Passwords do not match.'); valid = false; }
    if (!valid) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

    try {
      const formData = new FormData(form);
      const response = await fetch('register_process.php', { method: 'POST', body: formData });
      const data = await response.json();

      if (!data.success) {
        setError('repeatPasswordError', data.message || 'Registration failed.');
        window.showAppToast?.(data.message || 'Registration failed.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
        return;
      }

      const nameEl = document.getElementById('regSuccessName');
      const idEl = document.getElementById('regSuccessId');
      const overlay = document.getElementById('regSuccessOverlay');
      const bar = document.getElementById('regSuccessBar');

      if (nameEl) nameEl.textContent = data.fullName || 'Your account is ready.';
      if (idEl) idEl.textContent = data.idNumber || idNumber;
      if (overlay) overlay.classList.add('show');
      if (bar) {
        bar.style.width = '0%';
        requestAnimationFrame(() => { bar.style.width = '100%'; });
      }

      window.showAppToast?.('Registration successful! Redirecting to login...', 'success');

      form.reset();
      document.getElementById('courseLevel').value = '1';
      setTimeout(() => { window.location.href = 'login.php'; }, 4200);
    } catch (error) {
      setError('repeatPasswordError', 'Server error. Please make sure PHP and MySQL are running.');
      window.showAppToast?.('Server error. Please make sure PHP and MySQL are running.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
})();
