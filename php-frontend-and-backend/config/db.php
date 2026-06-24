<?php
/**
 * Database Bootstrap — supports both MySQL (local) and Turso/libSQL (Vercel).
 *
 * Environment detection:
 *   - If TURSO_DATABASE_URL is set   → connect via Turso/libSQL
 *   - Otherwise                      → connect via MySQL PDO (original behaviour)
 *
 * The global $pdo variable is always set, and provides the method signatures
 * shared by both PDO and TursoDatabase (prepare, exec, query, etc.).
 */
declare(strict_types=1);

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/turso_db.php';

sitin_load_env([
    dirname(__DIR__, 2) . '/.env',
    dirname(__DIR__) . '/.env',
]);

// ── Detect which database backend to use ─────────────────────────────────────
$tursoUrl = sitin_env('TURSO_DATABASE_URL', '');

if ($tursoUrl !== '') {
    // ── Turso (libSQL) — used on Vercel ──────────────────────────────────────
    $tursoToken = sitin_env('TURSO_AUTH_TOKEN', '');

    if ($tursoToken === '') {
        die(json_encode(['success' => false, 'message' => 'TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set.']));
    }

    try {
        $pdo = new TursoDatabase($tursoUrl, $tursoToken);

        // Bootstrap schema — ensure all tables exist
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS students (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                id_number         TEXT NOT NULL UNIQUE,
                first_name        TEXT NOT NULL,
                last_name         TEXT NOT NULL,
                middle_name       TEXT DEFAULT NULL,
                course            TEXT NOT NULL DEFAULT 'BSIT',
                year_level        INTEGER NOT NULL DEFAULT 1,
                email             TEXT NOT NULL UNIQUE,
                address           TEXT DEFAULT NULL,
                password          TEXT NOT NULL,
                remaining_session INTEGER NOT NULL DEFAULT 30,
                profile_photo     TEXT DEFAULT '',
                created_at        TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS labs (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT NOT NULL UNIQUE,
                capacity      INTEGER DEFAULT 40,
                is_active     INTEGER DEFAULT 1,
                software_list TEXT DEFAULT NULL,
                software_pdf  TEXT DEFAULT NULL,
                created_at    TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS announcements (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_name TEXT NOT NULL,
                content    TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS reservations (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id       INTEGER NOT NULL,
                student_name     TEXT NOT NULL,
                course           TEXT NOT NULL,
                lab              TEXT NOT NULL,
                date             TEXT NOT NULL,
                time_in          TEXT NOT NULL,
                purpose          TEXT NOT NULL,
                pc_number        INTEGER DEFAULT NULL,
                admin_pc         INTEGER DEFAULT NULL,
                software_needed  TEXT DEFAULT NULL,
                status           TEXT NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','approved','done','cancelled')),
                rejection_reason TEXT DEFAULT NULL,
                created_at       TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_res_student  ON reservations(student_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_res_lab_date ON reservations(lab, date)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_res_status   ON reservations(status)");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS sitins (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id        INTEGER NOT NULL,
                purpose           TEXT NOT NULL,
                lab               TEXT NOT NULL,
                pc_number         INTEGER DEFAULT NULL,
                remaining_session INTEGER NOT NULL DEFAULT 30,
                status            TEXT NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','done')),
                time_in           TEXT NOT NULL,
                time_out          TEXT DEFAULT NULL,
                created_at        TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sitin_student ON sitins(student_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sitin_status  ON sitins(status)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sitin_time_in ON sitins(time_in)");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS pc_seats (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                lab_id       INTEGER NOT NULL,
                pc_number    INTEGER NOT NULL,
                label        TEXT DEFAULT NULL,
                is_functional INTEGER DEFAULT 1,
                UNIQUE (lab_id, pc_number)
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS system_settings (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key   TEXT NOT NULL UNIQUE,
                setting_value TEXT NOT NULL DEFAULT '1',
                updated_at    TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS feedback (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                sitin_id   INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                rating     INTEGER NOT NULL,
                comment    TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        ");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback(student_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_feedback_sitin  ON feedback(sitin_id)");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS read_announcements (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id      INTEGER NOT NULL,
                announcement_id INTEGER NOT NULL,
                read_at         TEXT DEFAULT (datetime('now')),
                UNIQUE (student_id, announcement_id)
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS reservation_notifications (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id     INTEGER NOT NULL,
                reservation_id INTEGER NOT NULL,
                status         TEXT NOT NULL,
                is_read        INTEGER DEFAULT 0,
                created_at     TEXT DEFAULT (datetime('now')),
                UNIQUE (student_id, reservation_id, status)
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_name    TEXT NOT NULL,
                original_name TEXT NOT NULL,
                stored_name   TEXT NOT NULL,
                file_type     TEXT NOT NULL,
                file_size     INTEGER NOT NULL,
                category      TEXT DEFAULT 'general',
                description   TEXT,
                download_count INTEGER DEFAULT 0,
                created_at    TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS lab_sessions (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id    INTEGER NOT NULL,
                lab_id        INTEGER NOT NULL,
                pc_number     INTEGER DEFAULT NULL,
                software_used TEXT DEFAULT NULL,
                time_in       TEXT NOT NULL,
                time_out      TEXT DEFAULT NULL,
                status        TEXT DEFAULT 'active'
                              CHECK (status IN ('active','completed')),
                created_at    TEXT DEFAULT (datetime('now'))
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS activity_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_name  TEXT DEFAULT NULL,
                action_type TEXT DEFAULT NULL,
                description TEXT,
                entity_type TEXT DEFAULT NULL,
                entity_id   INTEGER DEFAULT 0,
                created_at  TEXT DEFAULT (datetime('now'))
            )
        ");

        // Seed default data
        $pdo->exec("INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES ('reservation_enabled', '1')");

        // Seed labs
        $sampleLabs = [
            'Lab 524' => '["Windows 11 Education","Visual Studio Code","Python 3.12","Git Bash","Docker Desktop","Node.js","Postman"]',
            'Lab 526' => '["Ubuntu 22.04 LTS","IntelliJ IDEA Ultimate","Java JDK 17","MySQL Workbench","Eclipse IDE","Apache NetBeans","VirtualBox"]',
            'Lab 528' => '["Windows 10 IoT","Cisco Packet Tracer","Wireshark","Nmap","Metasploit Framework","Kali Linux (VM)","Putty"]',
            'Lab 530' => '["Microsoft Visual Studio 2022","SQL Server Management Studio","C# / .NET 8","Azure Data Studio","PowerShell 7","GitLab CE","Blazor Server Tools"]',
            'Lab 542' => '["Android Studio","Flutter SDK","Xcode (macOS lab)","Firebase CLI","React Native Debugger","Genymotion Emulator","Figma"]',
            'Lab 544' => '["Jupyter Notebook","Anaconda Navigator","RStudio","TensorFlow","PyTorch","Tableau Public","MongoDB Compass"]',
        ];

        $stmt = $pdo->prepare("INSERT OR IGNORE INTO labs (name, capacity, is_active, software_list) VALUES (?, 40, 1, ?)");
        foreach ($sampleLabs as $name => $software) {
            $stmt->execute([$name, $software]);
        }

    } catch (Exception $e) {
        die(json_encode(['success' => false, 'message' => 'Turso Bootstrap Error: ' . $e->getMessage()]));
    }
} else {
    // ── MySQL (original) — local development ─────────────────────────────────
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
            // Ignore duplicate-column errors
        }
    }

    function seedLabs(PDO $pdo): void {
        $sampleLabs = [
            'Lab 524' => [
                'Windows 11 Education', 'Visual Studio Code', 'Python 3.12',
                'Git Bash', 'Docker Desktop', 'Node.js', 'Postman',
            ],
            'Lab 526' => [
                'Ubuntu 22.04 LTS', 'IntelliJ IDEA Ultimate', 'Java JDK 17',
                'MySQL Workbench', 'Eclipse IDE', 'Apache NetBeans', 'VirtualBox',
            ],
            'Lab 528' => [
                'Windows 10 IoT', 'Cisco Packet Tracer', 'Wireshark',
                'Nmap', 'Metasploit Framework', 'Kali Linux (VM)', 'Putty',
            ],
            'Lab 530' => [
                'Microsoft Visual Studio 2022', 'SQL Server Management Studio',
                'C# / .NET 8', 'Azure Data Studio', 'PowerShell 7',
                'GitLab CE', 'Blazor Server Tools',
            ],
            'Lab 542' => [
                'Android Studio', 'Flutter SDK', 'Xcode (macOS lab)',
                'Firebase CLI', 'React Native Debugger', 'Genymotion Emulator', 'Figma',
            ],
            'Lab 544' => [
                'Jupyter Notebook', 'Anaconda Navigator', 'RStudio',
                'TensorFlow', 'PyTorch', 'Tableau Public', 'MongoDB Compass',
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

    // ── MySQL schema bootstrap ───────────────────────────────────────────────
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_number VARCHAR(50) NOT NULL UNIQUE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                middle_name VARCHAR(100) DEFAULT NULL,
                course VARCHAR(150) NOT NULL DEFAULT 'BSIT',
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

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_name VARCHAR(100) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                stored_name VARCHAR(255) NOT NULL,
                file_type VARCHAR(100) NOT NULL,
                file_size INT NOT NULL COMMENT 'bytes',
                category VARCHAR(80) DEFAULT 'general',
                description TEXT,
                download_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_category (category)
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS lab_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                lab_id INT NOT NULL,
                pc_number INT DEFAULT NULL,
                software_used TEXT DEFAULT NULL,
                time_in DATETIME NOT NULL,
                time_out DATETIME DEFAULT NULL,
                status ENUM('active','completed') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_lab_sessions_student (student_id),
                KEY idx_lab_sessions_lab (lab_id)
            )
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_name VARCHAR(100) DEFAULT NULL,
                action_type VARCHAR(50) DEFAULT NULL,
                description TEXT,
                entity_type VARCHAR(50) DEFAULT NULL,
                entity_id INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Column-level migration helpers (idempotent)
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
        } catch (Exception $e) {}
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
}
