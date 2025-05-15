import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { cors } from 'hono/cors'
import { jwt, sign, verify } from 'hono/jwt'
import { D1Database, KVNamespace } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { results, userPredictions } from './schema'
import { randomUUID } from 'crypto'

type Bindings = {
  jurabbit_mode: KVNamespace,
  jurabbit_store: D1Database,
  ADMIN_PASSWORD: string,
  ADMIN_JWT_SECRET: string
}

// ヘルパー関数-------------------------------------------------------

// KVを操作するヘルパー関数
const getKVValue = async (c: any, key: string) => {
  if (!c.env.jurabbit_mode) {
    return c.json({ error: 'KV storage is not available' }, 500);
  }
  const value = await c.env.jurabbit_mode.get(key);
  return value;
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

// UUIDを生成するラッパ（ソースコードの見通しを良くするため）
const generateUserId = randomUUID;

// 認証ミドルウェア
const adminAuth = async (c: any, next: any) => {
  const token = getCookie(c, 'admin_token');
  
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    // トークンを検証
    const secret = c.env.ADMIN_JWT_SECRET || 'fallback-secret-do-not-use-in-production';
    const verified = await verify(token, secret);
    
    if (verified && verified.admin === true) {
      await next();
    } else {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  } catch (e) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

// ---------------------------------------------------------------

const app = new Hono<{Bindings: Bindings}>()

// CORSの設定
app.use('*', cors({
  origin: process.env.BACKEND_URL || 'http://localhost:8787',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// API Documentation is in ../README.md
app.get('/', (c) => {
  return c.text('This is the backend API for jurabbit')
})

// 管理者ログインAPI
app.post('/admin/login', async (c) => {
  try {
    const { password } = await c.req.json();
    const adminPassword = c.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return c.json({ error: 'Server configuration error' }, 500);
    }
    
    // パスワードの検証
    if (password !== adminPassword) {
      // レスポンスの遅延を加えてブルートフォース攻撃を困難にする
      await new Promise(resolve => setTimeout(resolve, 500));
      return c.json({ error: 'Invalid password' }, 401);
    }
    
    // JWTトークンの作成
    const secret = c.env.ADMIN_JWT_SECRET || 'fallback-secret-do-not-use-in-production';
    const token = await sign({ admin: true }, secret);
    
    // HTTP-onlyクッキーにトークンを設定
    setCookie(c, 'admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24, // 24時間
      path: '/'
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 管理者ログアウトAPI
app.post('/admin/logout', (c) => {
  deleteCookie(c, 'admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/'
  });
  
  return c.json({ success: true });
});

// 管理者認証確認API
app.get('/admin/verify', adminAuth, (c) => {
  return c.json({ authenticated: true });
});

// current race id
app.get('/current_race', async (c) => {
  const currentRaceId = await getKVValue(c, 'current_race');
  if (!currentRaceId) {
    return c.json({ error: 'Current race id not found' }, 404);
  }
  return c.json({ currentRaceId: currentRaceId });
})

// set current race id (for operators)
app.post('/current_race', adminAuth, async (c) => {
  const body = await c.req.json();
  const raceId = body.raceId;

  if (typeof raceId !== 'number' || raceId <= 0) {
    return c.json({ error: 'Invalid raceId' }, 400);
  }
  await setKVValue(c, 'current_race', raceId.toString());
  return c.json({ message: 'Current race id set successfully' });
})

// enable betting (for operators)
app.post('/enable_betting', adminAuth, async (c) => {
  await setKVValue(c, 'betting_enabled', 'true');
  return c.json({ message: 'Betting enabled' })
})

// disable betting (for operators)
app.post('/disable_betting', adminAuth, async (c) => {
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

// input the results of a race (for operators)
app.post('/results', adminAuth, async (c) => {
  try {
    const db = createDrizzleClient(c);

    const RaceResultSchema = z.object({
      raceId: z.number().int().positive(),
      results: z.array(z.object({
        horse_id: z.number().int().positive(),
        rank: z.number().int().positive().positive()
      })).nonempty()
    });

    const validatedRaceResult = RaceResultSchema.safeParse(await c.req.json());

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

    // 既存のレース結果があるか確認
    const existingResults = await db
      .select({ count: sql`count(*)` })
      .from(results)
      .where(eq(results.raceId, validatedRaceResult.data.raceId));
    
    const hasExistingResults = existingResults[0]?.count > 0;

    // フォースアップデートフラグがある場合またはまだデータがない場合
    const forceUpdate = c.req.query('forceUpdate') === 'true';
    
    if (hasExistingResults && !forceUpdate) {
      // 既存の結果があり、強制更新フラグがない場合はエラーを返す
      return c.json({ error: 'このレースの結果は既に入力されています' }, 409);
    }

    // 既存の結果がある場合は削除
    if (hasExistingResults) {
      await db
        .delete(results)
        .where(eq(results.raceId, validatedRaceResult.data.raceId));
    }

    // 新しい結果を挿入
    await db.insert(results).values(resultData);
    
    return c.json({
      message: hasExistingResults 
        ? 'Results updated successfully' 
        : 'Results inserted successfully',
    })
  } catch (error) {
    console.error('Error inserting results:', error);
    
    // 一意性制約違反の場合は特定のエラーメッセージを返す
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'このレースの結果は既に入力されています' }, 409); // Conflict
    }
    
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

    const validatedBet = BetSchema.safeParse(await c.req.json());
    if (!validatedBet.success) {
      return c.json(
        {
          error: 'Invalid request body',
          details: validatedBet.error.format()
        }, 400);
    }

    const parsedBody = validatedBet.data;
    
    // ユーザーIDを取得または使用
    let userId = getCookie(c, 'userId');
    
    // Cookieにユーザーが存在しない場合は、リクエストボディのユーザーIDを使うか新しく生成する
    if (!userId) {
      console.log('userId not found in cookie, using request body or generating new one');
      userId = parsedBody.userId || generateUserId();
      // 新しいユーザーIDをCookieに保存
      setCookie(c, 'userId', userId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 60 * 60 * 24 * 2, // 2 days
      });
    }

    await db
      .insert(userPredictions)
      .values({
        userId: userId, 
        raceId: parsedBody.raceId,
        firstChoice: parsedBody.firstChoice,
        secondChoice: parsedBody.secondChoice ?? null,
        thirdChoice: parsedBody.thirdChoice ?? null
      });

    return c.json({
      message: 'Bet placed successfully',
      bet: {
        userId: userId, // 実際に使用したuserIdを返す
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

// update a bet (for users)
app.put('/bet/update', async (c) => {
  try {
    const db = createDrizzleClient(c);

    // まず、ベッティングが許可されているか確認
    const status = await getKVValue(c, 'betting_enabled');
    const isBettingEnabled = status === 'true';
    
    if (!isBettingEnabled) {
      return c.json({ error: 'Betting is currently closed' }, 400);
    }

    const BetUpdateSchema = z.object({
      raceId: z.number().int().positive(),
      firstChoice: z.number().int().positive(),  // it should be a horse id
      secondChoice: z.number().int().positive().optional(),
      thirdChoice: z.number().int().positive().optional()
    });

    const validatedBet = BetUpdateSchema.safeParse(await c.req.json());
    if (!validatedBet.success) {
      return c.json(
        {
          error: 'Invalid request body',
          details: validatedBet.error.format()
        }, 400);
    }

    const parsedBody = validatedBet.data;
    
    // Cookieからユーザーを識別する
    const userId = getCookie(c, 'userId');
    
    // ユーザーIDが見つからない場合はエラー
    if (!userId) {
      return c.json({ error: 'User not identified. Cannot update bet.' }, 401);
    }

    // 既存の予想を更新
    await db
      .update(userPredictions)
      .set({
        firstChoice: parsedBody.firstChoice,
        secondChoice: parsedBody.secondChoice ?? null,
        thirdChoice: parsedBody.thirdChoice ?? null
      })
      .where(sql`${userPredictions.userId} = ${userId} AND ${userPredictions.raceId} = ${parsedBody.raceId}`);

    return c.json({
      message: 'Bet updated successfully',
      bet: {
        userId: userId,
        raceId: parsedBody.raceId,
        firstChoice: parsedBody.firstChoice,
        secondChoice: parsedBody.secondChoice,
        thirdChoice: parsedBody.thirdChoice
      }
    });
  } catch (error) {
    console.error('Error updating bet:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
})

// ユーザーの予想を取得するAPI（新規追加）
app.get('/user_prediction/:race_id', async (c) => {
  try {
    const raceId = parseInt(c.req.param('race_id'), 10);
    const userId = getCookie(c, 'userId');
    
    if (!userId) {
      return c.json({ error: 'User not identified' }, 401);
    }
    
    const db = createDrizzleClient(c);
    
    const prediction = await db
      .select()
      .from(userPredictions)
      .where(sql`${userPredictions.userId} = ${userId} AND ${userPredictions.raceId} = ${raceId}`);
    
    if (!prediction || prediction.length === 0) {
      return c.json({ error: 'No prediction found for this race' }, 404);
    }
    
    return c.json({
      message: 'Prediction found',
      bet: prediction[0]
    });
  } catch (error) {
    console.error('Error fetching user prediction:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
})

export default app
