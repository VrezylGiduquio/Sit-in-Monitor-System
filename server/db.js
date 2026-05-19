const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database(path.join(__dirname, "..", "school.db"), (err) => {
  if (err) console.error(err.message);
  console.log("SQLite Connected");
});

const defaultLabRules = [
  {
    title: "Proper Conduct and Discipline",
    description: "Students must behave respectfully at all times and follow all instructions from instructors or lab personnel."
  },
  {
    title: "Authorized System Usage Only",
    description: "Computers must be used strictly for academic purposes. Accessing inappropriate websites, installing unauthorized software, or attempting to modify system settings is prohibited."
  },
  {
    title: "Proper Login and Accountability",
    description: "Students must log in using their own accounts and are responsible for all activities done under their credentials. Sharing accounts is not allowed."
  },
  {
    title: "Time Management and Logout Policy",
    description: "Students must follow their assigned sit-in schedule and properly log out after use. Overstaying without permission is not allowed."
  },
  {
    title: "Equipment Care and Monitoring Compliance",
    description: "All laboratory equipment must be handled with care. All activities may be monitored, and violations may result in penalties or loss of privileges."
  }
];

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS student_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    remaining_sessions INTEGER DEFAULT 30,

    FOREIGN KEY (student_id) REFERENCES users(student_id)
    );
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE,
    last_name TEXT,
    first_name TEXT,
    middle_name TEXT,
    course_level TEXT,
    email TEXT UNIQUE,
    password TEXT,
    course TEXT,
    address TEXT,
    profile_photo TEXT
  )
`);

  db.run(`ALTER TABLE users ADD COLUMN profile_photo TEXT`, (err) => {
    if (err && !String(err.message || "").includes("duplicate column name")) {
      console.error(err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lab_software (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      software TEXT NOT NULL,
      seats TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lab_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_text TEXT NOT NULL,
      title TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`ALTER TABLE lab_rules ADD COLUMN title TEXT`, (err) => {
    if (err && !String(err.message || "").includes("duplicate column name")) {
      console.error(err.message);
    }
  });

  db.run(`ALTER TABLE lab_rules ADD COLUMN description TEXT`, (err) => {
    if (err && !String(err.message || "").includes("duplicate column name")) {
      console.error(err.message);
    }
  });

  db.get(`SELECT COUNT(*) AS count FROM lab_rules`, (err, row) => {
    if (err || row.count > 0) return;

    const stmt = db.prepare(
      `INSERT INTO lab_rules (rule_text, title, description, is_active) VALUES (?, ?, ?, 1)`
    );

    defaultLabRules.forEach((rule) => {
      stmt.run([`${rule.title}: ${rule.description}`, rule.title, rule.description]);
    });

    stmt.finalize();
  });

  db.run(
    `INSERT OR IGNORE INTO system_settings (key, value) VALUES ('reservation_enabled', 'true')`
  );

  db.run(`
    INSERT INTO student_sessions (student_id, remaining_sessions)
    SELECT u.student_id, 30
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1
      FROM student_sessions s
      WHERE s.student_id = u.student_id
    )
  `);


  // Create default admin
  db.get("SELECT * FROM admins WHERE username = 'admin'", (err, row) => {
    if (!row) {
      const hashed = bcrypt.hashSync("admin123", 8);
      db.run(
        "INSERT INTO admins (username, password) VALUES (?, ?)",
        ["admin", hashed]
      );
      console.log("Default Admin: admin / admin123");
    }
  });
});

db.run(`
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    purpose TEXT,
    room INTEGER,
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
