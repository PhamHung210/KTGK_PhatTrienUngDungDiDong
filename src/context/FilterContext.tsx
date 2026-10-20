import React, { createContext, useContext, useMemo, useState } from 'react';
import { DishFilter, defaultFilter } from '../utils/filter';

interface Ctx {
  filter: DishFilter;
  setFilter: (patch: Partial<DishFilter>) => void;
  reset: () => void;
}
const FilterContext = createContext<Ctx>(null as unknown as Ctx);

/** Giữ điều kiện tìm kiếm/lọc/sắp xếp khi điều hướng qua lại giữa các màn hình. */
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setState] = useState<DishFilter>(defaultFilter);
  const value = useMemo<Ctx>(() => ({
    filter,
    setFilter: (patch) => setState((f) => ({ ...f, ...patch })),
    reset: () => setState(defaultFilter),
  }), [filter]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
export const useFilter = () => useContext(FilterContext);
