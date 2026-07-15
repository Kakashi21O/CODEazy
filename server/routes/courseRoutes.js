// server/routes/courseRoutes.js

const router = require('express').Router();
const {
  getAllCourses,
  getCourse,
  getSubjects,
  getSubject,
} = require('../controllers/courseController');

router.get('/',                        getAllCourses);
router.get('/subject/:subjectId',      getSubject);   // must be before /:id
router.get('/:id',                     getCourse);
router.get('/:id/subjects',            getSubjects);

module.exports = router;
