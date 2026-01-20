import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, PermissionsAndroid } from 'react-native';
import { Sale } from '../models/Sale';
import { formatCurrency, formatDate } from '../utils/formatters';

// Importar react-native-thermal-printer
// Esta librería solo funciona en builds nativos (EAS Build o expo run:android)
let ThermalPrinter: any = null;
try {
  ThermalPrinter = require('react-native-thermal-printer').default;
} catch (error) {
  console.log('react-native-thermal-printer no disponible (modo web/Expo Go)');
}

// Estado de conexión
let connectedPrinter: any = null;

/**
 * Solicita permisos de Bluetooth según la versión de Android
 */
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS maneja permisos automáticamente con Info.plist
  }

  try {
    const apiLevel = Platform.Version;
    
    if (apiLevel >= 31) {
      // Android 12+ (API 31+)
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      return (
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      // Android 11 y anteriores
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de Ubicación',
          message: 'Se necesita para escanear dispositivos Bluetooth',
          buttonPositive: 'Aceptar',
          buttonNegative: 'Cancelar',
        }
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('Error al solicitar permisos Bluetooth:', error);
    return false;
  }
};

/**
 * Escanea dispositivos Bluetooth disponibles
 */
export const scanBluetoothDevices = async (): Promise<any[]> => {
  if (!ThermalPrinter) {
    console.warn('ThermalPrinter no disponible');
    return [];
  }

  try {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      throw new Error('Permisos de Bluetooth no otorgados');
    }

    // Escanear dispositivos Bluetooth
    const devices = await ThermalPrinter.getBluetoothDeviceList();
    console.log('Dispositivos encontrados:', devices);
    return devices || [];
  } catch (error) {
    console.error('Error al escanear dispositivos:', error);
    throw error;
  }
};

/**
 * Conecta con una impresora térmica Bluetooth
 */
export const connectBluetoothPrinter = async (deviceAddress: string): Promise<boolean> => {
  if (!ThermalPrinter) {
    throw new Error('ThermalPrinter no disponible en este entorno');
  }

  try {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      throw new Error('Permisos de Bluetooth no otorgados');
    }

    // Debug: ver qué métodos tiene ThermalPrinter
    console.log('Métodos disponibles en ThermalPrinter:', Object.keys(ThermalPrinter));
    
    // Intentar diferentes métodos de conexión
    if (typeof ThermalPrinter.connect === 'function') {
      await ThermalPrinter.connect(deviceAddress);
    } else if (typeof ThermalPrinter.connectPrinter === 'function') {
      await ThermalPrinter.connectPrinter(deviceAddress);
    } else {
      // Si no hay método de conexión, solo guardamos el estado
      console.log('No hay método de conexión explícito, guardando estado');
    }
    
    connectedPrinter = { address: deviceAddress, type: 'bluetooth' };
    console.log('Conectado a impresora:', deviceAddress);
    return true;
  } catch (error) {
    console.error('Error al conectar con impresora:', error);
    throw error;
  }
};

/**
 * Desconecta la impresora actual
 */
export const disconnectPrinter = async (): Promise<void> => {
  if (!ThermalPrinter || !connectedPrinter) {
    return;
  }

  try {
    // La librería no tiene un método explícito de desconexión
    // Solo limpiamos el estado local
    connectedPrinter = null;
    console.log('Impresora desconectada');
  } catch (error) {
    console.error('Error al desconectar impresora:', error);
  }
};

/**
 * Verifica si hay una impresora conectada
 */
export const isConnected = (): boolean => {
  return connectedPrinter !== null;
};

/**
 * Genera el contenido del ticket en formato de la librería
 */
const generateTicketContent = (sale: Sale, businessName: string = 'Mi Negocio'): string => {
  let content = '';
  
  // Encabezado centrado y en negrita
  content += `[C]<b>${businessName}</b>\n`;
  content += '[C]COMPROBANTE DE VENTA\n';
  content += '[L]\n';
  content += '[L]--------------------------------\n';
  
  // Información de la venta
  content += `[L]Fecha: ${formatDate(sale.date)}\n`;
  content += `[L]Venta #: ${sale.id || 'Nueva'}\n`;
  if (sale.username) {
    content += `[L]Vendedor: ${sale.username}\n`;
  }
  content += '[L]--------------------------------\n';
  
  // Items
  sale.items?.forEach(item => {
    content += `[L]${item.product_name}\n`;
    content += `[L]  ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}\n`;
  });
  
  content += '[L]--------------------------------\n';
  
  // Total y método de pago
  content += `[R]<b>TOTAL: ${formatCurrency(sale.total)}</b>\n`;
  
  // Mostrar desglose para pagos mixtos
  if (sale.payment_method === 'mixed' && sale.cash_amount && sale.transfer_amount) {
    content += '[L]--------------------------------\n';
    content += '[L]PAGO MIXTO:\n';
    content += `[L]  Efectivo: ${formatCurrency(sale.cash_amount)}\n`;
    content += `[L]  Transferencia: ${formatCurrency(sale.transfer_amount)}\n`;
  } else {
    // Mostrar método de pago simple
    const paymentLabel = sale.payment_method === 'cash' ? 'EFECTIVO' : 
                        sale.payment_method === 'transfer' ? 'TRANSFERENCIA' : 
                        'EFECTIVO';
    content += `[L]Pago: ${paymentLabel}\n`;
  }
  
  content += '[L]--------------------------------\n';
  
  // Footer
  content += '[C]Gracias por su compra!\n';
  content += '[C]App Gestor Ventas\n';
  content += '[L]\n';
  content += '[L]\n';
  content += '[L]\n';
  
  return content;
};

/**
 * Imprime un ticket de prueba simple
 */
export const printTestTicket = async (): Promise<void> => {
  if (!ThermalPrinter || !connectedPrinter) {
    throw new Error('No hay impresora conectada');
  }

  try {
    const content = `
[C]<b>PRUEBA DE IMPRESION</b>
[L]
[L]--------------------------------
[L]Fecha: ${new Date().toLocaleString('es-ES')}
[L]--------------------------------
[L]Si puede ver esto,
[L]la impresora funciona!
[L]
[L]
[L]
`;
    
    await ThermalPrinter.printBluetooth({
      payload: content,
      printerNbrCharactersPerLine: 32,
    });
    
    console.log('Ticket de prueba impreso');
  } catch (error) {
    console.error('Error al imprimir ticket de prueba:', error);
    throw error;
  }
};

/**
 * Imprime un comprobante en la impresora térmica Bluetooth
 */
export const printReceipt = async (sale: Sale, businessName?: string): Promise<void> => {
  try {
    // Intentar primero con impresora Bluetooth si está disponible y conectada
    if (ThermalPrinter && connectedPrinter) {
      try {
        const content = generateTicketContent(sale, businessName);
        await ThermalPrinter.printBluetooth({
          payload: content,
          printerNbrCharactersPerLine: 32,
        });
        console.log('Ticket impreso correctamente via Bluetooth');
        return; // Si la impresión fue exitosa, salir
      } catch (error: any) {
        console.error('Error al imprimir en térmica:', error);
        // Si falla la impresión Bluetooth, continuar con fallback a PDF
      }
    } else {
      console.log('Impresora térmica no disponible, usando fallback a PDF');
    }

    // Fallback a PDF si no hay impresora conectada o falló
    const html = generateReceiptHTML(sale, businessName);
    
    const { uri } = await Print.printToFileAsync({ html });
    
    console.log('PDF generado:', uri);
    
    // Compartir el PDF (el usuario puede imprimir desde aquí)
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir Comprobante',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.log('Sharing no disponible en este dispositivo');
      // En este caso, el PDF se guarda en el dispositivo
      alert('PDF guardado. Busca el archivo en tus descargas.');
    }
  } catch (error) {
    console.error('Error al generar comprobante:', error);
    throw error;
  }
};

/**
 * Genera el HTML del comprobante (fallback para PDF)
 */
const generateReceiptHTML = (sale: Sale, businessName: string = 'Mi Negocio'): string => {
  const itemsHTML = sale.items?.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">${formatCurrency(item.price)}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          margin: 20px;
        }
        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 20px;
          font-size: 12px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
        }
        .info {
          margin: 15px 0;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        .info p {
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th {
          background-color: #f0f0f0;
          padding: 10px 8px;
          text-align: left;
          border-bottom: 2px solid #000;
          font-weight: bold;
        }
        .total-section {
          text-align: right;
          margin: 20px 0;
          padding-top: 10px;
          border-top: 2px solid #000;
        }
        .total {
          font-size: 18px;
          font-weight: bold;
          margin: 10px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          border-top: 2px solid #000;
          padding-top: 15px;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${businessName}</h1>
        <p>COMPROBANTE DE VENTA</p>
      </div>
      
      <div class="info">
        <p><strong>Fecha:</strong> ${formatDate(sale.date)}</p>
        <p><strong>Venta #:</strong> ${sale.id || 'Nueva'}</p>
        ${sale.username ? `<p><strong>Vendedor:</strong> ${sale.username}</p>` : ''}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th style="text-align: center;">Cant.</th>
            <th style="text-align: right;">Precio</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="total-section">
        <p class="total">TOTAL: ${formatCurrency(sale.total)}</p>
      </div>
      
      <div class="footer">
        <p>¡Gracias por su compra!</p>
        <p>Generado con App Gestor Ventas</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Vista previa del comprobante (abre el diálogo de impresión del sistema)
 */
export const printReceiptDirect = async (sale: Sale, businessName?: string): Promise<void> => {
  try {
    const html = generateReceiptHTML(sale, businessName);
    
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Error al imprimir:', error);
    throw error;
  }
};

/**
 * Prueba de impresión (fallback PDF)
 */
export const printTest = async (): Promise<void> => {
  try {
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            text-align: center;
          }
          h1 {
            border: 2px solid #000;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <h1>PRUEBA DE IMPRESIÓN</h1>
        <p>Si puedes ver esto, la impresión funciona correctamente.</p>
        <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
      </body>
      </html>
    `;
    
    await Print.printAsync({ html: testHTML });
    
    console.log('Prueba de impresión exitosa');
  } catch (error) {
    console.error('Error en prueba de impresión:', error);
    throw error;
  }
};
