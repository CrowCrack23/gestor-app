import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SalesScreen } from './src/screens/SalesScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import * as db from './src/services/database';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Inicializar base de datos
      await db.initDatabase();
      console.log('Aplicación inicializada correctamente');
      setIsReady(true);
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
      Alert.alert(
        'Error',
        'No se pudo inicializar la aplicación. Por favor, reinicia la app.'
      );
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Inicializando...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#2196F3" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2196F3',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
            tabBarActiveTintColor: '#2196F3',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="Ventas"
            component={SalesScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>💰</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Productos"
            component={ProductsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>📦</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Historial"
            component={HistoryScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>📊</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Configuración"
            component={SettingsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>⚙️</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
