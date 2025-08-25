const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'short', 'essay'],
    required: [true, 'Question type is required']
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: [{
    type: String,
    trim: true
  }], // Only for MCQ questions
  correctAnswer: {
    type: String,
    trim: true
    // Required for MCQ questions (validated in pre-save hook)
  },
  marks: {
    type: Number,
    required: [true, 'Question marks are required'],
    min: [0.5, 'Minimum marks should be 0.5'],
    max: [100, 'Maximum marks cannot exceed 100']
  },
  order: {
    type: Number,
    required: true,
    min: 1
  },
  explanation: {
    type: String,
    trim: true
  } // Optional explanation for answers
}, { _id: true });

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Paper title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  subject: {
    type: String,
    trim: true,
    required: [true, 'Subject is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  settings: {
    timeLimit: {
      type: Number, // in minutes
      required: [true, 'Time limit is required'],
      min: [1, 'Minimum time limit is 1 minute'],
      max: [600, 'Maximum time limit is 10 hours']
    },
    totalMarks: {
      type: Number,
      required: true,
      min: [1, 'Total marks must be at least 1']
    },
    passingMarks: {
      type: Number,
      min: [0, 'Passing marks cannot be negative']
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, 'At least 1 attempt must be allowed'],
      max: [10, 'Maximum 10 attempts allowed']
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required']
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    showResultsImmediately: {
      type: Boolean,
      default: false
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    allowReview: {
      type: Boolean,
      default: true
    }
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  statistics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    highestScore: {
      type: Number,
      default: 0
    },
    lowestScore: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


module.exports = mongoose.model('Paper', paperSchema);