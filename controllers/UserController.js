// server/controllers/userController.js
const User = require('../models/User');

class UserController {
  async getAllUsers(req, res) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (error) {
      res.status(400).json({ message: 'Error getting all users' });
    }
  }

  async getUserById(req, res) {
    try {
      const id = req.params.id;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: 'Error getting user by id' });
    }
  }

  async updateUser(req, res) {
    try {
      const id = req.params.id;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: 'Error updating user' });
    }
  }

  async deleteUser(req, res) {
    try {
      const id = req.params.id;
      const user = await User.findByIdAndRemove(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Error deleting user' });
    }
  }

  async getProfile(req, res) {
    try {
      const user = req.user; // already from protect middleware
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: 'Error fetching profile' });
    }
  }

  async updateProfile(req, res) {
    try {
      const user = req.user; // already from protect middleware

      // Only allow certain fields to be updated
      const allowedUpdates = ['name', 'email', 'profile'];
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) user[field] = req.body[field];
      });

      await user.save();
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: 'Error updating profile' });
    }
  }

}

module.exports = new UserController();