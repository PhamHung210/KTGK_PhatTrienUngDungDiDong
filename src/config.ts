/**
 * Cấu hình trung tâm của dự án BIT247895_FoodManager.
 * Mọi thông tin cá nhân (MSSV, họ tên) và tiền tố Table/Field đều lấy từ đây.
 */
export const STUDENT_ID = 'BIT247895';
export const STUDENT_NAME = 'Phạm Quang Hưng';
export const PROJECT_NAME = `${STUDENT_ID}_FoodManager`;

/** Tiền tố bắt buộc cho tên bảng và tên trường: {MSSV}_ */
export const PREFIX = `${STUDENT_ID}_`;

/** Tên bảng SQLite và tên resource MockAPI (đều có tiền tố MSSV). */
export const TABLE_CATEGORY = `${PREFIX}DishCategory`;
export const TABLE_DISH = `${PREFIX}Dish`;
export const TABLE_DISH_IMAGE = `${PREFIX}DishImage`;
export const DB_NAME = `${PROJECT_NAME}.db`;

/**
 * Base URL của MockAPI, ví dụ: https://6710abc123.mockapi.io/api/v1
 * Cần tạo 2 resource trên MockAPI: BIT247895_DishCategory và BIT247895_Dish.
 * Nếu để nguyên giá trị YOUR_PROJECT_ID, app chạy ở chế độ chỉ-local (không đồng bộ).
 */
export const MOCKAPI_BASE_URL = 'https://YOUR_PROJECT_ID.mockapi.io/api/v1';

export const isSyncConfigured = () => !MOCKAPI_BASE_URL.includes('YOUR_PROJECT_ID');

/** Món có PreparationTime <= ngưỡng này được coi là "Quick / Nhanh". */
export const QUICK_THRESHOLD_MINUTES = 15;

export const RES_CATEGORY = TABLE_CATEGORY;
export const RES_DISH = TABLE_DISH;
