const Message = require('../models/message');
const User = require('../models/user');

module.exports = function (io) {
    io.on('connection', (socket) => {
        console.log('Nuevo usuario conectado:', socket.id);

        // Unirse a una sala de chat específica
        socket.on('join room', async ({ senderId, receiverId }) => {
            const room = [senderId, receiverId].sort().join('-');
            socket.join(room);

            // Obtener mensajes anteriores
            const messages = await Message.find({
                $or: [
                    { sender: senderId, receiver: receiverId },
                    { sender: receiverId, receiver: senderId }
                ]
            }).sort('createdAt').populate('sender', 'name');

            // Emitir solo al socket que se conectó
            socket.emit('previous messages', messages);
        });

        // Escuchar nuevos mensajes
        socket.on('chat message', async ({ senderId, receiverId, content }) => {
            try {
                const room = [senderId, receiverId].sort().join('-');

                // Guardar mensaje en la base de datos
                const message = new Message({
                    sender: senderId,
                    receiver: receiverId,
                    content
                });
                await message.save();

                // Obtener datos completos del mensaje (poblar tanto sender como receiver)
                const fullMessage = await Message.findById(message._id)
                    .populate('sender', 'name')
                    .populate('receiver', 'name');

                // Emitir mensaje a todos en la sala
                io.to(room).emit('chat message', fullMessage);
            } catch (err) {
                console.error('Error al guardar el mensaje:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log('Usuario desconectado:', socket.id);
        });
    });
};