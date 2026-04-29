<template>
  <div>
    <header class="bg-white shadow-sm border-b border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span class="text-3xl leading-none" aria-hidden="true">🃏</span>
            </div>
            <div>
              <h1 class="text-xl leading-tight font-bold text-gray-900 dark:text-gray-100">Scrum Poker</h1>
              <p class="text-sm leading-tight text-gray-500 dark:text-gray-400">Planning made simple</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 md:gap-3">
            <button
              class="btn-secondary h-10"
              @click="toggleTheme"
            >
              {{ isDarkTheme ? '☀️ Light' : '🌙 Dark' }}
            </button>

            <button
              class="btn-secondary h-10"
              @click="setThemeMode('system')"
            >
              🖥️ System
            </button>

            <template v-if="gameState.roomJoined">
            <div class="rounded-lg bg-gray-50 px-3 py-1.5 text-right dark:bg-gray-800">
              <p class="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">Room: {{ gameState.roomCode }}</p>
              <p class="text-xs leading-tight text-gray-500 dark:text-gray-400">{{ gameState.participants.length }} participants</p>
            </div>

            <div class="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-800">
              <span class="text-sm text-gray-500 dark:text-gray-400">You:</span>
              <input
                v-if="editingName"
                ref="nameInput"
                v-model="newPlayerName"
                type="text"
                class="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
              <span v-else class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ playerName }}</span>
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
              ❌ Leave
            </button>
            </template>
          </div>
        </div>
      </div>
    </header>
    
    <main>
      <slot />
    </main>

    <footer class="mt-10 border-t border-gray-100 bg-white/70 dark:border-gray-800 dark:bg-gray-900/70">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <p class="flex items-center justify-center gap-1 text-center text-xs text-gray-500 dark:text-gray-400">
          <span>© {{ currentYear }} Scrum Poker</span>
          <span aria-hidden="true">·</span>
          <a
            href="https://github.com/norbertpapp/scrum-poker"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.596 2 12.267c0 4.537 2.865 8.387 6.839 9.746.5.094.682-.221.682-.49 0-.241-.009-.879-.014-1.726-2.782.617-3.369-1.374-3.369-1.374-.455-1.184-1.11-1.499-1.11-1.499-.908-.636.069-.623.069-.623 1.004.072 1.532 1.058 1.532 1.058.892 1.567 2.341 1.114 2.91.851.091-.664.349-1.114.635-1.37-2.221-.259-4.556-1.14-4.556-5.074 0-1.121.389-2.038 1.029-2.756-.103-.259-.446-1.303.097-2.716 0 0 .84-.277 2.75 1.053A9.43 9.43 0 0 1 12 6.844c.85.004 1.705.117 2.504.343 1.909-1.33 2.747-1.053 2.747-1.053.545 1.413.202 2.457.1 2.716.64.718 1.027 1.635 1.027 2.756 0 3.944-2.339 4.812-4.566 5.066.359.316.678.941.678 1.898 0 1.37-.012 2.475-.012 2.812 0 .271.18.588.688.488C19.138 20.65 22 16.802 22 12.267 22 6.596 17.523 2 12 2Z" />
            </svg>
            GitHub
          </a>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { usePokerSession } from '~/composables/usePokerSession'

const THEME_MODE_KEY = 'scrum-poker-theme-mode'

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
const currentYear = new Date().getFullYear()
const themeMode = ref('system')
const systemPrefersDark = ref(false)
let mediaQuery = null

const isDarkTheme = computed(() => {
  if (themeMode.value === 'dark') return true
  if (themeMode.value === 'light') return false
  return systemPrefersDark.value
})

const applyThemeClass = () => {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', isDarkTheme.value)
  document.documentElement.style.colorScheme = isDarkTheme.value ? 'dark' : 'light'
}

const setThemeMode = (mode) => {
  themeMode.value = mode

  if (typeof localStorage === 'undefined') return
  if (mode === 'system') {
    localStorage.removeItem(THEME_MODE_KEY)
  } else {
    localStorage.setItem(THEME_MODE_KEY, mode)
  }

  applyThemeClass()
}

const toggleTheme = () => {
  setThemeMode(isDarkTheme.value ? 'light' : 'dark')
}

const handleSystemThemeChange = (event) => {
  systemPrefersDark.value = event.matches
  if (themeMode.value === 'system') {
    applyThemeClass()
  }
}

const startEditing = async () => {
  startEditingName()
  await nextTick()
  nameInput.value?.focus()
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = mediaQuery.matches

  const savedThemeMode = localStorage.getItem(THEME_MODE_KEY)
  if (savedThemeMode === 'light' || savedThemeMode === 'dark') {
    themeMode.value = savedThemeMode
  }

  applyThemeClass()
  mediaQuery.addEventListener('change', handleSystemThemeChange)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', handleSystemThemeChange)
})
</script>