import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Dish } from '../models/types';
import { dishRepo } from '../repositories/dishRepo';
import { categoryRepo } from '../repositories/categoryRepo';
import { useLanguage } from '../i18n/LanguageContext';
import { useSync } from '../context/SyncContext';
import { Badge, Button, Centered, ErrorText, Loading } from '../components/Ui';
import { PrepBadge } from '../components/DishCard';
import { SafeImage } from '../components/SafeImage';
import { formatPrice } from '../utils/helpers';
import { colors, radius, space } from '../theme/theme';
import { ValidationError } from '../models/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DishDetail'>;

export default function DishDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { t } = useLanguage();
  const { notifyChange, version } = useSync();
  const [dish, setDish] = useState<Dish | null>(null);
  const [catName, setCatName] = useState('—');
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await dishRepo.getById(id); // Id không tồn tại -> null
      setDish(d);
      if (d) setCatName((await categoryRepo.getById(d.dishCategoryId))?.name ?? '—');
    } catch {
      setDish(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [version, load]);

  const confirmDelete = () => {
    if (!dish) return;
    Alert.alert(t('confirmDeleteTitle'), t('confirmDeleteDish', { name: dish.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          try {
            await dishRepo.remove(dish.id);
            notifyChange();
            navigation.goBack();
          } catch {
            Alert.alert(t('deleteError'));
          }
        },
      },
    ]);
  };

  const setThumb = async (imageId: string) => {
    try { await dishRepo.setThumbnail(id, imageId); notifyChange(); await load(); }
    catch { Alert.alert(t('saveError')); }
  };

  const addImage = async () => {
    try {
      await dishRepo.addImage(id, newUrl);
      setNewUrl(''); setUrlError(null);
      notifyChange(); await load();
    } catch (e) {
      if (e instanceof ValidationError) setUrlError(e.errors.images);
      else Alert.alert(t('saveError'));
    }
  };

  if (loading) return <Loading />;
  if (!dish) {
    return (
      <Centered>
        <Text style={{ color: colors.text, marginBottom: space.md }}>{t('dishNotFound')}</Text>
        <Button title={t('back')} onPress={() => navigation.goBack()} />
      </Centered>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{dish.name}</Text>
      <View style={styles.badges}>
        <PrepBadge minutes={dish.preparationTime} />
        <Badge
          label={dish.isAvailable ? t('available') : t('unavailable')}
          bg={dish.isAvailable ? '#DDF1E6' : colors.dangerSoft}
          fg={dish.isAvailable ? colors.ok : colors.danger}
        />
      </View>

      <Text style={styles.price}>{formatPrice(dish.price)}</Text>
      <Text style={styles.meta}>{t('category')}: {catName}</Text>
      <Text style={styles.meta}>{t('prepTime')}: {dish.preparationTime} {t('minutes')}</Text>
      {!!dish.description && <Text style={styles.desc}>{dish.description}</Text>}

      <Text style={styles.section}>{t('images')} ({dish.images.length})</Text>
      {dish.images.length === 0 ? (
        <Text style={styles.meta}>{t('noImages')}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dish.images.map((img) => (
            <View key={img.id} style={styles.imgBox}>
              <SafeImage uri={img.imageUrl} style={styles.img} />
              {img.isThumbnail ? (
                <View style={{ marginTop: 6 }}><Badge label={t('thumbnail')} bg={colors.primary} fg="#fff" /></View>
              ) : (
                <Button title={t('setThumbnail')} kind="secondary" style={styles.thumbBtn} onPress={() => setThumb(img.id)} />
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="https://…"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          value={newUrl}
          onChangeText={setNewUrl}
        />
        <Button title={t('addImage')} onPress={addImage} style={{ paddingVertical: 10 }} />
      </View>
      <ErrorText>{urlError ? t(urlError) : null}</ErrorText>

      <View style={styles.actions}>
        <Button title={t('edit')} style={{ flex: 1 }} onPress={() => navigation.navigate('DishForm', { id: dish.id })} />
        <Button title={t('delete')} kind="danger" style={{ flex: 1 }} onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  badges: { flexDirection: 'row', gap: space.sm, marginVertical: space.sm },
  price: { fontSize: 22, fontWeight: '800', color: colors.primary, marginVertical: space.xs },
  meta: { color: colors.muted, fontSize: 14, marginTop: 2 },
  desc: { color: colors.text, fontSize: 15, marginTop: space.md, lineHeight: 21 },
  section: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: space.xl, marginBottom: space.sm },
  imgBox: { marginRight: space.md, width: 220 },
  img: { width: 220, height: 150, borderRadius: radius.md },
  thumbBtn: { marginTop: 6, paddingVertical: 6 },
  addRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md, alignItems: 'center' },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface,
    paddingHorizontal: space.md, paddingVertical: 9, color: colors.text,
  },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
});
