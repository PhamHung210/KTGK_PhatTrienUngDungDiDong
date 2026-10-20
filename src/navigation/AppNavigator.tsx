import React from 'react';
import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useLanguage } from '../i18n/LanguageContext';
import { colors } from '../theme/theme';
import { STUDENT_ID, STUDENT_NAME } from '../config';
import DishListScreen from '../screens/DishListScreen';
import DishDetailScreen from '../screens/DishDetailScreen';
import DishFormScreen from '../screens/DishFormScreen';
import CategoryListScreen from '../screens/CategoryListScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import AboutScreen from '../screens/AboutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { t, lang, toggle } = useLanguage();

  // Nút chuyển ngôn ngữ English <-> Tiếng Việt, hiển thị trên mọi màn hình
  const LangButton = () => (
    <Pressable onPress={toggle} hitSlop={10} style={{ paddingHorizontal: 8 }}>
      <Text style={{ color: '#fff', fontWeight: '700' }}>{lang === 'en' ? 'EN | vi' : 'en | VI'}</Text>
    </Pressable>
  );

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: LangButton,
      }}
    >
      <Stack.Screen name="DishList" component={DishListScreen} options={{ title: `${STUDENT_ID} - ${STUDENT_NAME}` }} />
      <Stack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: t('dishDetail') }} />
      <Stack.Screen name="DishForm" component={DishFormScreen} options={{ title: t('addDish') }} />
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={{ title: t('categories') }} />
      <Stack.Screen name="CategoryForm" component={CategoryFormScreen} options={{ title: t('addCategory') }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: t('about') }} />
    </Stack.Navigator>
  );
}
