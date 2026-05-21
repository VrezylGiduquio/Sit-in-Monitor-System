<?php
require_once __DIR__ . '/env.php';

sitin_load_env([
    dirname(__DIR__, 2) . '/.env',
    dirname(__DIR__) . '/.env',
]);

$host     = sitin_env('DB_HOST', 'localhost');
$port     = sitin_env('DB_PORT', '3306');
$dbname   = sitin_env('DB_NAME', 'sitin-system');
$username = sitin_env('DB_USER', 'root');
$password = sitin_env('DB_PASS', 'admin');

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]));
}

function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void {
    try {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    } catch (Exception $e) {
        // Ignore duplicate-column errors so the app can bootstrap idempotently.
    }
}

function seedLabs(PDO $pdo): void {
    $sampleLabs = [
        'Lab 524' => [
            'Windows 11 Education',
            'Visual Studio Code',
            'Python 3.12',
            'Git Bash',
            'Docker Desktop',
            'Node.js',
            'Postman',
        ],
        'Lab 526' => [
            'Ubuntu 22.04 LTS',
            'IntelliJ IDEA Ultimate',
            'Java JDK 17',
            'MySQL Workbench',
            'Eclipse IDE',
            'Apache NetBeans',
            'VirtualBox',
        ],
        'Lab 528' => [
            'Windows 10 IoT',
            'Cisco Packet Tracer',
            'Wireshark',
            'Nmap',
            'Metasploit Framework',
            'Kali Linux (VM)',
            'Putty',
        ],
        'Lab 530' => [
            'Microsoft Visual Studio 2022',
            'SQL Server Management Studio',
            'C# / .NET 8',
            'Azure Data Studio',
            'PowerShell 7',
            'GitLab CE',
            'Blazor Server Tools',
        ],
        'Lab 542' => [
            'Android Studio',
            'Flutter SDK',
            'Xcode (macOS lab)',
            'Firebase CLI',
            'React Native Debugger',
            'Genymotion Emulator',
            'Figma',
        ],
        'Lab 544' => [
            'Jupyter Notebook',
            'Anaconda Navigator',
            'RStudio',
            'TensorFlow',
            'PyTorch',
            'Tableau Public',
            'MongoDB Compass',
        ],
    ];

    $stmt = $pdo->prepare("
        INSERT INTO labs (name, capacity, is_active, software_list)
        VALUES (?, ?, 1, ?)
        ON DUPLICATE KEY UPDATE
            capacity = VALUES(capacity),
            software_list = CASE
                WHEN software_list IS NULL OR software_list = '' THEN VALUES(software_list)
                ELSE software_list
            END
    ");

    foreach ($sampleLabs as $labName => $software) {
        $stmt->execute([$labName, 40, json_encode($software)]);
    }
}

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_number VARCHAR(50) NOT NULL UNIQUE,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            middle_name VARCHAR(100) DEFAULT NULL,
            course VARCHAR(150) NOT NULL,
            year_level INT NOT NULL DEFAULT 1,
            email VARCHAR(150) NOT NULL UNIQUE,
            address VARCHAR(255) DEFAULT NULL,
            password VARCHAR(255) NOT NULL,
            remaining_session INT NOT NULL DEFAULT 30,
            profile_photo VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS labs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            capacity INT DEFAULT 40,
            is_active TINYINT(1) DEFAULT 1,
            software_list TEXT DEFAULT NULL,
            software_pdf VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_name VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            student_name VARCHAR(150) NOT NULL,
            course VARCHAR(150) NOT NULL,
            lab VARCHAR(100) NOT NULL,
            date DATE NOT NULL,
            time_in TIME NOT NULL,
            purpose VARCHAR(120) NOT NULL,
            pc_number INT DEFAULT NULL,
            admin_pc INT DEFAULT NULL,
            software_needed TEXT DEFAULT NULL,
            status ENUM('pending','approved','done','cancelled') NOT NULL DEFAULT 'pending',
            rejection_reason VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_res_student (student_id),
            KEY idx_res_lab_date (lab, date),
            KEY idx_res_status (status)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sitins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            purpose VARCHAR(120) NOT NULL,
            lab VARCHAR(100) NOT NULL,
            pc_number INT DEFAULT NULL,
            remaining_session INT NOT NULL DEFAULT 30,
            status ENUM('active','done') NOT NULL DEFAULT 'active',
            time_in DATETIME NOT NULL,
            time_out DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_sitin_student (student_id),
            KEY idx_sitin_status (status),
            KEY idx_sitin_time_in (time_in)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pc_seats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lab_id INT NOT NULL,
            pc_number INT NOT NULL,
            label VARCHAR(20) DEFAULT NULL,
            is_functional TINYINT(1) NOT NULL DEFAULT 1,
            UNIQUE KEY uq_lab_pc (lab_id, pc_number)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS system_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value VARCHAR(255) NOT NULL DEFAULT '1',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sitin_id INT NOT NULL,
            student_id INT NOT NULL,
            rating INT NOT NULL,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS read_announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            announcement_id INT NOT NULL,
            read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_student_ann (student_id, announcement_id)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reservation_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            reservation_id INT NOT NULL,
            status VARCHAR(20) NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_rsv_notif (student_id, reservation_id, status)
        )
    ");

    ensureColumn($pdo, 'students', 'middle_name', "VARCHAR(100) DEFAULT NULL AFTER `last_name`");
    ensureColumn($pdo, 'students', 'course', "VARCHAR(150) NOT NULL DEFAULT 'BSIT' AFTER `middle_name`");
    ensureColumn($pdo, 'students', 'year_level', "INT NOT NULL DEFAULT 1 AFTER `course`");
    ensureColumn($pdo, 'students', 'email', "VARCHAR(150) NOT NULL DEFAULT '' AFTER `year_level`");
    ensureColumn($pdo, 'students', 'address', "VARCHAR(255) DEFAULT NULL AFTER `email`");
    ensureColumn($pdo, 'students', 'password', "VARCHAR(255) NOT NULL AFTER `address`");
    ensureColumn($pdo, 'students', 'remaining_session', "INT NOT NULL DEFAULT 30 AFTER `password`");
    ensureColumn($pdo, 'students', 'profile_photo', "VARCHAR(255) DEFAULT '' AFTER `remaining_session`");
    ensureColumn($pdo, 'labs', 'software_list', "TEXT DEFAULT NULL AFTER `is_active`");
    ensureColumn($pdo, 'labs', 'software_pdf', "VARCHAR(255) DEFAULT NULL AFTER `software_list`");
    ensureColumn($pdo, 'reservations', 'pc_number', "INT DEFAULT NULL AFTER `purpose`");
    ensureColumn($pdo, 'reservations', 'admin_pc', "INT DEFAULT NULL AFTER `pc_number`");
    ensureColumn($pdo, 'reservations', 'software_needed', "TEXT DEFAULT NULL AFTER `admin_pc`");
    ensureColumn($pdo, 'reservations', 'rejection_reason', "VARCHAR(255) DEFAULT NULL AFTER `status`");
    try {
        $pdo->exec("ALTER TABLE reservations MODIFY COLUMN status ENUM('pending','approved','done','cancelled') NOT NULL DEFAULT 'pending'");
    } catch (Exception $e) {
        // Ignore if the schema is already aligned or the table is unavailable during bootstrap.
    }
    ensureColumn($pdo, 'sitins', 'pc_number', "INT DEFAULT NULL AFTER `lab`");
    ensureColumn($pdo, 'sitins', 'remaining_session', "INT NOT NULL DEFAULT 30 AFTER `pc_number`");
    ensureColumn($pdo, 'sitins', 'status', "ENUM('active','done') NOT NULL DEFAULT 'active' AFTER `remaining_session`");
    ensureColumn($pdo, 'sitins', 'time_out', "DATETIME DEFAULT NULL AFTER `time_in`");
    ensureColumn($pdo, 'sitins', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `time_out`");

    $pdo->exec("INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('reservation_enabled', '1')");
    seedLabs($pdo);
} catch (Exception $e) {
    die(json_encode(['success' => false, 'message' => 'Bootstrap Error: ' . $e->getMessage()]));
}
?>
