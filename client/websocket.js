class WebSocketManager {
  constructor() {
    this.ws = null;
    this.userId = this.generateUserId();
    this.userName = '';
    this.userColor = this.generateRandomColor();
    this.room = 'default';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }
  
  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  
  generateRandomColor() {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  connect(userName, room = 'default') {
    this.userName = userName;
    this.room = room;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected', 'Connected');
      
      // Send join message
      this.send({
        type: 'JOIN',
        userId: this.userId,
        userName: this.userName,
        room: this.room,
        color: this.userColor
      });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('disconnected', 'Connection Error');
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.updateConnectionStatus('disconnected', 'Disconnected');
      this.attemptReconnect();
    };
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      this.updateConnectionStatus('connecting', `Reconnecting... (${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(this.userName, this.room);
      }, this.reconnectDelay);
    } else {
      this.updateConnectionStatus('disconnected', 'Connection Failed');
      alert('Connection lost. Please refresh the page.');
    }
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  handleMessage(data) {
    switch(data.type) {
      case 'INIT_STATE':
        // Initialize canvas with current state
        if (window.canvasManager) {
          window.canvasManager.setOperations(data.operations);
        }
        this.updateUsersList(data.users);
        break;
        
      case 'USER_JOINED':
        this.updateUsersList(data.users);
        break;
        
      case 'USER_LEFT':
        this.updateUsersList(data.users);
        if (window.canvasManager) {
          window.canvasManager.removeCursor(data.userId);
        }
        break;
        
      case 'DRAW':
        // Draw operation from another user
        if (data.userId !== this.userId && window.canvasManager) {
          const operation = {
            points: data.points,
            color: data.color,
            width: data.width,
            tool: data.tool
          };
          window.canvasManager.drawOperation(operation);
          window.canvasManager.addOperation(operation);
        }
        break;
        
      case 'CURSOR':
        // Update cursor position
        if (data.userId !== this.userId && window.canvasManager) {
          // Get user color from users list
          const userColor = this.getUserColor(data.userId) || '#6366f1';
          window.canvasManager.updateCursor(data.userId, data.x, data.y, userColor);
        }
        break;
        
      case 'UNDO':
        // Redraw canvas with updated operations
        if (window.canvasManager) {
          window.canvasManager.setOperations(data.operations);
        }
        break;
        
      case 'REDO':
        // Redraw canvas with updated operations
        if (window.canvasManager) {
          window.canvasManager.setOperations(data.operations);
        }
        break;
        
      case 'CLEAR':
        // Clear canvas
        if (window.canvasManager) {
          window.canvasManager.clear();
        }
        break;
    }
  }
  
  getUserColor(userId) {
    // This is a simplified approach - in production, you'd track user colors
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
  
  sendDrawStart(x, y, color, width, tool) {
    this.send({
      type: 'DRAW_START',
      x, y, color, width, tool
    });
  }
  
  sendDraw(points, color, width, tool) {
    this.send({
      type: 'DRAW',
      points, color, width, tool
    });
  }
  
  sendCursor(x, y) {
    // Throttle cursor updates
    if (!this.lastCursorSend || Date.now() - this.lastCursorSend > 50) {
      this.send({
        type: 'CURSOR',
        x, y
      });
      this.lastCursorSend = Date.now();
    }
  }
  
  sendUndo() {
    this.send({ type: 'UNDO' });
  }
  
  sendRedo() {
    this.send({ type: 'REDO' });
  }
  
  sendClear() {
    this.send({ type: 'CLEAR' });
  }
  
  updateUsersList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      userItem.setAttribute('data-testid', `user-item-${user.id}`);
      
      const userColor = this.getUserColor(user.id);
      const isCurrentUser = user.id === this.userId;
      
      userItem.innerHTML = `
        <div class="user-avatar" style="background: ${userColor};"></div>
        <div class="user-info">
          <div class="user-item-name">${user.name}${isCurrentUser ? ' (You)' : ''}</div>
        </div>
      `;
      
      usersList.appendChild(userItem);
    });
  }
  
  updateConnectionStatus(status, text) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    indicator.className = 'status-indicator ' + status;
    statusText.textContent = text;
  }
}