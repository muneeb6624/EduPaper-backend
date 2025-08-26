// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      // Makes sure role never equals to "admin"
      if (role === 'admin') {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const user = new User({ name, email, password, role });

      // Hash password
      user.password = await bcrypt.hash(password, 10);

      // Save user to database
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });

      res.json({ token });
    } catch (error) {
      res.status(400).json({ message: 'Error registering user' });
    }
  }

async login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password'); // include password field

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password); 

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ token, role: user.role, test: "aoo aoo youlololo" });
  } catch (error) {
    console.error(error); // log actual error
    res.status(400).json({ message: 'Error logging in user' });
  }
}

  async refreshToken(req, res) {
    try {
      const { token } = req.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ _id: decoded._id });

      if (!user) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Generate new JWT token
      const newToken = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });

      res.json({ token: newToken });
    } catch (error) {
      res.status(400).json({ message: 'Error refreshing token' });
    }
  }
}

module.exports = new AuthController();