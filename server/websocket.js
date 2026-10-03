import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';

const VOTING_HISTORY_LIMIT = 5;

export class ScrumPokerServer {
  constructor({ disconnectGraceMs = 15 * 60 * 1000, heartbeatIntervalMs = 30 * 1000 } = {}) {
    this.rooms = new Map();
    this.clients = new Map();
    this.disconnectGraceMs = disconnectGraceMs;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  calculateVoteStatistics(votes) {
    if (votes.length === 0) {
      return { average: 'N/A', median: 'N/A', mode: 'N/A', range: 'N/A' };
    }

    if (votes.length === 1) {
      const singleVote = votes[0];
      return {
        average: singleVote.toString(),
        median: singleVote.toString(),
        mode: singleVote,
        range: singleVote.toString()
      };
    }

    const sortedVotes = [...votes].sort((a, b) => a - b);
    const average = (sortedVotes.reduce((sum, vote) => sum + vote, 0) / sortedVotes.length).toFixed(1);
    const middleIndex = Math.floor(sortedVotes.length / 2);
    const median = sortedVotes.length % 2 === 0
      ? ((sortedVotes[middleIndex - 1] + sortedVotes[middleIndex]) / 2).toFixed(1)
      : sortedVotes[middleIndex].toString();

    const voteCountByValue = new Map();
    sortedVotes.forEach((vote) => {
      voteCountByValue.set(vote, (voteCountByValue.get(vote) || 0) + 1);
    });

    let mode = sortedVotes[0];
    let modeCount = 0;
    voteCountByValue.forEach((count, vote) => {
      if (count > modeCount || (count === modeCount && vote < mode)) {
        mode = vote;
        modeCount = count;
      }
    });

    const min = sortedVotes[0];
    const max = sortedVotes[sortedVotes.length - 1];
    const range = min === max ? min.toString() : `${min}-${max}`;

    return {
      average,
      median,
      mode,
      range
    };
  }

  recordVotingRound(room) {
    const votedParticipants = Array.from(room.participants.values()).filter((participant) => participant.hasVoted);
    if (votedParticipants.length === 0) {
      return;
    }

    const numericVotes = votedParticipants
      .map((participant) => participant.vote)
      .filter((vote) => typeof vote === 'number' && !Number.isNaN(vote));

    const statistics = this.calculateVoteStatistics(numericVotes);

    room.roundCounter += 1;
    room.votingHistory.unshift({
      roundNumber: room.roundCounter,
      revealedAt: Date.now(),
      participantsCount: room.participants.size,
      votesCast: votedParticipants.length,
      numericVotesCount: numericVotes.length,
      statistics
    });
    room.votingHistory = room.votingHistory.slice(0, VOTING_HISTORY_LIMIT);
  }

  handleKickParticipant(ws, message) {
    const requesterInfo = this.clients.get(ws);
    if (!requesterInfo) return;

    const { roomCode } = requesterInfo;
    const room = this.rooms.get(roomCode);
    const targetPlayerId = message?.data?.playerId;

    if (!room || !targetPlayerId) return;

    const targetParticipant = room.participants.get(targetPlayerId);
    if (!targetParticipant) return;

    clearTimeout(targetParticipant.disconnectTimer);
    room.participants.delete(targetPlayerId);

    let targetSocket = null;
    for (const [clientSocket, clientInfo] of this.clients.entries()) {
      if (clientInfo.playerId === targetPlayerId && clientInfo.roomCode === roomCode) {
        targetSocket = clientSocket;
        this.clients.delete(clientSocket);
        break;
      }
    }

    if (targetSocket && targetSocket.readyState === 1) {
      targetSocket.send(JSON.stringify({
        type: 'KICKED',
        data: {
          roomCode,
          reason: 'You were removed from the room.'
        }
      }));
      targetSocket.close();
    }

    if (room.participants.size === 0) {
      this.rooms.delete(roomCode);
      return;
    }

    this.broadcastRoomState(roomCode);
    console.log(`Player ${targetPlayerId} was kicked from room ${roomCode}`);
  }

  start(port = 8080) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      
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

    const heartbeat = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.readyState !== 1) return;
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatIntervalMs);
    heartbeat.unref();
    this.wss.on('close', () => clearInterval(heartbeat));
    
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
      case 'CLEAR_VOTE':
        this.handleClearVote(ws, message);
        break;
      case 'SEND_PING':
        this.handleSendPing(ws, message);
        break;
      case 'CHANGE_NAME':
        this.handleChangeName(ws, message);
        break;
      case 'KICK_PARTICIPANT':
        this.handleKickParticipant(ws, message);
        break;
    }
  }
  
  handleJoinRoom(ws, message) {
    const { roomCode, playerName, playerId } = message.data;
    const previousInfo = this.clients.get(ws);
    if (previousInfo && (previousInfo.roomCode !== roomCode || previousInfo.playerId !== playerId)) {
      this.handleLeaveRoom(ws, {});
    }
    
    // Create room if it doesn't exist
    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, {
        code: roomCode,
        participants: new Map(),
        votesRevealed: false,
        votingHistory: [],
        roundCounter: 0
      });
    }
    
    const room = this.rooms.get(roomCode);
    const previousParticipant = room.participants.get(playerId);
    if (previousParticipant) {
      clearTimeout(previousParticipant.disconnectTimer);
      if (previousParticipant.ws && previousParticipant.ws !== ws) {
        this.clients.delete(previousParticipant.ws);
        previousParticipant.ws.close(4000, 'Connection replaced');
      }
    }
    
    // Add participant to room
    room.participants.set(playerId, {
      id: playerId,
      name: playerName,
      hasVoted: previousParticipant?.hasVoted ?? false,
      vote: previousParticipant?.vote ?? null,
      ws
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
      const participant = room.participants.get(playerId);
      if (participant?.ws === ws) {
        clearTimeout(participant.disconnectTimer);
        room.participants.delete(playerId);

        // Remove room if empty
        if (room.participants.size === 0) {
          this.rooms.delete(roomCode);
        } else {
          this.broadcastRoomState(roomCode);
        }
      }
    }
    
    this.clients.delete(ws);
    console.log(`${playerName} left room ${roomCode}`);
  }
  
  handleSendPing(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    const { roomCode, playerName, playerId } = clientInfo;
    const room = this.rooms.get(roomCode);
    
    if (room) {
      const pingEmoji = typeof message?.data?.emoji === 'string' ? message.data.emoji : '🔔';
      const targetPendingVotersOnly = Boolean(message?.data?.pendingVotersOnly);
      const pingMessage = {
        type: 'PING_RECEIVED',
        data: {
          emoji: pingEmoji,
          fromPlayer: playerName,
          timestamp: Date.now()
        }
      };
      
      // Send ping to all participants in the room, or only pending voters when requested.
      room.participants.forEach(participant => {
        if (targetPendingVotersOnly && (participant.hasVoted || participant.id === playerId)) {
          return;
        }

        if (participant.ws?.readyState === 1) { // WebSocket.OPEN
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
      if (room.votesRevealed) {
        this.recordVotingRound(room);
      }

      room.votesRevealed = false;

      // Reset all participant votes
      room.participants.forEach(participant => {
        participant.hasVoted = false;
        participant.vote = null;
      });

      this.broadcastRoomState(roomCode);
    }
  }

  handleChangeName(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    const { roomCode, playerId } = clientInfo;
    const room = this.rooms.get(roomCode);
    const newName = message.data.newName;

    if (room && room.participants.has(playerId) && newName && newName.trim()) {
      const participant = room.participants.get(playerId);
      participant.name = newName.trim();

      clientInfo.playerName = newName.trim();
      this.clients.set(ws, clientInfo);

      this.broadcastRoomState(roomCode);
      console.log(`Player ${playerId} changed name to ${newName.trim()} in room ${roomCode}`);
    }
  }

  handleDisconnect(ws) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    this.clients.delete(ws);
    const { roomCode, playerId } = clientInfo;
    const room = this.rooms.get(roomCode);
    const participant = room?.participants.get(playerId);
    if (participant?.ws !== ws) return;

    participant.ws = null;
    participant.disconnectTimer = setTimeout(() => {
      if (room.participants.get(playerId) !== participant || participant.ws) return;
      room.participants.delete(playerId);
      if (room.participants.size === 0) {
        this.rooms.delete(roomCode);
      } else {
        this.broadcastRoomState(roomCode);
      }
    }, this.disconnectGraceMs);
    participant.disconnectTimer.unref();
    this.broadcastRoomState(roomCode);
  }
  
  broadcastRoomState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    const participants = Array.from(room.participants.values()).map(p => ({
      id: p.id,
      name: p.name,
      hasVoted: p.hasVoted,
      connected: p.ws?.readyState === 1,
      vote: room.votesRevealed ? p.vote : null
    }));
    
    const roomState = {
      type: 'ROOM_STATE',
      data: {
        roomCode: room.code,
        participants,
        votesRevealed: room.votesRevealed,
        votingHistory: room.votingHistory
      }
    };
    
    // Send to all participants in the room
    room.participants.forEach(participant => {
      if (participant.ws?.readyState === 1) { // WebSocket.OPEN
        participant.ws.send(JSON.stringify(roomState));
      }
    });
  }
}

// Start the server
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = new ScrumPokerServer();
  server.start(8080);
}