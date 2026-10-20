# BIT247895_FoodManager — Phạm Quang Hưng (BIT247895)

Ứng dụng quản lý món ăn (React Native + Expo + TypeScript), lưu local bằng SQLite và tự đồng bộ với MockAPI.

## Chạy dự án
```bash
npm install
npx expo install --fix      # căn chỉnh phiên bản thư viện đúng SDK Expo bạn đang dùng
npx expo start              # nhấn "a" (Android emulator) hoặc quét QR bằng Expo Go
```

## Cấu hình MockAPI (cho phần nâng cao offline/sync)
1. Vào https://mockapi.io, tạo project, thêm 2 resource tên đúng như sau:
   - `BIT247895_DishCategory`
   - `BIT247895_Dish`
   (không cần khai báo field, app tự gửi các field có tiền tố `BIT247895_`)
2. Mở `src/config.ts`, sửa `MOCKAPI_BASE_URL` thành base URL của bạn, ví dụ `https://abc123.mockapi.io/api/v1`.
3. Android emulator: hãy kiểm tra emulator có Internet. Để demo offline: bật Airplane mode, thêm/sửa món, tắt Airplane mode -> app tự đồng bộ (thanh trạng thái phía trên đổi màu).

Nếu chưa cấu hình URL, app chạy ở chế độ chỉ-local (vẫn đủ phần cơ bản).

## Cấu trúc
```
App.tsx, index.ts
src/
  config.ts              MSSV, họ tên, tiền tố, tên bảng, URL MockAPI
  db/database.ts         schema SQLite (BIT247895_ ở bảng + cột) và seed
  models/types.ts        kiểu dữ liệu, ValidationError/AppError
  repositories/          CRUD + validation (categoryRepo, dishRepo)
  api/mockApi.ts         REST client MockAPI
  sync/syncService.ts    push/pull hai chiều, chống trùng bằng LocalId
  context/               SyncContext (NetInfo, tự đồng bộ), FilterContext (giữ bộ lọc)
  i18n/                  từ điển EN/VI + LanguageContext (mặc định English, lưu AsyncStorage)
  screens/ components/ navigation/ utils/ theme/
```

## Điểm chính đối chiếu đề
- Tiền tố `BIT247895_` ở **tên bảng và mọi cột**: `src/db/database.ts` (+ tên resource/field MockAPI trong `syncService.ts`).
- Validation (Name, Price > 0, PreparationTime > 0, DishCategoryId hợp lệ, tên không trùng trong cùng loại): `repositories/dishRepo.ts`.
- Mỗi món tối đa 1 ảnh `IsThumbnail`: `normalizeThumbnail`, `setThumbnail` trong `dishRepo.ts`.
- Quick/Regular (<= 15 phút) tính tại runtime, không lưu: `utils/helpers.ts`, `components/DishCard.tsx`.
- Không xóa loại món đang dùng: `categoryRepo.remove`.
- Món ngừng bán vẫn hiện trong danh sách, ẩn khi bật "Chỉ món đang bán": `utils/filter.ts`.
- Offline + tự đồng bộ: `context/SyncContext.tsx` (NetInfo) và `sync/syncService.ts`.
