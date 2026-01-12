<template>
  <div>
    <header class="bg-white shadow-sm border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-3">
            <img src="/logo.png" width="40px" height="40px" title="Scrum Poker" />
            <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">SP</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">Scrum Poker</h1>
              <p class="text-sm text-gray-500">Planning made simple</p>
            </div>
          </div>
        </div>
      </div>
    </header>
    
    <main>
      <slot />
    </main>
  </div>
</template>