const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const { SECRET } = require("../config/jwt");
const { addLeaderboardClient } = require("../realtime");

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0 mins";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}h ${minutes} mins`;
  if (hours) return `${hours}hs`;
  return `${minutes} mins`;
}

function getMinutesExpression() {
  return `
    CASE
      WHEN end_time IS NOT NULL
       AND start_time IS NOT NULL
       AND time(end_time) > time(start_time)
      THEN CAST((strftime('%s', '2000-01-01 ' || end_time) - strftime('%s', '2000-01-01 ' || start_time)) / 60 AS INTEGER)
      ELSE 0
    END
  `;
}

function buildLeaderboardMetrics(rows = []) {
  const normalizedRows = rows.map((row, index) => {
    const totalMinutes = Number(row.total_minutes || 0);
    const sessions = Number(row.sessions || 0);

    return {
      rank: index + 1,
      studentId: row.student_id,
      name: row.name || row.student_id,
      sessions,
      totalMinutes,
      totalHoursLabel: `${(totalMinutes / 60).toFixed(1).replace(".0", "")}h`,
      averageHoursLabel: sessions
        ? `${(totalMinutes / sessions / 60).toFixed(1).replace(".0", "")}h`
        : "0h"
    };
  });

  const totalMinutes = normalizedRows.reduce((sum, row) => sum + row.totalMinutes, 0);
  const totalSessions = normalizedRows.reduce((sum, row) => sum + row.sessions, 0);

  return {
    rows: normalizedRows,
    summary: {
      rankedStudents: normalizedRows.length,
      totalHoursLabel: `${(totalMinutes / 60).toFixed(1).replace(".0", "")}h`,
      totalSessions,
      averageHoursLabel: normalizedRows.length
        ? `${(totalMinutes / normalizedRows.length / 60).toFixed(1).replace(".0", "")}h`
        : "0h"
    }
  };
}

function loadLeaderboard(callback, limit = null) {
  const minutesExpr = getMinutesExpression();
  const limitClause = Number.isInteger(limit) && limit > 0 ? `LIMIT ${limit}` : "";

  db.all(
    `
    SELECT
      u.student_id,
      TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS name,
      COALESCE(SUM(${minutesExpr}), 0) AS total_minutes,
      COUNT(r.id) AS sessions
    FROM users u
    LEFT JOIN reservations r
      ON r.student_id = u.student_id
     AND r.status = 'terminated'
    GROUP BY u.student_id, u.first_name, u.last_name
    ORDER BY total_minutes DESC, sessions DESC, u.student_id ASC
    ${limitClause}
    `,
    [],
    callback
  );
}

function listAnnouncements(callback) {
  db.all(
    `SELECT id, title, message, is_active, created_at
     FROM announcements
     ORDER BY created_at DESC
     LIMIT 20`,
    [],
    callback
  );
}

function listRules(callback) {
  db.all(
    `SELECT id, rule_text, title, description, is_active, created_at
     FROM lab_rules
     ORDER BY id ASC
     LIMIT 30`,
    [],
    callback
  );
}

router.get("/dashboard", verifyToken, (req, res) => {
  const minutesExpr = getMinutesExpression();

  db.serialize(() => {
    db.get(
      `
      SELECT
        COUNT(*) AS total_sessions,
        COALESCE(SUM(${minutesExpr}), 0) AS total_minutes,
        COALESCE(AVG(${minutesExpr}), 0) AS average_minutes,
        COALESCE(MAX(${minutesExpr}), 0) AS longest_minutes,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
        COALESCE(SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END), 0) AS completed_count
      FROM reservations
      `,
      [],
      (statsErr, statsRow) => {
        if (statsErr) {
          return res.status(500).json({ success: false, message: "Failed to load analytics" });
        }

        db.get(`SELECT COUNT(*) AS total_students FROM users`, [], (studentErr, studentRow) => {
          if (studentErr) {
            return res.status(500).json({ success: false, message: "Failed to load student count" });
          }

          loadLeaderboard((leaderboardErr, leaderboardRows) => {
              if (leaderboardErr) {
                return res.status(500).json({ success: false, message: "Failed to load leaderboard" });
              }

              db.all(
                `
                SELECT
                  room,
                  COUNT(*) AS reservations,
                  COALESCE(SUM(${minutesExpr}), 0) AS total_minutes
                FROM reservations
                GROUP BY room
                ORDER BY reservations DESC, total_minutes DESC
                LIMIT 3
                `,
                [],
                (roomErr, roomRows) => {
                  if (roomErr) {
                    return res.status(500).json({ success: false, message: "Failed to load room analytics" });
                  }

                  db.all(
                    `
                    SELECT
                      date,
                      COUNT(*) AS reservations
                    FROM reservations
                    GROUP BY date
                    ORDER BY date DESC
                    LIMIT 7
                    `,
                    [],
                    (trendErr, trendRows) => {
                      if (trendErr) {
                        return res.status(500).json({ success: false, message: "Failed to load activity trend" });
                      }

                      const totalMinutes = Number(statsRow.total_minutes || 0);
                      const averageMinutes = Math.round(Number(statsRow.average_minutes || 0));
                      const longestMinutes = Number(statsRow.longest_minutes || 0);
                      const totalSessions = Number(statsRow.total_sessions || 0);
                      const pendingCount = Number(statsRow.pending_count || 0);
                      const completedCount = Number(statsRow.completed_count || 0);
                      const totalStudents = Number(studentRow.total_students || 0);
                      const topRoom = roomRows[0];

                      const recommendation = totalSessions === 0
                        ? "No session history yet. Encourage initial reservations so the dashboard can build stronger scheduling recommendations."
                        : pendingCount > completedCount
                          ? `Pending reservations are higher than completed sessions. Prioritize approval flow${topRoom ? ` and prepare Lab ${topRoom.room}` : ""} for the next batch.`
                          : topRoom
                            ? `Lab ${topRoom.room} is currently the busiest location. Consider redistributing upcoming reservations to lower-traffic labs to balance workstation usage.`
                            : "Usage looks balanced. Continue monitoring session duration and approval volume for peak-hour shifts.";

                      res.json({
                        success: true,
                        stats: {
                          totalSitInHours: `${(totalMinutes / 60).toFixed(1).replace(".0", "")}hs`,
                          numberOfSessions: totalSessions,
                          averageSessionDuration: formatDuration(averageMinutes),
                          longestSession: formatDuration(longestMinutes),
                          pendingReservations: pendingCount,
                          completedSessions: completedCount,
                          totalStudents
                        },
                        leaderboard: buildLeaderboardMetrics(leaderboardRows).rows,
                        analytics: {
                          topRooms: roomRows.map((row) => ({
                            room: row.room,
                            reservations: Number(row.reservations || 0),
                            totalHoursLabel: `${(Number(row.total_minutes || 0) / 60).toFixed(1).replace(".0", "")}h`
                          })),
                          recentActivity: trendRows.reverse().map((row) => ({
                            date: row.date,
                            reservations: Number(row.reservations || 0)
                          }))
                        },
                        recommendation
                      });
                    }
                  );
                }
              );
            }, 5);
        });
      }
    );
  });
});

router.get("/leaderboard", verifyToken, (req, res) => {
  loadLeaderboard((err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Failed to load leaderboard" });
    }

    const leaderboard = buildLeaderboardMetrics(rows);

    res.json({
      success: true,
      summary: leaderboard.summary,
      podium: leaderboard.rows.slice(0, 3),
      leaderboard: leaderboard.rows
    });
  });
});

router.get("/leaderboard/events", (req, res) => {
  const token = String(req.query.token || "");

  jwt.verify(token, SECRET, (err) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });

    res.write("event: connected\n");
    res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
    addLeaderboardClient(res);
  });
});

router.get("/announcements", verifyToken, (req, res) => {
  listAnnouncements((err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Failed to load announcements" });
    }

    res.json({ success: true, announcements: rows });
  });
});

router.post("/announcements", verifyToken, (req, res) => {
  const title = String(req.body.title || "").trim();
  const message = String(req.body.message || "").trim();

  if (!title || !message) {
    return res.status(400).json({ success: false, message: "Title and message are required" });
  }

  db.run(
    `INSERT INTO announcements (title, message, is_active) VALUES (?, ?, 1)`,
    [title, message],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to save announcement" });
      }

      res.json({
        success: true,
        message: "Announcement posted.",
        announcement: {
          id: this.lastID,
          title,
          message,
          is_active: 1
        }
      });
    }
  );
});

router.patch("/announcements/:id/toggle", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  const isActive = req.body.is_active ? 1 : 0;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: false, message: "Invalid announcement ID" });
  }

  db.run(
    `UPDATE announcements SET is_active = ? WHERE id = ?`,
    [isActive, id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to update announcement" });
      }

      if (!this.changes) {
        return res.status(404).json({ success: false, message: "Announcement not found" });
      }

      res.json({ success: true, is_active: isActive });
    }
  );
});

router.get("/rules", verifyToken, (req, res) => {
  listRules((err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Failed to load rules" });
    }

    res.json({ success: true, rules: rows });
  });
});

router.post("/rules", verifyToken, (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const ruleText = String(req.body.rule_text || "").trim();
  const finalRuleText = ruleText || [title, description].filter(Boolean).join(": ");

  if (!finalRuleText) {
    return res.status(400).json({ success: false, message: "Rule text is required" });
  }

  db.run(
    `INSERT INTO lab_rules (rule_text, title, description, is_active) VALUES (?, ?, ?, 1)`,
    [finalRuleText, title || null, description || null],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to save rule" });
      }

      res.json({
        success: true,
        message: "Rule added.",
        rule: {
          id: this.lastID,
          rule_text: finalRuleText,
          title,
          description,
          is_active: 1
        }
      });
    }
  );
});

router.patch("/rules/:id/toggle", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  const isActive = req.body.is_active ? 1 : 0;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: false, message: "Invalid rule ID" });
  }

  db.run(
    `UPDATE lab_rules SET is_active = ? WHERE id = ?`,
    [isActive, id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to update rule" });
      }

      if (!this.changes) {
        return res.status(404).json({ success: false, message: "Rule not found" });
      }

      res.json({ success: true, is_active: isActive });
    }
  );
});

module.exports = router;
