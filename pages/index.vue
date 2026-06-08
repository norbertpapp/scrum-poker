<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Connection Status -->
    <div v-if="!connected" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 dark:bg-yellow-900/30 dark:border-yellow-700">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
        <p class="text-yellow-800 dark:text-yellow-200">Connecting to server...</p>
      </div>
    </div>

    <!-- Welcome Section -->
    <div v-if="!gameState.roomJoined" class="animate-fade-in">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Welcome to Scrum Poker
        </h2>
        <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Estimate story points collaboratively with your team using planning poker
        </p>
      </div>
      
      <div class="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 dark:bg-gray-800">
        <div class="space-y-6">
          <div>
            <label for="playerName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Name
            </label>
            <input
              id="playerName"
              v-model="playerName"
              type="text"
              placeholder="Enter your name"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              @keyup.enter="handleJoinRoom"
            />
          </div>
          
          <div>
            <label for="roomCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room Code (Optional)
            </label>
            <input
              id="roomCode"
              v-model="roomCode"
              type="text"
              placeholder="Enter room code or leave blank to create"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
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
      <!-- Results -->
      <div v-if="gameState.votesRevealed" class="bg-white rounded-2xl shadow-lg p-6 mb-8 animate-fade-in dark:bg-gray-800">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Results</h3>
          <span
            v-if="votesAreFullyAligned"
            class="inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold"
          >
            🎉 Perfect alignment
          </span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-primary-600">{{ voteStatistics.average }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Average</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">{{ voteStatistics.mode }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Most Common</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-orange-600">{{ voteStatistics.range }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Range</div>
          </div>
        </div>
      </div>

      <!-- Participants -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8 dark:bg-gray-800">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Participants</h3>
            <span
              v-if="kickModeEnabled"
              class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
            >
              Kick mode
            </span>
          </div>
          <div class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 w-full sm:w-auto dark:border-gray-700 dark:bg-gray-900">
            <button
              @click="participantsView = 'cards'"
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex-1 sm:flex-none"
              :class="participantsView === 'cards' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'"
            >
              Cards
            </button>
            <button
              @click="participantsView = 'table'"
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex-1 sm:flex-none"
              :class="participantsView === 'table' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'"
            >
              Table
            </button>
          </div>
        </div>

        <div v-if="participantsView === 'cards'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="participant in gameState.participants"
            :key="participant.id"
            class="text-center relative"
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
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover-me">{{ participant.name }}</p>
            <span class="tooltip full-name">{{ participant.name }}</span>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span v-if="!participant.hasVoted" class="text-gray-400 dark:text-gray-500">Waiting...</span>
              <span v-else-if="!gameState.votesRevealed" class="text-primary-600">✓ Voted</span>
              <span v-else class="font-bold text-lg text-gray-900 dark:text-gray-100">
                <img
                  v-if="isCoffeeEmojiVote(participant.vote)"
                  :src="getCoffeeEmojiSrcFromVote(participant.vote)"
                  alt="Coffee vote emoji"
                  class="h-8 w-8 rounded object-contain mx-auto"
                />
                <span v-else>{{ getVoteDisplay(participant.vote) }}</span>
              </span>
            </div>
            <button
              v-if="canKickParticipant(participant)"
              @click="handleKickParticipant(participant)"
              class="mt-2 inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              Kick
            </button>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Participant</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Status</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Vote</th>
                <th v-if="kickModeEnabled" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
              <tr v-for="participant in gameState.participants" :key="participant.id" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{{ participant.name }}</td>
                <td class="px-4 py-3 text-sm">
                  <span v-if="!participant.hasVoted" class="text-gray-400 dark:text-gray-500">Waiting...</span>
                  <span v-else class="text-primary-600">Voted</span>
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <span v-if="!participant.hasVoted" class="text-gray-400 dark:text-gray-500 font-normal">—</span>
                  <span v-else-if="!gameState.votesRevealed" class="text-gray-500 dark:text-gray-400 font-normal">Hidden</span>
                  <span v-else>
                    <img
                      v-if="isCoffeeEmojiVote(participant.vote)"
                      :src="getCoffeeEmojiSrcFromVote(participant.vote)"
                      alt="Coffee vote emoji"
                      class="h-8 w-8 rounded object-contain"
                    />
                    <span v-else>{{ getVoteDisplay(participant.vote) }}</span>
                  </span>
                </td>
                <td v-if="kickModeEnabled" class="px-4 py-3 text-sm">
                  <button
                    v-if="canKickParticipant(participant)"
                    @click="handleKickParticipant(participant)"
                    class="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Kick
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-8">
        <button
          v-if="!gameState.votesRevealed"
          @click="revealVotes"
          class="flex-1 py-3 text-lg"
          :class="{'btn-primary': votedCount === gameState.participants.length, 'btn-secondary': votedCount < gameState.participants.length}"
        >
          Reveal Votes ({{ votedCount }}/{{ gameState.participants.length }})
        </button>
        
        <button
          v-if="gameState.votesRevealed"
          @click="handleResetVotes"
          class="btn-primary flex-1 py-3 text-lg"
        >
          New Round
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
            class="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 dark:bg-gray-800 dark:border-gray-700"
            style="width: max-content;"
          >
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="emoji in emojiOptions"
                :key="emoji"
                @click="handleSendPing(emoji)"
                class="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-xl transition-colors duration-200"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Voting Cards -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8 dark:bg-gray-800">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Choose Your Estimate
          <span v-if="gameState.votesRevealed" class="text-sm text-gray-500 dark:text-gray-400 font-normal ml-2">(You can still change your vote)</span>
        </h3>
        <div class="mb-4">
          <div class="relative inline-block">
            <button
              type="button"
              @click="showCoffeeEmojiPicker = !showCoffeeEmojiPicker"
              class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
              title="Pick custom vote"
            >
              <span>Pick custom vote</span>
              <img
                v-if="selectedCoffeeEmojiSrc"
                :src="selectedCoffeeEmojiSrc"
                alt="Selected coffee emoji"
                class="h-6 w-6 rounded object-contain"
              />
              <span v-else class="text-lg">☕</span>
            </button>

            <div
              v-if="showCoffeeEmojiPicker"
              class="absolute left-0 top-full mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-xl z-50 dark:border-gray-700 dark:bg-gray-800"
              style="width: max-content;"
            >
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="emoji in coffeeEmojiOptions"
                  :key="emoji.fileName"
                  type="button"
                  @click="handleSelectCoffeeEmoji(emoji.fileName)"
                  class="h-11 w-11 rounded-lg border-2 bg-white p-1 transition-colors duration-200 dark:bg-gray-900"
                  :class="selectedCoffeeEmojiFile === emoji.fileName ? 'border-primary-500' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-500'"
                  :title="emoji.label"
                >
                  <span v-if="emoji.emoji" class="text-2xl">{{ emoji.emoji }}</span>
                  <img v-else :src="emoji.src" :alt="emoji.label" class="h-full w-full rounded object-contain" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          <div
            v-for="card in pokerCards"
            :key="card.value"
            role="button"
            tabindex="0"
            :aria-label="`Select vote ${card.display}`"
            :aria-pressed="isCardSelected(card)"
            @click="selectCard(card)"
            @keydown.enter.prevent="selectCard(card)"
            @keydown.space.prevent="selectCard(card)"
            class="poker-card aspect-[3/4] flex items-center justify-center"
            :class="{
              'selected': isCardSelected(card)
            }"
          >
            <template v-if="card.value === 'coffee'">
              <img
                v-if="selectedCoffeeEmojiSrc"
                :src="selectedCoffeeEmojiSrc"
                alt="Selected coffee vote emoji"
                class="h-12 w-12 rounded object-contain"
              />
              <span v-else class="text-3xl">☕</span>
            </template>
            <span v-else class="text-2xl font-bold" :class="card.color">
              {{ card.display }}
            </span>
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
        <div class="bg-white rounded-full shadow-lg px-3 py-2 flex items-center space-x-2 dark:bg-gray-800 dark:border dark:border-gray-700">
          <span class="text-2xl">{{ ping.emoji }}</span>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ ping.fromPlayer }}</span>
        </div>
      </div>
    </div>

    <div v-if="confettiPieces.length" class="fixed inset-0 pointer-events-none overflow-hidden z-40">
      <span
        v-for="piece in confettiPieces"
        :key="piece.id"
        class="confetti-piece"
        :style="{
          left: piece.left + '%',
          fontSize: piece.size + 'px',
          animationDelay: piece.delay + 'ms',
          animationDuration: piece.duration + 'ms',
          '--confetti-drift': piece.drift + 'px',
          '--confetti-rotate': piece.rotate + 'deg'
        }"
      >🎉</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { usePokerSession } from '~/composables/usePokerSession'

definePageMeta({
  path: '/:roomCode?'
})

const {
  connected,
  gameState,
  pings,
  vote,
  clearVote,
  revealVotes,
  resetVotes,
  sendPing,
  kickParticipant,
  playerName,
  playerId,
  roomCode,
  handleJoinRoom
} = usePokerSession()
const { resolvePublicAssetPath } = usePublicAssetPath()

const selectedVote = ref(null)
const participantsView = ref('cards')
const confettiPieces = ref([])
const kickModeEnabled = ref(false)
let confettiTimeoutId = null
const KICK_MODE_UNLOCK_TEXT = 'roundhousekick'
const KICK_MODE_BUFFER_MAX = KICK_MODE_UNLOCK_TEXT.length
const COFFEE_EMOJI_VOTE_PREFIX = 'coffee_emoji:'
let typedKickModeBuffer = ''

// Emoji ping data
const showEmojiPicker = ref(false)
const showCoffeeEmojiPicker = ref(false)
const emojiOptions = ['👍', '👎', '🤔', '😄', '😮', '🎉', '⚡', '🔥', '💡', '❤️', '👏', '🚀']
const coffeeEmojiOptions = [
  { fileName: 'default', label: 'Coffee', emoji: '☕' },
  { fileName: 'dog-scared.png', label: 'Scared dog', src: resolvePublicAssetPath('/img/emojis/dog-scared.png') },
  { fileName: 'scared-hamster-cross.png', label: 'Scared hamster', src: resolvePublicAssetPath('/img/emojis/scared-hamster-cross.png') },
  { fileName: 'screaming-cat.png', label: 'Screaming cat', src: resolvePublicAssetPath('/img/emojis/screaming-cat.png') },
  { fileName: 'shrugge.png', label: 'Shrugge', src: resolvePublicAssetPath('/img/emojis/shrugge.png') }
]
const selectedCoffeeEmojiFile = ref('default')

// Poker cards configuration
const pokerCards = [
  { value: 'coffee', display: '☕', color: 'text-amber-600' },
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
  { value: 69, display: '69', color: 'text-purple-600' },
  { value: 89, display: '89', color: 'text-purple-600' },
  { value: 100, display: '100', color: 'text-purple-600' },
  { value: 420, display: '420', color: 'text-green-600' },
  { value: '?', display: '?', color: 'text-gray-600' }
]

// Computed properties
const votedCount = computed(() => {
  return gameState.participants.filter(p => p.hasVoted).length
})

const voteStatistics = computed(() => {
  if (!gameState.votesRevealed) return { average: 0, mode: 0, range: '0-0' }
  
  const numericVotes = gameState.participants
    .map(p => p.vote)
    .filter(vote => typeof vote === 'number' && !isNaN(vote))
  
  if (numericVotes.length === 0) return { average: 'N/A', mode: 'N/A', range: 'N/A' }
  if (numericVotes.length === 1) return { average: numericVotes[0], mode: numericVotes[0], range: 'N/A' }
  
  const average = (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
  const mode = numericVotes.sort((a, b) => 
    numericVotes.filter(v => v === a).length - numericVotes.filter(v => v === b).length
  ).pop()
  const min = Math.min(...numericVotes)
  const max = Math.max(...numericVotes)
  const range = min === max ? min.toString() : `${min}-${max}`
  
  return { average, mode, range }
})

const selectedCoffeeEmojiSrc = computed(() => {
  const selected = coffeeEmojiOptions.find(emoji => emoji.fileName === selectedCoffeeEmojiFile.value)
  return selected?.src || null
})

const votesAreFullyAligned = computed(() => {
  if (!gameState.votesRevealed || gameState.participants.length === 0) return false
  if (gameState.participants.some(participant => !participant.hasVoted)) return false

  const firstVote = gameState.participants[0]?.vote
  return gameState.participants.every(participant => participant.vote === firstVote)
})

const triggerConfetti = () => {
  if (confettiTimeoutId) {
    clearTimeout(confettiTimeoutId)
  }

  confettiPieces.value = Array.from({ length: 24 }, (_, index) => {
    const fromLeft = Math.random() < 0.5

    return {
    id: `${Date.now()}-${index}`,
    left: fromLeft ? 4 + Math.random() * 18 : 78 + Math.random() * 18,
    size: 20 + Math.random() * 12,
    delay: Math.random() * 150,
    duration: 1300 + Math.random() * 500,
    drift: -80 + Math.random() * 160,
    rotate: -240 + Math.random() * 480
    }
  })

  confettiTimeoutId = setTimeout(() => {
    confettiPieces.value = []
    confettiTimeoutId = null
  }, 2200)
}

watch(() => gameState.votesRevealed, (isRevealed, wasRevealed) => {
  if (isRevealed && !wasRevealed && votesAreFullyAligned.value) {
    triggerConfetti()
  }

  if (!isRevealed && wasRevealed) {
    selectedVote.value = null
    confettiPieces.value = []

    if (confettiTimeoutId) {
      clearTimeout(confettiTimeoutId)
      confettiTimeoutId = null
    }
  }
})

watch(selectedCoffeeEmojiFile, () => {
  if (selectedVote.value !== 'coffee' && !isCoffeeEmojiVote(selectedVote.value)) {
    return
  }

  const updatedCoffeeVote = getSelectedCoffeeVoteValue()
  if (updatedCoffeeVote === selectedVote.value) {
    return
  }

  selectedVote.value = updatedCoffeeVote
  vote(updatedCoffeeVote)
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKickModeUnlock)
  }

  if (confettiTimeoutId) {
    clearTimeout(confettiTimeoutId)
  }
})

onMounted(() => {
  if (!import.meta.client) {
    return
  }

  window.addEventListener('keydown', handleKickModeUnlock)
})

// Helper function to get display value for votes
const getVoteDisplay = (vote) => {
  if (vote === 'coffee') return '☕'
  return vote
}

const getCoffeeEmojiVoteValue = (fileName) => `${COFFEE_EMOJI_VOTE_PREFIX}${fileName}`

const getSelectedCoffeeVoteValue = () => {
  if (selectedCoffeeEmojiFile.value === 'default') {
    return 'coffee'
  }

  return getCoffeeEmojiVoteValue(selectedCoffeeEmojiFile.value)
}

const isCoffeeEmojiVote = (vote) => {
  return typeof vote === 'string' && vote.startsWith(COFFEE_EMOJI_VOTE_PREFIX)
}

const getCoffeeEmojiSrcFromVote = (vote) => {
  if (!isCoffeeEmojiVote(vote)) {
    return null
  }

  const fileName = vote.slice(COFFEE_EMOJI_VOTE_PREFIX.length)
  const match = coffeeEmojiOptions.find(emoji => emoji.fileName === fileName)
  return match ? match.src : null
}

const isCardSelected = (card) => {
  if (card.value === 'coffee') {
    return selectedVote.value === 'coffee' || isCoffeeEmojiVote(selectedVote.value)
  }

  return selectedVote.value === card.value
}

// Methods
const selectCard = (card) => {
  if (card.value === 'coffee') {
    const coffeeVoteValue = getSelectedCoffeeVoteValue()
    selectedVote.value = coffeeVoteValue
    vote(coffeeVoteValue)
    return
  }

  selectedVote.value = card.value
  vote(card.value)
}

const clearSelection = () => {
  selectedVote.value = null
  clearVote()
}

const handleResetVotes = () => {
  resetVotes()
  clearSelection()
}

const handleSendPing = (emoji) => {
  sendPing(emoji)
  showEmojiPicker.value = false
}

const handleSelectCoffeeEmoji = (fileName) => {
  selectedCoffeeEmojiFile.value = fileName
  showCoffeeEmojiPicker.value = false
}

const handleKickModeUnlock = (event) => {
  if (kickModeEnabled.value) {
    return
  }

  if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1) {
    return
  }

  typedKickModeBuffer = `${typedKickModeBuffer}${event.key.toLowerCase()}`.slice(-KICK_MODE_BUFFER_MAX)

  if (typedKickModeBuffer === KICK_MODE_UNLOCK_TEXT) {
    kickModeEnabled.value = true
  }
}

const canKickParticipant = (participant) => {
  if (!kickModeEnabled.value) {
    return false
  }

  if (!participant || participant.id === playerId.value) {
    return false
  }

  return !participant.hasVoted
}

const handleKickParticipant = (participant) => {
  if (!canKickParticipant(participant)) {
    return
  }

  const shouldKick = window.confirm(`Kick ${participant.name} for being away/unresponsive?`)
  if (!shouldKick) {
    return
  }

  kickParticipant(participant.id)
}

// Meta
useHead({
  title: () => `Scrum Poker | ${gameState.roomJoined ? roomCode.value : 'Create or join a room'}`,
  meta: [
    { name: 'description', content: 'Scrum Poker app for fun.' }
  ],
})
</script>

<style scoped>
.confetti-piece {
  position: absolute;
  bottom: -20px;
  opacity: 0.98;
  line-height: 1;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes confetti-fall {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  100% {
    transform: translate3d(var(--confetti-drift), -110vh, 0) rotate(var(--confetti-rotate));
    opacity: 0;
  }
}
</style>
