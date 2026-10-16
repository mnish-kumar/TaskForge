const cookie = require("../utils/cookie");


const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers?.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }
    const decoded = cookie.verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};

module.exports = authMiddleware;
