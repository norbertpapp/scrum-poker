// Cloudflare Durable Object for Scrum Poker rooms
export class ScrumPokerRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.participants = new Map();
    this.currentStory = '';
    this.votesRevealed = false;
  }

  async fetch(request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();
    
    // Handle WebSocket connection
    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleMessage(server, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    server.addEventListener('close', () => {
      this.handleDisconnect(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleMessage(ws, message) {
    switch (message.type) {
      case 'JOIN_ROOM':
        await this.handleJoinRoom(ws, message);
        break;
      case 'LEAVE_ROOM':
        await this.handleLeaveRoom(ws, message);
        break;
      case 'VOTE':
        await this.handleVote(ws, message);
        break;
      case 'REVEAL_VOTES':
        await this.handleRevealVotes(ws, message);
        break;
      case 'RESET_VOTES':
        await this.handleResetVotes(ws, message);
        break;
      case 'UPDATE_STORY':
        await this.handleUpdateStory(ws, message);
        break;
      case 'CLEAR_VOTE':
        await this.handleClearVote(ws, message);
        break;
      case 'SEND_PING':
        await this.handleSendPing(ws, message);
        break;
    }
  }

  async handleJoinRoom(ws, message) {
    const { roomCode, playerName, playerId } = message.data;
    
    // Store session info
    this.sessions.set(ws, { playerId, playerName, roomCode });
    
    // Add participant
    this.participants.set(playerId, {
      id: playerId,
      name: playerName,
      hasVoted: false,
      vote: null,
      ws: ws
    });

    await this.broadcastRoomState();
    console.log(`${playerName} joined room ${roomCode}`);
  }

  async handleLeaveRoom(ws, message) {
    const sessionInfo = this.sessions.get(ws);
    if (!sessionInfo) return;

    const { playerId, playerName, roomCode } = sessionInfo;
    
    this.participants.delete(playerId);
    this.sessions.delete(ws);

    await this.broadcastRoomState();
    console.log(`${playerName} left room ${roomCode}`);
  }

  async handleSendPing(ws, message) {
    const sessionInfo = this.sessions.get(ws);
    if (!sessionInfo) return;

    const { playerName } = sessionInfo;
    
    const pingMessage = {
      type: 'PING_RECEIVED',
      data: {
        emoji: message.data.emoji,
        fromPlayer: playerName,
        timestamp: Date.now()
      }
    };

    // Send ping to all participants
    this.participants.forEach(participant => {
      if (participant.ws.readyState === 1) { // WebSocket.READY_STATE_OPEN
        participant.ws.send(JSON.stringify(pingMessage));
      }
    });
  }

  async handleVote(ws, message) {
    const sessionInfo = this.sessions.get(ws);
    if (!sessionInfo) return;

    const { playerId } = sessionInfo;
    const participant = this.participants.get(playerId);
    
    if (participant) {
      participant.hasVoted = true;
      participant.vote = message.data.vote;
      await this.broadcastRoomState();
    }
  }

  async handleClearVote(ws, message) {
    const sessionInfo = this.sessions.get(ws);
    if (!sessionInfo) return;

    const { playerId } = sessionInfo;
    const participant = this.participants.get(playerId);
    
    if (participant) {
      participant.hasVoted = false;
      participant.vote = null;
      await this.broadcastRoomState();
    }
  }

  async handleRevealVotes(ws, message) {
    this.votesRevealed = true;
    await this.broadcastRoomState();
  }

  async handleResetVotes(ws, message) {
    this.votesRevealed = false;
    this.currentStory = '';
    
    // Reset all participant votes
    this.participants.forEach(participant => {
      participant.hasVoted = false;
      participant.vote = null;
    });
    
    await this.broadcastRoomState();
  }

  async handleUpdateStory(ws, message) {
    this.currentStory = message.data.story;
    await this.broadcastRoomState();
  }

  handleDisconnect(ws) {
    const sessionInfo = this.sessions.get(ws);
    if (sessionInfo) {
      this.handleLeaveRoom(ws, {});
    }
  }

  async broadcastRoomState() {
    const participants = Array.from(this.participants.values()).map(p => ({
      id: p.id,
      name: p.name,
      hasVoted: p.hasVoted,
      vote: this.votesRevealed ? p.vote : null
    }));

    const roomState = {
      type: 'ROOM_STATE',
      data: {
        roomCode: this.getRoomCode(),
        participants,
        currentStory: this.currentStory,
        votesRevealed: this.votesRevealed
      }
    };

    // Send to all participants
    this.participants.forEach(participant => {
      if (participant.ws.readyState === 1) { // WebSocket.READY_STATE_OPEN
        participant.ws.send(JSON.stringify(roomState));
      }
    });
  }

  getRoomCode() {
    // Extract room code from the Durable Object ID
    return this.state.id.name || 'UNKNOWN';
  }
}

// Worker script to handle requests and route to Durable Objects
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade requests
    if (request.headers.get('Upgrade') === 'websocket') {
      // Extract room code from URL path or query parameter
      const roomCode = url.searchParams.get('room') || url.pathname.split('/').pop();
      
      if (!roomCode) {
        return new Response('Room code required', { status: 400 });
      }

      // Get Durable Object instance for this room
      const durableObjectId = env.SCRUM_POKER_ROOM.idFromName(roomCode);
      const durableObject = env.SCRUM_POKER_ROOM.get(durableObjectId);
      
      // Forward the request to the Durable Object
      return durableObject.fetch(request);
    }

    // Handle HTTP requests (health check, etc.)
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  }
};