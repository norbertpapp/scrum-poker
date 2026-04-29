<template>
  <div>
    <header class="bg-white shadow-sm border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">SP</span>
            </div>
            <div>
              <h1 class="text-xl leading-tight font-bold text-gray-900">Scrum Poker</h1>
              <p class="text-sm leading-tight text-gray-500">Planning made simple</p>
            </div>
          </div>

          <div v-if="gameState.roomJoined" class="flex flex-wrap items-center justify-end gap-2 md:gap-3">
            <div class="rounded-lg bg-gray-50 px-3 py-1.5 text-right">
              <p class="text-sm font-semibold leading-tight text-gray-900">Room: {{ gameState.roomCode }}</p>
              <p class="text-xs leading-tight text-gray-500">{{ gameState.participants.length }} participants</p>
            </div>

            <div class="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5">
              <span class="text-sm text-gray-500">You:</span>
              <input
                v-if="editingName"
                ref="nameInput"
                v-model="newPlayerName"
                type="text"
                class="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                @keyup.enter="handleNameChange"
                @blur="handleNameChange"
              />
              <button
                v-if="editingName"
                class="text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="handleNameChange"
              >
                Save
              </button>
              <span v-else class="text-sm font-medium text-gray-900">{{ playerName }}</span>
              <button
                v-if="!editingName"
                class="text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="startEditing"
              >
                Edit
              </button>
            </div>

            <button
              class="btn-secondary flex h-10 items-center gap-2"
              @click="copyRoomUrl"
            >
              <span>📋</span>
              <span>Copy URL</span>
            </button>

            <button
              class="btn-secondary h-10 text-red-600 hover:bg-red-50"
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