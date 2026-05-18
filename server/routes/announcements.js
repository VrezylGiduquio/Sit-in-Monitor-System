const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");

router.get("/", (req, res) => {
  db.all(
    `SELECT id, title, message, is_active, created_at
     FROM announcements
     WHERE is_active = 1
     ORDER BY created_at DESC
     LIMIT 8`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to load announcements" });
      }

      res.json({ success: true, announcements: rows });
    }
  );
});

router.get("/admin", verifyToken, (req, res) => {
  db.all(
    `SELECT id, title, message, is_active, created_at
     FROM announcements
     ORDER BY created_at DESC
     LIMIT 20`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to load announcements" });
      }

      res.json({ success: true, announcements: rows });
    }
  );
});

router.post("/", verifyToken, (req, res) => {
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

router.patch("/:id/toggle", verifyToken, (req, res) => {
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

module.exports = router;
