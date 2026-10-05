const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asynchandler");
const AppError = require("../utils/appError");

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new AppError(
        "Username, email, and password are required.", 400
    );
  }

  try {
    
    const existingUser = await userModel.findOne({ $or: [{username}, {email}] });

    if (existingUser) {
        throw new AppError('Username or email is already registered.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.create({
        username,
        email,
        password: hashedPassword,
    });

    const accessToken = jwt.sign(
        { id: newUser._id, username: newUser.username, email: newUser.email },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: newUser._id, username: newUser.username, email: newUser.email },
        process.env.JWT_REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });


    return res.status(201).json({
      success: true,
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
      },
    });

  } catch (error) {
    if (error.code === 11000) {
        throw new AppError('Username or email is already registered.', 409);
    }
    throw error;
  }
});

const login = asyncHandler(async (req, res) => {});

const logout = asyncHandler(async (req, res) => {});

module.exports = {
  register,
  login,
  logout
};
