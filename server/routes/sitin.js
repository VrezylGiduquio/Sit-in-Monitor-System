const express = require("express");
const router = express.Router();
const db = require("../db");
const { emitLeaderboardChanged } = require("../realtime");

router.get("/reservations", (req, res) => {
  const status = req.query.status || "pending";

  db.all(
    `SELECT * FROM reservations WHERE status = ? ORDER BY date ASC, start_time ASC`,
    [status],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json(rows);
    }
  );
});

// POST /admin/reservations/approve/:id
router.post("/reservations/approve/:id", (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE reservations SET status='ongoing' WHERE id=?`,
    [id],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Reservation approved" });
    }
  );
});

// POST /admin/reservations/terminate/:id
router.post("/reservations/terminate/:id", (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE reservations SET status='terminated' WHERE id=?`,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      emitLeaderboardChanged("reservation-terminated");
      res.json({ success: true, message: "Reservation terminated" });
    }
  );
});


module.exports = router;
