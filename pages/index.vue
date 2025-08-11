<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Connection Status -->
    <div v-if="!connected" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
        <p class="text-yellow-800">Connecting to server...</p>
      </div>
    </div>

    <!-- Welcome Section -->
    <div v-if="!gameState.roomJoined" class="animate-fade-in">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Scrum Poker
        </h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Estimate story points collaboratively with your team using planning poker
        </p>
      </div>
      
      <div class="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div class="space-y-6">
          <div>
            <label for="playerName" class="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="playerName"
              v-model="playerName"
              type="text"
              placeholder="Enter your name"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              @keyup.enter="handleJoinRoom"
            />
          </div>
          
          <div>
            <label for="roomCode" class="block text-sm font-medium text-gray-700 mb-2">
              Room Code (Optional)
            </label>
            <input
              id="roomCode"
              v-model="roomCode"
              type="text"
              placeholder="Enter room code or leave blank to create"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              @keyup.enter="handleJoinRoom"
            />
          </div>
          
          <button
            @click="handleJoinRoom"
            :disabled="!playerName.trim() || !connected"
            class="w-full btn-primary py-3 text-lg"
          >
            {{ roomCode ? 'Join Room' : 'Create Room' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Game Interface -->
    <div v-else class="animate-slide-up">
      <!-- Room Info -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Room: {{ gameState.roomCode }}</h2>
            <p class="text-gray-600">{{ gameState.participants.length }} participants</p>
          </div>
          <div class="flex space-x-3">
            <button
              @click="copyRoomCode"
              class="btn-secondary flex items-center space-x-2"
            >
              <span>📋</span>
              <span>Copy Code</span>
            </button>
            <button
              @click="handleLeaveRoom"
              class="btn-secondary text-red-600 hover:bg-red-50"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>

      <!-- Story Input -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div class="space-y-4">
          <label for="storyTitle" class="block text-lg font-medium text-gray-900">
            Current Story
          </label>
          <input
            id="storyTitle"
            v-model="currentStory"
            type="text"
            placeholder="Enter the story or task to estimate..."
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            @input="handleStoryUpdate"
          />
        </div>
      </div>

      <!-- Results -->
      <div v-if="gameState.votesRevealed" class="bg-white rounded-2xl shadow-lg p-6 mb-8 animate-fade-in">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Results</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-primary-600">{{ voteStatistics.average }}</div>
            <div class="text-sm text-gray-500">Average</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">{{ voteStatistics.mode }}</div>
            <div class="text-sm text-gray-500">Most Common</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-orange-600">{{ voteStatistics.range }}</div>
            <div class="text-sm text-gray-500">Range</div>
          </div>
        </div>
      </div>

      <!-- Participants -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="participant in gameState.participants"
            :key="participant.id"
            class="text-center"
          >
            <div
              class="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
              :class="[
                participant.hasVoted 
                  ? (gameState.votesRevealed ? 'bg-green-500' : 'bg-primary-500')
                  : 'bg-gray-400'
              ]"
            >
              {{ participant.name.charAt(0).toUpperCase() }}
            </div>
            <p class="text-sm font-medium text-gray-900 truncate">{{ participant.name }}</p>
            <div class="text-xs text-gray-500 mt-1">
              <span v-if="!participant.hasVoted" class="text-gray-400">Waiting...</span>
              <span v-else-if="!gameState.votesRevealed" class="text-primary-600">✓ Voted</span>
              <span v-else class="font-bold text-lg text-gray-900">{{ participant.vote }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Voting Cards -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-6">Choose Your Estimate</h3>
        <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          <div
            v-for="card in pokerCards"
            :key="card.value"
            @click="selectCard(card)"
            class="poker-card aspect-[3/4] flex items-center justify-center"
            :class="{ 
              'selected': selectedCard?.value === card.value,
              'opacity-50': gameState.votesRevealed 
            }"
          >
            <span class="text-2xl font-bold" :class="card.color">
              {{ card.display }}
            </span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-8">
        <button
          v-if="!gameState.votesRevealed"
          @click="revealVotes"
          :disabled="!allVotesIn"
          class="btn-primary flex-1 py-3 text-lg"
        >
          Reveal Votes ({{ votedCount }}/{{ gameState.participants.length }})
        </button>
        
        <button
          v-if="gameState.votesRevealed"
          @click="resetVotes"
          class="btn-primary flex-1 py-3 text-lg"
        >
          New Round
        </button>
        
        <button
          @click="clearSelection"
          class="btn-secondary flex-1 py-3 text-lg"
        >
          Clear Selection
        </button>
        
        <!-- Emoji Ping Button -->
        <div class="relative">
          <button
            @click="showEmojiPicker = !showEmojiPicker"
            class="btn-secondary py-3 px-4 text-lg"
            title="Send emoji ping"
          >
            😊
          </button>
          
          <!-- Emoji Picker -->
          <div
            v-if="showEmojiPicker"
            class="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50"
            style="width: max-content;"
          >
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="emoji in emojiOptions"
                :key="emoji"
                @click="handleSendPing(emoji)"
                class="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl transition-colors duration-200"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Floating Pings -->
    <div class="fixed inset-0 pointer-events-none z-50">
      <div
        v-for="ping in pings"
        :key="ping.id"
        class="absolute animate-ping-float"
        :style="{
          left: Math.random() * 80 + 10 + '%',
          top: Math.random() * 60 + 20 + '%'
        }"
      >
        <div class="bg-white rounded-full shadow-lg px-3 py-2 flex items-center space-x-2">
          <span class="text-2xl">{{ ping.emoji }}</span>
          <span class="text-sm font-medium text-gray-700">{{ ping.fromPlayer }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'

// WebSocket connection
const { connected, gameState, pings, joinRoom, leaveRoom, vote, clearVote, revealVotes, resetVotes, updateStory, sendPing } = useWebSocket()

// Player data
const playerName = ref('')
const roomCode = ref('')
const selectedCard = ref(null)
const currentStory = ref('')
const playerId = ref(Date.now().toString())

// Emoji ping data
const showEmojiPicker = ref(false)
const emojiOptions = ['👍', '👎', '🤔', '😄', '😮', '🎉', '⚡', '🔥', '💡', '❤️', '👏', '🚀']

// Sync current story with game state
watch(() => gameState.currentStory, (newStory) => {
  currentStory.value = newStory
})

// Poker cards configuration
const pokerCards = [
  { value: 0, display: '0', color: 'text-gray-600' },
  { value: 1, display: '1', color: 'text-blue-600' },
  { value: 2, display: '2', color: 'text-blue-600' },
  { value: 3, display: '3', color: 'text-blue-600' },
  { value: 5, display: '5', color: 'text-green-600' },
  { value: 8, display: '8', color: 'text-green-600' },
  { value: 13, display: '13', color: 'text-yellow-600' },
  { value: 21, display: '21', color: 'text-orange-600' },
  { value: 34, display: '34', color: 'text-red-600' },
  { value: 55, display: '55', color: 'text-red-600' },
  { value: 89, display: '89', color: 'text-purple-600' },
  { value: '?', display: '?', color: 'text-gray-600' },
  { value: 'coffee', display: '☕', color: 'text-amber-600' }
]

// Computed properties
const allVotesIn = computed(() => {
  return gameState.participants.length > 0 && 
         gameState.participants.every(p => p.hasVoted)
})

const votedCount = computed(() => {
  return gameState.participants.filter(p => p.hasVoted).length
})

const voteStatistics = computed(() => {
  if (!gameState.votesRevealed) return { average: 0, mode: 0, range: '0-0' }
  
  const numericVotes = gameState.participants
    .map(p => p.vote)
    .filter(vote => typeof vote === 'number' && !isNaN(vote))
  
  if (numericVotes.length === 0) return { average: 'N/A', mode: 'N/A', range: 'N/A' }
  
  const average = (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
  const mode = numericVotes.sort((a, b) => 
    numericVotes.filter(v => v === a).length - numericVotes.filter(v => v === b).length
  ).pop()
  const min = Math.min(...numericVotes)
  const max = Math.max(...numericVotes)
  const range = min === max ? min.toString() : `${min}-${max}`
  
  return { average, mode, range }
})

// Methods
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const handleJoinRoom = () => {
  if (!playerName.value.trim() || !connected.value) return
  
  const code = roomCode.value.trim() || generateRoomCode()
  joinRoom(code, playerName.value.trim(), playerId.value)
}

const handleLeaveRoom = () => {
  leaveRoom()
  selectedCard.value = null
  playerName.value = ''
  roomCode.value = ''
  currentStory.value = ''
}

const selectCard = (card) => {
  if (gameState.votesRevealed) return
  
  selectedCard.value = card
  vote(card.value)
}

const clearSelection = () => {
  selectedCard.value = null
  clearVote()
}

const handleStoryUpdate = () => {
  updateStory(currentStory.value)
}

const copyRoomCode = async () => {
  try {
    await navigator.clipboard.writeText(gameState.roomCode)
    // You could add a toast notification here
  } catch (err) {
    console.error('Failed to copy room code:', err)
  }
}

const handleSendPing = (emoji) => {
  sendPing(emoji)
  showEmojiPicker.value = false
}

// Meta
useHead({
  title: () => `Scrum Poker | ${gameState.roomJoined ? roomCode.value : 'Create or join a room'}`,
  meta: [
    { name: 'description', content: 'Scrum Poker app for fun.' }
  ],
})
</script>