// https://nuxt.com/docs/api/configuration/nuxt-config
const appBaseUrl = process.env.NUXT_APP_BASE_URL || '/'
const normalizedBaseUrl = appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`

export default defineNuxtConfig({
  app: {
    head: {
      title: 'Scrum Poker', // default fallback title
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        { rel: 'icon', type: 'image/png', href: `${normalizedBaseUrl}favicon.png` },
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

