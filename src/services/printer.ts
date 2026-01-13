/**
 * SERVICIO DE IMPRESIÓN - VERSIÓN MOCK
 * 
 * Este archivo contiene la estructura para integrar una impresora MRBOSS.
 * Por ahora funciona en modo simulación (mock).
 * 
 * PARA HABILITAR LA IMPRESIÓN REAL:
 * 
 * 1. Instala una librería de impresión Bluetooth según tu impresora:
 *    npm install @brooons/react-native-bluetooth-escpos-printer
 *    O busca la que sea compatible con tu modelo MRBOSS
 * 
 * 2. Descomenta el import y reemplaza las funciones mock con las reales
 * 
 * 3. Ejemplos de librerías disponibles:
 *    - @brooons/react-native-bluetooth-escpos-printer
 *    - @pipechela/react-native-bluetooth-escpos-printer
 *    - react-native-thermal-printer (para USB)
 */

import { Sale } from '../models/Sale';
import { formatCurrency, formatDate } from '../utils/formatters';

// DESCOMENTAR cuando instales la librería de impresión:
// import {
//   BluetoothManager,
//   BluetoothEscposPrinter,
// } from '@brooons/react-native-bluetooth-escpos-printer';

// Estado de conexión simulado
let mockConnected = false;
let mockDevice: any = null;

/**
 * Escanea dispositivos Bluetooth disponibles
 */
export const scanDevices = async (): Promise<any[]> => {
  try {
    // MOCK: Retorna dispositivos simulados
    console.log('🔍 Escaneando dispositivos Bluetooth (MODO SIMULACIÓN)...');
    
    // Simular delay de escaneo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Dispositivos simulados para prueba
    const mockDevices = [
      { name: 'MRBOSS Printer (SIMULADO)', address: '00:00:00:00:00:01' },
      { name: 'Thermal Printer (SIMULADO)', address: '00:00:00:00:00:02' },
    ];
    
    console.log('✅ Dispositivos encontrados:', mockDevices.length);
    return mockDevices;
    
    // PARA USAR IMPRESIÓN REAL, reemplaza por:
    // const devices = await BluetoothManager.scanDevices();
    // return JSON.parse(devices);
  } catch (error) {
    console.error('Error al escanear dispositivos:', error);
    throw error;
  }
};

/**
 * Conecta a una impresora Bluetooth
 */
export const connectPrinter = async (address: string): Promise<void> => {
  try {
    console.log('🔗 Conectando a impresora (MODO SIMULACIÓN)...', address);
    
    // Simular delay de conexión
    await new Promise(resolve => setTimeout(resolve, 500));
    
    mockConnected = true;
    mockDevice = { address };
    
    console.log('✅ Conectado a la impresora (SIMULACIÓN)');
    
    // PARA USAR IMPRESIÓN REAL, reemplaza por:
    // await BluetoothManager.connect(address);
  } catch (error) {
    console.error('Error al conectar con la impresora:', error);
    throw error;
  }
};

/**
 * Desconecta la impresora
 */
export const disconnectPrinter = async (): Promise<void> => {
  try {
    console.log('🔌 Desconectando impresora (MODO SIMULACIÓN)...');
    
    mockConnected = false;
    mockDevice = null;
    
    console.log('✅ Desconectado (SIMULACIÓN)');
    
    // PARA USAR IMPRESIÓN REAL, reemplaza por:
    // await BluetoothManager.disconnect();
  } catch (error) {
    console.error('Error al desconectar:', error);
    throw error;
  }
};

/**
 * Verifica si hay una impresora conectada
 */
export const isConnected = async (): Promise<boolean> => {
  // MOCK: Retorna estado simulado
  return mockConnected;
  
  // PARA USAR IMPRESIÓN REAL, reemplaza por:
  // return await BluetoothManager.isConnected();
};

/**
 * Genera el texto del comprobante
 */
const generateReceiptText = (sale: Sale, businessName: string = 'Mi Negocio'): string => {
  let receipt = '';

  // Encabezado
  receipt += '================================\n';
  receipt += `${businessName.padStart((32 + businessName.length) / 2).padEnd(32)}\n`;
  receipt += '================================\n';
  receipt += '\n';

  // Información de la venta
  receipt += `Fecha: ${formatDate(sale.date)}\n`;
  receipt += `Venta #: ${sale.id || 'Nueva'}\n`;
  receipt += '--------------------------------\n';
  receipt += '\n';

  // Items
  receipt += 'PRODUCTO              CANT  PRECIO\n';
  receipt += '--------------------------------\n';
  
  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      const productName = item.product_name || 'Producto';
      const truncatedName =
        productName.length > 20
          ? productName.substring(0, 17) + '...'
          : productName.padEnd(20, ' ');
      const quantity = item.quantity.toString().padStart(4, ' ');
      const subtotal = formatCurrency(item.subtotal).padStart(8, ' ');

      receipt += `${truncatedName} ${quantity} ${subtotal}\n`;
    }
  }

  receipt += '\n';
  receipt += '--------------------------------\n';
  receipt += `${'TOTAL: ' + formatCurrency(sale.total)}`.padStart(32) + '\n';
  receipt += '\n';

  // Pie de página
  receipt += '================================\n';
  receipt += 'Gracias por su compra\n';
  receipt += '================================\n';
  receipt += '\n\n\n';

  return receipt;
};

/**
 * Imprime el comprobante completo de una venta
 */
export const printReceipt = async (sale: Sale, businessName?: string): Promise<void> => {
  try {
    const connected = await isConnected();
    
    if (!connected) {
      throw new Error('No hay impresora conectada');
    }

    const receiptText = generateReceiptText(sale, businessName);
    
    // MOCK: Muestra en consola
    console.log('🖨️ IMPRIMIENDO COMPROBANTE (MODO SIMULACIÓN):');
    console.log(receiptText);
    console.log('✅ Comprobante "impreso" (ver consola)');
    
    // PARA USAR IMPRESIÓN REAL, reemplaza por:
    // await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    // await BluetoothEscposPrinter.printText(receiptText, {});
    
  } catch (error) {
    console.error('Error al imprimir comprobante:', error);
    throw error;
  }
};

/**
 * Prueba de impresión
 */
export const printTest = async (): Promise<void> => {
  try {
    const connected = await isConnected();
    
    if (!connected) {
      throw new Error('No hay impresora conectada');
    }

    const testText = 
      '================================\n' +
      'PRUEBA DE IMPRESION\n' +
      '================================\n' +
      '\n\n\n';

    // MOCK: Muestra en consola
    console.log('🖨️ PRUEBA DE IMPRESIÓN (MODO SIMULACIÓN):');
    console.log(testText);
    console.log('✅ Prueba "impresa" (ver consola)');
    
    // PARA USAR IMPRESIÓN REAL, reemplaza por:
    // await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    // await BluetoothEscposPrinter.printText(testText, {});

  } catch (error) {
    console.error('Error en prueba de impresión:', error);
    throw error;
  }
};
