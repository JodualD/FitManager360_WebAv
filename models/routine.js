const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

// Subdocumento de ejercicios
const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del ejercicio es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre del ejercicio no puede exceder 100 caracteres'],
  },
  sets: {
    type: Number,
    required: [true, 'El número de series es obligatorio'],
    min: [1, 'Debe haber al menos una serie'],
    max: [50, 'El número máximo de series es 50'],
  },
  reps: {
    type: Number,
    required: [true, 'El número de repeticiones es obligatorio'],
    min: [1, 'Debe haber al menos una repetición'],
  },
  rest: {
    type: Number,
    min: [0, 'El tiempo de descanso no puede ser negativo'],
    default: 60, // en segundos
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
  },
});

// Esquema de rutinas
const routineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El nombre del ejercicio es obligatorio'],
      trim: true,
      minlength: [3, 'El título debe tener al menos 3 caracteres'],
      maxlength: [100, 'El título no puede exceder 100 caracteres'],
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
      maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    },
    exercises: {
      type: [exerciseSchema],
      validate: {
        validator: function (exercises) {
          return exercises && exercises.length > 0;
        },
        message: 'Debe haber al menos un ejercicio en la rutina',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    duration: {
      type: Number,
      default: 30,
      min: [5, 'La duración mínima es 5 minutos'],
      max: [300, 'La duración máxima es 300 minutos'],
    },
    completedCount: {
      type: Number,
      default: 0,
      min: [0, 'El contador no puede ser negativo'],
    },
    lastCompleted: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, 'Cada tag no puede exceder 30 caracteres'],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Índices
routineSchema.index({ createdBy: 1, createdAt: -1 });
routineSchema.index({ createdBy: 1, title: 1 });

// Virtuales
routineSchema.virtual('totalExercises').get(function () {
  return this.exercises ? this.exercises.length : 0;
});

routineSchema.virtual('totalSets').get(function () {
  if (!this.exercises) return 0;
  return this.exercises.reduce(
    (total, exercise) => total + (exercise.sets || 0),
    0
  );
});

routineSchema.virtual('formattedCreatedAt').get(function () {
  return this.createdAt.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Método de instancia
routineSchema.methods.markAsCompleted = function () {
  this.completedCount += 1;
  this.lastCompleted = new Date();
  return this.save();
};

// Método estático para estadísticas
routineSchema.statics.getUserStats = async function (userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('ID de usuario no válido');
  }
  const stats = await this.aggregate([
    { $match: { createdBy: new Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalRoutines: { $sum: 1 },
        totalCompletions: { $sum: '$completedCount' },
        avgDuration: { $avg: '$duration' },
        totalExercises: { $sum: { $size: '$exercises' } },
      },
    },
  ]);

  return (
    stats[0] || {
      totalRoutines: 0,
      totalCompletions: 0,
      avgDuration: 0,
      totalExercises: 0,
    }
  );
};

// Configuración de salida JSON
routineSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Routine', routineSchema);
