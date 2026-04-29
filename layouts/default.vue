<template>
  <div>
    <header class="bg-white shadow-sm border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">SP</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">Scrum Poker</h1>
              <p class="text-sm text-gray-500">Planning made simple</p>
            </div>
          </div>

          <div v-if="gameState.roomJoined" class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-900">Room: {{ gameState.roomCode }}</p>
              <p class="text-xs text-gray-500">{{ gameState.participants.length }} participants</p>
            </div>

            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">You:</span>
              <input
                v-if="editingName"
                ref="nameInput"
                v-model="newPlayerName"
                type="text"
                class="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                @keyup.enter="handleNameChange"
                @blur="handleNameChange"
              />
              <button
                v-if="editingName"
                class="text-sm text-primary-600 hover:text-primary-700"
                @click="handleNameChange"
              >
                Save
              </button>
              <span v-else class="text-sm font-medium text-gray-900">{{ playerName }}</span>
              <button
                v-if="!editingName"
                class="text-sm text-primary-600 hover:text-primary-700"
                @click="startEditing"
              >
                Edit
              </button>
            </div>

            <button
              class="btn-secondary flex items-center space-x-2"
              @click="copyRoomUrl"
            >
              <span>📋</span>
              <span>Copy URL</span>
            </button>

            <button
              class="btn-secondary text-red-600 hover:bg-red-50"
              @click="handleLeaveRoom"
            >
              ❌ Leave Room
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { usePokerSession } from '~/composables/usePokerSession'

const {
  gameState,
  playerName,
  editingName,
  newPlayerName,
  copyRoomUrl,
  handleLeaveRoom,
  startEditingName,
  handleNameChange
} = usePokerSession()

const nameInput = ref(null)

const startEditing = async () => {
  startEditingName()
  await nextTick()
  nameInput.value?.focus()
}
</script>