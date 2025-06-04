const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/fitmanager360');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log('Conectado a MongoDB'));