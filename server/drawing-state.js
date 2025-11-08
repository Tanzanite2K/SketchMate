class DrawingState {
  constructor() {
    this.operations = [];
    this.redoStack = [];
  }
  
  addOperation(operation) {
    this.operations.push(operation);
    // Clear redo stack when new operation is added
    this.redoStack = [];
  }
  
  undo() {
    if (this.operations.length === 0) {
      return null;
    }
    
    const operation = this.operations.pop();
    this.redoStack.push(operation);
    return operation;
  }
  
  redo() {
    if (this.redoStack.length === 0) {
      return null;
    }
    
    const operation = this.redoStack.pop();
    this.operations.push(operation);
    return operation;
  }
  
  clear() {
    this.operations = [];
    this.redoStack = [];
  }
  
  getState() {
    return {
      operations: this.operations,
      redoStackSize: this.redoStack.length
    };
  }
}

module.exports = DrawingState;