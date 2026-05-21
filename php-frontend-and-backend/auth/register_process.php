<?php
session_start();
require __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$idNumber = trim($_POST['idNumber'] ?? '');
$lastName = trim($_POST['lastName'] ?? '');
$firstName = trim($_POST['firstName'] ?? '');
$middleName = trim($_POST['middleName'] ?? '');
$course = trim($_POST['course'] ?? 'BSIT');
$courseLevel = (int)($_POST['courseLevel'] ?? 1);
$email = trim($_POST['email'] ?? '');
$address = trim($_POST['address'] ?? '');
$password = (string)($_POST['password'] ?? '');
$repeatPassword = (string)($_POST['repeatPassword'] ?? '');

if ($idNumber === '' || $lastName === '' || $firstName === '' || $email === '' || $password === '' || $repeatPassword === '') {
    echo json_encode(['success' => false, 'message' => 'Please complete all required fields.']);
    exit;
}

if (!preg_match('/^[A-Za-z0-9-]+$/', $idNumber)) {
    echo json_encode(['success' => false, 'message' => 'ID number may only contain letters, numbers, and dashes.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

if ($courseLevel < 1 || $courseLevel > 6) {
    echo json_encode(['success' => false, 'message' => 'Year level must be between 1 and 6.']);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long.']);
    exit;
}

if ($password !== $repeatPassword) {
    echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
    exit;
}

try {
    $dup = $pdo->prepare("SELECT id FROM students WHERE id_number = ? OR email = ? LIMIT 1");
    $dup->execute([$idNumber, $email]);
    if ($dup->fetch()) {
        echo json_encode(['success' => false, 'message' => 'That ID number or email is already registered.']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO students (
            id_number,
            last_name,
            first_name,
            middle_name,
            course,
            year_level,
            email,
            address,
            password,
            remaining_session
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 30)
    ");
    $stmt->execute([
        $idNumber,
        $lastName,
        $firstName,
        $middleName,
        $course,
        $courseLevel,
        $email,
        $address,
        password_hash($password, PASSWORD_DEFAULT),
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Registration successful.',
        'idNumber' => $idNumber,
        'fullName' => trim($firstName . ' ' . $lastName),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}
