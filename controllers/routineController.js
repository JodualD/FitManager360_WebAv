const Routine = require('../models/routine');

module.exports = {
  listRoutines: async (req, res) => {
    try {
      const routines = await Routine.find({ createdBy: req.session.user._id });
      res.render('routines/list', { routines });
    } catch (err) {
      console.error(err);
      res.redirect('/dashboard');
    }
  },

  showRoutine: async (req, res) => {
    try {
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      res.render('routines/view', { routine });
    } catch (err) {
      console.error(err);
      res.redirect('/routines');
    }
  },

  newRoutineForm: (req, res) => {
    res.render('routines/add', {
      error: null,
      title: '',
      description: '',
    });
  },

  createRoutine: async (req, res) => {
    try {
      const { title, description, exercises } = req.body;

      // Verificar si exercises existe y tiene la estructura esperada
      if (!exercises || !exercises.name || !Array.isArray(exercises.name)) {
        return res.render('routines/add', {
          error: 'Debe agregar al menos un ejercicio',
          title: title || '',
          description: description || '',
        });
      }

      // Verificar que no haya ejercicios vacíos
      const hasEmptyExercise = exercises.name.some(
        (name) => !name || name.trim() === ''
      );
      if (hasEmptyExercise) {
        return res.render('routines/add', {
          error: 'Todos los ejercicios deben tener nombre',
          title: title || '',
          description: description || '',
        });
      }

      // Procesar ejercicios
      const exercisesArray = exercises.name.map((name, index) => ({
        name: name.trim(),
        sets: parseInt(exercises.sets[index]) || 3,
        reps: parseInt(exercises.reps[index]) || 10,
        rest: parseInt(exercises.rest[index]) || 60,
      }));

      const routine = new Routine({
        title: title.trim(),
        description: description.trim(),
        exercises: exercisesArray,
        createdBy: req.session.user._id,
      });

      await routine.save();
      res.redirect('/routines');
    } catch (err) {
      console.error(err);
      res.render('routines/add', {
        error: 'Error al crear la rutina',
        title: req.body.title || '',
        description: req.body.description || '',
      });
    }
  },

  editRoutineForm: async (req, res) => {
    try {
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      res.render('routines/edit', { routine });
    } catch (err) {
      console.error(err);
      res.redirect('/routines');
    }
  },

  updateRoutine: async (req, res) => {
    try {
      const { title, description, exercises } = req.body;
      const routine = await Routine.findById(req.params.id);

      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }

      // Procesar ejercicios
      const exercisesArray = exercises.name.map((name, index) => ({
        name: name.trim(),
        sets: parseInt(exercises.sets[index]) || 3,
        reps: parseInt(exercises.reps[index]) || 10,
        rest: parseInt(exercises.rest[index]) || 60,
      }));

      routine.title = title.trim();
      routine.description = description.trim();
      routine.exercises = exercisesArray;

      await routine.save();
      res.redirect(`/routines/${routine._id}`);
    } catch (err) {
      console.error(err);
      res.redirect('/routines');
    }
  },

  deleteRoutine: async (req, res) => {
    try {
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      await routine.deleteOne(); // Cambié de remove() a deleteOne()
      res.redirect('/routines');
    } catch (err) {
      console.error(err);
      res.redirect('/routines');
    }
  },
};
