import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AppError, DishCategory } from '../models/types';
import { categoryRepo } from '../repositories/categoryRepo';
import { dishRepo } from '../repositories/dishRepo';
import { useLanguage } from '../i18n/LanguageContext';
import { useSync } from '../context/SyncContext';
import { Button, Loading } from '../components/Ui';
import { SyncBar } from '../components/SyncBar';
import { colors, radius, space } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryList'>;

export default function CategoryListScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { notifyChange, version } = useSync();
  const [cats, setCats] = useState<DishCategory[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([categoryRepo.list(), dishRepo.list()]);
      const m: Record<string, number> = {};
      d.forEach((x) => { m[x.dishCategoryId] = (m[x.dishCategoryId] ?? 0) + 1; });
      setCats(c);
      setCounts(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [version, load]);

  const remove = (c: DishCategory) => {
    Alert.alert(t('confirmDeleteTitle'), t('confirmDeleteCategory', { name: c.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          try {
            await categoryRepo.remove(c.id);
            notifyChange();
            await load();
          } catch (e) {
            Alert.alert(e instanceof AppError ? t(e.key) : t('deleteError')); // loại đang dùng -> không cho xóa
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SyncBar />
      <FlatList
        data={cats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 96 }}
        ListEmptyComponent={<Text style={styles.empty}>{t('noCategories')}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('CategoryForm', { id: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
              <Text style={styles.count}>{t('dishesCount', { n: counts[item.id] ?? 0 })}{item.syncStatus !== 'synced' ? '  •' : ''}</Text>
            </View>
            <Button title={t('delete')} kind="danger" style={{ paddingVertical: 7 }} onPress={() => remove(item)} />
          </Pressable>
        )}
      />
      <View style={styles.fab}>
        <Button title={`+ ${t('addCategory')}`} onPress={() => navigation.navigate('CategoryForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface,
    padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: space.md,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  desc: { color: colors.muted, fontSize: 13, marginTop: 2 },
  count: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  empty: { textAlign: 'center', color: colors.muted, padding: space.xl },
  fab: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg },
});
