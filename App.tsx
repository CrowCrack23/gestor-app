import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { SalesScreen } from './src/screens/SalesScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SetupAdminScreen } from './src/screens/SetupAdminScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { CashHistoryScreen } from './src/screens/CashHistoryScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { TablesScreen } from './src/screens/TablesScreen';
import { TableDetailScreen } from './src/screens/TableDetailScreen';
import * as db from './src/services/database';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Stack Navigator para Mesas
 */
function TablesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
        },
      }}
    >
      <Stack.Screen
        name="TablesMain"
        component={TablesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TableDetail"
        component={TableDetailScreen}
        options={{ title: 'Detalle de Mesa' }}
      />
    </Stack.Navigator>
  );
}

/**
 * Componente interno con acceso al contexto de autenticación
 */
function AppContent() {
  const { currentUser, isLoading: isAuthLoading, hasUsers, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Deseas cerrar tu sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          },
        },
      ]
    );
  };

  // Pantalla de carga de autenticación
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Si no hay usuarios, mostrar pantalla de configuración inicial
  if (!hasUsers) {
    return <SetupAdminScreen />;
  }

  // Si no hay usuario logueado, mostrar login
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Usuario logueado: mostrar tabs según rol
  const isAdmin = currentUser.role === 'admin';
  const isSeller = currentUser.role === 'seller';

  return (
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
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        {/* Tab Ventas: disponible para todos */}
        <Tab.Screen
          name="Ventas"
          component={SalesScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>💰</Text>
            ),
            headerRight: () => (
              <View style={styles.headerRight}>
                <Text style={styles.usernameText}>{currentUser.username}</Text>
                {isSeller && (
                  <TouchableOpacity
                    onPress={handleLogout}
                    style={styles.logoutButton}
                  >
                    <Text style={styles.logoutText}>Salir</Text>
                  </TouchableOpacity>
                )}
              </View>
            ),
          }}
        />

        {/* Tab Mesas: disponible para todos */}
        <Tab.Screen
          name="Mesas"
          component={TablesStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🍽️</Text>
            ),
            headerShown: false,
          }}
        />

        {/* Tabs solo para admin */}
        {isAdmin && (
          <>
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
                  <Text style={{ fontSize: size, color }}>📋</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Reportes"
              component={ReportsScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Text style={{ fontSize: size, color }}>📊</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Usuarios"
              component={UsersScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Text style={{ fontSize: size, color }}>👥</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Cierres"
              component={CashHistoryScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Text style={{ fontSize: size, color }}>📊</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Config"
              component={SettingsScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Text style={{ fontSize: size, color }}>⚙️</Text>
                ),
                headerRight: () => (
                  <TouchableOpacity
                    onPress={handleLogout}
                    style={styles.logoutButton}
                  >
                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
                  </TouchableOpacity>
                ),
              }}
            />
          </>
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await db.initDatabase();
      console.log('Base de datos inicializada en App');
      setIsDbReady(true);
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
      Alert.alert(
        'Error',
        'No se pudo inicializar la aplicación. Por favor, reinicia la app.'
      );
    }
  };

  if (!isDbReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Inicializando...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  usernameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
