-- ============================================================================
-- Turso (libSQL / SQLite) Schema — CCS Sit-in Monitoring System
-- ============================================================================
-- This schema is compatible with Turso/libSQL and is used when deploying
-- on Vercel.  Differences from the MySQL version:
--   • INTEGER PRIMARY KEY AUTOINCREMENT  instead of INT AUTO_INCREMENT
--   • TEXT  instead of  VARCHAR / ENUM / TIMESTAMP
--   • No ENGINE=InnoDB  (SQLite doesn't use storage engines)
--   • No ON DUPLICATE KEY  (use INSERT OR REPLACE / ON CONFLICT)
--   • Boolean stored as INTEGER (0/1)
--   • Datetimes stored as TEXT in ISO-8601 format
-- ============================================================================

-- ── Students ─────────────────────────────────────────────────────────────────
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
);

-- ── Labs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE,
    capacity      INTEGER DEFAULT 40,
    is_active     INTEGER DEFAULT 1,
    software_list TEXT DEFAULT NULL,
    software_pdf  TEXT DEFAULT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
);

-- ── Announcements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_name TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ── Reservations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id       INTEGER NOT NULL,
    student_name     TEXT NOT NULL,
    course           TEXT NOT NULL,
    lab              TEXT NOT NULL,
    date             TEXT NOT NULL,        -- ISO date: YYYY-MM-DD
    time_in          TEXT NOT NULL,        -- ISO time: HH:MM:SS
    purpose          TEXT NOT NULL,
    pc_number        INTEGER DEFAULT NULL,
    admin_pc         INTEGER DEFAULT NULL,
    software_needed  TEXT DEFAULT NULL,
    status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','done','cancelled')),
    rejection_reason TEXT DEFAULT NULL,
    created_at       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_res_student     ON reservations(student_id);
CREATE INDEX IF NOT EXISTS idx_res_lab_date    ON reservations(lab, date);
CREATE INDEX IF NOT EXISTS idx_res_status      ON reservations(status);

-- ── Sit-ins ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sitins (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id        INTEGER NOT NULL,
    purpose           TEXT NOT NULL,
    lab               TEXT NOT NULL,
    pc_number         INTEGER DEFAULT NULL,
    remaining_session INTEGER NOT NULL DEFAULT 30,
    status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','done')),
    time_in           TEXT NOT NULL,        -- ISO datetime
    time_out          TEXT DEFAULT NULL,    -- ISO datetime
    created_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sitin_student  ON sitins(student_id);
CREATE INDEX IF NOT EXISTS idx_sitin_status   ON sitins(status);
CREATE INDEX IF NOT EXISTS idx_sitin_time_in  ON sitins(time_in);

-- ── PC Seats ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pc_seats (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    lab_id       INTEGER NOT NULL,
    pc_number    INTEGER NOT NULL,
    label        TEXT DEFAULT NULL,
    is_functional INTEGER DEFAULT 1,
    UNIQUE (lab_id, pc_number)
);

-- ── System Settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key   TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL DEFAULT '1',
    updated_at    TEXT DEFAULT (datetime('now'))
);

-- ── Feedback ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    sitin_id   INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    rating     INTEGER NOT NULL,
    comment    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sitin   ON feedback(sitin_id);

-- ── Read Announcements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS read_announcements (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL,
    announcement_id INTEGER NOT NULL,
    read_at         TEXT DEFAULT (datetime('now')),
    UNIQUE (student_id, announcement_id)
);

-- ── Reservation Notifications ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservation_notifications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id     INTEGER NOT NULL,
    reservation_id INTEGER NOT NULL,
    status         TEXT NOT NULL,
    is_read        INTEGER DEFAULT 0,
    created_at     TEXT DEFAULT (datetime('now')),
    UNIQUE (student_id, reservation_id, status)
);

-- ── Uploaded Files ───────────────────────────────────────────────────────────
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
);
CREATE INDEX IF NOT EXISTS idx_upl_category ON uploaded_files(category);

-- ── Lab Sessions ─────────────────────────────────────────────────────────────
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
);
CREATE INDEX IF NOT EXISTS idx_ls_student ON lab_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_ls_lab     ON lab_sessions(lab_id);

-- ── Activity Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_name  TEXT DEFAULT NULL,
    action_type TEXT DEFAULT NULL,
    description TEXT,
    entity_type TEXT DEFAULT NULL,
    entity_id   INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- ── Default seed data ────────────────────────────────────────────────────────

-- Default system setting
INSERT OR IGNORE INTO system_settings (setting_key, setting_value)
VALUES ('reservation_enabled', '1');

-- Seed labs
INSERT OR IGNORE INTO labs (name, capacity, is_active, software_list, software_pdf)
VALUES
    ('Lab 524', 40, 1, '["Windows 11 Education","Visual Studio Code","Python 3.12","Git Bash","Docker Desktop","Node.js","Postman"]', NULL),
    ('Lab 526', 40, 1, '["Ubuntu 22.04 LTS","IntelliJ IDEA Ultimate","Java JDK 17","MySQL Workbench","Eclipse IDE","Apache NetBeans","VirtualBox"]', NULL),
    ('Lab 528', 40, 1, '["Windows 10 IoT","Cisco Packet Tracer","Wireshark","Nmap","Metasploit Framework","Kali Linux (VM)","Putty"]', NULL),
    ('Lab 530', 40, 1, '["Microsoft Visual Studio 2022","SQL Server Management Studio","C# / .NET 8","Azure Data Studio","PowerShell 7","GitLab CE","Blazor Server Tools"]', NULL),
    ('Lab 542', 40, 1, '["Android Studio","Flutter SDK","Xcode (macOS lab)","Firebase CLI","React Native Debugger","Genymotion Emulator","Figma"]', NULL),
    ('Lab 544', 40, 1, '["Jupyter Notebook","Anaconda Navigator","RStudio","TensorFlow","PyTorch","Tableau Public","MongoDB Compass"]', NULL);
