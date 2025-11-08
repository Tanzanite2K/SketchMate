// Initialize managers
let canvasManager;
let wsManager;

// DOM Elements
const welcomeModal = document.getElementById('welcomeModal');
const joinForm = document.getElementById('joinForm');
const userNameInput = document.getElementById('userName');
const roomNameInput = document.getElementById('roomName');
const currentUserName = document.getElementById('currentUserName');
const roomInfo = document.getElementById('roomInfo');

// Tool controls
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');
const rectangleBtn = document.getElementById('rectangleBtn');
const squareBtn = document.getElementById('squareBtn');
const circleBtn = document.getElementById('circleBtn');
const triangleBtn = document.getElementById('triangleBtn');
const colorPicker = document.getElementById('colorPicker');
const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');

// Action buttons
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');

// Initialize app
function init() {
  // Show welcome modal
  welcomeModal.classList.remove('hidden');
  
  // Handle join form
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userName = userNameInput.value.trim();
    const roomName = roomNameInput.value.trim() || 'default';
    
    if (userName) {
      startApp(userName, roomName);
    }
  });
}

function startApp(userName, roomName) {
  // Hide modal
  welcomeModal.classList.add('hidden');
  
  // Update header
  currentUserName.textContent = userName;
  roomInfo.textContent = `Room: ${roomName}`;
  
  // Initialize canvas
  canvasManager = new CanvasManager('canvas');
  window.canvasManager = canvasManager;
  
  // Initialize WebSocket
  wsManager = new WebSocketManager();
  window.wsManager = wsManager;
  wsManager.connect(userName, roomName);
  
  // Setup tool controls
  setupToolControls();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
}

function setupToolControls() {
  // Function to deactivate all tools
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
    if (confirm('Are you sure you want to clear the canvas? This will affect all users.')) {
      wsManager.sendClear();
    }
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Z = Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      wsManager.sendUndo();
    }
    
    // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z = Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      wsManager.sendRedo();
    }
    
    // B = Brush
    if (e.key === 'b' || e.key === 'B') {
      brushBtn.click();
    }
    
    // E = Eraser
    if (e.key === 'e' || e.key === 'E') {
      eraserBtn.click();
    }

    // R = Rectangle
    if (e.key === 'r' || e.key === 'R') {
      rectangleBtn.click();
    }

    // S = Square
    if (e.key === 's' || e.key === 'S') {
      squareBtn.click();
    }

    // C = Circle
    if (e.key === 'c' || e.key === 'C') {
      circleBtn.click();
    }

    // T = Triangle
    if (e.key === 't' || e.key === 'T') {
      triangleBtn.click();
    }
  });
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}