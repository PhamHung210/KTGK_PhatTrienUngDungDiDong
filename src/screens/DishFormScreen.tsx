import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AppError, DishCategory, DishInput, FieldErrors, ValidationError } from '../models/types';
import { dishRepo } from '../repositories/dishRepo';
import { categoryRepo } from '../repositories/categoryRepo';
import { useLanguage } from '../i18n/LanguageContext';
import { useSync } from '../context/SyncContext';
import { Badge, Button, Centered, Chip, ErrorText, Loading } from '../components/Ui';
import { SafeImage } from '../components/SafeImage';
import { colors, radius, space } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DishForm'>;

const empty: DishInput = {
  name: '', price: '', preparationTime: '', isAvailable: true, description: '', dishCategoryId: '', images: [],
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      <ErrorText>{error ? t(error) : null}</ErrorText>
    </View>
  );
}

export default function DishFormScreen({ route, navigation }: Props) {
  const id = route.params?.id;
  const { t } = useLanguage();
  const { notifyChange } = useSync();
  const [form, setForm] = useState<DishInput>(empty);
  const [cats, setCats] = useState<DishCategory[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: id ? t('editDish') : t('addDish') });
  }, [navigation, id, t]);

  useEffect(() => {
    (async () => {
      try {
        const c = await categoryRepo.list();
        setCats(c);
        if (id) {
          const d = await dishRepo.getById(id);
          if (!d) { setNotFound(true); return; }
          setForm({
            name: d.name,
            price: String(d.price),
            preparationTime: String(d.preparationTime),
            isAvailable: d.isAvailable,
            description: d.description,
            dishCategoryId: d.dishCategoryId,
            images: d.images.map((i) => ({ id: i.id, imageUrl: i.imageUrl, isThumbnail: i.isThumbnail })),
          });
        } else if (c.length > 0) {
          setForm((f) => ({ ...f, dishCategoryId: c[0].id }));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const patch = (p: Partial<DishInput>) => setForm((f) => ({ ...f, ...p }));

  const addImage = () => {
    const url = newUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) { setErrors((e) => ({ ...e, images: 'errImageUrlInvalid' })); return; }
    setErrors((e) => { const { images, ...rest } = e; return rest; });
    patch({ images: [...form.images, { imageUrl: url, isThumbnail: form.images.length === 0 }] });
    setNewUrl('');
  };

  const setThumb = (index: number) =>
    patch({ images: form.images.map((img, i) => ({ ...img, isThumbnail: i === index })) });

  const removeImage = (index: number) => {
    const next = form.images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((i) => i.isThumbnail)) next[0] = { ...next[0], isThumbnail: true };
    patch({ images: next });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (id) await dishRepo.update(id, form);
      else await dishRepo.create(form);
      notifyChange();
      navigation.goBack();
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.errors);
      else if (e instanceof AppError) Alert.alert(t(e.key));
      else Alert.alert(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (notFound) {
    return (
      <Centered>
        <Text style={{ color: colors.text, marginBottom: space.md }}>{t('dishNotFound')}</Text>
        <Button title={t('back')} onPress={() => navigation.goBack()} />
      </Centered>
    );
  }
  if (cats.length === 0) {
    return (
      <Centered>
        <Text style={{ color: colors.text, marginBottom: space.md, textAlign: 'center' }}>{t('errNeedCategory')}</Text>
        <Button title={t('goToCategories')} onPress={() => navigation.replace('CategoryList')} />
      </Centered>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Field label={t('name')} error={errors.name}>
        <TextInput style={[styles.input, !!errors.name && styles.inputErr]} value={form.name} onChangeText={(v) => patch({ name: v })} />
      </Field>

      <Field label={t('price')} error={errors.price}>
        <TextInput style={[styles.input, !!errors.price && styles.inputErr]} keyboardType="numeric" value={form.price} onChangeText={(v) => patch({ price: v })} />
      </Field>

      <Field label={t('prepTime')} error={errors.preparationTime}>
        <TextInput style={[styles.input, !!errors.preparationTime && styles.inputErr]} keyboardType="numeric" value={form.preparationTime} onChangeText={(v) => patch({ preparationTime: v })} />
      </Field>

      <Field label={t('category')} error={errors.dishCategoryId}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {cats.map((c) => (
            <Chip key={c.id} label={c.name} active={form.dishCategoryId === c.id} onPress={() => patch({ dishCategoryId: c.id })} />
          ))}
        </ScrollView>
      </Field>

      <View style={[styles.rowBetween, { marginBottom: space.md }]}>
        <Text style={styles.label}>{form.isAvailable ? t('available') : t('unavailable')}</Text>
        <Switch value={form.isAvailable} onValueChange={(v) => patch({ isAvailable: v })} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>

      <Field label={t('description')}>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={form.description} onChangeText={(v) => patch({ description: v })} />
      </Field>

      <Text style={styles.label}>{t('images')} ({form.images.length})</Text>
      {form.images.length === 0 && <Text style={{ color: colors.muted, marginBottom: space.sm }}>{t('noImages')}</Text>}
      {form.images.map((img, i) => (
        <View key={img.id ?? `${img.imageUrl}-${i}`} style={styles.imgRow}>
          <SafeImage uri={img.imageUrl} style={styles.thumb} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{img.imageUrl}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              {img.isThumbnail
                ? <Badge label={t('thumbnail')} bg={colors.primary} fg="#fff" />
                : <Button title={t('setThumbnail')} kind="secondary" style={styles.smallBtn} onPress={() => setThumb(i)} />}
              <Button title={t('remove')} kind="danger" style={styles.smallBtn} onPress={() => removeImage(i)} />
            </View>
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <TextInput
          style={[styles.input, { flex: 1 }, !!errors.images && styles.inputErr]}
          placeholder={t('imageUrl')}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          value={newUrl}
          onChangeText={setNewUrl}
        />
        <Button title={t('addImage')} onPress={addImage} style={{ paddingVertical: 10 }} />
      </View>
      <ErrorText>{errors.images ? t(errors.images) : null}</ErrorText>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <Button title={t('cancel')} kind="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        <Button title={t('save')} style={{ flex: 1 }} disabled={saving} onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '600', marginBottom: 6, fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface,
    paddingHorizontal: space.md, paddingVertical: 10, color: colors.text,
  },
  inputErr: { borderColor: colors.danger },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imgRow: {
    flexDirection: 'row', gap: space.md, backgroundColor: colors.surface, padding: space.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: space.sm, alignItems: 'center',
  },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
  smallBtn: { paddingVertical: 5, paddingHorizontal: 10 },
});
