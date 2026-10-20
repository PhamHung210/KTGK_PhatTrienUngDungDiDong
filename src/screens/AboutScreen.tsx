import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { SyncBar } from '../components/SyncBar';
import { PROJECT_NAME, STUDENT_ID, STUDENT_NAME } from '../config';
import { colors, radius, space } from '../theme/theme';

export default function AboutScreen() {
  const { t } = useLanguage();
  const rows: [string, string][] = [
    [t('studentId'), STUDENT_ID],
    [t('studentName'), STUDENT_NAME],
    [t('project'), PROJECT_NAME],
    [t('storage'), t('storageValue')],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SyncBar />
      <View style={styles.card}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.k}>{k}</Text>
            <Text style={styles.v}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: space.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  row: { padding: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  k: { color: colors.muted, fontSize: 12 },
  v: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
});
