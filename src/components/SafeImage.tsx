import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import { useLanguage } from '../i18n/LanguageContext';

/** Ảnh có placeholder khi URL rỗng / không tải được (ví dụ đang offline). */
export function SafeImage({ uri, style }: { uri?: string | null; style: StyleProp<ImageStyle> }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[style as any, { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{t('imageUnavailable')}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} onError={() => setFailed(true)} resizeMode="cover" />;
}
