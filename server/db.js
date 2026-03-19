const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("./school.db", (err) => {
  if (err) console.error(err.message);
  console.log("SQLite Connected");
});

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
    address TEXT
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


module.exports = db;