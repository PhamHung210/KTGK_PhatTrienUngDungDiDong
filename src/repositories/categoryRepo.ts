import { getDb } from '../db/database';
import { isSyncConfigured } from '../config';
import {
  AppError, CategoryInput, DishCategory, FieldErrors, SyncStatus, ValidationError,
} from '../models/types';
import { uid } from '../utils/helpers';

interface Row {
  BIT247895_Id: string;
  BIT247895_Name: string;
  BIT247895_Description: string;
  BIT247895_ServerId: string | null;
  BIT247895_SyncStatus: SyncStatus;
  BIT247895_UpdatedAt: number;
}

const map = (r: Row): DishCategory => ({
  id: r.BIT247895_Id,
  name: r.BIT247895_Name,
  description: r.BIT247895_Description,
  serverId: r.BIT247895_ServerId,
  syncStatus: r.BIT247895_SyncStatus,
  updatedAt: r.BIT247895_UpdatedAt,
});

function validate(input: CategoryInput): FieldErrors {
  const e: FieldErrors = {};
  if (!input.name.trim()) e.name = 'errNameRequired';
  return e;
}

export const categoryRepo = {
  async list(): Promise<DishCategory[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(
      `SELECT * FROM BIT247895_DishCategory WHERE BIT247895_SyncStatus != 'deleted'
       ORDER BY BIT247895_Name COLLATE NOCASE`
    );
    return rows.map(map);
  },

  async getById(id: string): Promise<DishCategory | null> {
    const db = await getDb();
    const r = await db.getFirstAsync<Row>(
      `SELECT * FROM BIT247895_DishCategory WHERE BIT247895_Id = ? AND BIT247895_SyncStatus != 'deleted'`,
      [id]
    );
    return r ? map(r) : null;
  },

  async create(input: CategoryInput): Promise<string> {
    const errors = validate(input);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const db = await getDb();
    const id = uid();
    await db.runAsync(
      `INSERT INTO BIT247895_DishCategory
       (BIT247895_Id, BIT247895_Name, BIT247895_Description, BIT247895_ServerId, BIT247895_SyncStatus, BIT247895_UpdatedAt)
       VALUES (?, ?, ?, NULL, 'pending', ?)`,
      [id, input.name.trim(), input.description.trim(), Date.now()]
    );
    return id;
  },

  async update(id: string, input: CategoryInput): Promise<void> {
    const errors = validate(input);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const db = await getDb();
    const res = await db.runAsync(
      `UPDATE BIT247895_DishCategory
       SET BIT247895_Name = ?, BIT247895_Description = ?, BIT247895_SyncStatus = 'pending', BIT247895_UpdatedAt = ?
       WHERE BIT247895_Id = ? AND BIT247895_SyncStatus != 'deleted'`,
      [input.name.trim(), input.description.trim(), Date.now(), id]
    );
    if (res.changes === 0) throw new AppError('categoryNotFound');
  },

  /** Không cho xóa loại món đang được món ăn sử dụng. */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    const used = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM BIT247895_Dish
       WHERE BIT247895_DishCategoryId = ? AND BIT247895_SyncStatus != 'deleted'`,
      [id]
    );
    if (used && used.c > 0) throw new AppError('errCategoryInUse');
    if (isSyncConfigured()) {
      // tombstone để lần đồng bộ sau xóa trên MockAPI
      await db.runAsync(
        `UPDATE BIT247895_DishCategory SET BIT247895_SyncStatus = 'deleted', BIT247895_UpdatedAt = ? WHERE BIT247895_Id = ?`,
        [Date.now(), id]
      );
    } else {
      await db.runAsync('DELETE FROM BIT247895_DishCategory WHERE BIT247895_Id = ?', [id]);
    }
  },
};
