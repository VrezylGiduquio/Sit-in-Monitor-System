const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");

router.get("/", (req, res) => {
  db.all(
    `SELECT id, room, software, seats, status, updated_at
     FROM lab_software
     ORDER BY room ASC, software ASC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to load software inventory" });
      }

      res.json({ success: true, items: rows });
    }
  );
});

router.post("/import", verifyToken, (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!items.length) {
    return res.status(400).json({ success: false, message: "No software rows provided" });
  }

  const cleaned = items
    .map((item) => ({
      room: String(item.room || "").trim(),
      software: String(item.software || "").trim(),
      seats: String(item.seats || "").trim(),
      status: String(item.status || "").trim()
    }))
    .filter((item) => item.room && item.software && item.seats && item.status);

  if (!cleaned.length) {
    return res.status(400).json({ success: false, message: "No valid rows found in upload" });
  }

  db.serialize(() => {
    db.run(`DELETE FROM lab_software`, [], (deleteErr) => {
      if (deleteErr) {
        return res.status(500).json({ success: false, message: "Failed to reset software inventory" });
      }

      const stmt = db.prepare(
        `INSERT INTO lab_software (room, software, seats, status) VALUES (?, ?, ?, ?)`
      );

      cleaned.forEach((item) => {
        stmt.run([item.room, item.software, item.seats, item.status]);
      });

      stmt.finalize((insertErr) => {
        if (insertErr) {
          return res.status(500).json({ success: false, message: "Failed to import software inventory" });
        }

        res.json({
          success: true,
          message: "Software inventory uploaded successfully.",
          count: cleaned.length
        });
      });
    });
  });
});

module.exports = router;
