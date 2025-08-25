const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionType: {
    type: String,
    enum: ['mcq', 'short', 'essay'],
    required: true
  },
  answer: {
    type: String,
    trim: true,
    default: ''
  },
  isCorrect: {
    type: Boolean,
    default: null // null for ungraded, true/false for graded
  },
  marksObtained: {
    type: Number,
    default: 0,
    min: 0
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 0
  },
  feedback: {
    type: String,
    trim: true
  }, // Teacher's feedback for subjective questions
  autoGraded: {
    type: Boolean,
    default: false
  },
  gradedAt: {
    type: Date,
    default: null
  }
}, { _id: true });

const attemptSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  answers: [answerSchema],
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'auto_graded', 'manually_graded', 'completed'],
    default: 'in_progress'
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  submitTime: {
    type: Date,
    default: null
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  scoring: {
    totalMarks: {
      type: Number,
      required: true,
      default: 0
    },
    obtainedMarks: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    grade: {
      type: String,
      default: null
    },
    isPassed: {
      type: Boolean,
      default: false
    }
  },
  grading: {
    autoGradedQuestions: {
      type: Number,
      default: 0
    },
    manuallyGradedQuestions: {
      type: Number,
      default: 0
    },
    pendingGradingQuestions: {
      type: Number,
      default: 0
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    gradedAt: {
      type: Date,
      default: null
    },
    isFullyGraded: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    browserInfo: String,
    submissionMethod: {
      type: String,
      enum: ['manual', 'auto_timeout'],
      default: 'manual'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Attempt', attemptSchema);