const http = require('http');

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const DrawingState = require('./drawing-state');
const RoomManager = require('./rooms');

const PORT = process.env.PORT || 8080;

// MIME types for serving static files

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.ico': 'image/x-icon'
};

// Creataing HTTP server to serve static files
const server = http.createServer((req, res) => {

  let filePath = req.url === '/' ? '/client/index.html' : req.url;

  filePath = path.join(__dirname, '..', filePath);
  
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  

  // Read the requested file into memory
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        console.error('Server error:', error);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }

  });
});

// Creating a WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize the room manager
const roomManager = new RoomManager();

// Handling WebSocket connections
wss.on('connection', (ws) => {

  console.log('New client connected');
  
  let userId = null;
  let currRoom = 'default';
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'JOIN':
          console.log(`User ${data.userId} joined room ${data.room}`);
          userId = data.userId;
          currRoom = data.room || 'default';
          
          // Add user to room
          roomManager.addUser(currRoom, userId, data.userName, ws);
          

          // Send current canvas state to new user *
          const currState = roomManager.getCanvasState(currRoom);
          ws.send(JSON.stringify({
            type: 'INIT_STATE',
            operations: currState.operations,
            users: roomManager.getUsers(currRoom)
          }));
          // notify other users that a new user has joined
          roomManager.broadcast(currRoom, {
            type: 'USER_JOINED',
            userId: userId,
            userName: data.userName,
            color: data.color,
            users: roomManager.getUsers(currRoom)
          }, userId);
          


          console.log(`User ${userId} joined room ${currRoom}`);
          break;
          
        case 'DRAW_START':
          // Broadcast draw start to all users in room
          roomManager.broadcast(currRoom, {
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
          // Store operation and broadcast to all users in room
          const operation = {
            type: 'DRAW',
            userId: userId,
            points: data.points,
            color: data.color,
            width: data.width,
            tool: data.tool,
            timestamp: Date.now()
          };
          roomManager.addOperation(currRoom, operation);
          

          roomManager.broadcast(currRoom, {
            type: 'DRAW',
            userId: userId,
            points: data.points,
            color: data.color,
            width: data.width,
            tool: data.tool
          });
          break;
          

        case 'CURSOR':
          // Broadcast cursor position to other users
          roomManager.broadcast(currRoom, {
            type: 'CURSOR',
            userId: userId,
            x: data.x,
            y: data.y
          }, userId);
          break;
          
        case 'UNDO':
          // Global undo => remove last operation from canvas
          const undoneOp = roomManager.undo(currRoom);
          if (undoneOp) {
            roomManager.broadcast(currRoom, {
              type: 'UNDO',
              operation: undoneOp,
              operations: roomManager.getCanvasState(currRoom).operations
            });
          }
          break;
          

        case 'REDO':
          // Global redo => restore last operation to canvas
          const redoneOp = roomManager.redo(currRoom);
          if (redoneOp) {
            roomManager.broadcast(currRoom, {
              type: 'REDO',
              operation: redoneOp,
              operations: roomManager.getCanvasState(currRoom).operations
            });
          }
          break;
          

        case 'CLEAR':
          // Clear canvas and notify all users
          roomManager.clearCanvas(currRoom);
          roomManager.broadcast(currRoom, {
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
      roomManager.removeUser(currRoom, userId);
      roomManager.removeUser(currRoom, userId);
      roomManager.broadcast(currRoom, {
        type: 'USER_LEFT',
        userId: userId,
        users: roomManager.getUsers(currRoom)
      });

      console.log(`User ${userId} disconnected from room ${currRoom}`);
    }
  });
  

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

});

server.listen(PORT, () => {
  
  console.log(`Server running on http://localhost:${PORT}`);
});
