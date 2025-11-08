// in this class we are going to manage the drawing state.

class DrawingState {
  constructor() {
    this.ops = [];
    this.redo_Stack = [];
  }
  

  // add a new operation
  addOperation(operation) {
    this.ops.push(operation);
    // Clear redo stack when new operation is added
    this.redo_Stack = [];
  }
  // undo the last operation
  undo() {
    // Check if there are operations to undo, if not return null
    if (this.ops.length === 0) {
      return null;
    }
    // Pop the last operation and push it to the redo stack
    const op = this.ops.pop();
    this.redo_Stack.push(op);
    return op;
  }
  


  // redo the last operation
  redo() {
    // Check if there are operations to redo, if not return null
    if (this.redo_Stack.length === 0) {
      return null;
    }
    // Pop the last operation from the redo stack and push it back to operations
    const op = this.redo_Stack.pop();
    this.ops.push(op);
    return op;
  }
  
  // clear all operations, setting the state back to initial state
  clear() {
    this.ops = [];
    this.redo_Stack = [];
  }
  // get the current state of the drawing
  getState() {
    return {
      operations: this.ops,
      redoStackSize: this.redo_Stack.length
    };
  }

}



module.exports = DrawingState;