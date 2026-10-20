export type SyncStatus = 'synced' | 'pending' | 'deleted';

export interface DishCategory {
  id: string;
  name: string;
  description: string;
  serverId: string | null;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface DishImage {
  id: string;
  dishId: string;
  imageUrl: string;
  isThumbnail: boolean;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  preparationTime: number;
  isAvailable: boolean;
  description: string;
  dishCategoryId: string;
  serverId: string | null;
  syncStatus: SyncStatus;
  updatedAt: number;
  images: DishImage[];
}

/** Dữ liệu form (giá trị nhập dạng chuỗi để validate được input sai). */
export interface DishInput {
  name: string;
  price: string;
  preparationTime: string;
  isAvailable: boolean;
  description: string;
  dishCategoryId: string;
  images: { id?: string; imageUrl: string; isThumbnail: boolean }[];
}

export interface CategoryInput {
  name: string;
  description: string;
}

/** field -> khóa i18n của thông báo lỗi */
export type FieldErrors = Record<string, string>;

export class ValidationError extends Error {
  errors: FieldErrors;
  constructor(errors: FieldErrors) {
    super('ValidationError');
    this.errors = errors;
  }
}

/** Lỗi nghiệp vụ, message là khóa i18n. */
export class AppError extends Error {
  key: string;
  constructor(key: string) {
    super(key);
    this.key = key;
  }
}
