// Initialize the canvas and ws managers
let canvasManager;
let wsManager;


// DOM elements
const welcomeModal = document.getElementById('welcomeModal');
const joinForm = document.getElementById('joinForm');
const userNameInput = document.getElementById('userName');
const roomNameInput = document.getElementById('roomName');

const currentUserName = document.getElementById('currentUserName');
const roomInfo = document.getElementById('roomInfo');





// Tool controls - brush, eraser, shapes
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');

const rectangleBtn = document.getElementById('rectangleBtn');
const squareBtn = document.getElementById('squareBtn');
const circleBtn = document.getElementById('circleBtn');

const triangleBtn = document.getElementById('triangleBtn');



const colorPicker = document.getElementById('colorPicker');
const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');

// Action buttons - undo, redo, clear
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

const clearBtn = document.getElementById('clearBtn');

// Initialize app
function init() {
  // Show the welcome modal to get user info

  welcomeModal.classList.remove('hidden');
  
  // Handle's the join form submission
  
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const user_Name = userNameInput.value.trim();
    const room_Name = roomNameInput.value.trim() || 'default';
    

    if (user_Name) {
      startApp(user_Name, room_Name);
    }


  });
}

function startApp(user_Name, room_Name) {
  // Hide the modal
  welcomeModal.classList.add('hidden');
  
  // Update the header
  currentUserName.textContent = user_Name;

  roomInfo.textContent = `Room: ${room_Name}`;
  
  // Initialize canvas manager
  
  canvasManager = new CanvasManager('canvas');
  window.canvasManager = canvasManager;

  // Initialize WebSocket manager
  wsManager = new WebSocketManager();
  window.wsManager = wsManager;
  wsManager.connect(user_Name, room_Name);
  
  // Setup the tool controls
  setupToolControls();
  


  // Setup the keyboard shortcuts
  setupKeyboardShortcuts();
}

function setupToolControls() {
  // Function to deactivate all tools - brush, eraser, shapes etc.
  const deactivateAllTools = () => {

    brushBtn.classList.remove('active');
    eraserBtn.classList.remove('active');

    rectangleBtn.classList.remove('active');
    squareBtn.classList.remove('active');
    circleBtn.classList.remove('active');
    triangleBtn.classList.remove('active');
  };

  // Brush tool
  brushBtn.addEventListener('click', () => {
    deactivateAllTools();

    canvasManager.setTool('brush');
    brushBtn.classList.add('active');
  });
  // Eraser tool
  eraserBtn.addEventListener('click', () => {
    deactivateAllTools();
    canvasManager.setTool('eraser');

    eraserBtn.classList.add('active');
  });



  // Rectangle tool
  rectangleBtn.addEventListener('click', () => {
    deactivateAllTools();
    canvasManager.setTool('rectangle');
    rectangleBtn.classList.add('active');


  });
  // Square tool
  squareBtn.addEventListener('click', () => {
    deactivateAllTools();


    canvasManager.setTool('square');
    squareBtn.classList.add('active');
  });



  // Circle tool
  circleBtn.addEventListener('click', () => {

    deactivateAllTools();
    canvasManager.setTool('circle');
    circleBtn.classList.add('active');
  });

  // Triangle tool


  triangleBtn.addEventListener('click', () => {
    deactivateAllTools();
    canvasManager.setTool('triangle');

    triangleBtn.classList.add('active');

  });
  




  // Color picker
  colorPicker.addEventListener('input', (e) => {

    canvasManager.setColor(e.target.value);

  });
  
  // Color presets
  document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {

      const color = preset.getAttribute('data-color');
      colorPicker.value = color;


      canvasManager.setColor(color);
    });


  });
  
  // Width slider

  widthSlider.addEventListener('input', (e) => {
    const width = e.target.value;

    widthValue.textContent = width;
    canvasManager.setWidth(parseInt(width));

  });
  
  // Undo button
  undoBtn.addEventListener('click', () => {

    wsManager.sendUndo();
  });
  
  // Redo button
  redoBtn.addEventListener('click', () => {
    wsManager.sendRedo();

  });
  
  // Clear button
  clearBtn.addEventListener('click', () => {
    if (confirm('Dude are you sure , this will clear the whole canvas for everyone!!!')) {
      wsManager.sendClear();
    }

  });

}


function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl + Z => Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();


      wsManager.sendUndo();
    }

    // Ctrl + Y || Ctrl + Shift + Z => Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();

      wsManager.sendRedo();
    }
    // B => Brush
    if (e.key === 'b' || e.key === 'B') {
      brushBtn.click();
    }
    


    // E => Eraser
    if (e.key === 'e' || e.key === 'E') {
      eraserBtn.click();
    }
    // R => Rectangle
    if (e.key === 'r' || e.key === 'R') {
      rectangleBtn.click();
    }

    // S => Square
    if (e.key === 's' || e.key === 'S') {
      squareBtn.click();
    }



    // C => Circle
    if (e.key === 'c' || e.key === 'C') {
      circleBtn.click();
    }

    // T => Triangle
    if (e.key === 't' || e.key === 'T') {
      triangleBtn.click();
    }
  });


}

// Start the app when DOM is ready.
if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}