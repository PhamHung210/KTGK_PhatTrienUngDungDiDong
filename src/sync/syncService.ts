import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../db/database';
import { mockApi, ApiError } from '../api/mockApi';
import { isSyncConfigured, RES_CATEGORY, RES_DISH } from '../config';
import { SyncStatus } from '../models/types';

/**
 * ĐỒNG BỘ HAI CHIỀU local (SQLite) <-> MockAPI
 *
 * Quy trình mỗi lần chạy:
 *  1. PUSH loại món  : bản ghi pending -> POST/PUT; bản ghi deleted -> DELETE
 *  2. PUSH món ăn    : tương tự (đẩy loại món trước để khóa ngoại hợp lệ)
 *  3. PULL loại món, PULL món ăn: lấy bản ghi mới/sửa từ MockAPI về local
 *
 * Chống trùng bản ghi: mỗi bản ghi có UUID (BIT247895_Id) được lưu lên MockAPI
 * dưới trường BIT247895_LocalId. Trước khi POST luôn đối chiếu theo LocalId
 * nên dù POST bị đứt mạng giữa chừng, lần sau chỉ PUT chứ không tạo mới.
 * Xung đột: "ghi sau cùng thắng" dựa trên BIT247895_UpdatedAt.
 */

interface RemoteCategory {
  id: string;
  BIT247895_LocalId?: string;
  BIT247895_Name: string;
  BIT247895_Description?: string;
  BIT247895_UpdatedAt?: number;
}
interface RemoteImage { BIT247895_ImageUrl: string; BIT247895_IsThumbnail: boolean }
interface RemoteDish {
  id: string;
  BIT247895_LocalId?: string;
  BIT247895_Name: string;
  BIT247895_Price: number;
  BIT247895_PreparationTime: number;
  BIT247895_IsAvailable: boolean;
  BIT247895_Description?: string;
  BIT247895_DishCategoryId: string;
  BIT247895_DishImage?: RemoteImage[];
  BIT247895_UpdatedAt?: number;
}

interface LocalRow {
  BIT247895_Id: string;
  BIT247895_ServerId: string | null;
  BIT247895_SyncStatus: SyncStatus;
  BIT247895_UpdatedAt: number;
  [k: string]: any;
}

const is404 = (e: unknown) => e instanceof ApiError && e.status === 404;
const localIdOf = (r: { id: string; BIT247895_LocalId?: string }) => r.BIT247895_LocalId || `srv-${r.id}`;

/** Đẩy các bản ghi pending/deleted của một bảng lên MockAPI. */
async function push<R extends { id: string; BIT247895_LocalId?: string }>(
  db: SQLiteDatabase,
  table: string,
  resource: string,
  toRemote: (row: LocalRow) => Promise<object>
) {
  const remote = await mockApi.list<R>(resource);
  const byLocalId = new Map<string, R>();
  remote.forEach((r) => byLocalId.set(localIdOf(r), r));

  const rows = await db.getAllAsync<LocalRow>(`SELECT * FROM ${table} WHERE BIT247895_SyncStatus != 'synced'`);
  for (const row of rows) {
    const knownRemoteId = row.BIT247895_ServerId ?? byLocalId.get(row.BIT247895_Id)?.id ?? null;

    if (row.BIT247895_SyncStatus === 'deleted') {
      if (knownRemoteId) {
        try { await mockApi.remove(resource, knownRemoteId); } catch (e) { if (!is404(e)) throw e; }
      }
      await db.runAsync(`DELETE FROM ${table} WHERE BIT247895_Id = ?`, [row.BIT247895_Id]);
      continue;
    }

    const body = await toRemote(row);
    let saved: { id: string };
    if (knownRemoteId) {
      try {
        saved = await mockApi.update<{ id: string }>(resource, knownRemoteId, body);
      } catch (e) {
        if (!is404(e)) throw e;
        saved = await mockApi.create<{ id: string }>(resource, body); // bản ghi đã bị xóa trên server -> tạo lại
      }
    } else {
      saved = await mockApi.create<{ id: string }>(resource, body);
    }
    await db.runAsync(`UPDATE ${table} SET BIT247895_ServerId = ? WHERE BIT247895_Id = ?`, [saved.id, row.BIT247895_Id]);
    // Chỉ đánh dấu synced nếu trong lúc đồng bộ người dùng chưa sửa tiếp bản ghi này
    await db.runAsync(
      `UPDATE ${table} SET BIT247895_SyncStatus = 'synced' WHERE BIT247895_Id = ? AND BIT247895_UpdatedAt = ?`,
      [row.BIT247895_Id, row.BIT247895_UpdatedAt]
    );
  }
}

async function pushCategories(db: SQLiteDatabase) {
  await push<RemoteCategory>(db, 'BIT247895_DishCategory', RES_CATEGORY, async (r) => ({
    BIT247895_LocalId: r.BIT247895_Id,
    BIT247895_Name: r.BIT247895_Name,
    BIT247895_Description: r.BIT247895_Description,
    BIT247895_UpdatedAt: r.BIT247895_UpdatedAt,
  }));
}

async function pushDishes(db: SQLiteDatabase) {
  await push<RemoteDish>(db, 'BIT247895_Dish', RES_DISH, async (r) => {
    const imgs = await db.getAllAsync<{ BIT247895_ImageUrl: string; BIT247895_IsThumbnail: number }>(
      'SELECT * FROM BIT247895_DishImage WHERE BIT247895_DishId = ?',
      [r.BIT247895_Id]
    );
    return {
      BIT247895_LocalId: r.BIT247895_Id,
      BIT247895_Name: r.BIT247895_Name,
      BIT247895_Price: r.BIT247895_Price,
      BIT247895_PreparationTime: r.BIT247895_PreparationTime,
      BIT247895_IsAvailable: r.BIT247895_IsAvailable === 1,
      BIT247895_Description: r.BIT247895_Description,
      BIT247895_DishCategoryId: r.BIT247895_DishCategoryId, // = LocalId của loại món
      BIT247895_DishImage: imgs.map((i) => ({
        BIT247895_ImageUrl: i.BIT247895_ImageUrl,
        BIT247895_IsThumbnail: i.BIT247895_IsThumbnail === 1,
      })),
      BIT247895_UpdatedAt: r.BIT247895_UpdatedAt,
    };
  });
}

async function pullCategories(db: SQLiteDatabase) {
  const remote = await mockApi.list<RemoteCategory>(RES_CATEGORY);
  const local = await db.getAllAsync<LocalRow>('SELECT * FROM BIT247895_DishCategory');
  const byId = new Map(local.map((r) => [r.BIT247895_Id, r]));
  const remoteServerIds = new Set(remote.map((r) => r.id));

  for (const r of remote) {
    const lid = localIdOf(r);
    const row = byId.get(lid);
    const remoteUpdated = r.BIT247895_UpdatedAt ?? 0;
    if (!row) {
      await db.runAsync(
        `INSERT INTO BIT247895_DishCategory
         (BIT247895_Id, BIT247895_Name, BIT247895_Description, BIT247895_ServerId, BIT247895_SyncStatus, BIT247895_UpdatedAt)
         VALUES (?, ?, ?, ?, 'synced', ?)`,
        [lid, r.BIT247895_Name, r.BIT247895_Description ?? '', r.id, remoteUpdated || Date.now()]
      );
      continue;
    }
    if (row.BIT247895_SyncStatus !== 'synced') continue; // thay đổi local chưa đẩy -> local thắng
    if (row.BIT247895_ServerId !== r.id) {
      await db.runAsync('UPDATE BIT247895_DishCategory SET BIT247895_ServerId = ? WHERE BIT247895_Id = ?', [r.id, lid]);
    }
    if (remoteUpdated > row.BIT247895_UpdatedAt) {
      await db.runAsync(
        `UPDATE BIT247895_DishCategory SET BIT247895_Name = ?, BIT247895_Description = ?, BIT247895_UpdatedAt = ?
         WHERE BIT247895_Id = ?`,
        [r.BIT247895_Name, r.BIT247895_Description ?? '', remoteUpdated, lid]
      );
    }
  }
  // Bản ghi đã xóa trên server (và local không còn thay đổi chờ đẩy) -> xóa local nếu không có món đang dùng
  for (const row of local) {
    if (row.BIT247895_SyncStatus === 'synced' && row.BIT247895_ServerId && !remoteServerIds.has(row.BIT247895_ServerId)) {
      const used = await db.getFirstAsync<{ c: number }>(
        'SELECT COUNT(*) AS c FROM BIT247895_Dish WHERE BIT247895_DishCategoryId = ?', [row.BIT247895_Id]
      );
      if (!used || used.c === 0) {
        await db.runAsync('DELETE FROM BIT247895_DishCategory WHERE BIT247895_Id = ?', [row.BIT247895_Id]);
      } else {
        await db.runAsync(
          `UPDATE BIT247895_DishCategory SET BIT247895_ServerId = NULL, BIT247895_SyncStatus = 'pending' WHERE BIT247895_Id = ?`,
          [row.BIT247895_Id]
        );
      }
    }
  }
}

async function replaceImages(db: SQLiteDatabase, dishId: string, imgs: RemoteImage[]) {
  await db.runAsync('DELETE FROM BIT247895_DishImage WHERE BIT247895_DishId = ?', [dishId]);
  let i = 0;
  for (const img of imgs) {
    await db.runAsync(
      `INSERT INTO BIT247895_DishImage (BIT247895_Id, BIT247895_DishId, BIT247895_ImageUrl, BIT247895_IsThumbnail)
       VALUES (?, ?, ?, ?)`,
      [`${dishId}-img-${i++}`, dishId, img.BIT247895_ImageUrl, img.BIT247895_IsThumbnail ? 1 : 0]
    );
  }
}

async function pullDishes(db: SQLiteDatabase) {
  const remote = await mockApi.list<RemoteDish>(RES_DISH);
  const local = await db.getAllAsync<LocalRow>('SELECT * FROM BIT247895_Dish');
  const byId = new Map(local.map((r) => [r.BIT247895_Id, r]));
  const cats = await db.getAllAsync<{ BIT247895_Id: string }>('SELECT BIT247895_Id FROM BIT247895_DishCategory');
  const catIds = new Set(cats.map((c) => c.BIT247895_Id));
  const remoteServerIds = new Set(remote.map((r) => r.id));

  for (const r of remote) {
    const lid = localIdOf(r);
    const row = byId.get(lid);
    const remoteUpdated = r.BIT247895_UpdatedAt ?? 0;
    const imgs = r.BIT247895_DishImage ?? [];
    if (!row) {
      if (!catIds.has(r.BIT247895_DishCategoryId)) continue; // loại món không tồn tại -> bỏ qua
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO BIT247895_Dish
           (BIT247895_Id, BIT247895_Name, BIT247895_Price, BIT247895_PreparationTime, BIT247895_IsAvailable,
            BIT247895_Description, BIT247895_DishCategoryId, BIT247895_ServerId, BIT247895_SyncStatus, BIT247895_UpdatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [
            lid, r.BIT247895_Name, r.BIT247895_Price, r.BIT247895_PreparationTime,
            r.BIT247895_IsAvailable ? 1 : 0, r.BIT247895_Description ?? '', r.BIT247895_DishCategoryId,
            r.id, remoteUpdated || Date.now(),
          ]
        );
        await replaceImages(db, lid, imgs);
      });
      continue;
    }
    if (row.BIT247895_SyncStatus !== 'synced') continue;
    if (row.BIT247895_ServerId !== r.id) {
      await db.runAsync('UPDATE BIT247895_Dish SET BIT247895_ServerId = ? WHERE BIT247895_Id = ?', [r.id, lid]);
    }
    if (remoteUpdated > row.BIT247895_UpdatedAt && catIds.has(r.BIT247895_DishCategoryId)) {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE BIT247895_Dish SET BIT247895_Name = ?, BIT247895_Price = ?, BIT247895_PreparationTime = ?,
             BIT247895_IsAvailable = ?, BIT247895_Description = ?, BIT247895_DishCategoryId = ?, BIT247895_UpdatedAt = ?
           WHERE BIT247895_Id = ?`,
          [
            r.BIT247895_Name, r.BIT247895_Price, r.BIT247895_PreparationTime, r.BIT247895_IsAvailable ? 1 : 0,
            r.BIT247895_Description ?? '', r.BIT247895_DishCategoryId, remoteUpdated, lid,
          ]
        );
        await replaceImages(db, lid, imgs);
      });
    }
  }
  for (const row of local) {
    if (row.BIT247895_SyncStatus === 'synced' && row.BIT247895_ServerId && !remoteServerIds.has(row.BIT247895_ServerId)) {
      await db.runAsync('DELETE FROM BIT247895_Dish WHERE BIT247895_Id = ?', [row.BIT247895_Id]);
    }
  }
}

export async function countPending(): Promise<number> {
  const db = await getDb();
  const a = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM BIT247895_DishCategory WHERE BIT247895_SyncStatus != 'synced'`);
  const b = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM BIT247895_Dish WHERE BIT247895_SyncStatus != 'synced'`);
  return (a?.c ?? 0) + (b?.c ?? 0);
}

/** Chạy một vòng đồng bộ đầy đủ. Ném lỗi nếu mất mạng / MockAPI lỗi (các thay đổi vẫn nằm an toàn ở local). */
export async function syncAll(): Promise<void> {
  if (!isSyncConfigured()) return;
  const db = await getDb();
  await pushCategories(db);
  await pushDishes(db);
  await pullCategories(db);
  await pullDishes(db);
}
