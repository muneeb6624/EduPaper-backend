const Attempt = require("../models/Attempt");
const Paper = require("../models/Paper");
const User = require("../models/User");
const Result = require("../models/Result");

class AttemptController {
  // Start an attempt
  async startAttempt(req, res) {
    try {
      const { paperId } = req.params;
      const studentId = req.user._id;

      const paper = await Paper.findById(paperId);
      if (!paper)
        return res
          .status(404)
          .json({ success: false, message: "Paper not found" });

      // Check if student is assigned
      if (!paper.assignedTo.some((id) => id.equals(studentId))) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You are not assigned to this paper",
          });
      }

      // Check time window
      const now = new Date();
      if (now < paper.settings.startTime || now > paper.settings.endTime) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Paper is not active at this time",
          });
      }

      // Count previous attempts
      const attemptCount = await Attempt.countDocuments({ paperId, studentId });
      if (attemptCount >= paper.settings.maxAttempts) {
        return res
          .status(400)
          .json({ success: false, message: "Maximum attempts reached" });
      }

      // Create new attempt
      const answers = paper.questions.map((q) => ({
        questionId: q._id,
        questionType: q.type,
        maxMarks: q.marks,
        answer: "",
        isCorrect: null,
        marksObtained: 0,
      }));

      const attempt = await Attempt.create({
        paperId,
        studentId,
        attemptNumber: attemptCount + 1,
        answers,
        status: "in_progress",
        scoring: { totalMarks: paper.settings.totalMarks },
      });

      res.status(201).json({ success: true, attempt });
    } catch (error) {
      console.error("Start attempt error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: "Error starting attempt",
          error: error.message,
        });
    }
  }

  // Submit attempt
  async submitAttempt(req, res) {
    try {
      const { paperId } = req.params;
      const studentId = req.user._id;
      const { answers: submittedAnswers } = req.body;

      const attempt = await Attempt.findOne({
        paperId,
        studentId,
        status: "in_progress",
      });
      if (!attempt)
        return res
          .status(404)
          .json({ success: false, message: "No in-progress attempt found" });

      const paper = await Paper.findById(paperId);
      if (!paper)
        return res
          .status(404)
          .json({ success: false, message: "Paper not found" });

      // Map submitted answers
      attempt.answers.forEach((ans) => {
        const submitted = submittedAnswers.find(
          (a) => a.questionId === ans.questionId.toString()
        );
        if (submitted) {
          ans.answer = submitted.answer || "";
          // Auto-grade MCQs
          if (ans.questionType === "mcq") {
            const question = paper.questions.id(ans.questionId);
            if (question) {
              ans.isCorrect = submitted.answer === question.correctAnswer;
              ans.marksObtained = ans.isCorrect ? question.marks : 0;
              ans.autoGraded = true;
              ans.gradedAt = new Date();
            }
          }
        }
      });

      // Compute scoring
      const obtainedMarks = attempt.answers.reduce(
        (sum, a) => sum + (a.marksObtained || 0),
        0
      );
      const totalMarks = paper.settings.totalMarks;
      const percentage = ((obtainedMarks / totalMarks) * 100).toFixed(2);
      attempt.scoring.obtainedMarks = obtainedMarks;
      attempt.scoring.percentage = Number(percentage);
      attempt.scoring.isPassed = paper.settings.passingMarks
        ? obtainedMarks >= paper.settings.passingMarks
        : true;

      attempt.status = attempt.answers.every((a) => a.isCorrect !== null)
        ? "auto_graded"
        : "submitted";
      attempt.submitTime = new Date();
      attempt.timeSpent = Math.round(
        (attempt.submitTime - attempt.startTime) / 60000
      ); // minutes

      await attempt.save();

      res.json({ success: true, attempt });
    } catch (error) {
      console.error("Submit attempt error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: "Error submitting attempt",
          error: error.message,
        });
    }
  }

  // Manual grading by teacher
  // inside AttemptController class
  async gradeAttempt(req, res) {
    try {
      const { id } = req.params; // attemptId
      const { gradedAnswers } = req.body; // [{ questionId, marksObtained, feedback }]

      const attempt = await Attempt.findById(id);
      if (!attempt) {
        return res
          .status(404)
          .json({ success: false, message: "Attempt not found" });
      }

      // Update answers
      gradedAnswers.forEach((ga) => {
        const ans = attempt.answers.id(ga.questionId);
        if (ans) {
          ans.marksObtained = ga.marksObtained;
          ans.feedback = ga.feedback || "";
          ans.autoGraded = false;
          ans.gradedAt = new Date();
        }
      });

      // Update scoring
      const obtainedMarks = attempt.answers.reduce(
        (sum, a) => sum + (a.marksObtained || 0),
        0
      );
      const totalMarks = attempt.scoring.totalMarks;
      const percentage = ((obtainedMarks / totalMarks) * 100).toFixed(2);

      attempt.scoring.obtainedMarks = obtainedMarks;
      attempt.scoring.percentage = Number(percentage);
      attempt.scoring.isPassed = attempt.scoring.percentage >= 50; // or custom passing logic

      attempt.status = "manually_graded";
      attempt.grading.gradedBy = req.user._id;
      attempt.grading.gradedAt = new Date();
      attempt.grading.isFullyGraded = true;

      await attempt.save();

      // === Create or Update Result ===
      const resultData = {
        attemptId: attempt._id,
        studentId: attempt.studentId,
        paperId: attempt.paperId,
        totalMarks,
        obtainedMarks,
        percentage: Number(percentage),
        isPassed: attempt.scoring.isPassed,
        feedback:
          gradedAnswers
            .map((ga) => ga.feedback)
            .filter(Boolean)
            .join("; ") || "",
        metadata: {
          gradedBy: req.user._id,
          gradedAt: new Date(),
          remarks: "Graded manually",
        },
      };

      let result = await Result.findOne({ attemptId: attempt._id });
      if (result) {
        // update
        Object.assign(result, resultData);
        await result.save();
      } else {
        // create
        result = await Result.create(resultData);
      }

      res.json({ success: true, attempt, result });
    } catch (error) {
      console.error("Grade attempt error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: "Error grading attempt",
          error: error.message,
        });
    }
  }

  // Get all attempts for a specific paper (teacher)
  async getPaperAttempts(req, res) {
    try {
      const { paperId } = req.params;
      
      const attempts = await Attempt.find({ paperId })
        .populate('studentId', 'name email')
        .sort({ createdAt: -1 });

      res.json({ success: true, attempts });
    } catch (error) {
      console.error("Get paper attempts error:", error);
      res.status(400).json({
        success: false,
        message: "Error fetching paper attempts",
        error: error.message,
      });
    }
  }

  // Get all attempts by a student
  async getStudentAttempts(req, res) {
    try {
      const { studentId } = req.params;
      
      const attempts = await Attempt.find({ studentId })
        .populate('paperId', 'title subject')
        .sort({ createdAt: -1 });

      res.json({ success: true, attempts });
    } catch (error) {
      console.error("Get student attempts error:", error);
      res.status(400).json({
        success: false,
        message: "Error fetching student attempts",
        error: error.message,
      });
    }
  }

  // Get specific attempt details
  async getAttemptById(req, res) {
    try {
      const { id } = req.params;
      
      const attempt = await Attempt.findById(id)
        .populate('studentId', 'name email')
        .populate('paperId', 'title subject questions');

      if (!attempt) {
        return res.status(404).json({
          success: false,
          message: "Attempt not found",
        });
      }

      res.json({ success: true, attempt });
    } catch (error) {
      console.error("Get attempt error:", error);
      res.status(400).json({
        success: false,
        message: "Error fetching attempt",
        error: error.message,
      });
    }
  }
}

module.exports = new AttemptController();
