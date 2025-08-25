// server/routes/routes.js
const express = require('express');
const router = express.Router();

// Controllers
const authCtrl = require('../controllers/authController');
const UserController = require('../controllers/UserController');
const PaperController = require('../controllers/paperController');
const attemptCtrl = require('../controllers/attemptController');
const resultCtrl = require('../controllers/resultController');

// Middleware
const { protect, authorize } = require('../middlewares/auth');

/* -------------------------
   AUTH ROUTES
-------------------------- */
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', authCtrl.register);
router.post('/auth/refresh', authCtrl.refreshToken);

/* -------------------------
   USER ROUTES (Admin only)
-------------------------- */
router.get('/users', protect, authorize('admin'), UserController.getAllUsers);
router.get('/users/:id', protect, authorize('admin'), UserController.getUserById);
router.put('/users/:id', protect, authorize('admin'), UserController.updateUser);
router.delete('/users/:id', protect, authorize('admin'), UserController.deleteUser);

/* -------------------------
   PAPER ROUTES (Teacher only for create/update/delete)
-------------------------- */
router.post('/papers', protect, authorize('teacher'), PaperController.createPaper);
router.get('/papers', protect, PaperController.getPapers);
router.get('/papers/:id', protect, PaperController.getPaperById);
router.put('/papers/:id', protect, authorize('teacher'), PaperController.updatePaper);
router.delete('/papers/:id', protect, authorize('teacher'), PaperController.deletePaper);

/* -------------------------
   ATTEMPT ROUTES (Student for attempts, Teacher for grading)
-------------------------- */
router.get('/papers/:paperId/attempt', protect, authorize('student'), attemptCtrl.startAttempt);
router.post('/papers/:paperId/submit', protect, authorize('student'), attemptCtrl.submitAttempt);
router.put('/attempts/:id/grade', protect, authorize('teacher'), attemptCtrl.gradeAttempt);

/* -------------------------
   RESULT ROUTES
-------------------------- */
router.get('/results/:id', protect, resultCtrl.getResultById);
router.get('/results/student/:studentId', protect, authorize('student'), resultCtrl.getStudentResults);
router.get('/results/class/:paperId', protect, authorize('teacher'), resultCtrl.getClassResults);


/* -------------------------
   UPDATE PROFILE (LOGGED IN USER)
-------------------------- */
// Profile routes (any logged-in user)
router.get('/users/me', protect, UserController.getProfile);
router.put('/users/me', protect, UserController.updateProfile);


/* -------------------------
   PING / API INFO
-------------------------- */
router.get('/ping', (req, res) => res.json({ message: 'pong' }));
router.get('/', (req, res) => {
  res.json({
    message: 'EduPaper API v1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      papers: '/api/papers',
      attempts: '/api/attempts',
      results: '/api/results'
    },
    documentation: 'Coming soon...'
  });
});

module.exports = router;
