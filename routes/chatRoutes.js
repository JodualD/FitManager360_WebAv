const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Proteger todas las rutas
router.use((req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
});

router.get('/', async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.session.user._id } });
        res.render('chat/chat', { users });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

module.exports = router;