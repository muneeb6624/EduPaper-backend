// server/controllers/resultController.js
const Result = require('../models/Result');

class ResultController {
  // Get a single result by result ID
  async getResultById(req, res) {
    try {
      const { id } = req.params;
      const result = await Result.findById(id)
        .populate('studentId', 'name email')
        .populate('paperId', 'title subject')
        .populate('metadata.gradedBy', 'name email');

      if (!result) {
        return res.status(404).json({ message: 'Result not found' });
      }

      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: 'Error fetching result' });
    }
  }

  // Get all results for a specific student
  async getStudentResults(req, res) {
    try {
      const { studentId } = req.params;
      
      console.log(`🔍 Fetching results for student: ${studentId}`);
      
      const results = await Result.find({ studentId })
        .populate('paperId', 'title subject settings')
        .populate('attemptId', 'timeSpent submitTime')
        .sort({ createdAt: -1 });

      console.log(`📊 Found ${results.length} results for student ${studentId}`);
      console.log('🏆 Results:', results.map(r => ({
        id: r._id,
        paper: r.paperId?.title,
        score: `${r.obtainedMarks}/${r.totalMarks}`,
        percentage: r.percentage
      })));

      res.json({ 
        success: true, 
        results,
        count: results.length 
      });
    } catch (error) {
      console.error('Get student results error:', error);
      res.status(400).json({ 
        success: false, 
        message: 'Error fetching student results',
        error: error.message 
      });
    }
  }

  // Get all results for a specific class/paper
  async getClassResults(req, res) {
    try {
      const { paperId } = req.params;
      const results = await Result.find({ paperId })
        .populate('studentId', 'name email')
        .sort({ obtainedMarks: -1 }); // highest scorer first

      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: 'Error fetching class results' });
    }
  }

  // Optionally: publish a result (teacher sets visibility)
  async publishResult(req, res) {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;

      const result = await Result.findByIdAndUpdate(
        id,
        {
          isPublished,
          publishedAt: isPublished ? new Date() : null,
          'metadata.gradedBy': req.user._id,
          'metadata.gradedAt': new Date()
        },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({ message: 'Result not found' });
      }

      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: 'Error updating result publication' });
    }
  }
}

module.exports = new ResultController();
