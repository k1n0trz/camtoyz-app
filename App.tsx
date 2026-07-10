import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/routes';
import { lightTheme } from '@/theme';
import SplashScreen from '@/screens/SplashScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import ScanScreen from '@/screens/ScanScreen';
import { ConnectionStatusOverlay } from '@/components/ConnectionStatusOverlay';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: lightTheme.colors.bg },
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            {/* Codex: registrar aquí el resto de rutas de src/navigation/routes.ts
                a medida que se construyen (Scan, PatternsAll, MultiDevice, GestureControl,
                SoundControl, MusicControl, Room*, SettingsDevice). */}
          </Stack.Navigator>
        </NavigationContainer>
        <ConnectionStatusOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
