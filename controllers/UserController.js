const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserController {
  async getAllUsers(req, res) {
    try {
      const { role, page = 1, limit = 50, search = '' } = req.query;
      
      // Build query
      let query = { isActive: true };
      
      // Filter by role if provided
      if (role) {
        query.role = role;
      }
      
      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      const users = await User.find(query)
        .select('-password')
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await User.countDocuments(query);
      
      res.json({
        success: true,
        count: users.length,
        total,
        users: users, // Frontend expects 'users' key
        students: users, // Also provide 'students' for compatibility
        data: users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting all users',
        error: error.message 
      });
    }
  }

  async getStudents(req, res) {
    try {
      const students = await User.find({ 
        role: 'student', 
        isActive: true 
      }).select('-password');
      
      res.json({
        success: true,
        count: students.length,
        students: students
      });
    } catch (error) {
      console.error('Get students error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting students',
        error: error.message 
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).select('-password');
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting user by ID',
        error: error.message 
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields from update
      delete updateData.password;
      delete updateData.role; // Don't allow role changes through this endpoint

      const user = await User.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating user',
        error: error.message 
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Soft delete - set isActive to false
      const user = await User.findByIdAndUpdate(
        id, 
        { isActive: false }, 
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'User deactivated successfully' 
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting user',
        error: error.message 
      });
    }
  }

  async getProfile(req, res) {
    try {
      // req.user is already populated by protect middleware
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching profile',
        error: error.message 
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const { name, email, profile, currentPassword, newPassword } = req.body;
      
      const user = await User.findById(userId).select('+password');
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Update basic fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (profile) user.profile = { ...user.profile, ...profile };

      // Handle password update
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ 
            success: false, 
            message: 'Current password is required to set new password' 
          });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ 
            success: false, 
            message: 'Current password is incorrect' 
          });
        }

        user.password = await bcrypt.hash(newPassword, 12);
      }

      await user.save();

      // Return user without password
      const updatedUser = await User.findById(userId).select('-password');

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error updating profile',
        error: error.message 
      });
    }
  }
}

module.exports = new UserController();