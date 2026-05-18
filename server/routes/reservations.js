const express = require("express");
const router = express.Router();
const db = require("../db");

const validRooms = [524, 526, 528, 530, 542, 544];

function getReservationEnabled(callback) {
  db.get(
    `SELECT value FROM system_settings WHERE key = 'reservation_enabled'`,
    [],
    (err, row) => {
      if (err) return callback(err);
      callback(null, row ? row.value !== "false" : true);
    }
  );
}

function ensureStudentSession(studentId, callback) {
  db.get(
    `SELECT remaining_sessions FROM student_sessions WHERE student_id = ? ORDER BY id DESC LIMIT 1`,
    [studentId],
    (sessionErr, sessionRow) => {
      if (sessionErr) return callback(sessionErr);
      if (sessionRow) return callback(null, sessionRow);

      db.get(
        `SELECT student_id FROM users WHERE student_id = ?`,
        [studentId],
        (userErr, userRow) => {
          if (userErr) return callback(userErr);
          if (!userRow) return callback(null, null);

          db.run(
            `INSERT INTO student_sessions (student_id, remaining_sessions) VALUES (?, 30)`,
            [studentId],
            (insertErr) => {
              if (insertErr) return callback(insertErr);
              callback(null, { remaining_sessions: 30 });
            }
          );
        }
      );
    }
  );
}

router.post("/", (req, res) => {
  const { student_id, purpose, room, date, start_time, end_time } = req.body;

  if (!student_id || !purpose || !room || !date || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  if (!validRooms.includes(Number(room))) {
    return res.status(400).json({ success: false, message: "Invalid room" });
  }

  getReservationEnabled((settingsErr, enabled) => {
    if (settingsErr) {
      return res.status(500).json({ success: false, message: "Failed to read reservation settings" });
    }

    if (!enabled) {
      return res.status(403).json({ success: false, message: "Reservations are currently disabled by the admin." });
    }

    ensureStudentSession(student_id, (sessionErr, sessionRow) => {
        if (sessionErr) {
          return res.status(500).json({ success: false, message: "Server error" });
        }

        if (!sessionRow) {
          return res.status(400).json({ success: false, message: "Student not found" });
        }

        if (sessionRow.remaining_sessions <= 0) {
          return res.status(400).json({ success: false, message: "Maximum sessions reached!" });
        }

        const studentConflict = `
          SELECT * FROM reservations
          WHERE student_id = ?
          AND date = ?
          AND status IN ('pending', 'approved', 'ongoing')
          AND (? < end_time AND ? > start_time)
        `;

        db.get(studentConflict, [student_id, date, start_time, end_time], (studentConflictErr, row) => {
          if (studentConflictErr) {
            return res.status(500).json({ success: false, message: "Database error" });
          }

          if (row) {
            return res.status(400).json({
              success: false,
              message: "You already have a reservation at this time"
            });
          }

          const roomConflict = `
            SELECT * FROM reservations
            WHERE room = ?
            AND date = ?
            AND status IN ('pending', 'approved', 'ongoing')
            AND (? < end_time AND ? > start_time)
          `;

          db.get(roomConflict, [room, date, start_time, end_time], (roomConflictErr, roomRow) => {
            if (roomConflictErr) {
              return res.status(500).json({ success: false, message: "Database error" });
            }

            if (roomRow) {
              return res.status(400).json({
                success: false,
                message: "Room already reserved at this time"
              });
            }

            db.run(
              `INSERT INTO reservations (student_id, purpose, room, date, start_time, end_time, status)
               VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
              [student_id, purpose, room, date, start_time, end_time],
              function (insertErr) {
                if (insertErr) {
                  return res.status(500).json({ success: false, message: "Error creating reservation" });
                }

                db.run(
                  `UPDATE student_sessions
                   SET remaining_sessions = remaining_sessions - 1
                   WHERE student_id = ?`,
                  [student_id],
                  (updateErr) => {
                    if (updateErr) {
                      return res.status(500).json({ success: false, message: "Error updating sessions" });
                    }

                    res.json({ success: true, message: "Reservation successful!" });
                  }
                );
              }
            );
          });
        });
      }
    );
  });
});

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

module.exports = router;
