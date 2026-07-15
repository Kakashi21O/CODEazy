// server/routes/progressRoutes.js

const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProgress,
  markComplete,
  markIncomplete,
} = require('../controllers/progressController');

// All progress routes are protected
router.use(protect);

router.get('/',                      getProgress);
router.post('/:subjectId',           markComplete);
router.delete('/:subjectId',         markIncomplete);

module.exports = router;
