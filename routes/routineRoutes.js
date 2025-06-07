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
//Rutas principales
router.get('/', routineController.listRoutines);
router.get('/dashboard', routineController.dashboard);
router.get('/new', routineController.newRoutineForm);
router.post('/', routineController.createRoutine);
router.get('/:id', routineController.showRoutine);
router.get('/:id/edit', routineController.editRoutineForm);
router.put('/:id', routineController.updateRoutine);
router.delete('/:id', routineController.deleteRoutine);

//Nuevas rutas para funcionalidad del dashboard
router.post('/:id/dashboard', routineController.completeRoutine);
router.get('/api/stats', routineController.getStats);

//Ruta para duplicar rutina (funcionalidad adicional)
router.post('/:id/duplicate', async (req, res) => {
  try {
    const Routine = require('../models/routine');
    const originalRoutine = await Routine.findById(req.params.id);

    if (
      !originalRoutine ||
      !originalRoutine.createdBy.equals(req.session.user._id)
    ) {
      return res.redirect('/routines/dashboard');
    }

    const duplicatedRoutine = new Routine({
      title: `${originalRoutine.title} (Copia)`,
      description: originalRoutine.description,
      exercises: originalRoutine.exercises,
      duration: originalRoutine.duration,
      difficulty: originalRoutine.difficulty,
      tags: originalRoutine.tags,
      createdBy: req.session.user._id,
    });

    await duplicatedRoutine.save();
    res.redirect('/routines/dashboard');
  } catch (err) {
    console.error('Error al duplicar rutina:', err);
    res.redirect('/routines/dashboard');
  }
});
module.exports = router;
