import { Hono } from 'hono'
import { KVNamespace } from '@cloudflare/workers-types'

type Bindings = {
  jurabbit_mode: KVNamespace
}

const app = new Hono<{Bindings: Bindings}>()

// API Documentation is in ../README.md
app.get('/', (c) => {
  return c.text('This is the backend API for jurabbit')
})

// enable betting (for operators)
app.post('/enable_betting', async (c) => {
  if (!c.env.jurabbit_mode) {
    return c.json({ error: 'KV storage is not available' }, 500);
  }
  await c.env.jurabbit_mode.put('betting_enabled', 'true')
  return c.json({ message: 'Betting enabled' })
})

// disable betting (for operators)
app.post('/disable_betting', async (c) => {
  if (!c.env.jurabbit_mode) {
    return c.json({ error: 'KV storage is not available' }, 500);
  }
  await c.env.jurabbit_mode.put('betting_enabled', 'false')
  return c.json({ message: 'Betting disabled' })
})

// get betting status (for users and operators)
app.get('/betting_status', async (c) => {
  if (!c.env.jurabbit_mode) {
    return c.json({ error: 'KV storage is not available' }, 500);
  }
  
  const status = await c.env.jurabbit_mode.get('betting_enabled');
  const isBettingEnabled = status === 'true';
  
  return c.json({ 
    betting_enabled: isBettingEnabled,
    status: isBettingEnabled ? 'enabled' : 'disabled' 
  });
})

// // get info about horses (for users)
// app.get('/horses', (c) => {
// })

// // input the results of a race (for operators)
// app.post('/results', (c) => {
// })

// // get winners by race id (for users)
// app.get('/winners/:race_id', (c) => {
// })

// // issue a bet (for users)
// app.post('/bet', (c) => {
// })

export default app
