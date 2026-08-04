import { ref, reactive, onMounted, onUnmounted } from 'vue'

const ws = ref(null)
const connected = ref(false)
const pings = ref([])
const gameState = reactive({
  roomJoined: false,
  roomCode: '',
  participants: [],
  votesRevealed: false,
  votingHistory: []
})
const RECONNECT_DELAY_MS = 3000
let reconnectTimeout = null
let activeConsumers = 0
let lastJoin = null
let reconnectQueuedWhileHidden = false
let intentionalDisconnect = false
let visibilityListenerAttached = false
let visibilityChangeHandler = null

const clearReconnectTimeout = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
}

export const useWebSocket = () => {
  const runtimeConfig = useRuntimeConfig()

  const connect = () => {
    if (!import.meta.client) return
    intentionalDisconnect = false
    clearReconnectTimeout()

    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsHost = `${window.location.hostname}:8080`
      const wsUrl = runtimeConfig.public.wsUrl || `${wsProtocol}://${wsHost}`
      if (!wsUrl) return

      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        connected.value = true
        reconnectQueuedWhileHidden = false
        console.log('Connected to WebSocket server')

        if (lastJoin) {
          sendMessage('JOIN_ROOM', lastJoin)
        }
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
        ws.value = null
        connected.value = false
        console.log('Disconnected from WebSocket server')

        if (intentionalDisconnect || activeConsumers === 0) {
          return
        }

        if (document.hidden) {
          reconnectQueuedWhileHidden = true
          return
        }

        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null

          if (!connected.value && activeConsumers > 0 && !document.hidden) {
            connect()
          }
        }, RECONNECT_DELAY_MS)
      }

      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
    }
  }

  const disconnect = () => {
    intentionalDisconnect = true
    reconnectQueuedWhileHidden = false
    clearReconnectTimeout()

    if (ws.value) {
      const currentSocket = ws.value
      ws.value = null

      if (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING) {
        currentSocket.close()
      }

      connected.value = false
    }
  }

  const handleVisibilityChange = () => {
    if (!import.meta.client || document.hidden) {
      return
    }

    if (reconnectQueuedWhileHidden || (!connected.value && activeConsumers > 0)) {
      reconnectQueuedWhileHidden = false
      connect()
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
      case 'KICKED':
        handleKicked(message.data)
        break
    }
  }

  const resetRoomState = () => {
    gameState.roomJoined = false
    gameState.participants = []
    gameState.votesRevealed = false
    gameState.votingHistory = []
    gameState.roomCode = ''
    pings.value = []
  }

  const updateGameState = (data) => {
    gameState.roomCode = data.roomCode
    gameState.participants = data.participants
    gameState.votesRevealed = data.votesRevealed
    gameState.votingHistory = data.votingHistory || []
    gameState.roomJoined = true
  }

  const handlePingReceived = (data) => {
    const left = `${Math.random() * 80 + 10}%`
    const top = `${Math.random() * 60 + 20}%`
    const ping = {
      id: `${Date.now()}-${Math.random()}`,
      emoji: data.emoji,
      fromPlayer: data.fromPlayer,
      timestamp: data.timestamp,
      left,
      top
    }

    pings.value.push(ping)

    // Remove ping after 3 seconds
    setTimeout(() => {
      pings.value = pings.value.filter(currentPing => currentPing.id !== ping.id)
    }, 3000)
  }

  const handleKicked = (data) => {
    lastJoin = null
    resetRoomState()

    if (import.meta.client && data?.reason) {
      window.alert(data.reason)
    }
  }

  // Room actions
  const joinRoom = (roomCode, playerName, playerId) => {
    lastJoin = { roomCode, playerName, playerId }
    sendMessage('JOIN_ROOM', lastJoin)
  }

  const leaveRoom = () => {
    lastJoin = null
    sendMessage('LEAVE_ROOM', {})
    resetRoomState()
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

  const sendPing = (emoji) => {
    sendMessage('SEND_PING', { emoji })
  }

  const sendPendingVotersNudge = (emoji = '🔔') => {
    sendMessage('SEND_PING', {
      emoji,
      pendingVotersOnly: true
    })
  }

  const changeName = (newName) => {
    if (lastJoin) {
      lastJoin.playerName = newName
    }

    sendMessage('CHANGE_NAME', { newName })
  }

  const kickParticipant = (playerId) => {
    sendMessage('KICK_PARTICIPANT', { playerId })
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      activeConsumers += 1

      if (!visibilityListenerAttached) {
        visibilityChangeHandler = handleVisibilityChange
        document.addEventListener('visibilitychange', visibilityChangeHandler)
        visibilityListenerAttached = true
      }

      connect()
    }
  })

  onUnmounted(() => {
    activeConsumers = Math.max(0, activeConsumers - 1)
    if (activeConsumers === 0) {
      if (visibilityListenerAttached) {
        if (visibilityChangeHandler) {
          document.removeEventListener('visibilitychange', visibilityChangeHandler)
        }
        visibilityChangeHandler = null
        visibilityListenerAttached = false
      }
      disconnect()
    }
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
    sendPing,
    sendPendingVotersNudge,
    changeName,
    kickParticipant
  }

}
