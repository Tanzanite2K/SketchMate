const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const DrawingState = require('./drawing-state');
const RoomManager = require('./rooms');

const PORT = process.env.PORT || 8080;

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/client/index.html' : req.url;
  filePath = path.join(__dirname, '..', filePath);
  
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize room manager
const roomManager = new RoomManager();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  let userId = null;
  let currentRoom = 'default';
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'JOIN':
          userId = data.userId;
          currentRoom = data.room || 'default';
          
          // Add user to room
          roomManager.addUser(currentRoom, userId, data.userName, ws);
          
          // Send current canvas state to new user
          const currentState = roomManager.getCanvasState(currentRoom);
          ws.send(JSON.stringify({
            type: 'INIT_STATE',
            operations: currentState.operations,
            users: roomManager.getUsers(currentRoom)
          }));
          
          // Broadcast user joined to others
          roomManager.broadcast(currentRoom, {
            type: 'USER_JOINED',
            userId: userId,
            userName: data.userName,
            color: data.color,
            users: roomManager.getUsers(currentRoom)
          }, userId);
          
          console.log(`User ${userId} joined room ${currentRoom}`);
          break;
          
        case 'DRAW_START':
          // Broadcast draw start to all users in room
          roomManager.broadcast(currentRoom, {
            type: 'DRAW_START',
            userId: userId,
            x: data.x,
            y: data.y,
            color: data.color,
            width: data.width,
            tool: data.tool
          });
          break;
          
        case 'DRAW':
          // Store operation and broadcast
          const operation = {
            type: 'DRAW',
            userId: userId,
            points: data.points,
            color: data.color,
            width: data.width,
            tool: data.tool,
            timestamp: Date.now()
          };
          
          roomManager.addOperation(currentRoom, operation);
          
          roomManager.broadcast(currentRoom, {
            type: 'DRAW',
            userId: userId,
            points: data.points,
            color: data.color,
            width: data.width,
            tool: data.tool
          });
          break;
          
        case 'CURSOR':
          // Broadcast cursor position
          roomManager.broadcast(currentRoom, {
            type: 'CURSOR',
            userId: userId,
            x: data.x,
            y: data.y
          }, userId);
          break;
          
        case 'UNDO':
          // Global undo - remove last operation
          const undoneOp = roomManager.undo(currentRoom);
          if (undoneOp) {
            roomManager.broadcast(currentRoom, {
              type: 'UNDO',
              operation: undoneOp,
              operations: roomManager.getCanvasState(currentRoom).operations
            });
          }
          break;
          
        case 'REDO':
          // Global redo - restore last undone operation
          const redoneOp = roomManager.redo(currentRoom);
          if (redoneOp) {
            roomManager.broadcast(currentRoom, {
              type: 'REDO',
              operation: redoneOp,
              operations: roomManager.getCanvasState(currentRoom).operations
            });
          }
          break;
          
        case 'CLEAR':
          // Clear canvas
          roomManager.clearCanvas(currentRoom);
          roomManager.broadcast(currentRoom, {
            type: 'CLEAR'
          });
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    if (userId) {
      roomManager.removeUser(currentRoom, userId);
      roomManager.broadcast(currentRoom, {
        type: 'USER_LEFT',
        userId: userId,
        users: roomManager.getUsers(currentRoom)
      });
      console.log(`User ${userId} disconnected from room ${currentRoom}`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});