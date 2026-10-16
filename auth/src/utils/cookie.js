const jwt = require('jsonwebtoken');

const refreshTokenCokkieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, refreshTokenCokkieOptions);
}

const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", refreshTokenCokkieOptions);
}

const refreshToken = (id, username, email, familyId, sessionId) => {
  return jwt.sign({ id, username, email, familyId, sessionId }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

const accessToken = (id, username, email) => {
  return jwt.sign({ id, username, email }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    throw new Error("Invalid access token.");
  }
}

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    throw new Error("Invalid refresh token.");
  }
}

module.exports = {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  refreshToken,
  accessToken,
  verifyAccessToken,
  verifyRefreshToken,
};