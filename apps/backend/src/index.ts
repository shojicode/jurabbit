import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { D1Database, KVNamespace } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { results, userPredictions } from './schema'
import { randomUUID } from 'crypto'

type Bindings = {
  jurabbit_mode: KVNamespace,
  jurabbit_store: D1Database
}

// KVを操作するヘルパー関数
const getKVValue = async (c: any, key: string) => {
  if (!c.env.jurabbit_mode) {
    return c.json({ error: 'KV storage is not available' }, 500);
  }
  const value = await c.env.jurabbit_mode.get(key);
}

const setKVValue = async (c: any, key: string, value: string) => {
  if (!c.env.jurabbit_mode) {
    return c.json({ error: 'KV storage is not available' }, 500);
  }
  await c.env.jurabbit_mode.put(key, value);
}

// D1アクセスのヘルパー関数
const createDrizzleClient = (c: any) => {
  if (!c.env.jurabbit_store) {
    return c.json({ error: 'D1 storage is not available' }, 500);
  }
  return drizzle(c.env.jurabbit_store);
}

const app = new Hono<{Bindings: Bindings}>()

// API Documentation is in ../README.md
app.get('/', (c) => {
  return c.text('This is the backend API for jurabbit')
})

// current race id
app.get('/current_race', async (c) => {
  const currentRaceId = await getKVValue(c, 'current_race');
  if (!currentRaceId) {
    return c.json({ error: 'Current race id not found' }, 404);
  }
  return c.json({ currentRaceId: currentRaceId });
})

// set current race id (for operators)
app.post('/current_race', async (c) => {
  const body = await c.req.json();
  const raceId = body.raceId;

  if (typeof raceId !== 'number' || raceId <= 0) {
    return c.json({ error: 'Invalid raceId' }, 400);
  }
  await setKVValue(c, 'current_race', raceId.toString());
  return c.json({ message: 'Current race id set successfully' });
})


// enable betting (for operators)
app.post('/enable_betting', async (c) => {
  await setKVValue(c, 'betting_enabled', 'true');
  return c.json({ message: 'Betting enabled' })
})

// disable betting (for operators)
app.post('/disable_betting', async (c) => {
  await setKVValue(c, 'betting_enabled', 'false');
  return c.json({ message: 'Betting disabled' })
})

// get betting status (for users and operators)
app.get('/betting_status', async (c) => {
  const status = await getKVValue(c, 'betting_enabled');
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
    const db = createDrizzleClient(c);

    const RaceResultSchema = z.object({
      raceId: z.number().int().positive(),
      results: z.array(z.object({
        horse_id: z.number().int().positive(),
        rank: z.number().int().positive().positive()
      })).nonempty()
    });

    const validatedRaceResult = RaceResultSchema.safeParse(c.req.json());

    if (!validatedRaceResult.success) {
      return c.json(
        {
          error: 'Invalid request body',
          details: validatedRaceResult.error.format()
        }, 400);
    }

    const resultData = validatedRaceResult.data.results.map(result => ({
      raceId: validatedRaceResult.data.raceId,
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
  const requiredRaceId = parseInt(c.req.param('id'), 10);
  const db = createDrizzleClient(c);

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

// issue a bet (for users)
app.post('/bet', async (c) => {
  try {
    const db = createDrizzleClient(c);

    const BetSchema = z.object({
      userId: z.string().nullable(),
      raceId: z.number().int().positive(),
      firstChoice: z.number().int().positive(),  // it should be a horse id
      secondChoice: z.number().int().positive().optional(),
      thirdChoice: z.number().int().positive().optional()
    });

    const validatedBet = BetSchema.safeParse(c.req.json());
    if (!validatedBet.success) {
      return c.json(
        {
          error: 'Invalid request body',
          details: validatedBet.error.format()
        }, 400);
    }

    // ユーザーIDがない場合は生成してクッキーに保存
    if (!validatedBet.data.userId) {
      const newUserId = generateUserId();
      setCookie(c, 'userId', newUserId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 60 * 60 * 24 * 2, // 2 days
      });
      validatedBet.data.userId = newUserId;
    }


    const parsedBody = validatedBet.data;
    
    await db
      .insert(userPredictions)
      .values({
        userId: parsedBody.userId,
        raceId: parsedBody.raceId,
        firstChoice: parsedBody.firstChoice,
        secondChoice: parsedBody.secondChoice ?? null,
        thirdChoice: parsedBody.thirdChoice ?? null
      });

    return c.json({
      message: 'Bet placed successfully',
      bet: {
        userId: parsedBody.userId,
        raceId: parsedBody.raceId,
        firstChoice: parsedBody.firstChoice,
        secondChoice: parsedBody.secondChoice,
        thirdChoice: parsedBody.thirdChoice
      }
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    
    // 一意性制約違反の場合は409を返す
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'You have already placed a bet' }, 409); // Conflict
    }
    
    return c.json({ error: 'Internal server error' }, 500);
  }
})

const generateUserId = randomUUID;

export default app
