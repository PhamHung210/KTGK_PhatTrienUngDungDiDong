import { getDb } from '../db/database';
import { isSyncConfigured } from '../config';
import {
  AppError, Dish, DishImage, DishInput, FieldErrors, SyncStatus, ValidationError,
} from '../models/types';
import { isValidUrl, parseNumber, uid } from '../utils/helpers';

interface DishRow {
  BIT247895_Id: string;
  BIT247895_Name: string;
  BIT247895_Price: number;
  BIT247895_PreparationTime: number;
  BIT247895_IsAvailable: number;
  BIT247895_Description: string;
  BIT247895_DishCategoryId: string;
  BIT247895_ServerId: string | null;
  BIT247895_SyncStatus: SyncStatus;
  BIT247895_UpdatedAt: number;
}
interface ImageRow {
  BIT247895_Id: string;
  BIT247895_DishId: string;
  BIT247895_ImageUrl: string;
  BIT247895_IsThumbnail: number;
}

const mapImage = (r: ImageRow): DishImage => ({
  id: r.BIT247895_Id,
  dishId: r.BIT247895_DishId,
  imageUrl: r.BIT247895_ImageUrl,
  isThumbnail: r.BIT247895_IsThumbnail === 1,
});

const mapDish = (r: DishRow, images: DishImage[]): Dish => ({
  id: r.BIT247895_Id,
  name: r.BIT247895_Name,
  price: r.BIT247895_Price,
  preparationTime: r.BIT247895_PreparationTime,
  isAvailable: r.BIT247895_IsAvailable === 1,
  description: r.BIT247895_Description,
  dishCategoryId: r.BIT247895_DishCategoryId,
  serverId: r.BIT247895_ServerId,
  syncStatus: r.BIT247895_SyncStatus,
  updatedAt: r.BIT247895_UpdatedAt,
  images,
});

/** Mỗi món có tối đa 1 ảnh đại diện; nếu có ảnh mà chưa chọn thì ảnh đầu tiên là ảnh đại diện. */
function normalizeThumbnail<T extends { isThumbnail: boolean }>(images: T[]): T[] {
  if (images.length === 0) return images;
  const first = images.findIndex((i) => i.isThumbnail);
  const keep = first === -1 ? 0 : first;
  return images.map((img, idx) => ({ ...img, isThumbnail: idx === keep }));
}

/** Validation: Name không rỗng; Price > 0; PreparationTime > 0; DishCategoryId hợp lệ; tên không trùng trong cùng loại. */
async function validate(input: DishInput, excludeId?: string): Promise<FieldErrors> {
  const e: FieldErrors = {};
  const db = await getDb();
  const name = input.name.trim();
  if (!name) e.name = 'errNameRequired';

  const price = parseNumber(input.price);
  if (isNaN(price) || price <= 0) e.price = 'errPriceInvalid';

  const prep = parseNumber(input.preparationTime);
  if (isNaN(prep) || prep <= 0 || !Number.isInteger(prep)) e.preparationTime = 'errPrepInvalid';

  if (!input.dishCategoryId) {
    e.dishCategoryId = 'errCategoryInvalid';
  } else {
    const cat = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM BIT247895_DishCategory WHERE BIT247895_Id = ? AND BIT247895_SyncStatus != 'deleted'`,
      [input.dishCategoryId]
    );
    if (!cat || cat.c === 0) e.dishCategoryId = 'errCategoryInvalid';
  }

  if (!e.name && !e.dishCategoryId) {
    const dup = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM BIT247895_Dish
       WHERE BIT247895_DishCategoryId = ? AND LOWER(BIT247895_Name) = LOWER(?)
         AND BIT247895_SyncStatus != 'deleted' AND BIT247895_Id != ?`,
      [input.dishCategoryId, name, excludeId ?? '']
    );
    if (dup && dup.c > 0) e.name = 'errNameDuplicate';
  }

  if (input.images.some((i) => !isValidUrl(i.imageUrl))) e.images = 'errImageUrlInvalid';
  return e;
}

export const dishRepo = {
  async list(): Promise<Dish[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<DishRow>(
      `SELECT * FROM BIT247895_Dish WHERE BIT247895_SyncStatus != 'deleted' ORDER BY BIT247895_Name COLLATE NOCASE`
    );
    const imgs = await db.getAllAsync<ImageRow>('SELECT * FROM BIT247895_DishImage');
    const byDish = new Map<string, DishImage[]>();
    for (const i of imgs) {
      const arr = byDish.get(i.BIT247895_DishId) ?? [];
      arr.push(mapImage(i));
      byDish.set(i.BIT247895_DishId, arr);
    }
    return rows.map((r) => mapDish(r, byDish.get(r.BIT247895_Id) ?? []));
  },

  async getById(id: string): Promise<Dish | null> {
    const db = await getDb();
    const r = await db.getFirstAsync<DishRow>(
      `SELECT * FROM BIT247895_Dish WHERE BIT247895_Id = ? AND BIT247895_SyncStatus != 'deleted'`,
      [id]
    );
    if (!r) return null;
    const imgs = await db.getAllAsync<ImageRow>(
      'SELECT * FROM BIT247895_DishImage WHERE BIT247895_DishId = ?',
      [id]
    );
    return mapDish(r, imgs.map(mapImage));
  },

  async create(input: DishInput): Promise<string> {
    const errors = await validate(input);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const db = await getDb();
    const id = uid();
    const images = normalizeThumbnail(input.images);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO BIT247895_Dish
         (BIT247895_Id, BIT247895_Name, BIT247895_Price, BIT247895_PreparationTime, BIT247895_IsAvailable,
          BIT247895_Description, BIT247895_DishCategoryId, BIT247895_ServerId, BIT247895_SyncStatus, BIT247895_UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?)`,
        [
          id, input.name.trim(), parseNumber(input.price), parseNumber(input.preparationTime),
          input.isAvailable ? 1 : 0, input.description.trim(), input.dishCategoryId, Date.now(),
        ]
      );
      for (const img of images) {
        await db.runAsync(
          `INSERT INTO BIT247895_DishImage (BIT247895_Id, BIT247895_DishId, BIT247895_ImageUrl, BIT247895_IsThumbnail)
           VALUES (?, ?, ?, ?)`,
          [img.id ?? uid(), id, img.imageUrl.trim(), img.isThumbnail ? 1 : 0]
        );
      }
    });
    return id;
  },

  async update(id: string, input: DishInput): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new AppError('dishNotFound');
    const errors = await validate(input, id);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const db = await getDb();
    const images = normalizeThumbnail(input.images);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE BIT247895_Dish SET
           BIT247895_Name = ?, BIT247895_Price = ?, BIT247895_PreparationTime = ?, BIT247895_IsAvailable = ?,
           BIT247895_Description = ?, BIT247895_DishCategoryId = ?, BIT247895_SyncStatus = 'pending', BIT247895_UpdatedAt = ?
         WHERE BIT247895_Id = ?`,
        [
          input.name.trim(), parseNumber(input.price), parseNumber(input.preparationTime),
          input.isAvailable ? 1 : 0, input.description.trim(), input.dishCategoryId, Date.now(), id,
        ]
      );
      await db.runAsync('DELETE FROM BIT247895_DishImage WHERE BIT247895_DishId = ?', [id]);
      for (const img of images) {
        await db.runAsync(
          `INSERT INTO BIT247895_DishImage (BIT247895_Id, BIT247895_DishId, BIT247895_ImageUrl, BIT247895_IsThumbnail)
           VALUES (?, ?, ?, ?)`,
          [img.id ?? uid(), id, img.imageUrl.trim(), img.isThumbnail ? 1 : 0]
        );
      }
    });
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    const existing = await this.getById(id);
    if (!existing) throw new AppError('dishNotFound');
    if (isSyncConfigured()) {
      await db.runAsync(
        `UPDATE BIT247895_Dish SET BIT247895_SyncStatus = 'deleted', BIT247895_UpdatedAt = ? WHERE BIT247895_Id = ?`,
        [Date.now(), id]
      );
    } else {
      await db.runAsync('DELETE FROM BIT247895_Dish WHERE BIT247895_Id = ?', [id]); // ảnh bị xóa theo (CASCADE)
    }
  },

  /** Đặt ảnh đại diện: đảm bảo chỉ có đúng 1 ảnh IsThumbnail = true. */
  async setThumbnail(dishId: string, imageId: string): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE BIT247895_DishImage SET BIT247895_IsThumbnail = 0 WHERE BIT247895_DishId = ?', [dishId]);
      await db.runAsync(
        'UPDATE BIT247895_DishImage SET BIT247895_IsThumbnail = 1 WHERE BIT247895_Id = ? AND BIT247895_DishId = ?',
        [imageId, dishId]
      );
      await db.runAsync(
        `UPDATE BIT247895_Dish SET BIT247895_SyncStatus = 'pending', BIT247895_UpdatedAt = ? WHERE BIT247895_Id = ?`,
        [Date.now(), dishId]
      );
    });
  },

  async addImage(dishId: string, imageUrl: string): Promise<void> {
    if (!isValidUrl(imageUrl)) throw new ValidationError({ images: 'errImageUrlInvalid' });
    const db = await getDb();
    const count = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) AS c FROM BIT247895_DishImage WHERE BIT247895_DishId = ?', [dishId]
    );
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO BIT247895_DishImage (BIT247895_Id, BIT247895_DishId, BIT247895_ImageUrl, BIT247895_IsThumbnail)
         VALUES (?, ?, ?, ?)`,
        [uid(), dishId, imageUrl.trim(), count && count.c === 0 ? 1 : 0]
      );
      await db.runAsync(
        `UPDATE BIT247895_Dish SET BIT247895_SyncStatus = 'pending', BIT247895_UpdatedAt = ? WHERE BIT247895_Id = ?`,
        [Date.now(), dishId]
      );
    });
  },
};
