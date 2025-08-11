import WebSocket, { WebSocketServer } from 'ws';

class ScrumPokerServer {
  constructor() {
    this.rooms = new Map();
    this.clients = new Map();
  }

  start(port = 8080) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
    });
    
    console.log(`WebSocket server running on port ${port}`);
  }
  
  handleMessage(ws, message) {
    switch (message.type) {
      case 'JOIN_ROOM':
        this.handleJoinRoom(ws, message);
        break;
      case 'LEAVE_ROOM':
        this.handleLeaveRoom(ws, message);
        break;
      case 'VOTE':
        this.handleVote(ws, message);
        break;
      case 'REVEAL_VOTES':
        this.handleRevealVotes(ws, message);
        break;
      case 'RESET_VOTES':
        this.handleResetVotes(ws, message);
        break;
      case 'UPDATE_STORY':
        this.handleUpdateStory(ws, message);
        break;
      case 'CLEAR_VOTE':
        this.handleClearVote(ws, message);
        break;
      case 'SEND_PING':
        this.handleSendPing(ws, message);
        break;
    }
  }
  
  handleJoinRoom(ws, message) {
    const { roomCode, playerName, playerId } = message.data;
    
    // Create room if it doesn't exist
    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, {
        code: roomCode,
        participants: new Map(),
        currentStory: '',
        votesRevealed: false
      });
    }
    
    const room = this.rooms.get(roomCode);
    
    // Add participant to room
    room.participants.set(playerId, {
      id: playerId,
      name: playerName,
      hasVoted: false,
      vote: null,
      ws: ws
    });
    
    // Store client info
    this.clients.set(ws, { roomCode, playerId, playerName });
    
    // Send room state to all participants
    this.broadcastRoomState(roomCode);
    
    console.log(`${playerName} joined room ${roomCode}`);
  }
  
  handleLeaveRoom(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode, playerId, playerName } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room) {
      room.participants.delete(playerId);
      
      // Remove room if empty
      if (room.participants.size === 0) {
        this.rooms.delete(roomCode);
      } else {
        this.broadcastRoomState(roomCode);
      }
    }
    
    this.clients.delete(ws);
    console.log(`${playerName} left room ${roomCode}`);
  }
  
  handleSendPing(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode, playerName } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room) {
      const pingMessage = {
        type: 'PING_RECEIVED',
        data: {
          emoji: message.data.emoji,
          fromPlayer: playerName,
          timestamp: Date.now()
        }
      };
      
      // Send ping to all participants in the room
      room.participants.forEach(participant => {
        if (participant.ws.readyState === 1) { // WebSocket.OPEN
          participant.ws.send(JSON.stringify(pingMessage));
        }
      });
    }
  }
  
  handleVote(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode, playerId } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room && room.participants.has(playerId)) {
      const participant = room.participants.get(playerId);
      participant.hasVoted = true;
      participant.vote = message.data.vote;
      
      this.broadcastRoomState(roomCode);
    }
  }
  
  handleClearVote(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode, playerId } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room && room.participants.has(playerId)) {
      const participant = room.participants.get(playerId);
      participant.hasVoted = false;
      participant.vote = null;
      
      this.broadcastRoomState(roomCode);
    }
  }
  
  handleRevealVotes(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room) {
      room.votesRevealed = true;
      this.broadcastRoomState(roomCode);
    }
  }
  
  handleResetVotes(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room) {
      room.votesRevealed = false;
      room.currentStory = '';
      
      // Reset all participant votes
      room.participants.forEach(participant => {
        participant.hasVoted = false;
        participant.vote = null;
      });
      
      this.broadcastRoomState(roomCode);
    }
  }
  
  handleUpdateStory(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room) {
      room.currentStory = message.data.story;
      this.broadcastRoomState(roomCode);
    }
  }
  
  handleDisconnect(ws) {
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      this.handleLeaveRoom(ws, {});
    }
  }
  
  broadcastRoomState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    const participants = Array.from(room.participants.values()).map(p => ({
      id: p.id,
      name: p.name,
      hasVoted: p.hasVoted,
      vote: room.votesRevealed ? p.vote : null
    }));
    
    const roomState = {
      type: 'ROOM_STATE',
      data: {
        roomCode: room.code,
        participants,
        currentStory: room.currentStory,
        votesRevealed: room.votesRevealed
      }
    };
    
    // Send to all participants in the room
    room.participants.forEach(participant => {
      if (participant.ws.readyState === 1) { // WebSocket.OPEN
        participant.ws.send(JSON.stringify(roomState));
      }
    });
  }
}

// Start the server
const server = new ScrumPokerServer();
server.start(8080);