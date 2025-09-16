const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;
      
      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide name, email, and password' 
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User already exists' 
        });
      }

      // Validate role - only allow student or teacher registration
      if (role && !['student', 'teacher'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid role. Only student or teacher allowed' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: role || 'student' // default to student
      });

      // Generate JWT token with user info
      const token = jwt.sign(
        { 
          _id: user._id, 
          role: user.role, 
          name: user.name,
          email: user.email 
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ 
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error registering user',
        error: error.message 
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide email and password' 
        });
      }

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is deactivated. Please contact administrator' 
        });
      }

      // Validate password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token with complete user info
      const token = jwt.sign(
        { 
          _id: user._id, 
          role: user.role,
          name: user.name,
          email: user.email
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error logging in user',
        error: error.message 
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Token is required' 
        });
      }

      // Verify the existing token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user to ensure they still exist and are active
      const user = await User.findById(decoded._id);

      if (!user || !user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found or inactive' 
        });
      }

      // Generate new JWT token
      const newToken = jwt.sign(
        { 
          _id: user._id, 
          role: user.role,
          name: user.name,
          email: user.email
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        success: true,
        token: newToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired' 
        });
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error refreshing token',
        error: error.message 
      });
    }
  }
}

module.exports = new AuthController();