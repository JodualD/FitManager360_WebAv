const User = require('../models/user');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configuración de nodemailer (simplificada para el ejemplo)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = {
    getLogin: (req, res) => {
        res.render('auth/login', { error: null });
    },

    postLogin: async (req, res) => {
        const { email, password } = req.body;
        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.render('auth/login', { error: 'Usuario no encontrado' });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.render('auth/login', { error: 'Contraseña incorrecta' });
            }

            req.session.user = user;
            res.redirect('/dashboard');
        } catch (err) {
            console.error(err);
            res.render('auth/login', { error: 'Error en el servidor' });
        }
    },

    getSignup: (req, res) => {
        res.render('auth/signup', { error: null });
    },

    postSignup: async (req, res) => {
        const { name, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('auth/signup', { error: 'Las contraseñas no coinciden' });
        }

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.render('auth/signup', { error: 'El email ya está registrado' });
            }

            const user = new User({ name, email, password });
            await user.save();

            req.session.user = user;
            res.redirect('/dashboard');
        } catch (err) {
            console.error(err);
            res.render('auth/signup', { error: 'Error al registrar el usuario' });
        }
    },

    getReset: (req, res) => {
        res.render('auth/reset', { error: null, message: null });
    },

    postReset: async (req, res) => {
        const { email } = req.body;
        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.render('auth/reset', { error: 'Usuario no encontrado', message: null });
            }

            const token = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
            await user.save();

            const resetUrl = `http://${req.headers.host}/reset/${token}`;
            const mailOptions = {
                to: user.email,
                from: process.env.EMAIL_USER,
                subject: 'Restablecimiento de contraseña',
                text: `Para restablecer tu contraseña, haz clic en el siguiente enlace:\n\n${resetUrl}\n\nSi no solicitaste este restablecimiento, ignora este correo.`
            };

            await transporter.sendMail(mailOptions);
            res.render('auth/reset', { error: null, message: 'Se ha enviado un correo con instrucciones' });
        } catch (err) {
            console.error(err);
            res.render('auth/reset', { error: 'Error al procesar la solicitud', message: null });
        }
    },

    getResetToken: async (req, res) => {
        try {
            const user = await User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() } // El token aún es válido
            });

            if (!user) {
                return res.render('auth/reset', { error: 'Token inválido o expirado', message: null });
            }

            res.render('auth/new-password', { token: req.params.token, error: null });
        } catch (err) {
            console.error(err);
            res.render('auth/reset', { error: 'Error en el servidor', message: null });
        }
    },

    postNewPassword: async (req, res) => {
        const { token, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('auth/new-password', { token, error: 'Las contraseñas no coinciden' });
        }

        try {
            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.render('auth/reset', { error: 'Token inválido o expirado', message: null });
            }

            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.redirect('/login');
        } catch (err) {
            console.error(err);
            res.render('auth/new-password', { token, error: 'Error al restablecer la contraseña' });
        }
    },


    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    }
};