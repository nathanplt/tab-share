import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from 'react-native';

export const AuthContext = React.createContext<{
  userToken: string | null;
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}>({
  userToken: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export default function Layout() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (userToken) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, userToken, router]);

  const authContext = {
    userToken,
    isLoading,
    signIn: (token: string) => {
      AsyncStorage.setItem('userToken', token).then(() => {
        setUserToken(token);
      });
    },
    signOut: () => {
      AsyncStorage.removeItem('userToken').then(() => {
        setUserToken(null);
      });
    },
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContext}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="bill/[id]" options={{ title: '' }} />
        <Stack.Screen name="scan" options={{ title: '' }} />
      </Stack>
    </AuthContext.Provider>
  );
}