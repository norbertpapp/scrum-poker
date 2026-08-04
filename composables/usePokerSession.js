import { nextTick, watch } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'

const PLAYER_NAME_KEY = 'scrum-poker-player-name'
const GENERIC_PLAYER_NAME_PREFIX = 'Player'
let sideEffectsInitialized = false
let playerNameHydrated = false
let autoJoinSuppressed = false

export const usePokerSession = () => {
  const route = useRoute()
  const router = useRouter()
  const runtimeConfig = useRuntimeConfig()

  const resolveRouteRoomCode = (routeRoomCode) => {
    if (Array.isArray(routeRoomCode)) {
      return routeRoomCode[0] || ''
    }
    return routeRoomCode || ''
  }

  const getGenericPlayerName = (id) => {
    return `${GENERIC_PLAYER_NAME_PREFIX}-${id.slice(-4)}`
  }

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
    sendPendingVotersNudge,
    changeName,
    kickParticipant
  } = useWebSocket()

  const playerName = useState('scrum-poker-player-name', () => '')
  const roomCode = useState('scrum-poker-room-code', () => {
    return resolveRouteRoomCode(route.params.roomCode)
  })
  const playerId = useState('scrum-poker-player-id', () => Date.now().toString())
  const editingName = useState('scrum-poker-editing-name', () => false)
  const newPlayerName = useState('scrum-poker-new-player-name', () => '')

  if (import.meta.client && !playerNameHydrated) {
    playerNameHydrated = true
    const savedName = localStorage.getItem(PLAYER_NAME_KEY)
    if (savedName && savedName.trim()) {
      playerName.value = savedName.trim()
    }
  }

  if (import.meta.client && !sideEffectsInitialized) {
    sideEffectsInitialized = true

    watch(playerName, (name) => {
      if (name.trim()) {
        localStorage.setItem(PLAYER_NAME_KEY, name.trim())
      }
    })

    watch(() => route.params.roomCode, (routeRoomCode) => {
      const nextRoomCode = resolveRouteRoomCode(routeRoomCode)

      if (!nextRoomCode) {
        autoJoinSuppressed = false
      }

      if (!gameState.roomJoined && nextRoomCode && roomCode.value !== nextRoomCode) {
        roomCode.value = nextRoomCode
      }
    }, { immediate: true })

    watch(() => gameState.roomCode, (newRoomCode) => {
      if (!newRoomCode) {
        return
      }

      roomCode.value = newRoomCode
      if (resolveRouteRoomCode(route.params.roomCode) !== newRoomCode) {
        router.replace({ path: `/${encodeURIComponent(newRoomCode)}` })
      }
    })

    watch(
      [connected, () => route.params.roomCode, () => gameState.roomJoined],
      ([isConnected, routeRoomCode, roomJoined]) => {
        const targetRoomCode = resolveRouteRoomCode(routeRoomCode).trim()
        if (!isConnected || roomJoined || !targetRoomCode || autoJoinSuppressed) {
          return
        }

        if (!playerName.value.trim()) {
          playerName.value = getGenericPlayerName(playerId.value)
        }

        roomCode.value = targetRoomCode
        joinRoom(targetRoomCode, playerName.value.trim(), playerId.value)
      },
      { immediate: true }
    )
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
    autoJoinSuppressed = true
    leaveRoom()
    roomCode.value = ''
    editingName.value = false
    newPlayerName.value = ''
    router.replace({ path: '/' })
  }

  const getRoomUrl = () => {
    if (!import.meta.client) {
      return ''
    }
    const basePath = runtimeConfig.app.baseURL.endsWith('/')
      ? runtimeConfig.app.baseURL
      : `${runtimeConfig.app.baseURL}/`

    return new URL(`${basePath}${encodeURIComponent(gameState.roomCode)}`, window.location.origin).toString()
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
    sendPendingVotersNudge,
    kickParticipant,
    playerName,
    playerId,
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
