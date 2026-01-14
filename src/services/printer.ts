import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Sale } from '../models/Sale';
import { formatCurrency, formatDate } from '../utils/formatters';

/**
 * Genera el HTML del comprobante
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
 * Genera un PDF del comprobante y lo comparte
 */
export const printReceipt = async (sale: Sale, businessName?: string): Promise<void> => {
  try {
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
    console.error('Error al generar PDF:', error);
    throw error;
  }
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
 * Prueba de impresión
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

// Funciones mock para compatibilidad con la interfaz anterior
export const scanDevices = async (): Promise<any[]> => {
  // En Expo con Print, no necesitamos escanear dispositivos
  // El sistema operativo maneja las impresoras disponibles
  return [];
};

export const connectPrinter = async (address: string): Promise<void> => {
  // No necesario con expo-print
  console.log('expo-print maneja la conexión automáticamente');
};

export const disconnectPrinter = async (): Promise<void> => {
  // No necesario con expo-print
  console.log('No hay conexión que desconectar con expo-print');
};

export const isConnected = async (): Promise<boolean> => {
  // Con expo-print siempre está "conectado" porque usa el sistema del OS
  return true;
};

