const Paper = require('../models/Paper');
const User = require('../models/User');

class PaperController {
  // Create a new paper
  async createPaper(req, res) {
    try {
      const { title, description, subject, questions, settings, tags, difficulty } = req.body;

      // Optional: calculate totalMarks from questions if not provided
      let totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
      if (!settings.totalMarks) settings.totalMarks = totalMarks;

      const paper = await Paper.create({
        title,
        description,
        subject,
        createdBy: req.user._id,
        questions,
        settings,
        tags,
        difficulty
      });

      res.status(201).json({ success: true, paper });
    } catch (error) {
      console.error('Error creating paper:', error);
      res.status(400).json({ success: false, message: 'Error creating paper', error: error.message });
    }
  }

  // Get all papers (teacher/admin sees all, student sees assigned)
  async getPapers(req, res) {
    try {
      let papers;
      if (req.user.role === 'student') {
        papers = await Paper.find({ assignedTo: req.user._id, isActive: true });
      } else {
        papers = await Paper.find({ createdBy: req.user._id, isActive: true });
      }
      res.json({ success: true, papers });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error fetching papers', error: error.message });
    }
  }

  // Get a single paper by ID
  async getPaperById(req, res) {
    try {
      const { id } = req.params;
      const paper = await Paper.findById(id).populate('assignedTo', 'name email');
      if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

      // Optional: check if student is allowed
      if (req.user.role === 'student' && !paper.assignedTo.some(u => u._id.equals(req.user._id))) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this paper' });
      }

      res.json({ success: true, paper });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error fetching paper', error: error.message });
    }
  }

  // Update paper
  async updatePaper(req, res) {
    try {
      const { id } = req.params;
      const paper = await Paper.findById(id);
      if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

      // Only creator or admin can update
      if (!paper.createdBy.equals(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      Object.assign(paper, req.body); // merge updates
      await paper.save();

      res.json({ success: true, paper });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error updating paper', error: error.message });
    }
  }

  // Assign paper to students
  async assignPaper(req, res) {
    try {
      const { id } = req.params;
      const { studentIds } = req.body; // array of student IDs

      const paper = await Paper.findById(id);
      if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

      // Filter valid students
      const validStudents = await User.find({ _id: { $in: studentIds }, role: 'student' });
      const validStudentIds = validStudents.map(s => s._id);

      paper.assignedTo = Array.from(new Set([...paper.assignedTo, ...validStudentIds]));
      await paper.save();

      res.json({ success: true, message: 'Paper assigned', assignedTo: paper.assignedTo });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error assigning paper', error: error.message });
    }
  }

  async deletePaper(req, res) {
    try {
      const { id } = req.params;
      const paper = await Paper.findById(id);
      if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

      // Only creator or admin can delete
      if (!paper.createdBy.equals(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      await paper.remove();
      res.json({ success: true, message: 'Paper deleted' });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error deleting paper', error: error.message });
    }
  }
}

module.exports = new PaperController();
