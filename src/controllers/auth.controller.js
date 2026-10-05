const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username, email, and password are required.',
        });
    }

    try {
       

     
    } catch (error) {
        console.error('User registration failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to register user.',
        });
    }
};

const login = async (req, res) => {

};

const logout = async (req, res) => {

};

module.exports = {
    register
};