import { Hono } from 'hono'
import { D1Database, KVNamespace } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { results } from './schema'

type Bindings = {
  jurabbit_mode: KVNamespace,
  jurabbit_store: D1Database
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

// get info about horses (for users)
// リクエスト数の削減のため、このAPIはフロントエンドのSSG時に呼び出され、一般のユーザーが直接利用することはない
// app.get('/horses', (c) => {
  
// })

// input the results of a race (for operators)
app.post('/results', async (c) => {
  try {
    if (!c.env.jurabbit_store) {
      return c.json({ error: 'D1 storage is not available' }, 500);
    }

    const body = await c.req.json();

    const ResultSchema = z.object({
      raceId: z.number().int().positive(),
      results: z.array(z.object({
        horse_id: z.number().int().positive(),
        rank: z.number().int().positive().positive()
      })).nonempty()
    });

    const parsedResult = ResultSchema.safeParse(body);

    if (!parsedResult.success) {
      return c.json(
        {
          error: 'Invalid request body',
          details: parsedResult.error.format()
        }, 400);
    }

    const parsedBody = parsedResult.data;

    const db = drizzle(c.env.jurabbit_store);

    const resultData = parsedBody.results.map(result => ({
      raceId: parsedBody.raceId,
      horseId: result.horse_id,
      rank: result.rank
    }));

    await db.insert(results).values(resultData);
    
    return c.json({
      message: 'Results inserted successfully',
    })
  } catch (error) {
    console.error('Error inserting results:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
})

// get results
app.get('/results/:id', async (c) => {
  if (!c.env.jurabbit_store) {
    return c.json({ error: 'D1 database is not available' }, 500);
  }

  const requiredRaceId = parseInt(c.req.param('id'), 10);
  const db = drizzle(c.env.jurabbit_store);

  const searchedResults = await db
    .select({
      horseId: results.horseId,
      rank: results.rank
    })
    .from(results)
    .where(eq(results.raceId, requiredRaceId));
  
  return c.json(searchedResults);
})

// // get winners by race id (for users)
// app.get('/winners/:race_id', (c) => {
// })

// // issue a bet (for users)
// app.post('/bet', (c) => {
// })

export default app
