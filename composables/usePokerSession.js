import { computed, nextTick, watch } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'

const PLAYER_NAME_KEY = 'scrum-poker-player-name'
const PLAYER_ID_KEY = 'scrum-poker-player-id'
const GENERIC_PLAYER_NAME_PREFIX = 'Player'
const PLAYER_ID_CHECK_MS = 200
const createPlayerId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
let sideEffectsInitialized = false
let playerNameHydrated = false
let playerIdHydrated = false
let autoJoinSuppressed = false
let playerIdChannel = null
let playerIdCheckTimeout = null

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    playerIdChannel?.close()
    clearTimeout(playerIdCheckTimeout)
  })
}

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
    connected: socketConnected,
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
  const playerId = useState(PLAYER_ID_KEY, () => '')
  const playerIdReady = useState('scrum-poker-player-id-ready', () => false)
  const connected = computed(() => socketConnected.value && playerIdReady.value)
  const editingName = useState('scrum-poker-editing-name', () => false)
  const newPlayerName = useState('scrum-poker-new-player-name', () => '')

  if (import.meta.client && !playerIdHydrated) {
    playerIdHydrated = true
    playerIdReady.value = false
    const savedId = sessionStorage.getItem(PLAYER_ID_KEY)
    playerId.value = savedId || createPlayerId()
    if (!savedId) {
      sessionStorage.setItem(PLAYER_ID_KEY, playerId.value)
    }

    if (typeof BroadcastChannel === 'undefined') {
      playerIdReady.value = true
    } else {
      playerIdChannel = new BroadcastChannel(PLAYER_ID_KEY)
      const requestId = createPlayerId()
      playerIdChannel.onmessage = ({ data }) => {
        if (data?.type === 'check' && data.playerId === playerId.value) {
          playerIdChannel.postMessage({ type: 'in-use', requestId: data.requestId, playerId: data.playerId })
        } else if (data?.type === 'in-use' && data.requestId === requestId && data.playerId === playerId.value && !playerIdReady.value) {
          clearTimeout(playerIdCheckTimeout)
          playerId.value = createPlayerId()
          sessionStorage.setItem(PLAYER_ID_KEY, playerId.value)
          playerIdReady.value = true
        }
      }

      if (savedId) {
        playerIdChannel.postMessage({ type: 'check', requestId, playerId: savedId })
        playerIdCheckTimeout = setTimeout(() => { playerIdReady.value = true }, PLAYER_ID_CHECK_MS)
      } else {
        playerIdReady.value = true
      }
    }
  }

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
