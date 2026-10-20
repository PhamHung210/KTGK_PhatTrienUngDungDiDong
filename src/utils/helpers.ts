import { QUICK_THRESHOLD_MINUTES } from '../config';

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const formatPrice = (n: number) => {
  const [i, d] = String(n).split('.');
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${d ? '.' + d : ''} ₫`;
};

export const isQuick = (prepMinutes: number) => prepMinutes <= QUICK_THRESHOLD_MINUTES;

export const isValidUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

/** Parse số từ chuỗi người dùng nhập; trả NaN nếu không hợp lệ. */
export const parseNumber = (s: string): number => {
  const t = s.trim().replace(/,/g, '');
  if (t === '') return NaN;
  return Number(t);
};
