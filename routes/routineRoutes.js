const express = require('express');
const router = express.Router();
const routineController = require('../controllers/routineController');

// Proteger todas las rutas
router.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
});

router.get('/', routineController.listRoutines);
router.get('/new', routineController.newRoutineForm);
router.post('/', routineController.createRoutine);
router.get('/:id', routineController.showRoutine);
router.get('/:id/edit', routineController.editRoutineForm);
router.put('/:id', routineController.updateRoutine);
router.delete('/:id', routineController.deleteRoutine);

module.exports = router;
