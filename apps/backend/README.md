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
- ユーザ/クライアント用
  - 馬券購入
  - 当選者の確認
  - 競走馬の情報の取得
- その他
  - 当選者の枚挙処理
## API Documentation
### POST /enable_betting
**説明**: 馬券購入を解禁する
### POST /disable_betting
**説明**: 馬券購入を締め切る
### GET /horses
**説明**: 競走馬の情報を取得する
**レスポンス**:
```json
{
  "horses": [
    {
      "id": 1,
      "name": "馬名",
      "additional_info": "追加情報",
    },
    ...
  ]
}
```
### POST /results
**説明**: 競走の結果を登録する。**このAPIが叩かれた場合、当選者枚挙処理が行われる。**
**リクエストボディ**:
```json
{
    "race_id": 1,
    "results": [] // 競走結果の配列
}
```

### GET /winners/{race_id}
**説明**: 当選者を取得する
**レスポンス**:
```json
{
  "winners": [] // 当選者のIDの配列
}
```
もし当選者枚挙処理が行われていない場合はエラー。
## POST /tickets
**説明**: 馬券を購入する
**リクエストボディ**:
```json
{
  "guess": [] // 予想の配列
}
```
**レスポンス**:
```json
{
  "user_id": 1,
}
```
