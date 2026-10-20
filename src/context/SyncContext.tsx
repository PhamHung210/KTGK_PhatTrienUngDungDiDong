import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { countPending, syncAll } from '../sync/syncService';
import { isSyncConfigured } from '../config';

interface Ctx {
  online: boolean;
  syncing: boolean;
  syncError: boolean;
  pending: number;
  /** Tăng sau mỗi lần dữ liệu thay đổi (do người dùng hoặc do đồng bộ) để màn hình tải lại. */
  version: number;
  /** Gọi sau mỗi thao tác ghi: làm mới UI và tự đồng bộ nếu đang online. */
  notifyChange: () => void;
}
const SyncContext = createContext<Ctx>(null as unknown as Ctx);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [pending, setPending] = useState(0);
  const [version, setVersion] = useState(0);

  const onlineRef = useRef(true);
  const running = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPending = useCallback(async () => {
    try { setPending(await countPending()); } catch { /* bỏ qua */ }
  }, []);

  const runSync = useCallback(async () => {
    if (!isSyncConfigured() || !onlineRef.current) return;
    if (running.current) { again.current = true; return; }
    running.current = true;
    setSyncing(true);
    try {
      await syncAll();
      setSyncError(false);
    } catch {
      setSyncError(true); // dữ liệu vẫn an toàn ở local, sẽ thử lại
    } finally {
      running.current = false;
      setSyncing(false);
      setVersion((v) => v + 1);
      await refreshPending();
      if (again.current) { again.current = false; runSync(); }
    }
  }, [refreshPending]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(runSync, 400);
  }, [runSync]);

  const notifyChange = useCallback(() => {
    setVersion((v) => v + 1);
    refreshPending();
    schedule();
  }, [refreshPending, schedule]);

  // Phát hiện có/mất mạng -> có mạng trở lại thì tự đồng bộ (không cần nút "Đồng bộ")
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      const isOn = !!s.isConnected && s.isInternetReachable !== false;
      const was = onlineRef.current;
      onlineRef.current = isOn;
      setOnline(isOn);
      if (isOn && !was) schedule();
    });
    NetInfo.fetch().then((s) => {
      const isOn = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = isOn;
      setOnline(isOn);
      if (isOn) schedule();
    });
    refreshPending();
    return () => { unsub(); if (timer.current) clearTimeout(timer.current); };
  }, [schedule, refreshPending]);

  // Đồng bộ khi quay lại app, và thử lại định kỳ nếu còn thay đổi chờ đẩy / lần trước lỗi
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') schedule(); });
    const iv = setInterval(() => {
      if (onlineRef.current && isSyncConfigured()) schedule();
    }, 30000);
    return () => { sub.remove(); clearInterval(iv); };
  }, [schedule]);

  const value = useMemo(
    () => ({ online, syncing, syncError, pending, version, notifyChange }),
    [online, syncing, syncError, pending, version, notifyChange]
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export const useSync = () => useContext(SyncContext);
