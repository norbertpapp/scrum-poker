import { nextTick, watch } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'

const PLAYER_NAME_KEY = 'scrum-poker-player-name'
let sideEffectsInitialized = false
let playerNameHydrated = false

export const usePokerSession = () => {
  const route = useRoute()
  const router = useRouter()

  const {
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
    changeName
  } = useWebSocket()

  const playerName = useState('scrum-poker-player-name', () => '')
  const roomCode = useState('scrum-poker-room-code', () => {
    const queryRoom = route.query.room
    if (Array.isArray(queryRoom)) {
      return queryRoom[0] || ''
    }
    return queryRoom || ''
  })
  const playerId = useState('scrum-poker-player-id', () => Date.now().toString())
  const editingName = useState('scrum-poker-editing-name', () => false)
  const newPlayerName = useState('scrum-poker-new-player-name', () => '')

  if (import.meta.client && !playerNameHydrated) {
    playerNameHydrated = true
    const savedName = localStorage.getItem(PLAYER_NAME_KEY)
    if (savedName) {
      playerName.value = savedName
    }
  }

  if (import.meta.client && !sideEffectsInitialized) {
    sideEffectsInitialized = true

    watch(playerName, (name) => {
      if (name.trim()) {
        localStorage.setItem(PLAYER_NAME_KEY, name.trim())
      }
    })

    watch(() => gameState.roomCode, (newRoomCode) => {
      if (!newRoomCode) {
        return
      }

      roomCode.value = newRoomCode
      if (route.query.room !== newRoomCode) {
        router.replace({ query: { room: newRoomCode } })
      }
    })
  }

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleJoinRoom = () => {
    if (!playerName.value.trim() || !connected.value) {
      return
    }

    const code = roomCode.value.trim() || generateRoomCode()
    roomCode.value = code
    joinRoom(code, playerName.value.trim(), playerId.value)
  }

  const handleLeaveRoom = () => {
    leaveRoom()
    roomCode.value = ''
    editingName.value = false
    newPlayerName.value = ''
    router.replace({ query: {} })
  }

  const getRoomUrl = () => {
    if (!import.meta.client) {
      return ''
    }
    return `${window.location.origin}${window.location.pathname}?room=${gameState.roomCode}`
  }

  const copyRoomUrl = async () => {
    try {
      const roomUrl = getRoomUrl()
      await navigator.clipboard.writeText(roomUrl)
    } catch (error) {
      console.error('Failed to copy room URL:', error)
    }
  }

  const startEditingName = () => {
    newPlayerName.value = playerName.value
    editingName.value = true
  }

  const handleNameChange = async () => {
    if (newPlayerName.value.trim() && newPlayerName.value.trim() !== playerName.value) {
      playerName.value = newPlayerName.value.trim()
      changeName(newPlayerName.value.trim())
    }
    editingName.value = false
    await nextTick()
  }

  return {
    connected,
    gameState,
    pings,
    vote,
    clearVote,
    revealVotes,
    resetVotes,
    sendPing,
    playerName,
    roomCode,
    editingName,
    newPlayerName,
    handleJoinRoom,
    handleLeaveRoom,
    copyRoomUrl,
    startEditingName,
    handleNameChange
  }
}
