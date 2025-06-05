document.addEventListener('DOMContentLoaded', function () {
  const socket = io();
  let currentReceiverId = null;

  // Seleccionar usuario para chatear
  document.querySelectorAll('.start-chat').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const userId = this.getAttribute('data-userid');
      const userName = this.textContent.trim();

      currentReceiverId = userId;
      document.getElementById('receiver-id').value = userId;
      document.getElementById('chat-with').textContent = `Chat con ${userName}`;

      // Unirse a la sala de chat
      socket.emit('join room', {
        senderId: document.querySelector('meta[name="user-id"]').getAttribute('content'),
        receiverId: userId
      });
    });
  });

  // Enviar mensaje
  document.getElementById('message-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const receiverId = document.getElementById('receiver-id').value;

    if (message && receiverId) {
      socket.emit('chat message', {
        senderId: document.querySelector('meta[name="user-id"]').getAttribute('content'),
        receiverId: receiverId,
        content: message
      });

      messageInput.value = '';
    }
  });

  // Recibir mensajes
  socket.on('previous messages', function (messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    messages.forEach(msg => {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');

      if (msg.sender._id === document.querySelector('meta[name="user-id"]').getAttribute('content')) {
        messageDiv.classList.add('sent');
      } else {
        messageDiv.classList.add('received');
      }

      messageDiv.innerHTML = `
                <strong>${msg.sender.name}</strong>
                <p>${msg.content}</p>
                <small>${new Date(msg.createdAt).toLocaleString()}</small>
            `;

      messagesContainer.appendChild(messageDiv);
    });

    // Scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  socket.on('chat message', function (message) {
    const currentUserId = document.querySelector('meta[name="user-id"]').getAttribute('content');

    // Mostrar el mensaje si es enviado por mí o recibido por mí en la conversación actual
    if ((message.sender._id === currentUserId && message.receiver._id === currentReceiverId) ||
      (message.sender._id === currentReceiverId && message.receiver._id === currentUserId)) {

      const messagesContainer = document.getElementById('messages');

      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');

      if (message.sender._id === currentUserId) {
        messageDiv.classList.add('sent');
      } else {
        messageDiv.classList.add('received');
      }

      messageDiv.innerHTML = `
            <strong>${message.sender.name}</strong>
            <p>${message.content}</p>
            <small>${new Date(message.createdAt).toLocaleString()}</small>
        `;

      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
});