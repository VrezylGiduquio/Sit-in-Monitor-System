const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");

router.get("/reservation", (req, res) => {
  db.get(
    `SELECT value FROM system_settings WHERE key = 'reservation_enabled'`,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to load reservation setting" });
      }

      res.json({
        success: true,
        enabled: row ? row.value !== "false" : true
      });
    }
  );
});

router.put("/reservation", verifyToken, (req, res) => {
  const enabled = req.body.enabled !== false;

  db.run(
    `INSERT INTO system_settings (key, value)
     VALUES ('reservation_enabled', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(enabled)],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to update reservation setting" });
      }

      res.json({ success: true, enabled });
    }
  );
});

module.exports = router;
