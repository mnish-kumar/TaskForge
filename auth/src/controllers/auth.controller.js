const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asynchandler");
const AppError = require("../utils/appError");
const crypto = require("../utils/crypto");
const refreshTokenModel = require("../models/refreshToken.model");
const cookie = require("../utils/cookie");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new AppError("Username or email is already registered.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.create({
      username,
      email,
      password: hashedPassword,
    });

    const familyId = crypto.generateFamilyId();
    const sessionId = crypto.generateSessionId();

    const accessToken = cookie.accessToken(
      newUser._id,
      newUser.username,
      newUser.email,
    );
    const refreshToken = cookie.refreshToken(
      newUser._id,
      newUser.username,
      newUser.email,
      familyId,
      sessionId,
    );

    const hashedRefreshToken = crypto.hashToken(refreshToken);
    await refreshTokenModel.create({
      userId: newUser._id,
      tokenHash: hashedRefreshToken,
      familyId,
      sessionId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    cookie.setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
      },
      accessToken: accessToken,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Username or email is already registered.", 409);
    }
    throw error;
  }
});

/**
 * @desc    Login a user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;


  try {
    const user = await userModel.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError("Invalid email/password.", 401);
    }

    if (user.status !== "active") {
      throw new AppError("User account is inactive.", 403);
    }

    const familyId = crypto.generateFamilyId();
    const sessionId = crypto.generateSessionId();

    const accessToken = cookie.accessToken(user._id, user.username, user.email);
    const refreshToken = cookie.refreshToken(
      user._id,
      user.username,
      user.email,
      familyId,
      sessionId
    );

    const hashedRefreshToken = crypto.hashToken(refreshToken);

    await refreshTokenModel.create({
      userId: user._id,
      tokenHash: hashedRefreshToken,
      familyId,
      sessionId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.lastLogin = new Date();
    await user.save();

    cookie.setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
      accessToken: accessToken,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * @desc    Logout a user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken;

  try {
    if (rawToken && req.user?.id) {
      const tokenHash = crypto.hashToken(rawToken);

      const currentToken = await refreshTokenModel.findOne({
        tokenHash,
        userId: req.user.id,
        revokeAt: null,
        expiresAt: { $gt: new Date() },
      });
      console.log(currentToken);

      if (currentToken) {
        await refreshTokenModel.updateMany(
          {
            userId: req.user.id,
            sessionId: currentToken.sessionId,
            revokeAt: null,
          },
          {
            $set: { revokeAt: new Date() },
          }
        );
      }
    }
  } finally {
    cookie.clearRefreshTokenCookie(res);
  }

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token not found.", 401);
  }

  let decoded;

  try {
    decoded = cookie.verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  if (!decoded.sessionId || !decoded.familyId || !decoded.id) {
    throw new AppError("Invalid refresh token claims.", 401);
  }

  const oldTokenHash = crypto.hashToken(refreshToken);

  const newAccessToken = cookie.accessToken(
    decoded.id,
    decoded.username,
    decoded.email,
  );
  const newRefreshToken = cookie.refreshToken(
    decoded.id,
    decoded.username,
    decoded.email,
    decoded.familyId,
    decoded.sessionId,
  );

  const session = await refreshTokenModel.startSession();

  try {
    await session.withTransaction(async () => {
      const oldToken = await refreshTokenModel
        .findOne({
          tokenHash: oldTokenHash,
          userId: decoded.id,
          sessionId: decoded.sessionId,
          familyId: decoded.familyId,
          revokeAt: null,
          expiresAt: { $gt: new Date() },
        })
        .session(session);

      if (!oldToken) {
        throw new AppError("Invalid or already used refresh token.", 401);
      }

      const [newTokenDoc] = await refreshTokenModel.create(
        [
          {
            userId: decoded.id,
            tokenHash: crypto.hashToken(newRefreshToken),
            familyId: decoded.familyId,
            sessionId: decoded.sessionId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
        { session },
      );

      const revoked = await refreshTokenModel.findOneAndUpdate(
        {
          _id: oldToken._id,
          revokeAt: null,
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            revokeAt: new Date(),
            replacedBy: newTokenDoc._id,
          },
        },
        { session, new: true },
      );

      if (!revoked) {
        throw new AppError("Refresh token already used.", 401);
      }
    });
  } finally {
    await session.endSession();
  }

  cookie.setRefreshTokenCookie(res, newRefreshToken);

  return res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
};
