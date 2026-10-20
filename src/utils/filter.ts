import { Dish } from '../models/types';
import { parseNumber } from './helpers';

export type SortKey = 'none' | 'priceAsc' | 'priceDesc' | 'timeAsc';

export interface DishFilter {
  search: string;
  categoryId: string | null;
  availableOnly: boolean;
  minPrice: string;
  maxPrice: string;
  sort: SortKey;
}

export const defaultFilter: DishFilter = {
  search: '',
  categoryId: null,
  availableOnly: false,
  minPrice: '',
  maxPrice: '',
  sort: 'none',
};

/** Trả về khóa i18n của lỗi nếu khoảng giá không hợp lệ, ngược lại null. */
export function priceRangeError(f: DishFilter): string | null {
  const hasMin = f.minPrice.trim() !== '';
  const hasMax = f.maxPrice.trim() !== '';
  const min = parseNumber(f.minPrice);
  const max = parseNumber(f.maxPrice);
  if (hasMin && (isNaN(min) || min < 0)) return 'errPriceRange';
  if (hasMax && (isNaN(max) || max < 0)) return 'errPriceRange';
  if (hasMin && hasMax && min > max) return 'errPriceRange';
  return null;
}

export function applyFilter(dishes: Dish[], f: DishFilter): Dish[] {
  const q = f.search.trim().toLowerCase();
  const rangeOk = priceRangeError(f) === null;
  const min = parseNumber(f.minPrice);
  const max = parseNumber(f.maxPrice);

  let out = dishes.filter((d) => {
    if (q && !d.name.toLowerCase().includes(q)) return false;
    if (f.categoryId && d.dishCategoryId !== f.categoryId) return false;
    if (f.availableOnly && !d.isAvailable) return false;
    if (rangeOk) {
      if (!isNaN(min) && d.price < min) return false;
      if (!isNaN(max) && d.price > max) return false;
    }
    return true;
  });

  if (f.sort === 'priceAsc') out = [...out].sort((a, b) => a.price - b.price);
  else if (f.sort === 'priceDesc') out = [...out].sort((a, b) => b.price - a.price);
  else if (f.sort === 'timeAsc') out = [...out].sort((a, b) => a.preparationTime - b.preparationTime);
  return out;
}
