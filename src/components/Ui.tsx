import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, space } from '../theme/theme';

export function Button({
  title, onPress, kind = 'primary', style, disabled,
}: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; style?: ViewStyle; disabled?: boolean;
}) {
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : colors.surface;
  const fg = kind === 'secondary' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        kind === 'secondary' && { borderWidth: 1, borderColor: colors.primary },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function Loading() {
  return <Centered><ActivityIndicator size="large" color={colors.primary} /></Centered>;
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: space.lg, borderRadius: radius.md, alignItems: 'center' },
  btnText: { fontWeight: '600', fontSize: 15 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface, marginRight: space.sm,
  },
  chipText: { color: colors.text, fontSize: 13 },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.sm, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
