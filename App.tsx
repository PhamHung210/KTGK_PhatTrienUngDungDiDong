import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/db/database';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { FilterProvider } from './src/context/FilterContext';
import { SyncProvider } from './src/context/SyncContext';
import AppNavigator from './src/navigation/AppNavigator';
import { Loading } from './src/components/Ui';
import { PROJECT_NAME } from './src/config';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase().then(() => setReady(true)).catch((e) => setError(String(e?.message ?? e)));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <LanguageProvider>
        {error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontWeight: '700' }}>{PROJECT_NAME}</Text>
            <Text style={{ marginTop: 8 }}>{error}</Text>
          </View>
        ) : !ready ? (
          <Loading />
        ) : (
          <FilterProvider>
            <SyncProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </SyncProvider>
          </FilterProvider>
        )}
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
