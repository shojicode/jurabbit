# Jurabbit Backend
v0.1.0

## 環境
|ジャンル|プロダクト名|
|---|---|
|言語|TypeScript|
|フレームワーク|Hono|
|コンピューティング|Cloudflare Workers|
|データベース|Cloudflare D1|
|CI/CD|GitHub Actions|

## 機能
- オペレータ用
  - 馬券購入の解禁・締切
  - 競走結果の登録
  - レースIDの設定
- ユーザ/クライアント用
  - 馬券購入
  - 結果の確認
  - 現在のレースIDの取得
- その他
  - 馬券購入状態の管理

## API Documentation

### GET /current_race
**説明**: 現在のレースIDを取得する
**レスポンス**:
```json
{
  "currentRaceId": "1"
}
```

### POST /current_race
**説明**: 現在のレースIDを設定する（オペレータ用）
**リクエストボディ**:
```json
{
  "raceId": 1
}
```
**レスポンス**:
```json
{
  "message": "Current race id set successfully"
}
```

### POST /enable_betting
**説明**: 馬券購入を解禁する
**レスポンス**:
```json
{
  "message": "Betting enabled"
}
```

### POST /disable_betting
**説明**: 馬券購入を締め切る
**レスポンス**:
```json
{
  "message": "Betting disabled"
}
```

### GET /betting_status
**説明**: 馬券購入の状態を取得する
**レスポンス**:
```json
{
  "betting_enabled": true,
  "status": "enabled"
}
```

### POST /bet
**説明**: 馬券を購入する
**リクエストボディ**:
```json
{
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // 省略可。省略時は新規生成
  "raceId": 1,
  "firstChoice": 1, // 恐竜ID
  "secondChoice": 2, // 省略可
  "thirdChoice": 3   // 省略可
}
```
**レスポンス**:
```json
{
  "message": "Bet placed successfully",
  "bet": {
    "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "raceId": 1,
    "firstChoice": 1,
    "secondChoice": 2,
    "thirdChoice": 3
  }
}
```

### POST /results
**説明**: 競走の結果を登録する。
**リクエストボディ**:
```json
{
  "raceId": 1,
  "results": [
    {
      "horse_id": 1,
      "rank": 1
    },
    {
      "horse_id": 2,
      "rank": 2
    },
    // ...
  ]
}
```
**レスポンス**:
```json
{
  "message": "Results inserted successfully"
}
```

### GET /results/:id
**説明**: 指定されたレースIDの結果を取得する
**レスポンス**:
```json
[
  {
    "horseId": 1,
    "rank": 1
  },
  {
    "horseId": 2,
    "rank": 2
  },
  // ...
]
