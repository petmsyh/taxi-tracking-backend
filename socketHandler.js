const pool = require('./database');

const connectedUsers = new Map(); // Store user socket connections (userId -> socketId)

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins with their user ID
    socket.on('user_join', (data) => {
      const { userId, role } = data;
      connectedUsers.set(userId, { socketId: socket.id, role });
      socket.join(`user_${userId}`);
      console.log(`User ${userId} (${role}) joined`);
    });

    // User joins a chat room
    socket.on('join_chat', async (data) => {
      const { chatId, userId } = data;
      
      try {
        // Verify user is part of this chat
        const chatCheck = await pool.query(
          'SELECT patient_id, doctor_id FROM chats WHERE id = $1',
          [chatId]
        );

        if (chatCheck.rows.length > 0) {
          const chat = chatCheck.rows[0];
          if (chat.patient_id === userId || chat.doctor_id === userId) {
            socket.join(`chat_${chatId}`);
            console.log(`User ${userId} joined chat ${chatId}`);
            
            // Notify other users in chat
            socket.to(`chat_${chatId}`).emit('user_joined_chat', { userId });
          }
        }
      } catch (error) {
        console.error('Error joining chat:', error);
      }
    });

    // Send message in chat
    socket.on('send_message', async (data) => {
      const { chatId, senderId, content, attachments, messageType } = data;
      
      try {
        // Verify user is part of this chat
        const chatCheck = await pool.query(
          'SELECT patient_id, doctor_id FROM chats WHERE id = $1',
          [chatId]
        );

        if (chatCheck.rows.length === 0) {
          socket.emit('message_error', { error: 'Chat not found' });
          return;
        }

        const chat = chatCheck.rows[0];
        if (chat.patient_id !== senderId && chat.doctor_id !== senderId) {
          socket.emit('message_error', { error: 'Unauthorized' });
          return;
        }

        // Save message to database
        const result = await pool.query(
          `INSERT INTO messages (chat_id, sender_id, content, attachments, message_type) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [chatId, senderId, content, attachments || [], messageType || 'text']
        );

        const message = result.rows[0];

        // Update chat updated_at timestamp
        await pool.query(
          'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [chatId]
        );

        // Get sender info
        const senderInfo = await pool.query(
          'SELECT first_name, last_name FROM users WHERE id = $1',
          [senderId]
        );

        const messageData = {
          ...message,
          sender_first_name: senderInfo.rows[0].first_name,
          sender_last_name: senderInfo.rows[0].last_name
        };

        // Broadcast message to all users in the chat room
        io.to(`chat_${chatId}`).emit('new_message', messageData);

        // Send push notification to offline users
        const recipientId = chat.patient_id === senderId ? chat.doctor_id : chat.patient_id;
        const recipientConnection = connectedUsers.get(recipientId);
        
        if (!recipientConnection) {
          // User is offline - would trigger push notification here
          console.log(`User ${recipientId} is offline - push notification needed`);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { chatId, userId } = data;
      socket.to(`chat_${chatId}`).emit('user_typing', { userId });
    });

    socket.on('stop_typing', (data) => {
      const { chatId, userId } = data;
      socket.to(`chat_${chatId}`).emit('user_stop_typing', { userId });
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      const { chatId, userId } = data;
      
      try {
        await pool.query(
          `UPDATE messages SET read_flag = true 
           WHERE chat_id = $1 AND sender_id != $2 AND read_flag = false`,
          [chatId, userId]
        );

        socket.to(`chat_${chatId}`).emit('messages_read', { chatId, userId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Doctor availability status update
    socket.on('update_availability', async (data) => {
      const { doctorId, isAvailable } = data;
      
      try {
        await pool.query(
          'UPDATE doctors SET is_available = $1 WHERE user_id = $2',
          [isAvailable, doctorId]
        );

        // Broadcast availability change
        io.emit('doctor_availability_changed', { doctorId, isAvailable });
      } catch (error) {
        console.error('Error updating availability:', error);
      }
    });

    // Emit notification to specific user
    socket.on('send_notification', async (data) => {
      const { userId, notification } = data;
      
      try {
        // Send notification to user's room
        io.to(`user_${userId}`).emit('new_notification', notification);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    });

    socket.on('disconnect', () => {
      // Remove user from connected users
      for (const [userId, connection] of connectedUsers.entries()) {
        if (connection.socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  // Export helper function to send notifications from outside socket context
  return {
    sendNotification: (userId, notification) => {
      io.to(`user_${userId}`).emit('new_notification', notification);
    },
    broadcastAppointmentUpdate: (appointmentId, data) => {
      io.emit('appointment_updated', { appointmentId, ...data });
    }
  };
}

module.exports = { initializeSocket };
