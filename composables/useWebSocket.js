import { ref, reactive, onMounted, onUnmounted } from 'vue'

export const useWebSocket = () => {
  const ws = ref(null)
  const connected = ref(false)
  const pings = ref([])
  const gameState = reactive({
    roomJoined: false,
    roomCode: '',
    currentStory: '',
    participants: [],
    votesRevealed: false
  })

  const connect = () => {
    try {
      // Use localhost for development, adjust for production
      const wsUrl = process.client ? 'ws://localhost:8080' : null
      if (!wsUrl) return

      ws.value = new WebSocket(wsUrl)
      
      ws.value.onopen = () => {
        connected.value = true
        console.log('Connected to WebSocket server')
      }
      
      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      ws.value.onclose = () => {
        connected.value = false
        console.log('Disconnected from WebSocket server')
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!connected.value) {
            connect()
          }
        }, 3000)
      }
      
      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
    }
  }

  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
      connected.value = false
    }
  }

  const sendMessage = (type, data) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type, data }))
    }
  }

  const handleMessage = (message) => {
    switch (message.type) {
      case 'ROOM_STATE':
        updateGameState(message.data)
        break
      case 'PING_RECEIVED':
        handlePingReceived(message.data)
        break
    }
  }

  const updateGameState = (data) => {
    gameState.roomCode = data.roomCode
    gameState.participants = data.participants
    gameState.currentStory = data.currentStory
    gameState.votesRevealed = data.votesRevealed
    gameState.roomJoined = true
  }

  const handlePingReceived = (data) => {
    pings.value.push({
      id: Date.now() + Math.random(),
      emoji: data.emoji,
      fromPlayer: data.fromPlayer,
      timestamp: data.timestamp
    })
    
    // Remove ping after 3 seconds
    setTimeout(() => {
      pings.value = pings.value.filter(ping => ping.timestamp !== data.timestamp)
    }, 3000)
  }

  // Room actions
  const joinRoom = (roomCode, playerName, playerId) => {
    sendMessage('JOIN_ROOM', { roomCode, playerName, playerId })
  }

  const leaveRoom = () => {
    sendMessage('LEAVE_ROOM', {})
    gameState.roomJoined = false
    gameState.participants = []
    gameState.votesRevealed = false
    gameState.roomCode = ''
    gameState.currentStory = ''
  }

  const vote = (voteValue) => {
    sendMessage('VOTE', { vote: voteValue })
  }

  const clearVote = () => {
    sendMessage('CLEAR_VOTE', {})
  }

  const revealVotes = () => {
    sendMessage('REVEAL_VOTES', {})
  }

  const resetVotes = () => {
    sendMessage('RESET_VOTES', {})
  }

  const updateStory = (story) => {
    sendMessage('UPDATE_STORY', { story })
  }

  const sendPing = (emoji) => {
    sendMessage('SEND_PING', { emoji })
  }
  onMounted(() => {
    if (process.client) {
      connect()
    }
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    gameState,
    pings,
    joinRoom,
    leaveRoom,
    vote,
    clearVote,
    revealVotes,
    resetVotes,
    updateStory,
    sendPing
  }
}