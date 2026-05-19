const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { SECRET } = require("../config/jwt");
const { emitLeaderboardChanged } = require("../realtime");

// REGISTER
router.post("/register", (req, res) => {
  const {
    student_id,
    last_name,
    first_name,
    middle_name,
    course_level,
    email,
    password,
    course,
    address
  } = req.body;

  if (!student_id || !last_name || !first_name || !course_level || !email || !password) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users 
    (student_id, last_name, first_name, middle_name, course_level, email, password, course, address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, last_name, first_name, middle_name, course_level, email, hashed, course, address],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "User already exists or error" });
      }

      db.run(
        `INSERT INTO student_sessions (student_id, remaining_sessions) VALUES (?, 30)`,
        [student_id],
        (sessionErr) => {
          if (sessionErr) {
            console.error(sessionErr);
            return res.status(500).json({ message: "Registered but failed to initialize sessions" });
          }

          emitLeaderboardChanged("student-registered");
          res.json({ message: "Registered successfully" });
        }
      );
    }
  );
});

// LOGIN
router.post("/login", (req, res) => {
  const { student_id, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE student_id = ?",
    [student_id],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ message: "User not found" });
      }

      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Wrong password" });
      }

      const token = jwt.sign(
        { id: user.id, student_id: user.student_id },
        SECRET,
        { expiresIn: "2h" }
      );

      res.json({ token });
    }
  );
});

module.exports = router;
