// this class manages the canvas drawing operations, user interactions, and cursor updates

class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);

    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    
    // Drawing state
    this.isDrawing = false;
    this.currentTool = 'brush';

    this.currentColor = '#6366f1';
    this.currentWidth = 5;

    this.points = [];
    



    // Shape drawing state
    this.startPoint = null;


    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d');
  // Pointer or an preview state


  this._activePointerId = null;
  this._previewRaf = null;
  this._lastPreviewPos = null;
  this._actionSent = false; // ensure stopDrawing only sends once per action
    
    // Operations history for redrawing
    this.operations = [];
    

    // User cursors
    this.cursors = new Map();
    
    this.setupCanvas();
    this.setupEventListeners();

  }
  
  setupCanvas() {
    // Set canvas size to match container
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
    


    // Set canvas properties
    this.ctx.lineCap = 'round';

    this.ctx.lineJoin = 'round';
    
    // Setup temp canvas for shape preview
    this.tempCanvas.style.position = 'absolute';



    this.tempCanvas.style.pointerEvents = 'none';
    this.tempCanvas.style.left = '0px';
    this.tempCanvas.style.top = '0px';

    this.tempCanvas.style.zIndex = '2';
    // ensure the parent container is the positioned container (canvas-container)

    this.canvas.parentElement.appendChild(this.tempCanvas);
    this.resizeTempCanvas();


  }
  



  resizeTempCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;


    
    // Reset the scale first
    this.tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    
    this.tempCanvas.width = rect.width * dpr;


    this.tempCanvas.height = rect.height * dpr;


    this.tempCanvas.style.width = rect.width + 'px';
    this.tempCanvas.style.height = rect.height + 'px';

    this.tempCanvas.style.left = this.canvas.offsetLeft + 'px';

    this.tempCanvas.style.top = this.canvas.offsetTop + 'px';
    // Scale context
    this.tempCtx.scale(dpr, dpr);
  }
  


  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Store current canvas state

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Resize canvas
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    
    this.canvas.style.width = rect.width + 'px';


    this.canvas.style.height = rect.height + 'px';
    
    // Scale context


    this.ctx.scale(dpr, dpr);
    
    // Clear and fill with white background
    this.ctx.fillStyle = '#ffffff';

    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Restore canvas state


    this.ctx.putImageData(imageData, 0, 0);
    

    // Resize temp canvas
    this.resizeTempCanvas();
    

    // Redraw all operations
    this.redrawCanvas();


  }



  
  setupEventListeners() {
    // Use Pointer Events handling and to track the active pointer

    this.canvas.addEventListener('pointerdown', (e) => {
      // Only start if left button
      if (e.isPrimary) {

        this._activePointerId = e.pointerId;
        this.startDrawing(e);

        // Capture pointer to continue receiving events outside canvas
      } 

    });

    this.canvas.addEventListener('pointermove', (e) => {
      // Only process moves for the active pointer


      if (this._activePointerId === null || e.pointerId !== this._activePointerId) return;
      this.draw(e);
    });

    this.canvas.addEventListener('pointerup', (e) => {


      if (this._activePointerId === null || e.pointerId !== this._activePointerId) return;
      this.stopDrawing(e);
      this._activePointerId = null;

    });

    this.canvas.addEventListener('pointercancel', (e) => {

      if (this._activePointerId === null || e.pointerId !== this._activePointerId) return;
      this.stopDrawing(e);
      this._activePointerId = null;

    });


  }
  
// Get mouse position relative to canvas
  
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();

    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  startDrawing(e) {


    // Begin a drawing action for the active pointer
    this.isDrawing = true;

    this._actionSent = false;
    const pos = this.getMousePos(e);


    this.startPoint = pos;

    this.points = [pos];


    this._lastPreviewPos = pos;

    // Notify WebSocket about start
    if (window.wsManager) {

      window.wsManager.sendDrawStart(pos.x, pos.y, this.currentColor, this.currentWidth, this.currentTool);
    }
  }
  
  draw(e) {
    // Send cursor position
    const pos = this.getMousePos(e);


    if (window.wsManager) {
      window.wsManager.sendCursor(pos.x, pos.y);
    }

    
    if (!this.isDrawing) return;

    // For brush/eraser draw immediately
    if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
      this.points.push(pos);
      if (this.points.length >= 2) {

        const lastPoint = this.points[this.points.length - 2];
        const currentPoint = this.points[this.points.length - 1];

        this.ctx.beginPath();
        this.ctx.moveTo(lastPoint.x, lastPoint.y);


        this.ctx.lineTo(currentPoint.x, currentPoint.y);
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
        this.ctx.lineWidth = this.currentWidth;

        this.ctx.stroke();
      }
      return;
    }


    // preview with requestAnimationFrame
    this._lastPreviewPos = pos;
    if (!this._previewRaf) {
      this._previewRaf = requestAnimationFrame(() => {



        this._previewRaf = null;
        const p = this._lastPreviewPos;
        // Clear temp canvas properly 
        this.tempCtx.setTransform(1, 0, 0, 1, 0, 0);

        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        // Reapply DPR scale for drawing in CSS pixels
        
        const dpr = window.devicePixelRatio || 1;
        this.tempCtx.scale(dpr, dpr);

        this.tempCtx.beginPath();


        this.tempCtx.strokeStyle = this.currentColor;
        this.tempCtx.lineWidth = this.currentWidth;

        switch (this.currentTool) {
          case 'rectangle':
            this.drawRectangle(this.tempCtx, this.startPoint, p);
            break;

            
          case 'square':
            this.drawSquare(this.tempCtx, this.startPoint, p);
            break;
          case 'circle':
            this.drawCircle(this.tempCtx, this.startPoint, p);
            break;
          case 'triangle':
            this.drawTriangle(this.tempCtx, this.startPoint, p);
            break;
        }
        this.tempCtx.stroke();


      });
    }


  }
  
  stopDrawing() {


    if (!this.isDrawing) return;
    this.isDrawing = false;


    if (this.points.length === 0 && (this.currentTool === 'brush' || this.currentTool === 'eraser')) {
      // nothing to send
      return;
    }



    // Finalize shape drawing
    if (this.currentTool !== 'brush' && this.currentTool !== 'eraser') {


      const endPoint = this._lastPreviewPos || this.startPoint;

      // Draw the final shape onto main canvas
      this.ctx.beginPath();


      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentWidth;

      

      switch (this.currentTool) {
        case 'rectangle':
          this.drawRectangle(this.ctx, this.startPoint, endPoint);
          break;

        case 'square':
          this.drawSquare(this.ctx, this.startPoint, endPoint);
          break;
        case 'circle':
          this.drawCircle(this.ctx, this.startPoint, endPoint);
          break;
          
        case 'triangle':
          this.drawTriangle(this.ctx, this.startPoint, endPoint);
          break;
      }
      this.ctx.stroke();



      // Clear preview canvas
      this.tempCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);


      // reapply DPR
      this.tempCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);


      // Build a normalized operation (shape-only) and add to local history
      const opPoints = [{ type: this.currentTool, start: this.startPoint, end: endPoint }];





      const operation = { points: opPoints, color: this.currentColor, width: this.currentWidth, tool: this.currentTool };
      this.addOperation(operation);



      // Send single shape operation to server (only once)


      if (window.wsManager && !this._actionSent) {
        window.wsManager.sendDraw(opPoints, this.currentColor, this.currentWidth, this.currentTool);
        this._actionSent = true;
      }
    } else {
      // For brush/eraser: create operation from collected points
      const opPoints = this.points.slice();
      const operation = { points: opPoints, color: this.currentColor, width: this.currentWidth, tool: this.currentTool };

      this.addOperation(operation);


      if (window.wsManager && !this._actionSent) {
        window.wsManager.sendDraw(opPoints, this.currentColor, this.currentWidth, this.currentTool);
        this._actionSent = true;


      }
    }

    // Reset per-action state
    this.points = [];



    this.startPoint = null;
    this._lastPreviewPos = null;

    this._previewRaf = null;
    this._actionSent = false;
  }
  
  drawRectangle(ctx, start, end) {


    ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
  }
  
  drawSquare(ctx, start, end) {
    const size = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    const signX = Math.sign(end.x - start.x);


    const signY = Math.sign(end.y - start.y);
    ctx.rect(start.x, start.y, size * signX, size * signY);



  }
  
  drawCircle(ctx, start, end) {

    
    const radius = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    ) / 2;
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;


    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  }
  
  drawTriangle(ctx, start, end) {
    ctx.moveTo(start.x, start.y);

    ctx.lineTo(end.x, end.y);
    ctx.lineTo(start.x - (end.x - start.x), end.y);

    ctx.closePath();
  }
  
  // Draw operation from remote user or history
  drawOperation(operation) {
    
    if (!operation.points || operation.points.length === 0) return;
    
    this.ctx.strokeStyle = operation.tool === 'eraser' ? '#ffffff' : operation.color;
    this.ctx.lineWidth = operation.width;
    
    // Check if this is a shape operation


    const lastPoint = operation.points[operation.points.length - 1];
    if (typeof lastPoint === 'object' && lastPoint.type) {
      // This is a shape operation


      const shapeData = lastPoint;
      this.ctx.beginPath();
      
      switch (shapeData.type) {

        case 'rectangle':
          this.drawRectangle(this.ctx, shapeData.start, shapeData.end);
          break;
        case 'square':
          this.drawSquare(this.ctx, shapeData.start, shapeData.end);
          break;

        case 'circle':
          this.drawCircle(this.ctx, shapeData.start, shapeData.end);
          break;
        case 'triangle':
          this.drawTriangle(this.ctx, shapeData.start, shapeData.end);
          break;
      }
      
      
      this.ctx.stroke();
    } else {
      // This is a brush operation
      this.ctx.beginPath();


      this.ctx.moveTo(operation.points[0].x, operation.points[0].y);
      
      for (let i = 1; i < operation.points.length; i++) {


        this.ctx.lineTo(operation.points[i].x, operation.points[i].y);
      }
      

      this.ctx.stroke();
    }
  }
  
  // Redraw entire canvas from operations
  redrawCanvas() {
    // Reset transform to ensure proper clearing
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);


    
    // Clear the entire canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Fill with white background
    this.ctx.fillStyle = '#ffffff';


    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Restore the device pixel ratio scale
    const dpr = window.devicePixelRatio || 1;

    this.ctx.scale(dpr, dpr);




    
    // Redraw all operations
    this.operations.forEach(op => {
      this.drawOperation(op);
    });
  }
  


  // Set operations (used for syncing)
  setOperations(operations) {


    this.operations = operations;
    this.redrawCanvas();

  }




  
  // Add operation to history

  addOperation(operation) {
    this.operations.push(operation);


  }
  
  // Clear canvas
  clear() {
    // Reset all drawing state
    this.operations = [];


    this.points = [];
    this.startPoint = null;


    this.isDrawing = false;
    
    // Clear temp canvas

    this.tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);

    const dpr = window.devicePixelRatio || 1;
    this.tempCtx.scale(dpr, dpr);
    

    // Clear and redraw main canvas
    this.redrawCanvas();
  }
  




  // Tool management
  setTool(tool) {
    this.currentTool = tool;

  }
  
  setColor(color) {
    this.currentColor = color;

  }
  
  setWidth(width) {
    this.currentWidth = width;
  }
  
  // Cursor management


  updateCursor(userId, x, y, color) {
    const overlay = document.getElementById('cursorsOverlay');

    let cursor = this.cursors.get(userId);
    


    if (!cursor) {
      cursor = document.createElement('div');


      cursor.className = 'user-cursor';
      cursor.style.backgroundColor = color;

      overlay.appendChild(cursor);
      this.cursors.set(userId, cursor);

      
    }
    
    cursor.style.left = x + 'px';


    cursor.style.top = y + 'px';
  }



  
  removeCursor(userId) {
    const cursor = this.cursors.get(userId);
    if (cursor) {


      cursor.remove();
      this.cursors.delete(userId);


    }


  }
}