import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, foreignKey, primaryKey } from "drizzle-orm/sqlite-core";

// テーブル
// 馬管理テーブル
// 馬と付加的な情報を管理する。
// horses
// { id: int
//   name: string
//   info: string }
// ユーザ管理テーブル
// ユーザ識別子と投票した馬の情報を管理する。
// users
// { user_id: string<UUID>
//   first_bet: int<horse_id>
//   second_bet: int<horse_id> // nullable 
//   third_bet: int<horse_id> // nullable }
// 結果管理テーブル
// 競争idと競争の結果を入れておく。horse_idとpositionを紐づける
// results
// { race_id: int
//   horse_id: int
//   position: int }

// 馬テーブル
export const horses = sqliteTable('horses', {
    horseId: integer('horse_id').primaryKey(),
    name: text('name').notNull(),
    info: text('info').notNull(),
});
  
// ユーザ予想（race_idごと）
export const userPredictions = sqliteTable('user_predictions', {
  userId: text('user_id').notNull(),
  raceId: integer('race_id').notNull(),
  firstChoice: integer('first_choice').notNull(),
  secondChoice: integer('second_choice'),
  thirdChoice: integer('third_choice'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.raceId] }),
}));

// レース結果
export const results = sqliteTable('results', {
  raceId: integer('race_id').notNull(),
  horseId: integer('horse_id').notNull(),
  rank: integer('rank').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.raceId, table.horseId] }),
}));