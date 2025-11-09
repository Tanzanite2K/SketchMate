# SketchMate - Collaborative Canvas

A small real-time collaborative drawing canvas built with a Node.js HTTP server, the `ws` WebSocket library and vanilla JavaScript on the client.

## Quick setup

Prerequisites: Node.js (14+) installed.

1. Install dependencies

```powershell
npm install
```

2. Start the server

```powershell
npm start
```

3. Open the app in a browser

Point your browser to http://localhost:8080 (the server serves `client/index.html`). Open multiple browser windows/tabs to test collaboration.

The `start` script runs `node server/server.js` (see `package.json`).


## How to test with multiple users
- Open multiple browser windows or different browsers (Chrome, Firefox, Edge) and navigate to http://localhost:8080.
- Each window will generate a unique user id and color automatically.
- To test as separate users without cookies or shared state, use an incognito/private window for each participant.
- You can join the same room (default room id is `default`) or modify the client code to pass a different `room` to `WebSocketManager.connect(userName, room)`.

Example manual steps:
1. Open two browser windows and visit http://localhost:8080.
2. Draw in one window — strokes should appear in the other window in near-real time.
3. Use the undo/redo buttons in either window to trigger a global undo/redo (these are server-side/global operations — see ARCHITECTURE.md).
4. Try clearing the canvas from one client and observe the broadcast to others.


## Files of interest
- `server/server.js` — HTTP server, WebSocket upgrade and message handling.
- `server/rooms.js` — room manager that stores room users and per-room `DrawingState`.
- `server/drawing-state.js` — in-memory operations history with undo/redo stacks.
- `client/websocket.js` — client WebSocket manager and message handler.
- `client/canvas.js` — canvas drawing logic and operations replay.

## Known limitations / bugs
- In-memory state only: canvas operations and rooms are stored in memory. If the server restarts all canvas history is lost.
- Global undo/redo: UNDO and REDO are global to the room and operate on the shared operations stack. There is no per-user undo — pressing undo removes the last operation from the room history, regardless of owner.
- Memory growth: operations are stored indefinitely and can grow unbounded in long sessions. Consider trimming or snapshotting history for production.
- No authentication: users are identified by a client-generated id and name only. The server accepts the client-provided id and name without validation.
- Basic conflict handling: simultaneous drawing is handled by appending operations - overlapping strokes may interleave and are displayed in arrival order.
- No persistence, no reconnection state beyond `INIT_STATE` on join. Reconnects will get the current in-memory state but if the server restarted, clients will start with a blank canvas.
- Basic security: WebSocket messages are JSON strings and there is no rate limiting or message size enforcement.

## Time spent
- Development & prototyping: ~1 day 3 hours (Extra feature implimentations - live drawing broadcasts, per-room in-memory state, undo/redo stacks, shapes, cursor presence, basic reconnect logic).

## How it works
1. Client sends a `JOIN` message when a user connects. Server responds with `INIT_STATE` containing current operations and user list.
2. Client sends `DRAW` messages (with an array of points) after completing a stroke. Server appends the operation to room history and broadcasts it to others.
3. UNDO/REDO/CLEAR messages are handled on the server and broadcast to all clients with the updated operations list.

## Contributing / Next steps
- Add persistence (database) to survive restarts.
- Implement per-user undo or more advanced conflict resolution for simultaneous edits.
- Limit operations history and/or compress older operations to avoid memory issues.
- Add authentication and room access control.

## Review 
# Join Room
<img width="1919" height="916" alt="image" src="https://github.com/user-attachments/assets/f34dcd7a-71d4-4414-b334-5778247828b8" />
# Sketch 
<img width="1919" height="906" alt="image" src="https://github.com/user-attachments/assets/693ce25b-3b2b-4eb4-a718-f9ba154992a0" />
<img width="1919" height="909" alt="image" src="https://github.com/user-attachments/assets/ce8ef8f0-ab57-41c4-b5f2-826d6a6d5ff9" />
# Undo Operation
<img width="1919" height="918" alt="image" src="https://github.com/user-attachments/assets/436ab841-4260-4f3c-a586-91df71d45c6e" />
# Redo Operation
<img width="1918" height="910" alt="image" src="https://github.com/user-attachments/assets/3064d0a9-f2bf-40eb-9337-b03c8f8b9985" />
# Clear Operation
<img width="1919" height="913" alt="image" src="https://github.com/user-attachments/assets/ec430b6b-4dbe-43d5-9201-0e1c2c357ee0" />
