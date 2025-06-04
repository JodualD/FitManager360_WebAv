require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const methodOverride = require('method-override');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const routineRoutes = require('./routes/routineRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Configuración de la aplicación
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 día
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Variables globales
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

// Rutas
app.use('/', authRoutes);
app.use('/routines', routineRoutes);
app.use('/chat', chatRoutes);

// Ruta principal
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('dashboard', { user: req.session.user });
});

// Configuración de Socket.IO
require('./controllers/chatController')(io);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});