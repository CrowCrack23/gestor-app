import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import * as printer from '../services/printer';

interface BluetoothDevice {
  name: string;
  address: string;
}

export const SettingsScreen: React.FC = () => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);

  useEffect(() => {
    checkConnection();
    requestBluetoothPermissions();
  }, []);

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert(
            'Permisos necesarios',
            'La aplicación necesita permisos de Bluetooth y ubicación para conectarse con la impresora.'
          );
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const checkConnection = async () => {
    try {
      const isConnected = await printer.isConnected();
      setConnected(isConnected);
    } catch (error) {
      console.error('Error al verificar conexión:', error);
    }
  };

  const handleScanDevices = async () => {
    try {
      setScanning(true);
      const scannedDevices = await printer.scanDevices();
      setDevices(scannedDevices);
      
      if (scannedDevices.length === 0) {
        Alert.alert(
          'No se encontraron dispositivos',
          'Asegúrate de que tu impresora esté encendida y emparejada con el dispositivo.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron escanear los dispositivos Bluetooth');
      console.error(error);
    } finally {
      setScanning(false);
    }
  };

  const handleConnectDevice = async (device: BluetoothDevice) => {
    try {
      setScanning(true);
      await printer.connectPrinter(device.address);
      setConnected(true);
      setConnectedDevice(device);
      Alert.alert('Éxito', `Conectado a ${device.name}`);
    } catch (error) {
      Alert.alert('Error de conexión', 'No se pudo conectar con la impresora');
      console.error(error);
    } finally {
      setScanning(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await printer.disconnectPrinter();
      setConnected(false);
      setConnectedDevice(null);
      Alert.alert('Desconectado', 'Impresora desconectada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo desconectar la impresora');
      console.error(error);
    }
  };

  const handleTestPrint = async () => {
    if (!connected) {
      Alert.alert('No conectado', 'Primero conecta una impresora');
      return;
    }

    try {
      await printer.printTest();
      Alert.alert('Éxito', 'Prueba de impresión enviada');
    } catch (error) {
      Alert.alert('Error', 'No se pudo realizar la prueba de impresión');
      console.error(error);
    }
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => handleConnectDevice(item)}
      disabled={scanning}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Dispositivo sin nombre'}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
      </View>
      <Text style={styles.connectText}>Conectar →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración de Impresora</Text>
      </View>

      {/* Estado de conexión */}
      <View style={[styles.statusCard, connected && styles.statusCardConnected]}>
        <Text style={styles.statusLabel}>Estado:</Text>
        <Text style={[styles.statusText, connected && styles.statusTextConnected]}>
          {connected ? '✓ Conectado' : '✕ Desconectado'}
        </Text>
        {connected && connectedDevice && (
          <Text style={styles.connectedDeviceName}>{connectedDevice.name}</Text>
        )}
      </View>

      {/* Acciones */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanDevices}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scanButtonText}>🔍 Escanear Dispositivos</Text>
          )}
        </TouchableOpacity>

        {connected && (
          <>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestPrint}
            >
              <Text style={styles.testButtonText}>🖨 Prueba de Impresión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectButtonText}>Desconectar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Lista de dispositivos */}
      {devices.length > 0 && (
        <View style={styles.devicesSection}>
          <Text style={styles.sectionTitle}>Dispositivos Disponibles</Text>
          <FlatList
            data={devices}
            keyExtractor={item => item.address}
            renderItem={renderDevice}
            contentContainerStyle={styles.devicesList}
          />
        </View>
      )}

      {/* Instrucciones */}
      <View style={styles.instructionsSection}>
        <Text style={styles.instructionsTitle}>Instrucciones:</Text>
        <Text style={styles.instructionText}>
          1. Asegúrate de que tu impresora MRBOSS esté encendida
        </Text>
        <Text style={styles.instructionText}>
          2. Empareja la impresora con tu dispositivo desde Configuración de Android
        </Text>
        <Text style={styles.instructionText}>
          3. Toca "Escanear Dispositivos" para buscar la impresora
        </Text>
        <Text style={styles.instructionText}>
          4. Selecciona tu impresora de la lista para conectar
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  statusCardConnected: {
    borderLeftColor: '#4CAF50',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
  },
  statusTextConnected: {
    color: '#4CAF50',
  },
  connectedDeviceName: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  actionsSection: {
    padding: 16,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devicesSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  devicesList: {
    paddingBottom: 16,
  },
  deviceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
  },
  connectText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  instructionsSection: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});

