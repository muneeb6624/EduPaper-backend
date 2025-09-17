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

      console.log(`🎯 Student ${studentId} attempting paper ${paperId}`);

      const paper = await Paper.findById(paperId);
      if (!paper) {
        console.log(`❌ Paper ${paperId} not found`);
        return res
          .status(404)
          .json({ success: false, message: "Paper not found" });
      }

      console.log(`📋 Paper found: ${paper.title}`);
      console.log(`👥 Assigned to: ${paper.assignedTo.length} students`);
      console.log(`🎯 Student ID: ${studentId}`);

      // Check if student is assigned
      const isAssigned = paper.assignedTo.some((id) => id.toString() === studentId.toString());
      if (!isAssigned) {
        console.log(`❌ Student ${studentId} not assigned to paper ${paperId}`);
        console.log(`📝 Assigned students: ${paper.assignedTo.map(id => id.toString())}`);
        return res
          .status(403)
          .json({
            success: false,
            message: "You are not assigned to this paper",
          });
      }

      // Check time window
      const now = new Date();
      console.log(`⏰ Current time: ${now}`);
      console.log(`⏰ Start time: ${paper.settings.startTime}`);
      console.log(`⏰ End time: ${paper.settings.endTime}`);

      if (now < paper.settings.startTime || now > paper.settings.endTime) {
        console.log(`❌ Paper not active at this time`);
        return res
          .status(400)
          .json({
            success: false,
            message: "Paper is not active at this time",
          });
      }

      // Count previous attempts for THIS STUDENT only
      const attemptCount = await Attempt.countDocuments({ 
        paperId, 
        studentId 
      });
      console.log(`📊 Previous attempts by this student: ${attemptCount}/${paper.settings.maxAttempts}`);
      
      if (attemptCount >= paper.settings.maxAttempts) {
        console.log(`❌ Maximum attempts reached for student ${studentId}`);
        return res
          .status(400)
          .json({ success: false, message: "You have reached the maximum number of attempts for this paper" });
      }

      // Create new attempt
      const answers = paper.questions.map((q) => ({
        questionId: q._id,
        questionType: q.type,
        maxMarks: q.marks,
        answer: "",
        isCorrect: null,
        obtainedMarks: 0,
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
              ans.obtainedMarks = ans.isCorrect ? question.marks : 0;
              ans.autoGraded = true;
              ans.gradedAt = new Date();
            }
          }
        }
      });

      // Compute scoring
      const obtainedMarks = attempt.answers.reduce(
        (sum, a) => sum + (a.obtainedMarks || 0),
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

      // Create result if attempt is fully auto-graded
      if (attempt.status === "auto_graded") {
        console.log('🎯 Creating result for auto-graded attempt');
        
        const resultData = {
          attemptId: attempt._id,
          studentId: attempt.studentId,
          paperId: attempt.paperId,
          totalMarks,
          obtainedMarks,
          percentage: Number(percentage),
          isPassed: attempt.scoring.isPassed,
          feedback: "Auto-graded submission",
          isPublished: true, // Auto-publish auto-graded results
          publishedAt: new Date(),
          metadata: {
            gradedBy: null, // Auto-graded
            gradedAt: new Date(),
            remarks: "Automatically graded",
          },
        };

        let result = await Result.findOne({ attemptId: attempt._id });
        if (result) {
          Object.assign(result, resultData);
          await result.save();
        } else {
          result = await Result.create(resultData);
        }
        
        console.log('✅ Result created for auto-graded attempt:', result._id);
      }

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
      console.log('🚨🚨🚨 GRADE ATTEMPT API HIT! 🚨🚨🚨');
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Headers:', req.headers);
      
      const { id } = req.params; // attemptId
      const { gradedAnswers } = req.body; // [{ questionId, obtainedMarks, feedback }]

      console.log('🎯 Attempt ID from params:', id);
      console.log('📝 Request body:', req.body);

      const attempt = await Attempt.findById(id);
      if (!attempt) {
        console.log('❌ Attempt not found for ID:', id);
        return res
          .status(404)
          .json({ success: false, message: "Attempt not found" });
      }

      console.log('✅ Attempt found:', attempt._id);
      console.log('🚨 GRADE ATTEMPT METHOD CALLED!');
      console.log('📥 Request params:', req.params);
      console.log('📥 Request body:', req.body);
      console.log('👤 User:', req.user.name, req.user.role);
      console.log('🎯 Grading attempt:', id);
      console.log('📝 Graded answers received:', JSON.stringify(gradedAnswers, null, 2));

      // Update answers
      gradedAnswers.forEach((ga, index) => {
        console.log(`🔍 Processing graded answer ${index + 1}:`, ga);
        
        // Find answer by questionId (convert both to string for comparison)
        const ans = attempt.answers.find(a => a.questionId.toString() === ga.questionId.toString());
        
        if (ans) {
          console.log(`📊 Found answer for question ${ga.questionId}`);
          console.log(`📊 Current marks: ${ans.obtainedMarks}`);
          console.log(`📊 New marks from payload: ${ga.marksObtained}`);
          
          const newMarks = Number(ga.marksObtained);
          console.log(`📊 Converted to number: ${newMarks}`);
          
          ans.obtainedMarks = newMarks;
          ans.feedback = ga.feedback || "";
          ans.autoGraded = false;
          ans.gradedAt = new Date();
          
          console.log(`✅ Answer updated - obtainedMarks: ${ans.obtainedMarks}, feedback: "${ans.feedback}"`);
        } else {
          console.log(`❌ Question ${ga.questionId} not found in attempt answers`);
          console.log(`📋 Available question IDs:`, attempt.answers.map(a => a.questionId.toString()));
        }
      });

      // Update scoring
      console.log('📊 Calculating total marks from all answers:');
      attempt.answers.forEach((ans, index) => {
        console.log(`   Answer ${index + 1}: questionId=${ans.questionId}, obtainedMarks=${ans.obtainedMarks}`);
      });
      
      const obtainedMarks = attempt.answers.reduce(
        (sum, a) => {
          const marks = a.obtainedMarks || 0;
          console.log(`💯 Adding marks: ${sum} + ${marks} = ${sum + marks}`);
          return sum + marks;
        },
        0
      );
      const totalMarks = attempt.scoring.totalMarks;
      const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;

      console.log(`🏆 FINAL CALCULATION: ${obtainedMarks}/${totalMarks} = ${percentage}%`);
      console.log(`🏆 obtainedMarks type:`, typeof obtainedMarks, obtainedMarks);
      console.log(`🏆 percentage type:`, typeof percentage, percentage);

      attempt.scoring.obtainedMarks = obtainedMarks;
      attempt.scoring.percentage = Number(percentage);
      attempt.scoring.isPassed = attempt.scoring.percentage >= 50; // or custom passing logic

      attempt.status = "manually_graded";
      attempt.grading.gradedBy = req.user._id;
      attempt.grading.gradedAt = new Date();
      attempt.grading.isFullyGraded = true;

      // Mark the answers array as modified for Mongoose
      attempt.markModified('answers');
      attempt.markModified('scoring');

      await attempt.save();
      
      console.log('💾 Attempt saved with scoring:', {
        obtainedMarks: attempt.scoring.obtainedMarks,
        totalMarks: attempt.scoring.totalMarks,
        percentage: attempt.scoring.percentage
      });

      // Verify the saved data by re-fetching
      const savedAttempt = await Attempt.findById(attempt._id);
      console.log('🔍 Verification - Saved attempt scoring:', {
        obtainedMarks: savedAttempt.scoring.obtainedMarks,
        totalMarks: savedAttempt.scoring.totalMarks,
        percentage: savedAttempt.scoring.percentage
      });

      // === Create or Update Result ===
      // Use the calculated values, not the old attempt object
      const resultData = {
        attemptId: attempt._id,
        studentId: attempt.studentId,
        paperId: attempt.paperId,
        totalMarks: totalMarks,
        obtainedMarks: obtainedMarks,  // Use calculated value
        percentage: Number(percentage), // Use calculated value
        isPassed: Number(percentage) >= 50, // Use calculated value
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
      
      console.log('📊 Result data being saved:', {
        obtainedMarks: resultData.obtainedMarks,
        totalMarks: resultData.totalMarks,
        percentage: resultData.percentage
      });

      let result = await Result.findOne({ attemptId: attempt._id });
      if (result) {
        // update
        console.log('📝 Updating existing result:', result._id);
        Object.assign(result, resultData);
        await result.save();
        console.log('✅ Result updated with marks:', {
          obtainedMarks: result.obtainedMarks,
          totalMarks: result.totalMarks,
          percentage: result.percentage
        });
      } else {
        // create
        console.log('🆕 Creating new result');
        result = await Result.create(resultData);
        console.log('✅ Result created with marks:', {
          obtainedMarks: result.obtainedMarks,
          totalMarks: result.totalMarks,
          percentage: result.percentage
        });
      }

      // Return the updated attempt with fresh data
      const updatedAttempt = await Attempt.findById(attempt._id)
        .populate('studentId', 'name email')
        .populate('paperId', 'title subject');
      
      res.json({ success: true, attempt: updatedAttempt, result });
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
      
      console.log(`🔍 Fetching attempts for paper: ${paperId}`);
      
      const attempts = await Attempt.find({ paperId })
        .populate('studentId', 'name email')
        .sort({ createdAt: -1 });

      console.log(`📊 Found ${attempts.length} attempts for paper ${paperId}`);
      console.log('📝 Attempts:', attempts.map(a => ({
        id: a._id,
        student: a.studentId?.name,
        status: a.status,
        score: `${a.scoring?.obtainedMarks}/${a.scoring?.totalMarks}`
      })));

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
