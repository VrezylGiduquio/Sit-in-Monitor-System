


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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS labs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  capacity INT NOT NULL DEFAULT 40,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  software_list TEXT DEFAULT NULL,
  software_pdf VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
  status ENUM('pending','approved','cancelled') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_res_student (student_id),
  KEY idx_res_lab_date (lab, date),
  KEY idx_res_status (status)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_name VARCHAR(100) DEFAULT NULL,
  action_type VARCHAR(50) DEFAULT NULL,
  description TEXT,
  entity_type VARCHAR(50) DEFAULT NULL,
  entity_id INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pc_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT NOT NULL,
  pc_number INT NOT NULL,
  label VARCHAR(20) DEFAULT NULL,
  is_functional TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_lab_pc (lab_id, pc_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL DEFAULT '1',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sitin_id INT NOT NULL,
  student_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_feedback_student (student_id),
  KEY idx_feedback_sitin (sitin_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS read_announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  announcement_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_ann (student_id, announcement_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservation_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  reservation_id INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rsv_notif (student_id, reservation_id, status)
) ENGINE=InnoDB;

INSERT INTO system_settings (setting_key, setting_value)
VALUES ('reservation_enabled', '1')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO labs (name, capacity, is_active, software_list, software_pdf)
VALUES
  ('Lab 524', 40, 1, '["Windows 11 Education","Visual Studio Code","Python 3.12","Git Bash","Docker Desktop","Node.js","Postman"]', NULL),
  ('Lab 526', 40, 1, '["Ubuntu 22.04 LTS","IntelliJ IDEA Ultimate","Java JDK 17","MySQL Workbench","Eclipse IDE","Apache NetBeans","VirtualBox"]', NULL),
  ('Lab 528', 40, 1, '["Windows 10 IoT","Cisco Packet Tracer","Wireshark","Nmap","Metasploit Framework","Kali Linux (VM)","Putty"]', NULL),
  ('Lab 530', 40, 1, '["Microsoft Visual Studio 2022","SQL Server Management Studio","C# / .NET 8","Azure Data Studio","PowerShell 7","GitLab CE","Blazor Server Tools"]', NULL),
  ('Lab 542', 40, 1, '["Android Studio","Flutter SDK","Xcode (macOS lab)","Firebase CLI","React Native Debugger","Genymotion Emulator","Figma"]', NULL),
  ('Lab 544', 40, 1, '["Jupyter Notebook","Anaconda Navigator","RStudio","TensorFlow","PyTorch","Tableau Public","MongoDB Compass"]', NULL)
ON DUPLICATE KEY UPDATE
  capacity = VALUES(capacity),
  is_active = VALUES(is_active),
  software_list = VALUES(software_list),
  software_pdf = VALUES(software_pdf);
