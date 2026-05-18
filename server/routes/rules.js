const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");

router.get("/", (req, res) => {
  db.all(
    `SELECT id, rule_text, title, description, is_active, created_at
     FROM lab_rules
     WHERE is_active = 1
     ORDER BY id ASC
     LIMIT 12`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to load rules" });
      }

      res.json({ success: true, rules: rows });
    }
  );
});

router.get("/admin", verifyToken, (req, res) => {
  db.all(
    `SELECT id, rule_text, title, description, is_active, created_at
     FROM lab_rules
     ORDER BY id ASC
     LIMIT 30`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to load rules" });
      }

      res.json({ success: true, rules: rows });
    }
  );
});

router.post("/", verifyToken, (req, res) => {
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

router.patch("/:id/toggle", verifyToken, (req, res) => {
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
