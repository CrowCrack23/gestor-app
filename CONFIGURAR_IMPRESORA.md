# 🖨️ Configurar Impresora MRBOSS - Guía Completa

## ℹ️ Estado Actual

La aplicación está **completamente funcional** sin impresora. Todas las funcionalidades funcionan:
- ✅ Gestión de productos
- ✅ Registro de ventas
- ✅ Historial de ventas
- ✅ Base de datos SQLite

La **impresión está en modo simulación** (muestra en consola). Para activar la impresión real, sigue esta guía.

## 📋 Opciones de Librerías para Impresora MRBOSS

Tu impresora MRBOSS debe ser compatible con el protocolo **ESC/POS**. Aquí tienes varias opciones:

### Opción 1: @brooons/react-native-bluetooth-escpos-printer (Recomendada)

```bash
npm install @brooons/react-native-bluetooth-escpos-printer
```

### Opción 2: @pipechela/react-native-bluetooth-escpos-printer

```bash
npm install @pipechela/react-native-bluetooth-escpos-printer
```

### Opción 3: Fork de Tulpar (con QR y mejorado)

```bash
npm install git+https://github.com/Tulpar-Yazilim/tp-react-native-bluetooth-printer.git
```

### Opción 4: Thermal Printer (para USB)

```bash
npm install react-native-thermal-printer
```

## 🔧 Pasos para Activar la Impresión Real

### Paso 1: Instalar la Librería

Elige una de las opciones anteriores e instálala. Por ejemplo:

```bash
npm install @brooons/react-native-bluetooth-escpos-printer
```

### Paso 2: Modificar src/services/printer.ts

Abre el archivo `src/services/printer.ts` y:

1. **Descomenta las líneas de import** (líneas 17-20):

```typescript
import {
  BluetoothManager,
  BluetoothEscposPrinter,
} from '@brooons/react-native-bluetooth-escpos-printer';
```

2. **Reemplaza las funciones mock con las reales:**

#### En `scanDevices()`:
```typescript
// ANTES (líneas 35-49):
const mockDevices = [
  { name: 'MRBOSS Printer (SIMULADO)', address: '00:00:00:00:00:01' },
];
return mockDevices;

// DESPUÉS:
const devices = await BluetoothManager.scanDevices();
return JSON.parse(devices);
```

#### En `connectPrinter()`:
```typescript
// ANTES (líneas 63-67):
mockConnected = true;
mockDevice = { address };

// DESPUÉS:
await BluetoothManager.connect(address);
```

#### En `disconnectPrinter()`:
```typescript
// ANTES (líneas 82-83):
mockConnected = false;
mockDevice = null;

// DESPUÉS:
await BluetoothManager.disconnect();
```

#### En `isConnected()`:
```typescript
// ANTES (línea 100):
return mockConnected;

// DESPUÉS:
return await BluetoothManager.isConnected();
```

#### En `printReceipt()`:
```typescript
// ANTES (líneas 176-178):
console.log('🖨️ IMPRIMIENDO COMPROBANTE (MODO SIMULACIÓN):');
console.log(receiptText);

// DESPUÉS:
await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
await BluetoothEscposPrinter.printText(receiptText, {});
```

#### En `printTest()`:
```typescript
// ANTES (líneas 205-207):
console.log('🖨️ PRUEBA DE IMPRESIÓN (MODO SIMULACIÓN):');
console.log(testText);

// DESPUÉS:
await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
await BluetoothEscposPrinter.printText(testText, {});
```

### Paso 3: Configuración adicional para Android

Si usas la librería de Bluetooth, necesitas:

1. **Linking (si usas React Native < 0.60):**
```bash
react-native link @brooons/react-native-bluetooth-escpos-printer
```

2. **Ya tienes los permisos configurados** en `android/app/src/main/AndroidManifest.xml` ✅

### Paso 4: Recompilar la App

```bash
cd android
./gradlew clean
cd ..
npm run android
```

## 📱 Probar la Impresora

1. **Emparejar tu impresora MRBOSS:**
   - Ve a Configuración de Android → Bluetooth
   - Empareja tu impresora MRBOSS

2. **En la app:**
   - Ve a la pestaña "Configuración"
   - Toca "Escanear Dispositivos"
   - Selecciona tu impresora
   - Toca "Prueba de Impresión"

3. **Si no imprime:**
   - Verifica que la impresora esté encendida
   - Verifica que tenga papel
   - Verifica que esté emparejada (no solo visible)
   - Revisa los logs: `adb logcat | grep "ReactNative"`

## 🎨 Personalizar el Formato de Impresión

En `src/services/printer.ts`, función `generateReceiptText()`:

```typescript
const generateReceiptText = (sale: Sale, businessName: string = 'Tu Negocio'): string => {
  // Modifica aquí el formato del comprobante
  // Puedes cambiar:
  // - Nombre del negocio
  // - Ancho de columnas
  // - Información adicional
  // - Formato de fecha/hora
}
```

## 🐛 Solución de Problemas

### Error: "Module not found @brooons/..."

Asegúrate de haber instalado la librería:
```bash
npm install @brooons/react-native-bluetooth-escpos-printer
```

### Error: "Could not connect to development server"

Reinicia Metro Bundler:
```bash
npm start -- --reset-cache
```

### La impresora no se encuentra

1. Verifica que esté emparejada en Configuración de Android
2. La app necesita permisos de ubicación para escanear Bluetooth
3. Dale permisos a la app en Configuración → Apps → App Gestor

### Caracteres especiales no se imprimen

Algunas impresoras ESC/POS tienen limitaciones con caracteres especiales.
Ajusta el texto en la función `generateReceiptText()`.

## 📚 Recursos Adicionales

- **Documentación ESC/POS:** https://reference.epson-biz.com/modules/ref_escpos/
- **Repo brooons:** https://github.com/brooons/react-native-bluetooth-escpos-printer
- **Manual MRBOSS:** Consulta el manual de tu modelo específico

## 🎯 Resumen Rápido

1. ✅ La app funciona SIN impresora (modo simulación)
2. 📦 Instala la librería de Bluetooth que prefieras
3. ✏️ Edita `src/services/printer.ts` y descomenta el código real
4. 🔄 Recompila la app
5. 🖨️ ¡Listo para imprimir!

---

**Nota:** La app está diseñada para funcionar perfectamente sin impresora. La impresión es una característica opcional.

