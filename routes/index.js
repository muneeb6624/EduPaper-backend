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
   USER PROFILE ROUTES (LOGGED IN USER)
-------------------------- */
router.get('/me', protect, UserController.getProfile);
router.put('/me', protect, UserController.updateProfile);

/* -------------------------
   USER ROUTES (Admin only)
-------------------------- */
// router.get('/users', protect, authorize(), UserController.getAllUsers);
// router.get('/users/:id', protect, authorize(), UserController.getUserById);
// router.put('/users/:id', protect, authorize(), UserController.updateUser);
// router.delete('/users/:id', protect, authorize(), UserController.deleteUser);

router.get('/users', protect, UserController.getAllUsers);
router.get('/users/:id', protect, UserController.getUserById);
router.put('/users/:id', protect, UserController.updateUser);
router.delete('/users/:id', protect, UserController.deleteUser);


/* -------------------------
   PAPER ROUTES 
-------------------------- */
router.post('/papers', protect, authorize('teacher'), PaperController.createPaper);
router.get('/papers', protect, PaperController.getPapers);
router.get('/papers/:id', protect, PaperController.getPaperById);
router.put('/papers/:id', protect, authorize('teacher'), PaperController.updatePaper);
router.delete('/papers/:id', protect, authorize('teacher'), PaperController.deletePaper);
router.post('/papers/:id/assign', protect, authorize('teacher'), PaperController.assignPaper);

/* -------------------------
   ATTEMPT ROUTES 
-------------------------- */
router.get('/papers/:paperId/attempt', protect, authorize('student'), attemptCtrl.startAttempt);
router.post('/papers/:paperId/submit', protect, authorize('student'), attemptCtrl.submitAttempt);
router.put('/attempts/:id/grade', protect, authorize('teacher'), attemptCtrl.gradeAttempt);
router.get('/papers/:paperId/attempts', protect, authorize('teacher'), attemptCtrl.getPaperAttempts);
router.get('/students/:studentId/attempts', protect, attemptCtrl.getStudentAttempts);
router.get('/attempts/:id', protect, attemptCtrl.getAttemptById);

/* -------------------------
   RESULT ROUTES
-------------------------- */
router.get('/results/:id', protect, resultCtrl.getResultById);
router.get('/results/student/:studentId', protect, resultCtrl.getStudentResults);
router.get('/results/class/:paperId', protect, authorize('teacher'), resultCtrl.getClassResults);
router.post('/results/:id/publish', protect, authorize('teacher'), resultCtrl.publishResult);

/* -------------------------
   PING / API INFO
-------------------------- */
router.get('/ping', (req, res) => res.json({ 
  success: true, 
  message: 'pong',
  timestamp: new Date().toISOString()
}));

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EduPaper API v1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      profile: '/api/me',
      papers: '/api/papers',
      attempts: '/api/attempts',
      results: '/api/results'
    },
    documentation: 'Coming soon...'
  });
});

module.exports = router;