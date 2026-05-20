<?php
require __DIR__ . '/../config/session_helper.php';
require __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$loginId = trim($_POST['loginId'] ?? '');
$password = (string)($_POST['loginPassword'] ?? '');
$loginRole = trim($_POST['loginRole'] ?? 'student');

if ($loginId === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'ID number and password are required.']);
    exit;
}

$defaultAdminId = getenv('SITIN_ADMIN_ID') ?: 'admin';
$defaultAdminPassword = getenv('SITIN_ADMIN_PASSWORD') ?: 'admin';
$defaultAdminName = getenv('SITIN_ADMIN_NAME') ?: 'CCS Administrator';

if ($loginRole === 'admin' || strcasecmp($loginId, $defaultAdminId) === 0) {
    if ($loginId !== $defaultAdminId || $password !== $defaultAdminPassword) {
        echo json_encode(['success' => false, 'message' => 'Invalid admin credentials.']);
        exit;
    }

    sitin_destroy_session('admin');
    sitin_start_session('admin');
    session_regenerate_id(true);
    $_SESSION = [];
    $_SESSION['admin_logged_in'] = true;
    $_SESSION['role'] = 'admin';
    $_SESSION['admin_name'] = $defaultAdminName;
    session_write_close();

    echo json_encode([
        'success' => true,
        'role' => 'admin',
        'message' => 'Admin login successful.',
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT id, id_number, first_name, last_name, course, password, profile_photo
        FROM students
        WHERE id_number = ?
        LIMIT 1
    ");
    $stmt->execute([$loginId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student || !password_verify($password, $student['password'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid student ID or password.']);
        exit;
    }

    sitin_destroy_session('student');
    sitin_start_session('student');
    session_regenerate_id(true);
    $_SESSION = [];
    $_SESSION['student_id'] = (int)$student['id'];
    $_SESSION['role'] = 'student';
    $_SESSION['student_name'] = trim($student['first_name'] . ' ' . $student['last_name']);
    $_SESSION['id_number'] = $student['id_number'];
    $_SESSION['course'] = $student['course'];
    $_SESSION['profile_photo'] = $student['profile_photo'] ?? '';
    session_write_close();

    echo json_encode([
        'success' => true,
        'role' => 'student',
        'message' => 'Login successful.',
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Login failed: ' . $e->getMessage()]);
}
