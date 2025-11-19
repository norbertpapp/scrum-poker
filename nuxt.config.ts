// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'Scrum Poker', // default fallback title
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ]
    }
  },
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  vite: {
    define: {
      HOSTNAME: 'web-bjbh32j7s46c.up-de-fra1-k8s-1.apps.run-on-seenode.com'
    }
  }

})
