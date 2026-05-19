const express = require("express");
const router = express.Router();
const db = require("../db");

const validRooms = [524, 526, 528, 530, 542, 544];
const SLOT_DURATION_MINUTES = 90;
const PURPOSE_ROOM_MAP = {
  Research: [524, 526],
  "Project Development": [526, 530, 544],
  "Assignment / Lab Activity": [524, 528, 530],
  "Thesis / Capstone": [542, 544],
  "Programming Practice": [526, 528, 542]
};
const ROOM_SCHEDULES = {
  524: {
    1: ["07:30", "09:00", "10:30", "13:00", "14:30", "16:00"],
    2: ["07:30", "09:00", "10:30", "13:00", "14:30", "16:00"],
    3: ["08:00", "09:30", "11:00", "13:30", "15:00"],
    4: ["08:00", "09:30", "11:00", "13:30", "15:00"],
    5: ["07:30", "09:00", "10:30", "13:00", "14:30"]
  },
  526: {
    1: ["08:00", "09:30", "11:00", "13:30", "15:00"],
    2: ["08:00", "09:30", "11:00", "13:30", "15:00"],
    3: ["07:30", "09:00", "10:30", "13:00", "14:30"],
    4: ["07:30", "09:00", "10:30", "13:00", "14:30"],
    5: ["08:30", "10:00", "11:30", "13:30", "15:00"]
  },
  528: {
    1: ["07:30", "09:00", "10:30", "12:30", "14:00"],
    2: ["07:30", "09:00", "10:30", "12:30", "14:00"],
    3: ["08:30", "10:00", "11:30", "13:30", "15:00"],
    4: ["08:30", "10:00", "11:30", "13:30", "15:00"],
    5: ["07:30", "09:00", "10:30", "13:00", "14:30"]
  },
  530: {
    1: ["08:30", "10:00", "11:30", "13:30", "15:00"],
    2: ["08:30", "10:00", "11:30", "13:30", "15:00"],
    3: ["08:00", "09:30", "11:00", "13:00", "14:30"],
    4: ["08:00", "09:30", "11:00", "13:00", "14:30"],
    5: ["07:30", "09:00", "10:30", "12:30", "14:00"]
  },
  542: {
    1: ["07:30", "09:00", "10:30", "13:00", "14:30"],
    2: ["08:30", "10:00", "11:30", "13:30", "15:00"],
    3: ["07:30", "09:00", "10:30", "13:00", "14:30"],
    4: ["08:00", "09:30", "11:00", "13:30", "15:00"],
    5: ["07:30", "09:00", "10:30", "12:30", "14:00"]
  },
  544: {
    1: ["08:00", "09:30", "11:00", "13:00", "14:30"],
    2: ["07:30", "09:00", "10:30", "13:30", "15:00"],
    3: ["08:00", "09:30", "11:00", "13:00", "14:30"],
    4: ["07:30", "09:00", "10:30", "12:30", "14:00"],
    5: ["08:30", "10:00", "11:30", "13:30", "15:00"]
  }
};

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

function toMinutes(timeValue) {
  const [hours, minutes] = String(timeValue || "").split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
}

function formatTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getDayOfWeek(dateValue) {
  const [year, month, day] = String(dateValue || "").split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getDay();
}

function getScheduleSlots(room, dateValue) {
  const dayOfWeek = getDayOfWeek(dateValue);
  if (!dayOfWeek || dayOfWeek === 0 || dayOfWeek === 6) return [];

  return (ROOM_SCHEDULES[Number(room)]?.[dayOfWeek] || []).map((startTime) => ({
    start_time: startTime,
    end_time: formatTime(toMinutes(startTime) + SLOT_DURATION_MINUTES),
    label: `${startTime} - ${formatTime(toMinutes(startTime) + SLOT_DURATION_MINUTES)}`
  }));
}

function isValidScheduleSlot(room, dateValue, startTime, endTime) {
  return getScheduleSlots(room, dateValue).some((slot) =>
    slot.start_time === startTime && slot.end_time === endTime
  );
}

function isValidPurposeRoom(purpose, room) {
  const allowedRooms = PURPOSE_ROOM_MAP[String(purpose || "").trim()];
  return Array.isArray(allowedRooms) && allowedRooms.includes(Number(room));
}

router.get("/schedule", (req, res) => {
  const room = Number(req.query.room);
  const date = String(req.query.date || "");
  const purpose = String(req.query.purpose || "").trim();

  if (!validRooms.includes(room)) {
    return res.status(400).json({ success: false, message: "Invalid room" });
  }

  if (purpose && !isValidPurposeRoom(purpose, room)) {
    return res.status(400).json({
      success: false,
      message: `Lab ${room} is not available for ${purpose}. Please choose one of the recommended rooms.`
    });
  }

  if (!date) {
    return res.status(400).json({ success: false, message: "Date is required" });
  }

  const dayOfWeek = getDayOfWeek(date);
  if (dayOfWeek === null) {
    return res.status(400).json({ success: false, message: "Invalid date" });
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return res.json({ success: true, slots: [], message: "No schedule available on weekends. Please choose Monday to Friday." });
  }

  res.json({
    success: true,
    slots: getScheduleSlots(room, date),
    duration_minutes: SLOT_DURATION_MINUTES
  });
});

router.post("/", (req, res) => {
  const { student_id, purpose, room, date, start_time, end_time } = req.body;

  if (!student_id || !purpose || !room || !date || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  if (!validRooms.includes(Number(room))) {
    return res.status(400).json({ success: false, message: "Invalid room" });
  }

  if (!isValidPurposeRoom(purpose, room)) {
    return res.status(400).json({
      success: false,
      message: `Lab ${room} is not available for ${purpose}. Please choose one of the recommended rooms.`
    });
  }

  if (!isValidScheduleSlot(room, date, start_time, end_time)) {
    return res.status(400).json({
      success: false,
      message: "Please choose one of the fixed schedule slots for this room and date."
    });
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
