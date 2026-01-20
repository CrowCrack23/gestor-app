import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  scanBluetoothDevices,
  connectBluetoothPrinter,
  isConnected,
  printTestTicket,
  disconnectPrinter,
  requestBluetoothPermissions,
} from '../services/printer';

interface BluetoothDevice {
  deviceName: string;
  macAddress: string;
}

export default function PrinterSettingsScreen() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    // Verificar estado de conexión al montar
    setConnected(isConnected());
  }, []);

  const handleRequestPermissions = async () => {
    try {
      const granted = await requestBluetoothPermissions();
      if (!granted) {
        Alert.alert(
          'Permisos Requeridos',
          'Se necesitan permisos de Bluetooth para usar la impresora. Por favor, actívalos en Configuración.',
          [{ text: 'OK' }]
        );
      }
      return granted;
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      return false;
    }
  };

  const handleScan = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'No Disponible',
        'La impresión térmica Bluetooth solo está disponible en Android.',
        [{ text: 'OK' }]
      );
      return;
    }

    const hasPermission = await handleRequestPermissions();
    if (!hasPermission) {
      return;
    }

    setScanning(true);
    setDevices([]);

    try {
      const foundDevices = await scanBluetoothDevices();
      console.log('Dispositivos a mostrar:', foundDevices);
      console.log('Cantidad de dispositivos:', foundDevices.length);
      
      if (foundDevices.length === 0) {
        Alert.alert(
          'Sin Dispositivos',
          'No se encontraron impresoras Bluetooth.\n\n' +
          'Asegúrate de que:\n' +
          '• La impresora esté encendida\n' +
          '• Bluetooth esté activado\n' +
          '• La impresora esté emparejada en Ajustes',
          [{ text: 'OK' }]
        );
      } else {
        setDevices(foundDevices);
        console.log('Estado devices actualizado');
      }
    } catch (error: any) {
      console.error('Error al escanear:', error);
      Alert.alert(
        'Error al Escanear',
        error.message || 'No se pudieron buscar dispositivos Bluetooth.',
        [{ text: 'OK' }]
      );
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: BluetoothDevice) => {
    setConnecting(true);
    setSelectedDevice(device.macAddress);

    try {
      await connectBluetoothPrinter(device.macAddress);
      setConnected(true);
      
      Alert.alert(
        '✓ Conectado',
        `Conectado a ${device.deviceName}\n\n¿Deseas imprimir un ticket de prueba?`,
        [
          { text: 'Ahora No', style: 'cancel' },
          { text: 'Sí, Probar', onPress: handleTestPrint },
        ]
      );
    } catch (error: any) {
      console.error('Error al conectar:', error);
      Alert.alert(
        'Error de Conexión',
        `No se pudo conectar con ${device.deviceName}.\n\n${error.message}`,
        [{ text: 'OK' }]
      );
      setConnected(false);
    } finally {
      setConnecting(false);
      setSelectedDevice(null);
    }
  };

  const handleTestPrint = async () => {
    if (!connected) {
      Alert.alert('No Conectado', 'Primero debes conectar una impresora.', [{ text: 'OK' }]);
      return;
    }

    try {
      await printTestTicket();
      Alert.alert(
        '✓ Impreso',
        'El ticket de prueba se envió correctamente. Verifica que la impresora lo haya impreso.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error al imprimir:', error);
      Alert.alert(
        'Error de Impresión',
        `No se pudo imprimir el ticket de prueba.\n\n${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPrinter();
      setConnected(false);
      setDevices([]);
      Alert.alert('Desconectado', 'La impresora se desconectó correctamente.', [{ text: 'OK' }]);
    } catch (error: any) {
      console.error('Error al desconectar:', error);
    }
  };


  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.notAvailableContainer}>
          <Text style={styles.notAvailableTitle}>⚠️ No Disponible</Text>
          <Text style={styles.notAvailableText}>
            La impresión térmica Bluetooth solo está disponible en dispositivos Android.
          </Text>
          <Text style={styles.notAvailableText}>
            En esta plataforma, los comprobantes se generarán como PDF.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración de Impresora</Text>
        <Text style={styles.subtitle}>Impresora Térmica Bluetooth</Text>
      </View>

      {connected ? (
        <View style={styles.connectedContainer}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusIcon}>✓</Text>
            <Text style={styles.statusText}>Impresora Conectada</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleTestPrint}>
            <Text style={styles.primaryButtonText}>🖨️ Imprimir Prueba</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleDisconnect}>
            <Text style={styles.secondaryButtonText}>Desconectar</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              La impresora está lista para usar. Los comprobantes se imprimirán automáticamente
              al completar una venta.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.disconnectedContainer}>
          <TouchableOpacity
            style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={styles.scanningIndicator} />
                <Text style={styles.scanButtonText}>Escaneando...</Text>
              </>
            ) : (
              <>
                <Text style={styles.scanButtonIcon}>🔍</Text>
                <Text style={styles.scanButtonText}>Buscar Impresoras</Text>
              </>
            )}
          </TouchableOpacity>

          {devices.length > 0 && (
            <View style={styles.devicesContainer}>
              <Text style={styles.devicesTitle}>Dispositivos Encontrados: ({devices.length})</Text>
              <ScrollView style={styles.devicesList}>
                {devices.map((device, index) => {
                  const isConnecting = connecting && selectedDevice === device.macAddress;
                  
                  return (
                    <TouchableOpacity
                      key={device.macAddress || `device-${index}`}
                      style={styles.deviceItem}
                      onPress={() => handleConnect(device)}
                      disabled={connecting || connected}
                    >
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{device.deviceName}</Text>
                        <Text style={styles.deviceAddress}>{device.macAddress}</Text>
                      </View>
                      
                      {isConnecting ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <View style={styles.connectButton}>
                          <Text style={styles.connectButtonText}>Conectar</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {!scanning && devices.length === 0 && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Instrucciones:</Text>
              <Text style={styles.instructionText}>1. Enciende tu impresora térmica</Text>
              <Text style={styles.instructionText}>
                2. Empareja la impresora en Ajustes {'>'} Bluetooth
              </Text>
              <Text style={styles.instructionText}>3. Toca "Buscar Impresoras"</Text>
              <Text style={styles.instructionText}>4. Selecciona tu impresora de la lista</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Impresora compatible: MRBoss POS 58 y similares ESC/POS
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  connectedContainer: {
    padding: 20,
  },
  disconnectedContainer: {
    padding: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 10,
    color: '#fff',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scanButtonDisabled: {
    backgroundColor: '#999',
  },
  scanButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanningIndicator: {
    marginRight: 10,
  },
  devicesContainer: {
    marginTop: 10,
    maxHeight: 400,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  devicesList: {
    maxHeight: 350,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  footer: {
    padding: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  notAvailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notAvailableTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 20,
  },
  notAvailableText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
});
