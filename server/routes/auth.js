const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const SECRET = "supersecretkey";

// LOGIN
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM admins WHERE username = ?",
    [username],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ message: "User not found" });
      }

      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Wrong password" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET,
        { expiresIn: "2h" }
      );

      res.json({ token });
    }
  );
});

module.exports = router;