import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DB_NAME } from '../config';

/**
 * SQLite local database.
 * Tên bảng và TẤT CẢ tên cột đều có tiền tố BIT247895_ theo yêu cầu đề bài.
 *
 *  BIT247895_DishCategory (1) ──< (N) BIT247895_Dish (1) ──< (N) BIT247895_DishImage
 *
 * Cột kỹ thuật phục vụ đồng bộ:
 *  - BIT247895_Id          : UUID tạo tại máy, dùng làm khóa chung giữa local và MockAPI (chống trùng bản ghi)
 *  - BIT247895_ServerId    : id do MockAPI cấp
 *  - BIT247895_SyncStatus  : 'synced' | 'pending' | 'deleted'
 *  - BIT247895_UpdatedAt   : thời điểm sửa cuối (last-write-wins)
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

async function init() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS BIT247895_DishCategory (
      BIT247895_Id          TEXT PRIMARY KEY NOT NULL,
      BIT247895_Name        TEXT NOT NULL,
      BIT247895_Description TEXT NOT NULL DEFAULT '',
      BIT247895_ServerId    TEXT,
      BIT247895_SyncStatus  TEXT NOT NULL DEFAULT 'pending',
      BIT247895_UpdatedAt   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS BIT247895_Dish (
      BIT247895_Id              TEXT PRIMARY KEY NOT NULL,
      BIT247895_Name            TEXT NOT NULL,
      BIT247895_Price           REAL NOT NULL,
      BIT247895_PreparationTime INTEGER NOT NULL,
      BIT247895_IsAvailable     INTEGER NOT NULL DEFAULT 1,
      BIT247895_Description     TEXT NOT NULL DEFAULT '',
      BIT247895_DishCategoryId  TEXT NOT NULL,
      BIT247895_ServerId        TEXT,
      BIT247895_SyncStatus      TEXT NOT NULL DEFAULT 'pending',
      BIT247895_UpdatedAt       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS BIT247895_DishImage (
      BIT247895_Id          TEXT PRIMARY KEY NOT NULL,
      BIT247895_DishId      TEXT NOT NULL,
      BIT247895_ImageUrl    TEXT NOT NULL,
      BIT247895_IsThumbnail INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (BIT247895_DishId) REFERENCES BIT247895_Dish(BIT247895_Id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_BIT247895_Dish_Category ON BIT247895_Dish(BIT247895_DishCategoryId);
    CREATE INDEX IF NOT EXISTS idx_BIT247895_Image_Dish ON BIT247895_DishImage(BIT247895_DishId);
  `);
  return db;
}

const SEED_KEY = '@BIT247895_seeded_v1';

/** Dữ liệu mẫu: 3 loại món + 6 món. Id cố định để nhiều máy seed không tạo bản ghi trùng trên MockAPI. */
export async function seedIfNeeded() {
  const db = await getDb();
  if (await AsyncStorage.getItem(SEED_KEY)) return;
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM BIT247895_DishCategory');
  if (row && row.c > 0) {
    await AsyncStorage.setItem(SEED_KEY, '1');
    return;
  }
  const now = Date.now();
  const cats = [
    ['seed-cat-main', 'Main dishes', 'Rice, noodle and soup dishes'],
    ['seed-cat-drink', 'Drinks', 'Coffee, tea and refreshments'],
    ['seed-cat-dessert', 'Desserts', 'Sweet treats'],
  ];
  const dishes = [
    ['seed-dish-1', 'Phở bò', 55000, 20, 1, 'Beef noodle soup with herbs', 'seed-cat-main', 'pho'],
    ['seed-dish-2', 'Bún chả', 50000, 18, 1, 'Grilled pork with rice vermicelli', 'seed-cat-main', 'buncha'],
    ['seed-dish-3', 'Bánh mì', 25000, 8, 1, 'Vietnamese baguette sandwich', 'seed-cat-main', 'banhmi'],
    ['seed-dish-4', 'Cà phê sữa đá', 28000, 5, 1, 'Iced coffee with condensed milk', 'seed-cat-drink', 'coffee'],
    ['seed-dish-5', 'Trà đào', 32000, 10, 0, 'Peach tea (currently unavailable)', 'seed-cat-drink', 'peachtea'],
    ['seed-dish-6', 'Chè ba màu', 22000, 12, 1, 'Three-colour sweet dessert', 'seed-cat-dessert', 'che'],
  ] as const;

  await db.withTransactionAsync(async () => {
    for (const [id, name, desc] of cats) {
      await db.runAsync(
        `INSERT INTO BIT247895_DishCategory
         (BIT247895_Id, BIT247895_Name, BIT247895_Description, BIT247895_ServerId, BIT247895_SyncStatus, BIT247895_UpdatedAt)
         VALUES (?, ?, ?, NULL, 'pending', ?)`,
        [id, name, desc, now]
      );
    }
    for (const [id, name, price, prep, avail, desc, cat, img] of dishes) {
      await db.runAsync(
        `INSERT INTO BIT247895_Dish
         (BIT247895_Id, BIT247895_Name, BIT247895_Price, BIT247895_PreparationTime, BIT247895_IsAvailable,
          BIT247895_Description, BIT247895_DishCategoryId, BIT247895_ServerId, BIT247895_SyncStatus, BIT247895_UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?)`,
        [id, name, price, prep, avail, desc, cat, now]
      );
      for (let i = 1; i <= 2; i++) {
        await db.runAsync(
          `INSERT INTO BIT247895_DishImage (BIT247895_Id, BIT247895_DishId, BIT247895_ImageUrl, BIT247895_IsThumbnail)
           VALUES (?, ?, ?, ?)`,
          [`${id}-img${i}`, id, `https://picsum.photos/seed/${img}${i}/600/400`, i === 1 ? 1 : 0]
        );
      }
    }
  });
  await AsyncStorage.setItem(SEED_KEY, '1');
}

export async function initDatabase() {
  await getDb();
  await seedIfNeeded();
}
