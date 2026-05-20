<?php
require __DIR__ . '/config/session_helper.php';

$studentSession = sitin_read_session('student');
if (($studentSession['role'] ?? '') === 'student' && !empty($studentSession['student_id'])) {
    header('Location: dashboard.php');
    exit;
}

$adminSession = sitin_read_session('admin');
if (($adminSession['role'] ?? '') === 'admin' && !empty($adminSession['admin_logged_in'])) {
    header('Location: admin.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CCS Sit-in Monitoring System</title>
  <link rel="stylesheet" href="assets/css/style.css"/>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet"/>
</head>
<body>
  <section class="auth-section">
    <div class="auth-card landing-shell">
      <div class="landing-hero">
        <div class="landing-hero-top">
          <div class="landing-badge"><i class="fa-solid fa-wave-square"></i> Digital Lab Operations</div>
          <h1 class="landing-title">Reserve. Track. <span>Flow.</span></h1>
          <p class="landing-subtitle">
            A sharper way to handle CCS laboratory access, room software visibility, and sit-in activity without bouncing between separate tools.
          </p>
          <div class="landing-stat-row">
            <div class="landing-stat">
              <strong>6</strong>
              <span>Labs Ready</span>
            </div>
            <div class="landing-stat">
              <strong>24/7</strong>
              <span>Access View</span>
            </div>
            <div class="landing-stat">
              <strong>1</strong>
              <span>Unified Portal</span>
            </div>
          </div>
        </div>
        <div class="landing-hero-bottom">
          <div class="landing-note">
            <span class="landing-note-icon"><i class="fa-solid fa-shield-halved"></i></span>
            <p>Built for smoother reservations, cleaner monitoring, and faster decision-making for students and lab admins.</p>
          </div>
        </div>
      </div>
      <div class="landing-panel">
        <div class="landing-panel-header">
          <div class="hero-badge"><i class="fa-solid fa-building-columns"></i> CCS Laboratory Access</div>
          <h2 class="auth-title">Sit-in Monitoring System</h2>
          <p class="auth-subtitle">
            Reserve a laboratory, review available software per room, and manage sit-in activity from one place.
          </p>
        </div>
        <div class="landing-feature-grid">
          <div class="landing-feature">
            <div class="landing-feature-icon"><i class="fa-solid fa-calendar-check"></i></div>
            <div>
              <h3>Fast Reservations</h3>
              <p>Choose labs, dates, and preferred PCs in a cleaner booking flow that reduces back-and-forth.</p>
            </div>
          </div>
          <div class="landing-feature">
            <div class="landing-feature-icon"><i class="fa-solid fa-laptop-code"></i></div>
            <div>
              <h3>Software Visibility</h3>
              <p>Check installed tools by laboratory before reserving so students know exactly where to work.</p>
            </div>
          </div>
          <div class="landing-feature">
            <div class="landing-feature-icon"><i class="fa-solid fa-chart-line"></i></div>
            <div>
              <h3>Live Tracking</h3>
              <p>Follow sessions, announcements, and room activity from one system instead of scattered files.</p>
            </div>
          </div>
        </div>
        <div class="landing-actions">
          <a href="login.php" class="btn btn-primary"><i class="fa-solid fa-right-to-bracket"></i> Sign In</a>
          <a href="registration.php" class="btn btn-secondary"><i class="fa-solid fa-user-plus"></i> Create Account</a>
        </div>
        <p class="landing-meta">Designed for a more organized CCS lab experience with fewer clicks and clearer room visibility.</p>
      </div>
    </div>
  </section>
</body>
</html>
