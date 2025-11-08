# Architecture

This document describes the high-level architecture, data flow and protocol used by this collaborative canvas project. It is written to match the current implementation in the repository (`server/server.js`, `server/rooms.js`, `server/drawing-state.js`, `client/websocket.js`, `client/canvas.js`).

## Data Flow Diagram

Textual diagram (user -> client -> server -> other clients):

User A (browser)
  └─> User input (mouse/touch) captured by `client/canvas.js`
       ├─> local incremental draw on canvas (fast local feedback)
       ├─> `WebSocketManager.sendDrawStart` when stroke starts
       └─> `WebSocketManager.sendDraw` when stroke finishes (sends points array)
            └─> WebSocket message to server (`server/server.js`)
                 ├─> `rooms.js` stores operation on the room's `DrawingState`
                 └─> `rooms.js` broadcasts the `DRAW` message to all connected clients in the room
                      └─> Other clients' `client/websocket.js` receive `DRAW`
                           └─> `client/canvas.js` draws the operation and appends it to local operations history

Notes:
- The server is authoritative for room membership and the canonical operations list. New clients receive an `INIT_STATE` snapshot when they join.
- Cursors are sent frequently but throttled on the client (50ms) and broadcasted to other clients to show live pointer positions.

## WebSocket Protocol (messages)

All messages are JSON objects with a `type` field. The project implements the following message types (direction indicated):

- Client -> Server
  - JOIN
    - { type: 'JOIN', userId, userName, room?, color }
    - Client announces itself and which room to join. Server responds with `INIT_STATE`.

  - DRAW_START
    - { type: 'DRAW_START', x, y, color, width, tool }
    - Optional: used for immediate local cursor feedback; broadcast to other clients so they can show a starting point.

  - DRAW
    - { type: 'DRAW', points, color, width, tool }
    - Sent at the end of a stroke (array of {x,y} points). Server appends the operation to room history and broadcasts it.

  - CURSOR
    - { type: 'CURSOR', x, y }
    - Throttled by client to avoid flooding. Sent frequently to update presence cursors on other clients.

  - UNDO
    - { type: 'UNDO' }
    - Server performs a global undo (pops last operation) and broadcasts updated operations.

  - REDO
    - { type: 'REDO' }
    - Server performs a global redo (restores last undone operation) and broadcasts updated operations.

  - CLEAR
    - { type: 'CLEAR' }
    - Clears server-side room history and instructs clients to clear their canvases.

- Server -> Client
  - INIT_STATE
    - { type: 'INIT_STATE', operations, users }
    - Sent to a joining client with the full operations array and current users list.

  - DRAW
    - { type: 'DRAW', userId, points, color, width, tool }
    - Broadcast to other clients to apply the operation.

  - DRAW_START
    - { type: 'DRAW_START', userId, x, y, color, width, tool }
    - Optional start-of-stroke broadcast.

  - CURSOR
    - { type: 'CURSOR', userId, x, y }
    - Update presence cursor for a given user.

  - UNDO / REDO
    - { type: 'UNDO'|'REDO', operation?, operations }
    - After performing an undo/redo the server broadcasts either message and typically includes the new `operations` array so clients can fully re-sync.

  - CLEAR
    - { type: 'CLEAR' }
    - Instruct clients to clear their canvases.

  - USER_JOINED / USER_LEFT
    - { type: 'USER_JOINED'|'USER_LEFT', userId, userName?, users }
    - Presence updates including the current users list.

Protocol notes:
- Messages are JSON text. The server does basic parsing and switch-case routing in `server/server.js`.
- The server includes the `operations` snapshot in `INIT_STATE` and in undo/redo broadcasts so clients can fully re-render when necessary.

## Undo/Redo Strategy (global operations)

- Per-room `DrawingState` (implemented in `server/drawing-state.js`) holds:
  - `operations` — an ordered array of applied operations (each is a stroke object: points[], color, width, tool, timestamp, userId)
  - `redoStack` — operations popped by undo and held for redo

- UNDO behavior (server-side):
  1. Pop the last operation from `operations` and push it onto `redoStack`.
  2. Broadcast `UNDO` (and the updated `operations`) to all clients so each client can re-render the canvas from the new list.

- REDO behavior (server-side):
  1. Pop the last operation from `redoStack` and push it back onto `operations`.
  2. Broadcast `REDO` (and the updated `operations`) to all clients.

Design considerations & implications:
- The undo/redo is global to the room. There is no per-user undo because the operations array is the single canonical timeline. This simplifies implementation but may be surprising to end users (pressing undo will remove the last stroke even if it belongs to someone else).
- When an undo/redo occurs, the server broadcasts the full operations list so clients re-draw deterministically from the operations array.

## Performance decisions and optimizations

- Incremental strokes: the client draws locally as the user moves the pointer and only sends a compact representation (array of points) when the stroke is finished. This reduces network chatter compared to sending every mousemove event as a DRAW message.
- Throttled cursors: client cursor updates are throttled to ~50ms to provide presence without spamming the server.
- Minimal payloads: `DRAW` contains only the points array and the stroke metadata (color, width, tool). The server broadcasts the same minimal payload instead of sending full canvas images.
- In-memory per-room state: Using an in-memory `operations` array is the simplest and lowest-latency approach for a demo. For production you should snapshot/compact old operations or persist to a database.
- Server-side authoritative ordering: The server timestamps/appends operations in arrival order. This creates a single ordering which simplifies replay and undo/redo implementation.

Potential enhancements for scale:
- Operation compacting: periodically merge older strokes into a raster snapshot and discard their raw points to limit memory.
- Persistence: save operations to a database or object storage and load them on demand.
- Binary protocol or compression: switch to a compact binary websocket message format or GZIP messages for large point arrays.
- Sharding rooms across processes/instances: use a message broker (Redis pub/sub) for multiple server instances.

## Conflict resolution (simultaneous drawing)

- Current approach: last-writer-wins ordering by arrival. The server appends operations to the room's `operations` array in the order it receives them and then broadcasts them.

Implications:
- If two users draw simultaneously in overlapping areas, both strokes are preserved; the visual result depends on the relative timing and order of playback on clients.
- There is no merging, OT, or CRDT — the app relies on coarse-grained stroke operations (entire strokes) rather than fine-grained edits, which reduces complexity.

When to adopt stronger conflict handling:
- If you need deterministic merging of concurrent edits at a per-pixel or per-stroke subcomponent level, consider a CRDT or OT approach. That is significantly more complex and usually required only for collaborative text or structured documents.

## Sequence diagram
