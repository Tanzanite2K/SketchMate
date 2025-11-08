const DrawingState = require('./drawing-state');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }
  
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        drawingState: new DrawingState()
      });
    }
    return this.rooms.get(roomId);
  }
  
  addUser(roomId, userId, userName, ws) {
    const room = this.getRoom(roomId);
    room.users.set(userId, {
      id: userId,
      name: userName,
      ws: ws,
      joinedAt: Date.now()
    });
  }
  
  removeUser(roomId, userId) {
    const room = this.getRoom(roomId);
    room.users.delete(userId);
    
    // Clean up empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    }
  }
  
  getUsers(roomId) {
    const room = this.getRoom(roomId);
    return Array.from(room.users.values()).map(user => ({
      id: user.id,
      name: user.name
    }));
  }
  
  broadcast(roomId, message, excludeUserId = null) {
    const room = this.getRoom(roomId);
    const messageStr = JSON.stringify(message);
    
    room.users.forEach((user, userId) => {
      if (userId !== excludeUserId && user.ws.readyState === 1) { // 1 = OPEN
        try {
          user.ws.send(messageStr);
        } catch (error) {
          console.error(`Error sending to user ${userId}:`, error);
        }
      }
    });
  }
  
  addOperation(roomId, operation) {
    const room = this.getRoom(roomId);
    room.drawingState.addOperation(operation);
  }
  
  undo(roomId) {
    const room = this.getRoom(roomId);
    return room.drawingState.undo();
  }
  
  redo(roomId) {
    const room = this.getRoom(roomId);
    return room.drawingState.redo();
  }
  
  clearCanvas(roomId) {
    const room = this.getRoom(roomId);
    room.drawingState.clear();
  }
  
  getCanvasState(roomId) {
    const room = this.getRoom(roomId);
    return room.drawingState.getState();
  }
}

module.exports = RoomManager;