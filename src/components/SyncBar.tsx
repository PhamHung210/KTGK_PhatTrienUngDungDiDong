import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSync } from '../context/SyncContext';
import { useLanguage } from '../i18n/LanguageContext';
import { isSyncConfigured } from '../config';
import { colors } from '../theme/theme';

/** Thanh trạng thái mạng / đồng bộ. */
export function SyncBar() {
  const { online, syncing, syncError, pending } = useSync();
  const { t } = useLanguage();

  let text: string;
  let bg: string;
  if (!isSyncConfigured()) { text = t('syncNotConfigured'); bg = colors.muted; }
  else if (!online) { text = pending > 0 ? `${t('offline')} · ${t('pending', { n: pending })}` : t('offline'); bg = colors.danger; }
  else if (syncing) { text = t('syncing'); bg = colors.warn; }
  else if (syncError) { text = t('syncError'); bg = colors.warn; }
  else if (pending > 0) { text = t('pending', { n: pending }); bg = colors.warn; }
  else { text = `${t('online')} · ${t('allSynced')}`; bg = colors.ok; }

  return (
    <View style={[styles.bar, { backgroundColor: bg }]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 5, paddingHorizontal: 12 },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
