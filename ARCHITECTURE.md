# Architechture
This docment try’s to explane the high level architechure, dataflow & protcol used in this colaborative canvas thingy. its kinda matched with whats implimented right now in the repo (`server/server.js`, `server/rooms.js`, `server/drawing-state.js`, `client/websocket.js`, `client/canvas.js`).

## Data Flow Diagram
So basiclly how data goes (user -> client -> server -> other clients):

User A (browser):

1. When the user moves mouse/touch – its caputred by `client/canvas.js`
   * It draws localy on canvas fast so user sees it right away (fast feedback duh)
   * `WebSocketManager.sendDrawStart` fires when stroke starts
   * `WebSocketManager.sendDraw` goes when stroke ends (it sends a list of points `[x,y]`)

2. Then this goes as Websocket msg -> Server (`server/server.js`)
   * `rooms.js` saves this action into room’s `DrawingState`
   * and then `rooms.js` emits a `DRAW` msg to all ppl in that room

3. **Other clients (`client/websocket.js`)**
   * Get that `DRAW` msg
   * then `client/canvas.js` replays that stroke and adds to local histroy

Notes:
* Server is the boss, it controls room members & keeps the main list of operations. New clients get `INIT_STATE` when they join.
* Cursors r sent very often but throttled (50ms ish) so not to spam, others see where ur pointer is.


## WebSocket Protcol (msgs)
Every msg is json, with `type` feild. The app has these msgs (dir shown):

### Client → Server

* **JOIN**

  * `{ type: 'JOIN', userId, userName, room?, color }`
  * client tells which room to join etc. server replies with `INIT_STATE`.

* **DRAW_START**

  * `{ type: 'DRAW_START', x, y, color, width, tool }`
  * optional msg just to show starting point of stroke to others, instant feedback.

* **DRAW**

  * `{ type: 'DRAW', points, color, width, tool }`
  * sent when stroke finishes. has array of {x,y}. server saves it in histroy n tells others.

* **CURSOR**

  * `{ type: 'CURSOR', x, y }`
  * sent alot but throttled so not spammy. updates user cursors on others screens.

* **UNDO**

  * `{ type: 'UNDO' }`
  * server undos the last op, pops it out and broadcast to everyone.

* **REDO**

  * `{ type: 'REDO' }`
  * does redo of the last undone op, sends update to all clients.

* **CLEAR**

  * `{ type: 'CLEAR' }`
  * clears the room histroy, all users clear their canvas too.

---

### Server → Client

* **INIT_STATE**

  * `{ type: 'INIT_STATE', operations, users }`
  * sent to new client with full history n user list.

* **DRAW**

  * `{ type: 'DRAW', userId, points, color, width, tool }`
  * tells other users to draw this stroke.

* **DRAW_START**

  * `{ type: 'DRAW_START', userId, x, y, color, width, tool }`
  * optional broadcast when someone starts drawing.

* **CURSOR**

  * `{ type: 'CURSOR', userId, x, y }`
  * updates pointer for that user.

* **UNDO / REDO**

  * `{ type: 'UNDO'|'REDO', operation?, operations }`
  * after undo/redo server sends this, mostly includes new `operations` arr so everyone can resync.

* **CLEAR**

  * `{ type: 'CLEAR' }`
  * everyone clears their canvas.

* **USER_JOINED / USER_LEFT**

  * `{ type: 'USER_JOINED'|'USER_LEFT', userId, userName?, users }`
  * updates presence list.

Notes:

* all msgs r json strings, server parses them simple switch-case in `server/server.js`.
* `INIT_STATE` and undo/redo always include ops snapshot so clients redraw cleanly.

---

## Undo / Redo Strategy (global ops)

Each room has `DrawingState` (in `server/drawing-state.js`) with:

* `operations` → list of all strokes in order (each stroke has: points[], color, width, tool, timestamp, userId)
* `redoStack` → ops removed by undo, saved for redo

### UNDO (server side)

1. takes last op from `operations`, pushes into `redoStack`
2. sends `UNDO` msg (with updated ops) to all clients so they re-render canvas

### REDO (server side)

1. pops last op from `redoStack`, adds back to `operations`
2. sends `REDO` msg (with new ops) to everyone

Design notez:
* undo/redo is *global* not per user. So any1 pressing undo will remove the latest stroke, even if it was someone elses.
* to keep all in sync, server sends whole ops list again after undo/redo so everyone draws same thing.


## Performance and Optimizations
* **Incremental strokes:** client draws locally while moving pointer, sends only final array of points later. reduces net traffic instead of spamming every move.
* **Throttled cursors:** cursors r limited to about every 50ms, so realtime but not spammy.
* **Small payloads:** `DRAW` only has points, color, width, tool. not full canvas images.
* **In-memory state:** for demo we just store in mem per room, fast. for real prod you should store in db or snapshot old ops to free mem.
* **Server ordering:** server stamps and appends ops in order received → makes playback & undo simpler.

### Possible Future Improve
* Merge old ops into image snapshot sometimes so mem not explode.
* Save ops to DB or cloud store so persistent history.
* maybe binary websocket msgs or gzip compress for big arrays.
* Scale out with redis pub/sub to sync multi servers.


## Conflict Resolution (multi ppl drawing same time)
Now if 2 users draw at same time... current rule is *last writer wins* by order server got them.

So:
* Both strokes saved.
* Result depends on order/time the server got & client replay order.
* no fancy merging or CRDT or OT stuff here — strokes are just big chunks, not per pixel edit. easier & simple.
