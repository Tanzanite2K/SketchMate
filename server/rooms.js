const DrawingState = require('./drawing-state');

// this class is going to manage rooms, users(add, remove, get all users), and drawing states(undo, redo, clear, current state of canvas).
class RoomManager {
  constructor() {
    this.rooms = new Map();
  }
  
  // get the room by roomid, if not exist create new room
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        drawingState: new DrawingState()
      });
    }
    return this.rooms.get(roomId);
  }

  
  // add user to that particular roomid user wanted to join 
  addUser(roomId, userId, userName, ws) {
    const room = this.getRoom(roomId);
    room.users.set(userId, {
      id: userId,
      name: userName,
      ws: ws,
      joinedAt: Date.now()
    });
  }
  
  // remove user from that particular roomid 
  removeUser(roomId, userId) {
    const room = this.getRoom(roomId);
    room.users.delete(userId);
    
    // Clean up empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    }
  }
  // get all users in a room
  getUsers(roomId) {
    const room = this.getRoom(roomId);
    return Array.from(room.users.values()).map(user => ({
      id: user.id,
      name: user.name
    }));
  }

  // send message to all users in a room except the users who exited
  broadcast(roomId, msg, exclude_uId = null) {
    const room = this.getRoom(roomId);
    const msgStr = JSON.stringify(msg);

    room.users.forEach((user, userId) => {
      if (userId !== exclude_uId && user.ws.readyState === 1) { // 1 = OPEN
        try {
          user.ws.send(msgStr);
        } catch (error) {
          console.error(`Error sending to user ${userId}:`, error);
        }
      }
    });
  }
  


  // Drawing state management methods
  addOperation(roomId, op) {
    const r = this.getRoom(roomId);
    r.drawingState.addOperation(op);
  }

  // Undo the last drawing operation
  undo(roomId) {
    const r = this.getRoom(roomId);
    return r.drawingState.undo();
  }

  // Redo the last undone drawing operation
  redo(roomId) {
    const r = this.getRoom(roomId);
    return r.drawingState.redo();
  }

  // Clear the canvas
  clearCanvas(roomId) {
    const r = this.getRoom(roomId);
    r.drawingState.clear();
  }
  
  // Get the current state of the canvas
  getCanvasState(roomId) {
    const r = this.getRoom(roomId);
    return r.drawingState.getState();
  }
}


module.exports = RoomManager;