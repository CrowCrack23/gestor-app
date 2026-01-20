import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
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
import PrinterSettingsScreen from './src/screens/PrinterSettingsScreen';
import * as db from './src/services/database';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Stack Navigator para Mesas
 */
interface TablesStackProps {
  isAdmin: boolean;
  onMenuPress: () => void;
}

function TablesStackWithProps({ isAdmin, onMenuPress }: TablesStackProps) {
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
        options={{
          title: 'Mesas',
          headerLeft: isAdmin ? () => (
            <TouchableOpacity
              onPress={onMenuPress}
              style={styles.hamburgerButton}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          ) : undefined,
        }}
      />
      <Stack.Screen
        name="TableDetail"
        component={TableDetailScreen}
        options={{ 
          title: 'Detalle de Mesa',
          headerLeft: isAdmin ? () => (
            <TouchableOpacity
              onPress={onMenuPress}
              style={styles.hamburgerButton}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          ) : undefined,
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Menú Hamburguesa para Admin
 */
interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

function HamburgerMenu({ visible, onClose, onNavigate, onLogout }: HamburgerMenuProps) {
  const menuItems = [
    { id: 'Ventas', icon: '💰', label: 'Ventas' },
    { id: 'Mesas', icon: '🍽️', label: 'Mesas' },
    { id: 'Productos', icon: '📦', label: 'Productos' },
    { id: 'Historial', icon: '📋', label: 'Historial de Ventas' },
    { id: 'Reportes', icon: '📊', label: 'Reportes' },
    { id: 'Cierres', icon: '💵', label: 'Cierres de Caja' },
    { id: 'Usuarios', icon: '👥', label: 'Gestión de Usuarios' },
    { id: 'Impresora', icon: '🖨️', label: 'Impresora Térmica' },
    { id: 'Config', icon: '⚙️', label: 'Configuración' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>📱 Menú Admin</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  onNavigate(item.id);
                  onClose();
                }}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.logoutMenuItem}
            onPress={() => {
              onClose();
              onLogout();
            }}
          >
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={styles.logoutMenuLabel}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Componente interno con acceso al contexto de autenticación
 */
function AppContent() {
  const { currentUser, isLoading: isAuthLoading, hasUsers, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState<any>(null);

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

  const handleNavigate = (screen: string) => {
    if (navigationRef) {
      navigationRef.navigate(screen);
    }
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
    <>
      <NavigationContainer ref={(ref) => setNavigationRef(ref)}>
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
            tabBarStyle: isAdmin ? { display: 'none' } : {
              paddingBottom: 20,
              paddingTop: 10,
              height: 100,
            },
            tabBarLabelStyle: {
              fontSize: 14,
              fontWeight: '600',
              marginBottom: 0,
              marginTop: 0,
            },
            tabBarIconStyle: {
              display: 'none',
            },
          }}
        >
          {/* Tab Ventas: disponible para todos */}
          <Tab.Screen
            name="Ventas"
            component={SalesScreen}
            options={{
              tabBarIcon: () => null,
              headerLeft: isAdmin ? () => (
                <TouchableOpacity
                  onPress={() => setMenuVisible(true)}
                  style={styles.hamburgerButton}
                >
                  <Text style={styles.hamburgerIcon}>☰</Text>
                </TouchableOpacity>
              ) : undefined,
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
            options={{
              tabBarIcon: () => null,
              headerShown: false,
            }}
          >
            {() => <TablesStackWithProps isAdmin={isAdmin} onMenuPress={() => setMenuVisible(true)} />}
          </Tab.Screen>

          {/* Pantallas adicionales solo para admin (ocultas de tabs, accesibles desde menú) */}
          {isAdmin && (
            <>
              <Tab.Screen
                name="Productos"
                component={ProductsScreen}
                options={{
                  tabBarButton: () => null, // Oculta del tab bar
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => setMenuVisible(true)}
                      style={styles.hamburgerButton}
                    >
                      <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                  ),
                }}
              />
              <Tab.Screen
                name="Historial"
                component={HistoryScreen}
                options={{
                  tabBarButton: () => null,
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => setMenuVisible(true)}
                      style={styles.hamburgerButton}
                    >
                      <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                  ),
                }}
              />
              <Tab.Screen
                name="Reportes"
                component={ReportsScreen}
                options={{
                  tabBarButton: () => null,
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => setMenuVisible(true)}
                      style={styles.hamburgerButton}
                    >
                      <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                  ),
                }}
              />
              <Tab.Screen
                name="Cierres"
                component={CashHistoryScreen}
                options={{
                  tabBarButton: () => null,
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => setMenuVisible(true)}
                      style={styles.hamburgerButton}
                    >
                      <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                  ),
                }}
              />
              <Tab.Screen
                name="Usuarios"
                component={UsersScreen}
                options={{
                  tabBarButton: () => null,
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => setMenuVisible(true)}
                      style={styles.hamburgerButton}
                    >
                      <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                  ),
                }}
              />
              <Tab.Screen
                name="Impresora"
                component={PrinterSettingsScreen}
                options={{
                  tabBarButton: () => null,
                  title: 'Impresora Térmica',
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => setMenuVisible(true)}
                      style={styles.hamburgerButton}
                    >
                      <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                  ),
                }}
              />
              <Tab.Screen
                name="Config"
                component={SettingsScreen}
                options={{
                  tabBarButton: () => null,
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => setMenuVisible(true)}
                      style={styles.hamburgerButton}
                    >
                      <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                  ),
                }}
              />
            </>
          )}
        </Tab.Navigator>
      </NavigationContainer>

      {/* Menú hamburguesa para admin */}
      {isAdmin && (
        <HamburgerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
    </>
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
  // Estilos del menú hamburguesa
  hamburgerButton: {
    marginLeft: 16,
    padding: 8,
  },
  hamburgerIcon: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#2196F3',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  menuList: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFEBEE',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  logoutMenuLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
    flex: 1,
  },
});
