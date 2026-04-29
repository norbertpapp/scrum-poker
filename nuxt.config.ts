// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'Scrum Poker', // default fallback title
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ]
    }
  },
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: ['@unocss/nuxt'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || ''
    }
  }

})


