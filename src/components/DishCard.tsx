import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Dish } from '../models/types';
import { colors, radius, space } from '../theme/theme';
import { formatPrice, isQuick } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from './Ui';
import { SafeImage } from './SafeImage';

export function PrepBadge({ minutes }: { minutes: number }) {
  const { t } = useLanguage();
  return isQuick(minutes)
    ? <Badge label={t('quick')} bg={colors.quick} fg={colors.quickText} />
    : <Badge label={t('regular')} bg={colors.regular} fg={colors.regularText} />;
}

export function DishCard({ dish, categoryName, onPress }: { dish: Dish; categoryName: string; onPress: () => void }) {
  const { t } = useLanguage();
  const thumb = dish.images.find((i) => i.isThumbnail) ?? dish.images[0];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <SafeImage uri={thumb?.imageUrl} style={styles.img} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{dish.name}</Text>
        <Text style={styles.cat} numberOfLines={1}>{categoryName}</Text>
        <Text style={styles.price}>{formatPrice(dish.price)}</Text>
        <View style={styles.row}>
          <PrepBadge minutes={dish.preparationTime} />
          <Text style={styles.time}>{dish.preparationTime} {t('minutes')}</Text>
        </View>
        <Text style={[styles.status, { color: dish.isAvailable ? colors.ok : colors.danger }]}>
          {dish.isAvailable ? t('available') : t('unavailable')}
          {dish.syncStatus !== 'synced' ? '  •' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md,
    marginHorizontal: space.lg, marginBottom: space.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  img: { width: 108, height: 108 },
  body: { flex: 1, padding: space.md, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  cat: { fontSize: 12, color: colors.muted },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  time: { fontSize: 12, color: colors.muted },
  status: { fontSize: 12, fontWeight: '600' },
});
