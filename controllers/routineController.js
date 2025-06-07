const { name } = require('ejs');
const Routine = require('../models/routine');

module.exports = {
  // Dashboard principal con estadísticas
  dashboard: async (req, res) => {
    try {
      // Verificar que existe la sesión y el usuario
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.redirect('/login');
      }
      const userId = req.session.user._id;

      //Obtener rutinaas con manejo de errores
      let routines = [];
      try {
        routines = await Routine.find({
          createdBy: userId,
          isActive: true,
        }).sort({ createdAt: -1 });
      } catch (routineError) {
        console.error('Error al obtener rutinas:', routineError);
        routines = [];
      }
      // Procesar rutinas para agregar campos faltantes
      const processedRoutines = routines.map((routine) => {
        const routineObj = routine.toObject ? routine.toObject() : routine;

        return {
          ...routineObj,
          // Asegurar que completedCount existe
          completedCount: routineObj.completedCount || 0,
          // Formatear fecha de creación
          formattedCreatedAt: routineObj.createdAt
            ? new Date(routineObj.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : 'Sin fecha',
          // Asegurar que exercises existe y es un array
          exercises: Array.isArray(routineObj.exercises)
            ? routineObj.exercises
            : [],
          // Asegurar que tags existe y es un array
          tags: Array.isArray(routineObj.tags) ? routineObj.tags : [],
          // Asegurar valores por defecto
          title: routineObj.title || 'Sin título',
          description: routineObj.description || 'Sin descripción',
          duration: routineObj.duration || 0,
          difficulty: routineObj.difficulty || 'Beginner',
        };
      });

      // Obtener estadísticas con manejo de errores
      let stats = {
        totalRoutines: 0,
        totalCompletions: 0,
        avgDuration: 0,
        totalExercises: 0,
      };

      try {
        // Si existe el método getUserStats en el modelo
        if (typeof Routine.getUserStats === 'function') {
          stats = await Routine.getUserStats(userId);
        } else {
          // Calcular estadísticas manualmente
          stats = {
            totalRoutines: processedRoutines.length,
            totalCompletions: processedRoutines.reduce(
              (sum, routine) => sum + (routine.completedCount || 0),
              0
            ),
            avgDuration:
              processedRoutines.length > 0
                ? processedRoutines.reduce(
                    (sum, routine) => sum + (routine.duration || 0),
                    0
                  ) / processedRoutines.length
                : 0,
            totalExercises: processedRoutines.reduce(
              (sum, routine) =>
                sum + (routine.exercises ? routine.exercises.length : 0),
              0
            ),
          };
        }
      } catch (statsError) {
        console.error('Error al obtener estadísticas:', statsError);
        // Mantener estadísticas por defecto
      }
      res.render('dashboard', {
        routines: processedRoutines,
        stats,
        user: req.session.user,
        title: 'Dashboard - Mis Rutinas',
      });
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
      res.render('dashboard', {
        routines: [],
        stats: {
          totalRoutines: 0,
          totalCompletions: 0,
          avgDuration: 0,
          totalExercises: 0,
        },
        user: req.session.user || { name: 'Invitado' },
        title: 'Dashboard - Mis Rutinas',
        error: 'Error al cargar las rutinas, Por favor, inténtalo más tarde.',
      });
    }
  },

  // Listar rutinas activas
  listRoutines: async (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.redirect('/login');
      }
      const routines = await Routine.find({
        createdBy: req.session.user._id,
        isActive: true,
      }).sort({ createdAt: -1 });
      res.render('routines/list', { routines, user: req.session.user });
    } catch (err) {
      console.error('Error al listar rutinas', err);
      res.redirect('/dashboard');
    }
  },

  showRoutine: async (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.redirect('/login');
      }
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      res.render('routines/view', { routine, user: req.session.user });
    } catch (err) {
      console.error('Error al mostrar rutina', err);
      res.redirect('/routines');
    }
  },

  newRoutineForm: (req, res) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
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
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.redirect('/login');
      }
      const { title, description, exercises, duration, difficulty, tags } =
        req.body;

      if (!title || title.trim().length < 3) {
        return res.render('routines/add', {
          error: 'El título debe tener al menos 3 caracteres',
          title,
          description,
          duration,
          difficulty,
          tags,
          user: req.session.user,
        });
      }

      if (!description || description.trim().length < 10) {
        return res.render('routines/add', {
          error: 'La descripción debe tener al menos 10 caracteres',
          title,
          description,
          duration,
          difficulty,
          tags,
          user: req.session.user,
        });
      }

      if (!exercises || !exercises.name || !Array.isArray(exercises.name)) {
        return res.render('routines/add', {
          error: 'Debe agregar al menos un ejercicio',
          title,
          description,
          duration,
          difficulty,
          tags,
          user: req.session.user,
        });
      }

      const hasEmptyExercise = exercises.name.some(
        (name) => !name || name.trim() === ''
      );
      if (hasEmptyExercise) {
        return res.render('routines/add', {
          error: 'Todos los ejercicios deben tener nombre',
          title,
          description,
          duration,
          difficulty,
          tags,
          user: req.session.user,
        });
      }

      const exercisesArray = exercises.name.map((name, index) => ({
        name: name.trim(),
        sets: parseInt(exercises.sets[index]) || 3,
        reps: parseInt(exercises.reps[index]) || 10,
        rest: parseInt(exercises.rest[index]) || 60,
        description: exercises.description
          ? exercises.description[index] || ''
          : '',
      }));

      const tagsArray = tags ? tags.split(',').map((tag) => tag.trim()) : [];

      const routine = new Routine({
        title: title.trim(),
        description: description.trim(),
        exercises: exercisesArray,
        duration: parseInt(duration) || 30,
        difficulty: difficulty || 'intermediate',
        tags: tagsArray,
        createdBy: req.session.user._id,
        isActive: true,
        completedCount: 0,
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
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.redirect('/login');
      }
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
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.redirect('/login');
      }
      const { title, description, exercises, duration, difficulty, tags } =
        req.body;
      const routine = await Routine.findById(req.params.id);

      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }

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

      const exercisesArray = exercises.name.map((name, index) => ({
        name: name.trim(),
        sets: parseInt(exercises.sets[index]) || 3,
        reps: parseInt(exercises.reps[index]) || 10,
        rest: parseInt(exercises.rest[index]) || 60,
        description: exercises.description ? exercises.description[index] : '',
      }));

      const tagsArray = tags
        ? tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
      //Actualizar rutina
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
          'Error al actualizar la rutina: ' + (err.message || 'desconocido'),
      });
    }
  },

  deleteRoutine: async (req, res) => {
    try {
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res.redirect('/routines');
      }
      routine.isActive = false;
      await routine.save();
      res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      res.redirect('/routines');
    }
  },

  completeRoutine: async (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado',
        });
      }
      const routine = await Routine.findById(req.params.id);
      if (!routine || !routine.createdBy.equals(req.session.user._id)) {
        return res
          .status(404)
          .json({ success: false, message: 'Rutina no encontrada' });
      }
      // Incrementar contador de completadas
      if (typeof routine.markAsCompleted === 'function') {
        await routine.markAsCompleted();
      } else {
        routine.completedCount = (routine.completedCount || 0) + 1;
        routine.lastCompleted = new Date();
        await routine.save();
      }
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

  getStats: async (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado',
        });
      }
      let stats;
      if (typeof Routine.getUserStats === 'function') {
        stats = await Routine.getUserStats(req.session.user._id);
      } else {
        // Calcular estadísticas manualmente
        const routines = await Routine.find({
          createdBy: req.session.user._id,
          isActive: true,
        });
        stats = {
          totalRoutines: routines.length,
          totalCompletions: routines.reduce(
            (sum, routine) => sum + (routine.completedCount || 0),
            0
          ),
          avgDuration:
            routines.length > 0
              ? routines.reduce(
                  (sum, routine) => sum + (routine.duration || 0),
                  0
                ) / routines.length
              : 0,
          totalExercises: routines.reduce(
            (sum, routine) =>
              sum + (routine.exercises ? routine.exercises.length : 0),
            0
          ),
        };
      }
      res.json({ success: true, stats });
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
      res
        .status(500)
        .json({ success: false, message: 'Error al obtener estadísticas' });
    }
  },
  // Nueva función para duplicar rutina
  duplicateRoutine: async (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user._id) {
        return res.redirect('/login');
      }

      const originalRoutine = await Routine.findById(req.params.id);
      if (
        !originalRoutine ||
        !originalRoutine.createdBy.equals(req.session.user._id)
      ) {
        return res.redirect('/routines');
      }

      const duplicatedRoutine = new Routine({
        title: `${originalRoutine.title} (Copia)`,
        description: originalRoutine.description,
        exercises: originalRoutine.exercises,
        duration: originalRoutine.duration,
        difficulty: originalRoutine.difficulty,
        tags: originalRoutine.tags,
        createdBy: req.session.user._id,
        isActive: true,
        completedCount: 0,
      });

      await duplicatedRoutine.save();
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Error al duplicar rutina:', err);
      res.redirect('/dashboard');
    }
  },
};
