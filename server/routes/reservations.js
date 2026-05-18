const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");

// Valid rooms
const validRooms = [524, 526, 528, 530, 542, 544];

// ➕ CREATE RESERVATION
router.post("/", (req, res) => {
  const { student_id, purpose, room, date, start_time, end_time } = req.body;

  // VALIDATION
  if (!student_id || !purpose || !room || !date || !start_time || !end_time) {
    return res.json({ success: false, message: "All fields required" });
  }

  if (!validRooms.includes(Number(room))) {
    return res.json({ success: false, message: "Invalid room" });
  }

  // CHECK STUDENT CONFLICT
  const studentConflict = `
    SELECT * FROM reservations
    WHERE student_id = ?
    AND date = ?
    AND status IN ('pending', 'approved')
    AND (? < end_time AND ? > start_time)
  `;

  db.get(studentConflict, [student_id, date, start_time, end_time], (err, row) => {
    if (err) return res.json({ success: false, message: "Database error" });
    if (row)
      return res.json({
        success: false,
        message: "You already have a reservation at this time",
      });

    // CHECK ROOM CONFLICT
    const roomConflict = `
      SELECT * FROM reservations
      WHERE room = ?
      AND date = ?
      AND status IN ('pending', 'approved')
      AND (? < end_time AND ? > start_time)
    `;

    db.get(roomConflict, [room, date, start_time, end_time], (err, r) => {
      if (err) return res.json({ success: false, message: "Database error" });
      if (r)
        return res.json({
          success: false,
          message: "Room already reserved at this time",
        });

      // INSERT RESERVATION
      db.run(
        `INSERT INTO reservations (student_id, purpose, room, date, start_time, end_time) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [student_id, purpose, room, date, start_time, end_time],
        (err) => {
          if (err) return res.json({ success: false, message: "Database error" });

          res.json({ success: true, message: "Reservation submitted" });
        }
      );
    });
  });
});

// 📄 GET RESERVATIONS FOR A STUDENT
router.get("/my/:student_id", (req, res) => {
  const { student_id } = req.params;

  db.all(
    `SELECT * FROM reservations 
     WHERE student_id = ? 
     AND status != 'terminated'
     ORDER BY date DESC, start_time ASC`,
    [student_id],
    (err, rows) => {
      if (err) return res.json([]);
      res.json(rows);
    }
  );
});

// 📄 GET TERMINATED RESERVATIONS FOR A STUDENT
router.get("/terminated/:student_id", (req, res) => {
  const { student_id } = req.params;

  db.all(
    `SELECT * FROM reservations 
     WHERE student_id = ? AND status = 'terminated'
     ORDER BY date DESC, start_time ASC`,
    [student_id],
    (err, rows) => {
      if (err) return res.json([]);
      res.json(rows);
    }
  );
});

router.post("/", verifyToken, (req, res) => {
  const { student_id, purpose, room, date, start_time, end_time } = req.body;

  // 1. Check remaining sessions
  db.get(
    `SELECT remaining_sessions FROM student_sessions WHERE student_id = ?`,
    [student_id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!row) return res.status(400).json({ success: false, message: "Student not found" });

      if (row.remaining_sessions <= 0) {
        return res.status(400).json({ success: false, message: "Maximum sessions reached!" });
      }

      // 2. Insert reservation
      db.run(
        `INSERT INTO reservations (student_id, purpose, room, date, start_time, end_time, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [student_id, purpose, room, date, start_time, end_time],
        function (err) {
          if (err) return res.status(500).json({ success: false, message: "Error creating reservation" });

          // 3. Deduct remaining session
          db.run(
            `UPDATE student_sessions SET remaining_sessions = remaining_sessions - 1 WHERE student_id = ?`,
            [student_id],
            (err2) => {
              if (err2) console.error("Error updating sessions:", err2);
              res.json({ success: true, message: "Reservation successful!" });
            }
          );
        }
      );
    }
  );
});

module.exports = router;