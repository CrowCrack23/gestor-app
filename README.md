# App Gestor de Ventas

Aplicación móvil React Native para gestión de ventas de productos con integración de impresora térmica MRBOSS.

## Características

- ✅ **Gestión de Productos**: Crear, editar y eliminar productos con control de inventario
- ✅ **Registro de Ventas**: Interfaz intuitiva de punto de venta con carrito de compras
- ✅ **Historial de Ventas**: Consulta ventas pasadas con filtros por fecha
- 🖨️ **Impresión de Comprobantes**: Preparado para impresora MRBOSS (modo simulación por defecto)
- ✅ **Base de Datos Local**: Almacenamiento offline con SQLite
- ✅ **Interfaz Moderna**: Diseño responsivo y fácil de usar

> **Nota:** La aplicación funciona completamente sin impresora. La impresión está en modo simulación (muestra en consola). Para activar impresión real, ver [`CONFIGURAR_IMPRESORA.md`](CONFIGURAR_IMPRESORA.md)

## Tecnologías Utilizadas

- **React Native 0.73**: Framework principal
- **TypeScript**: Tipado estático
- **React Navigation**: Navegación entre pantallas
- **SQLite**: Base de datos local
- **react-native-bluetooth-escpos-printer**: Impresión térmica

## Requisitos Previos

- Node.js >= 18
- Java JDK 11 o superior
- Android SDK
- Android Studio (recomendado)

## Instalación

1. **Clonar el repositorio (si aplica) o navegar al directorio del proyecto**

```bash
cd app-gestor
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Instalar dependencias de Android**

```bash
cd android
./gradlew clean
cd ..
```

## Configuración de la Impresora MRBOSS

### Permisos Requeridos

La aplicación requiere los siguientes permisos en Android (ya configurados en AndroidManifest.xml):

- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_CONNECT`
- `BLUETOOTH_SCAN`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`

### Configurar la Conexión

1. **Emparejar la impresora**: Antes de usar la aplicación, empareja tu impresora MRBOSS con tu dispositivo Android desde Configuración > Bluetooth

2. **Escanear dispositivos en la app**: La aplicación escaneará automáticamente los dispositivos Bluetooth disponibles

3. **Seleccionar impresora**: Conecta con tu impresora MRBOSS desde la aplicación

### Compatibilidad

La impresora MRBOSS debe ser compatible con comandos **ESC/POS**. Si tu modelo específico tiene comandos diferentes, puedes modificar el archivo `src/services/printer.ts`.

## Ejecutar la Aplicación

### Modo Desarrollo

1. **Iniciar Metro Bundler**

```bash
npm start
```

2. **En otra terminal, ejecutar en Android**

```bash
npm run android
```

O directamente:

```bash
npx react-native run-android
```

### Generar APK de Producción

```bash
cd android
./gradlew assembleRelease
```

El APK se generará en: `android/app/build/outputs/apk/release/app-release.apk`

## Estructura del Proyecto

```
app-gestor/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── ProductCard.tsx
│   │   ├── SaleItem.tsx
│   │   └── ReceiptPreview.tsx
│   ├── screens/             # Pantallas principales
│   │   ├── SalesScreen.tsx  # Punto de venta
│   │   ├── ProductsScreen.tsx # Gestión de productos
│   │   └── HistoryScreen.tsx  # Historial de ventas
│   ├── services/            # Servicios y lógica de negocio
│   │   ├── database.ts      # SQLite
│   │   ├── printer.ts       # Impresora MRBOSS
│   │   └── salesService.ts  # Lógica de ventas
│   ├── models/              # Modelos TypeScript
│   │   ├── Product.ts
│   │   ├── Sale.ts
│   │   └── SaleItem.ts
│   ├── utils/               # Utilidades
│   │   └── formatters.ts
│   └── App.tsx              # Componente raíz
├── android/                 # Configuración Android
├── package.json
└── tsconfig.json
```

## Uso de la Aplicación

### 1. Gestión de Productos

- **Agregar productos**: Toca el botón "+ Agregar Producto"
- Completa el nombre, precio y stock inicial
- Guarda el producto

### 2. Realizar una Venta

- Ve a la pestaña "Ventas"
- Toca los productos para agregarlos al carrito
- Ajusta las cantidades según necesites
- Toca "Finalizar Venta"
- Elige si deseas imprimir el comprobante

### 3. Ver Historial

- Ve a la pestaña "Historial"
- Revisa el total de ventas del día
- Toca en cualquier venta para ver detalles
- Puedes reimprimir comprobantes

### 4. Imprimir Comprobantes

- Conecta la impresora MRBOSS vía Bluetooth
- Los comprobantes incluyen:
  - Encabezado del negocio
  - Fecha y número de venta
  - Lista de productos con cantidades y precios
  - Total de la venta
  - Mensaje de agradecimiento

## Base de Datos

La aplicación utiliza SQLite con las siguientes tablas:

- **products**: Almacena información de productos
- **sales**: Registra las ventas realizadas
- **sale_items**: Detalle de items por venta

## Solución de Problemas

### La impresora no se conecta

1. Verifica que la impresora esté encendida y emparejada con el dispositivo
2. Asegúrate de tener los permisos de Bluetooth habilitados
3. Revisa que la aplicación tenga permisos de ubicación (necesario para Bluetooth en Android)

### Error al instalar dependencias

```bash
# Limpiar cache de npm
npm cache clean --force
rm -rf node_modules
npm install

# Limpiar Android
cd android
./gradlew clean
cd ..
```

### Error al compilar Android

```bash
# Asegúrate de tener las variables de entorno correctas
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Personalización

### Cambiar nombre del negocio en comprobantes

Edita el archivo `src/services/printer.ts` y modifica la función `printHeader`:

```typescript
const printHeader = async (businessName: string = 'Tu Negocio Aquí'): Promise<void> => {
  // ...
};
```

### Modificar formato de comprobante

Edita las funciones en `src/services/printer.ts` para personalizar:
- Tamaño de fuente
- Alineación
- Información adicional

## Contribuir

Si encuentras bugs o tienes sugerencias, no dudes en abrir un issue o pull request.

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Soporte

Para problemas específicos con la impresora MRBOSS, consulta la documentación del fabricante o contacta con su soporte técnico.

---

Desarrollado con ❤️ usando React Native

