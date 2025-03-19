const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.json({
      status: 401,
      data: { message: "Access denied. No token provided." },
    });
  }
  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", "").trim(),
      "SECRET_KEY"
    );
    req.user = decoded;
    next();
  } catch (error) {
    res.json({
      status: 401,
      data: { message: "Invalid token", error: error },
    });
  }
};

module.exports = authenticate;
