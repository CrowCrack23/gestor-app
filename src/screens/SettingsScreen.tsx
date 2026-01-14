import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as printer from '../services/printer';

export const SettingsScreen: React.FC = () => {
  const handleTestPrint = async () => {
    try {
      await printer.printTest();
    } catch (error) {
      Alert.alert('Error', 'No se pudo realizar la prueba de impresión');
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
        <Text style={styles.title}>Configuración</Text>
      </View>

      {/* Sección de Impresión */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📄 Impresión</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sistema de Impresión con PDF</Text>
          <Text style={styles.cardDescription}>
            Esta app utiliza expo-print para generar comprobantes en PDF.
          </Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>✅ Ventajas:</Text>
            <Text style={styles.infoText}>• No requiere configuración</Text>
            <Text style={styles.infoText}>• Compatible con cualquier impresora</Text>
            <Text style={styles.infoText}>• Puedes compartir por WhatsApp, email, etc.</Text>
            <Text style={styles.infoText}>• Guarda automáticamente en el dispositivo</Text>
          </View>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestPrint}
          >
            <Text style={styles.testButtonText}>🖨️ Prueba de Impresión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sección de Base de Datos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💾 Base de Datos</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SQLite Local</Text>
          <Text style={styles.cardDescription}>
            Tus datos se guardan localmente en tu dispositivo.
          </Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>• Funciona sin internet</Text>
            <Text style={styles.infoText}>• Datos seguros en tu dispositivo</Text>
            <Text style={styles.infoText}>• Acceso rápido</Text>
          </View>
        </View>
      </View>

      {/* Información de la App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Información</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Gestor de Ventas</Text>
          <Text style={styles.cardDescription}>
            Versión 1.0.0
          </Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>• Desarrollada con Expo</Text>
            <Text style={styles.infoText}>• TypeScript + React Native</Text>
            <Text style={styles.infoText}>• Base de datos SQLite</Text>
            <Text style={styles.infoText}>• Impresión PDF integrada</Text>
          </View>
        </View>
      </View>

      {/* Instrucciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 ¿Cómo Usar?</Text>
        <View style={styles.card}>
          <Text style={styles.instructionTitle}>1. Agrega Productos</Text>
          <Text style={styles.instructionText}>
            Ve a la pestaña "Productos" y crea tu catálogo de productos.
          </Text>

          <Text style={styles.instructionTitle}>2. Realiza Ventas</Text>
          <Text style={styles.instructionText}>
            En "Ventas", selecciona productos, ajusta cantidades y finaliza la venta.
          </Text>

          <Text style={styles.instructionTitle}>3. Genera Comprobantes</Text>
          <Text style={styles.instructionText}>
            Al finalizar una venta, genera un PDF que puedes imprimir o compartir.
          </Text>

          <Text style={styles.instructionTitle}>4. Consulta Historial</Text>
          <Text style={styles.instructionText}>
            Revisa todas tus ventas en la pestaña "Historial".
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Desarrollado con ❤️ usando Expo + React Native
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 12,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

