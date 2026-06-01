<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6 flex items-center justify-between gap-3">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Changelog</h2>
      <NuxtLink
        to="/"
        class="btn-secondary"
      >
        Back to poker
      </NuxtLink>
    </div>

    <article
      v-if="renderedChangelog"
      class="changelog-content rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
      v-html="renderedChangelog"
    />

    <div
      v-else
      class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
    >
      Could not load changelog. Please refresh page.
    </div>
  </div>
</template>

<script setup>
useHead({
  title: 'Changelog · Scrum Poker'
})

const { data: renderedChangelog } = await useAsyncData('changelog-html', async () => {
  const response = await $fetch('/api/changelog', {
    responseType: 'json'
  })
  return response?.html || ''
})
</script>

<style scoped>
.changelog-content :deep(h1) {
  margin-bottom: 0.75rem;
}

.changelog-content :deep(h2) {
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.changelog-content :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.changelog-content :deep(ul) {
  margin-bottom: 1.25rem;
  padding-left: 1.5rem;
}

.changelog-content :deep(li + li) {
  margin-top: 0.375rem;
}

.changelog-content :deep(p),
.changelog-content :deep(ol) {
  margin-bottom: 1rem;
}
</style>
