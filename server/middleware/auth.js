const jwt = require("jsonwebtoken");
const SECRET = "supersecretkey";

function verifyToken(req, res, next) {
  const bearer = req.headers["authorization"];

  if (!bearer) return res.status(401).json({ message: "No token" });

  const token = bearer.split(" ")[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;