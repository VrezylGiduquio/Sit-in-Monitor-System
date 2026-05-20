<?php require __DIR__ . '/../config/session_helper.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CCS | Login</title>
  <link rel="stylesheet" href="../assets/css/style.css"/>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet"/>
</head>
<body>

  <!-- LOGIN SECTION -->
  <section class="auth-section">
    <div class="auth-card login-card">
      <div class="auth-layout">
        <div class="auth-side-panel">
          <div class="auth-side-top">
            <div class="auth-side-kicker"><i class="fa-solid fa-user-shield"></i> Student Access</div>
            <h2 class="auth-side-title">Welcome <span>Back</span></h2>
            <p class="auth-side-text">Jump back into lab reservations, software checks, and your sit-in activity without digging through separate tools.</p>
            <div class="auth-side-stats">
              <div class="auth-side-stat">
                <strong>1</strong>
                <span>Single Sign-in</span>
              </div>
              <div class="auth-side-stat">
                <strong>Fast</strong>
                <span>Session Access</span>
              </div>
            </div>
          </div>
          <div class="auth-side-bottom">
            <div class="auth-side-note">
              <p>Use your student ID and password to open your dashboard, review lab activity, and continue your reservation workflow.</p>
            </div>
          </div>
        </div>
        <div class="auth-panel">
          <div class="auth-panel-inner">
            <a href="../index.php" class="btn-back">
              <i class="fa-solid fa-arrow-left"></i> Back
            </a>

            <div class="hero-badge"><i class="fa-solid fa-key"></i> Secure Login</div>
            <h2 class="auth-title">Sign in</h2>
            <p class="auth-subtitle">Access your student account to continue with reservations and lab tracking.</p>

            <form id="loginForm" class="auth-form auth-grid" novalidate>

              <div class="form-group">
                <label for="loginId">ID Number</label>
                <input
                  type="text"
                  id="loginId"
                  name="loginId"
                  placeholder="e.g. 123456789"
                  required
                  autocomplete="username"
                />
                <span class="form-error" id="loginIdError"></span>
              </div>

              <div class="form-group">
                <label for="loginPassword">Password</label>
                <div class="input-icon-wrap">
                  <input
                    type="password"
                    id="loginPassword"
                    name="loginPassword"
                    placeholder="Your password"
                    required
                    autocomplete="current-password"
                  />
                  <button type="button" class="toggle-pw" data-target="loginPassword" tabindex="-1">
                    <i class="fa-regular fa-eye"></i>
                  </button>
                </div>
                <span class="form-error" id="loginPasswordError"></span>
              </div>

              <div class="auth-helper-row">
                <span class="auth-mini-note"><i class="fa-solid fa-circle-info"></i> Admin can also sign in here</span>
                <a href="#" class="forgot-link">Forgot password?</a>
              </div>

              <button type="submit" id="loginBtn" class="btn btn-primary btn-full" style="margin-top:.2rem">
                <i class="fa-solid fa-right-to-bracket"></i> Sign In
              </button>

              <div class="auth-divider">or</div>

              <p class="auth-switch">
                Don't have an account? <a href="registration.php">Register here</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>

  <script src="../assets/js/script.js"></script>
  <script>
  (function () {
    /* ── submit ── */
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
      e.preventDefault();

      var idVal = (document.getElementById('loginId').value || '').trim();
      var pwVal =  document.getElementById('loginPassword').value || '';
      var idErr = document.getElementById('loginIdError');
      var pwErr = document.getElementById('loginPasswordError');

      idErr.textContent = '';
      pwErr.textContent = '';

      var ok = true;
      if (!idVal) { idErr.textContent = 'This field is required.'; ok = false; }
      if (!pwVal) { pwErr.textContent = 'This field is required.'; ok = false; }
      if (!ok) return;

      var btn = document.getElementById('loginBtn');
      btn.disabled  = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in\u2026';

      try {
        var fd = new FormData();
        fd.append('loginId',       idVal);
        fd.append('loginPassword', pwVal);
        fd.append('loginRole',     idVal.toLowerCase() === 'admin' ? 'admin' : 'student');

        var res  = await fetch('login_process.php', { method: 'POST', body: fd });
        var text = await res.text();
        var data;

        try { data = JSON.parse(text); }
        catch (_) {
          window.showAppToast?.('Unexpected server response. Check PHP logs.', 'error');
          console.error('login_process.php returned:', text);
          btn.disabled  = false;
          btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
          return;
        }

        if (data.success) {
          window.showAppToast?.('Login successful! Redirecting\u2026', 'success');
          setTimeout(function () {
            window.location.href = data.role === 'admin' ? 'admin.php' : 'dashboard.php';
          }, 1200);
        } else {
          window.showAppToast?.(data.message || 'Invalid credentials.', 'error');
          btn.disabled  = false;
          btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
          document.getElementById('loginPassword').value = '';
          document.getElementById('loginPassword').focus();
        }

      } catch (err) {
        window.showAppToast?.('Server error. Please make sure PHP and MySQL are running.', 'error');
        console.error('Login error:', err);
        btn.disabled  = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
      }
    });
  })();
  </script>

</body>
</html>
