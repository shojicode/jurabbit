import { Hono } from 'hono'

const app = new Hono()

// API Documentation is in ../README.md
app.get('/', (c) => {
  return c.text('This is the backend API for jurabbit')
})

// enable betting (for operators)
app.post('/enable_betting', (c) => {

})

// disable betting (for operators)
app.post('/disable_betting', (c) => {
})

// get info about horses (for users)
app.get('/horses', (c) => {
})

// input the results of a race (for operators)
app.post('/results', (c) => {
})

// get winners by race id (for users)
app.get('/winners/:race_id', (c) => {
})

// issue a bet (for users)
app.post('/bet', (c) => {
})

export default app
