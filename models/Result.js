// models/Result.js
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },
  obtainedMarks: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  grade: {
    type: String,
    trim: true,
    default: null
  },
  rank: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false // teacher controls visibility
  },
  publishedAt: {
    type: Date,
    default: null
  },
  metadata: {
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    gradedAt: {
      type: Date,
      default: null
    },
    remarks: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Result', resultSchema);
