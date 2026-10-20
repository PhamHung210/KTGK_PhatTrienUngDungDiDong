import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AppError, FieldErrors, ValidationError } from '../models/types';
import { categoryRepo } from '../repositories/categoryRepo';
import { useLanguage } from '../i18n/LanguageContext';
import { useSync } from '../context/SyncContext';
import { Button, Centered, ErrorText, Loading } from '../components/Ui';
import { colors, radius, space } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryForm'>;

export default function CategoryFormScreen({ route, navigation }: Props) {
  const id = route.params?.id;
  const { t } = useLanguage();
  const { notifyChange } = useSync();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: id ? t('editCategory') : t('addCategory') });
  }, [navigation, id, t]);

  useEffect(() => {
    if (!id) return;
    categoryRepo.getById(id)
      .then((c) => { if (!c) setNotFound(true); else { setName(c.name); setDescription(c.description); } })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    try {
      if (id) await categoryRepo.update(id, { name, description });
      else await categoryRepo.create({ name, description });
      notifyChange();
      navigation.goBack();
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.errors);
      else if (e instanceof AppError) Alert.alert(t(e.key));
      else Alert.alert(t('saveError'));
    }
  };

  if (loading) return <Loading />;
  if (notFound) {
    return (
      <Centered>
        <Text style={{ color: colors.text, marginBottom: space.md }}>{t('categoryNotFound')}</Text>
        <Button title={t('back')} onPress={() => navigation.goBack()} />
      </Centered>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>{t('name')}</Text>
      <TextInput style={[styles.input, !!errors.name && { borderColor: colors.danger }]} value={name} onChangeText={setName} />
      <ErrorText>{errors.name ? t(errors.name) : null}</ErrorText>

      <Text style={[styles.label, { marginTop: space.md }]}>{t('description')}</Text>
      <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={description} onChangeText={setDescription} />

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <Button title={t('cancel')} kind="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        <Button title={t('save')} style={{ flex: 1 }} onPress={save} />
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
});
