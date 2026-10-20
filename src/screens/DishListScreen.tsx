import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Dish, DishCategory } from '../models/types';
import { dishRepo } from '../repositories/dishRepo';
import { categoryRepo } from '../repositories/categoryRepo';
import { useFilter } from '../context/FilterContext';
import { useSync } from '../context/SyncContext';
import { useLanguage } from '../i18n/LanguageContext';
import { applyFilter, priceRangeError, SortKey } from '../utils/filter';
import { DishCard } from '../components/DishCard';
import { SyncBar } from '../components/SyncBar';
import { Button, Chip, ErrorText, Loading, Centered } from '../components/Ui';
import { colors, radius, space } from '../theme/theme';
import { STUDENT_ID, STUDENT_NAME } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'DishList'>;

export default function DishListScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { filter, setFilter, reset } = useFilter();
  const { version } = useSync();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cats, setCats] = useState<DishCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([dishRepo.list(), categoryRepo.list()]);
      setDishes(d);
      setCats(c);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [version, load]);

  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);
  const visible = useMemo(() => applyFilter(dishes, filter), [dishes, filter]);
  const rangeErr = priceRangeError(filter);

  const sorts: { key: SortKey; label: string }[] = [
    { key: 'none', label: t('sortNone') },
    { key: 'priceAsc', label: t('sortPriceAsc') },
    { key: 'priceDesc', label: t('sortPriceDesc') },
    { key: 'timeAsc', label: t('sortTimeAsc') },
  ];

  if (loading) return <Loading />;
  if (error) {
    return (
      <Centered>
        <Text style={{ color: colors.text, marginBottom: space.md }}>{t('loadError')}</Text>
        <Button title={t('retry')} onPress={load} />
      </Centered>
    );
  }

  const header = (
    <View>
      <View style={styles.studentBanner}>
        <Text style={styles.studentText}>{STUDENT_ID} – {STUDENT_NAME}</Text>
      </View>

      <View style={styles.navRow}>
        <Button title={t('categories')} kind="secondary" style={styles.navBtn} onPress={() => navigation.navigate('CategoryList')} />
        <Button title={t('about')} kind="secondary" style={styles.navBtn} onPress={() => navigation.navigate('About')} />
        <Button title={showFilters ? '▲' : '▼'} kind="secondary" style={{ paddingHorizontal: 14 }} onPress={() => setShowFilters((s) => !s)} />
      </View>

      <TextInput
        style={styles.search}
        placeholder={t('searchPlaceholder')}
        placeholderTextColor={colors.muted}
        value={filter.search}
        onChangeText={(v) => setFilter({ search: v })}
      />

      {showFilters && (
        <View style={styles.panel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.sm }}>
            <Chip label={t('allCategories')} active={filter.categoryId === null} onPress={() => setFilter({ categoryId: null })} />
            {cats.map((c) => (
              <Chip key={c.id} label={c.name} active={filter.categoryId === c.id} onPress={() => setFilter({ categoryId: c.id })} />
            ))}
          </ScrollView>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('availableOnly')}</Text>
            <Switch
              value={filter.availableOnly}
              onValueChange={(v) => setFilter({ availableOnly: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <View style={styles.priceRow}>
            <TextInput
              style={[styles.priceInput, !!rangeErr && { borderColor: colors.danger }]}
              placeholder={t('minPrice')}
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={filter.minPrice}
              onChangeText={(v) => setFilter({ minPrice: v })}
            />
            <Text style={{ color: colors.muted }}>–</Text>
            <TextInput
              style={[styles.priceInput, !!rangeErr && { borderColor: colors.danger }]}
              placeholder={t('maxPrice')}
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={filter.maxPrice}
              onChangeText={(v) => setFilter({ maxPrice: v })}
            />
          </View>
          <ErrorText>{rangeErr ? t(rangeErr) : null}</ErrorText>

          <Text style={[styles.label, { marginTop: space.sm, marginBottom: 6 }]}>{t('sortBy')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sorts.map((s) => (
              <Chip key={s.key} label={s.label} active={filter.sort === s.key} onPress={() => setFilter({ sort: s.key })} />
            ))}
          </ScrollView>

          <Button title={t('clearFilters')} kind="secondary" style={{ marginTop: space.md, paddingVertical: 8 }} onPress={reset} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SyncBar />
      <FlatList
        data={visible}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.empty}>{dishes.length === 0 ? t('noDishes') : t('noResults')}</Text>
        }
        renderItem={({ item }) => (
          <DishCard
            dish={item}
            categoryName={catName.get(item.dishCategoryId) ?? '—'}
            onPress={() => navigation.navigate('DishDetail', { id: item.id })}
          />
        )}
        contentContainerStyle={{ paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
      />
      <View style={styles.fab}>
        <Button title={`+ ${t('addDish')}`} onPress={() => navigation.navigate('DishForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  studentBanner: { backgroundColor: colors.primarySoft, paddingVertical: 8, paddingHorizontal: space.lg },
  studentText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  navRow: { flexDirection: 'row', gap: space.sm, padding: space.lg, paddingBottom: space.sm },
  navBtn: { flex: 1, paddingVertical: 9 },
  search: {
    marginHorizontal: space.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: space.md, paddingVertical: 10, color: colors.text,
  },
  panel: {
    margin: space.lg, marginBottom: space.md, padding: space.md, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  priceInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: space.md, paddingVertical: 8, color: colors.text,
  },
  empty: { textAlign: 'center', color: colors.muted, padding: space.xl },
  fab: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg },
});
