const Routine = require('../models/routine');

module.exports = {
  // Dashboard principal con estadísticas
  dashboard: async (req, res) => {
    try {
      const routines = await Routine.find({
        createdBy: req.session.user._id,
        isActive: true,
      }).sort({ createdAt: -1 });

      // Obtener estadísticas
      const stats = await Routine.getUserStats(req.session.user._id);

      res.render('routines/dashboard', {
        routines,
        stats,
        user: req.session.user,
        title: 'Dashboard - Mis Rutinas',
      });
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
      res.render('routines/dashboard', {
        routines: [],
        stats: {
          totalRoutines: 0,
          totalCompletions: 0,
          avgDuration: 0,
          totalExercises: 0,
        },
        user: req.session.user,
        title: 'Dashboard - Mis Rutinas',
        error: 'Error al cargar las rutinas',
      });
    }
  },
  // Listar rutinas activas
  listRoutines: async (req, res) => {
    try {
      const routines = await Routine.find({
        createdBy: req.session.user._id,
        isActive: true,
      }).sort({ createdAt: -1 });
      res.render('routines/list', { routines, user: req.session.user });
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
      res.render('routines/view', { routine, user: req.session.user });
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
      duration: 30,
      difficulty: 'intermediate',
      tags: '',
      user: req.session.user,
    });
  },

  createRoutine: async (req, res) => {
    try {
      const { title, description, exercises } = req.body;
      // Validar campos requeridos
      if (!title || title.trim().length < 3) {
        return res.render('routines/add', {
          error: 'El título debe tener al menos 3 caracteres',
          title: title || '',
          description: description || '',
          duration: duration || 30,
          difficulty: difficulty || 'Intermediate',
          tags: tags || '',
          user: req.session.user,
        });
      }
      if (!description || description.trim().length < 10) {
        return res.render('routines/add', {
          error: 'La descripción debe tener al menos 10 caracteres',
          title: title || '',
          description: description || '',
          duration: duration || 30,
          difficulty: difficulty || 'Intermediate',
          tags: tags || '',
          user: req.session.user,
        });
      }
      // Verificar si exercises existe y tiene la estructura esperada
      if (!exercises || !exercises.name || !Array.isArray(exercises.name)) {
        return res.render('routines/add', {
          error: 'Debe agregar al menos un ejercicio',
          title: title || '',
          description: description || '',
          duration: duration || 30,
          difficulty: difficulty || 'Intermediate',
          tags: tags || '',
          user: req.session.user,
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
          duration: duration || 30,
          difficulty: difficulty || 'Intermediate',
          tags: tags || '',
          user: req.session.user,
        });
      }

      // Procesar ejercicios
      const exercisesArray = exercises.name.map((name, index) => ({
        name: name.trim(),
        sets: parseInt(exercises.sets[index]) || 3,
        reps: parseInt(exercises.reps[index]) || 10,
        rest: parseInt(exercises.rest[index]) || 60,
        description: exercises.description
          ? exercises.description[index] || ''
          : '',
      }));
      //Procesar tags
      const tags = req.body.tags
        ? req.body.tags.split(',').map((tag) => tag.trim())
        : [];

      const routine = new Routine({
        title: title.trim(),
        description: description.trim(),
        exercises: exercisesArray,
        duration: parseInt(duration) || 30,
        difficulty: difficulty || 'intermediate',
        tags: tagsArray,
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
        duration: req.body.duration || 30,
        difficulty: req.body.difficulty || 'intermediate',
        tags: req.body.tags || '',
        user: req.session.user,
      });
    }
  },

  editRoutineForm: async (req, res) => {
    try {
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      res.render('routines/edit', {
        routine,
        user: req.session.user,
        error: null,
      });
    } catch (err) {
      console.error(err);
      res.redirect('/routines');
    }
  },

  updateRoutine: async (req, res) => {
    try {
      const { title, description, exercises, duration, difficulty, tags } =
        req.body;
      const routine = await Routine.findById(req.params.id);

      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      // Validaciones
      if (!title || title.trim().length < 3) {
        return res.render('routines/edit', {
          routine,
          user: req.session.user,
          error: 'El título debe tener al menos 3 caracteres',
        });
      }

      if (!description || description.trim().length < 10) {
        return res.render('routines/edit', {
          routine,
          user: req.session.user,
          error: 'La descripción debe tener al menos 10 caracteres',
        });
      }

      // Procesar ejercicios
      const exercisesArray = exercises.name.map((name, index) => ({
        name: name.trim(),
        sets: parseInt(exercises.sets[index]) || 3,
        reps: parseInt(exercises.reps[index]) || 10,
        rest: parseInt(exercises.rest[index]) || 60,
        description: exercises.description ? exercises.description[index] : '',
      }));
      // Procesar tags
      const tagsArray = tags
        ? tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [];
      // Actualizar rutina
      routine.title = title.trim();
      routine.description = description.trim();
      routine.exercises = exercisesArray;
      routine.duration = parseInt(duration) || routine.duration;
      routine.difficulty = difficulty || routine.difficulty;
      routine.tags = tagsArray;
      await routine.save();
      res.redirect(`/routines/${routine._id}`);
    } catch (err) {
      console.error('Error al actualizar la rutina:', err);
      const routine = await Routine.findById(req.params.id);
      res.render('routines/edit', {
        routine,
        user: req.session.user,
        error:
          'Error al actualizar la rutina' +
          (err.message || 'Error desconocido'),
      });
    }
  },

  deleteRoutine: async (req, res) => {
    try {
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      // Soft delete - marcar como inactiva en lugar de eliminar
      routine.isActive = false;
      await routine.save();

      res.redirect('/routines/dashboard');
    } catch (err) {
      console.error(err);
      res.redirect('/routines');
    }
  },
  // Nuevo método para marcar rutina como completada
  completeRoutine: async (req, res) => {
    try {
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res
          .status(404)
          .json({ success: false, message: 'Rutina no encontrada' });
      }

      await routine.markAsCompleted();
      res.json({
        success: true,
        message: 'Rutina completada exitosamente',
        completedCount: routine.completedCount,
      });
    } catch (err) {
      console.error('Error al completar rutina:', err);
      res
        .status(500)
        .json({ success: false, message: 'Error interno del servidor' });
    }
  },

  // API para obtener estadísticas
  getStats: async (req, res) => {
    try {
      const stats = await Routine.getUserStats(req.session.user._id);
      res.json({ success: true, stats });
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
      res
        .status(500)
        .json({ success: false, message: 'Error al obtener estadísticas' });
    }
  },
};
