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
router.post('/:id/complete', routineController.completeRoutine);

//Ruta para duplicar rutina (funcionalidad adicional)
router.post('/:id/duplicate', routineController.duplicateRoutine);
module.exports = router;
