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

const SEED_KEY = '@BIT247895_seeded_v_final';

/** Dữ liệu mẫu: 3 loại món + 6 món. Id cố định để nhiều máy seed không tạo bản ghi trùng trên MockAPI. */
export async function seedIfNeeded() {
  const db = await getDb();

  // Dọn dẹp dữ liệu cũ để nạp lại mới
  await db.execAsync(`
    DELETE FROM BIT247895_DishImage;
    DELETE FROM BIT247895_Dish;
    DELETE FROM BIT247895_DishCategory;
  `);

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
      const imageMap: Record<string, [string, string]> = {
  'seed-dish-1': [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRp63hqqANZeXyRQKFP_zSNKqvaT4iSdS0Lya21HtzS0A&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQh9So4QwyEt3Eb7_awMm1NHjjjNrKB1xuL22tMLgumZw&s=10'
  ],
  'seed-dish-2': [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMo3e19Uddx_I9WVoMfn6sRNQRb139oI2wrIxmQ_SlAg&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMGeJMolAva6m5sYprghhyTT_4Mc2MhXOav3ya2Y_BqQ&s=10'
  ],
  'seed-dish-3': [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuHonldaPzSamWuc_K2f6KmAaNdpFKwcpnu0n5Jf50rw&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoBcX9StvA2LfgEurTkyuAyVGmd4hLUTJ8JmzzBuNH3w&s=10'
  ],
  'seed-dish-4': [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQK8gFTSVuX9RKN5UKmRUaBsNRX3_xEUsRjeA3IiPf1uA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0oRkE-fU5c40s6_4tOUsefsN2_XceJxgtIpYhpuRZEg&s=10'
  ],
  'seed-dish-5': [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRH1lzHv653QuTBmJv_l9THqlYKBsb2gH8KF7UskH63tg&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAHxNJtCQP78i5KUvU2y_QDa44I04FEX4p5mtOLl-d6g&s=10'
  ],
  'seed-dish-6': [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSb7hn90pDK_RufMSRUDIkIl4rFOOA1VdZZ5Hb2DWMO4A&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7SBHhLR3OGSSh7dKtR-bLCM8XPtiQ6nK5nsL4LgJQcg&s=10'
  ],
};

const dishImages = imageMap[id] || [
  `https://picsum.photos/seed/${img}1/600/400`,
  `https://picsum.photos/seed/${img}2/600/400`
];

for (let i = 0; i < dishImages.length; i++) {
  await db.runAsync(
    `INSERT INTO BIT247895_DishImage (BIT247895_Id, BIT247895_DishId, BIT247895_ImageUrl, BIT247895_IsThumbnail)
     VALUES (?, ?, ?, ?)`,
    [`${id}-img${i + 1}`, id, dishImages[i], i === 0 ? 1 : 0]
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
