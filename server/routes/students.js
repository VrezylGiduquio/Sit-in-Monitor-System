const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");

// GET ALL
router.get("/", verifyToken, (req, res) => {
  db.all(`
    SELECT 
      u.id,
      u.student_id,
      u.first_name || ' ' || u.last_name AS name,
      u.course_level AS year_level,
      u.course,
      COALESCE(s.remaining_sessions, 30) AS remaining_sessions
    FROM users u
    LEFT JOIN student_sessions s 
      ON u.student_id = s.student_id
  `, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// GET LOGGED-IN STUDENT (UPDATED)
router.get("/me", verifyToken, (req, res) => {
  const userId = req.user.id; // from JWT

  db.get(
    `SELECT 
       u.student_id,
       u.first_name,
       u.last_name,
       u.middle_name,
       u.course_level AS year_level,
       u.course,
       u.email
     FROM users u
     WHERE u.id = ?`,
    [userId],
    (err, student) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      if (!student) return res.status(404).json({ success: false, message: "Student not found" });

      // Count active reservations
      db.all(
        `SELECT COUNT(*) AS activeCount 
         FROM reservations 
         WHERE student_id = ? AND status != 'terminated'`,
        [student.student_id],
        (err2, countRows) => {
          if (err2) return res.status(500).json({ success: false, message: "Database error" });

          const totalSessions = 30;
          const usedSessions = countRows[0].activeCount || 0;
          student.remaining_sessions = totalSessions - usedSessions;

          res.json(student);
        }
      );
    }
  );
});

// ADD
router.post("/", verifyToken, (req, res) => {
  const { student_id } = req.body;

  db.run(
    `INSERT INTO student_sessions (student_id, remaining_sessions)
     VALUES (?, 30)`,
    [student_id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

//PUT
router.put("/:student_id", verifyToken, (req, res) => {
  const { student_id } = req.params;
  const { first_name, last_name, middle_name, course_level, course, email, remaining_sessions } = req.body;

  db.serialize(() => {
    db.run(`
      UPDATE users
      SET first_name = ?, last_name = ?, middle_name = ?, course_level = ?, course = ?, email = ?
      WHERE student_id = ?
    `, [first_name, last_name, middle_name, course_level, course, email, student_id]);

    db.run(`
      UPDATE student_sessions
      SET remaining_sessions = ?
      WHERE student_id = ?
    `, [remaining_sessions, student_id], function(err) {
      if (err) return res.status(500).json(err);
      res.json({ updated: this.changes });
    });
  });
});

//DELETE
router.delete("/:student_id", verifyToken, (req, res) => {
  const { student_id } = req.params;

  db.serialize(() => {
    db.run(
      `DELETE FROM student_sessions WHERE student_id = ?`,
      [student_id]
    );

    db.run(
      `DELETE FROM users WHERE student_id = ?`,
      [student_id],
      function (err) {
        if (err) return res.status(500).json(err);

        res.json({ deleted: this.changes });
      }
    );
  });
});

module.exports = router;