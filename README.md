# Nuxt 3 Minimal Starter

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Cloudflare Workers Setup

This application uses Cloudflare Durable Objects for WebSocket functionality.

### Prerequisites
- Cloudflare account
- Wrangler CLI installed globally: `npm install -g wrangler`

### Development Setup

1. Login to Cloudflare:
```bash
wrangler login
```

2. Start the Cloudflare Workers development server:
```bash
wrangler dev functions/websocket.js --port 8787
```

3. In another terminal, start the Nuxt development server:
```bash
npm run dev
```

### Production Deployment

1. Deploy the Cloudflare Worker:
```bash
wrangler deploy functions/websocket.js
```

2. Update the WebSocket URL in `composables/useWebSocket.js` with your deployed worker domain.

3. Deploy your Nuxt application to your preferred hosting platform.

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn install

# npm
npm install

# pnpm
pnpm install
```

## Development Server

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Architecture

- **Frontend**: Nuxt 3 application with real-time WebSocket communication
- **Backend**: Cloudflare Durable Objects for stateful WebSocket handling
- **Benefits**: 
  - Global edge deployment
  - Automatic scaling
  - Strong consistency per room
  - No server management required
