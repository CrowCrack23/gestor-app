# 🎉 App Gestor de Ventas - Expo

Aplicación móvil desarrollada con **Expo** y **React Native** para gestión de ventas de productos con generación de comprobantes en PDF.

## ✨ Características

- 💰 **Gestión de Ventas**: Sistema POS completo con carrito de compras
- 📦 **Gestión de Productos**: CRUD completo de productos con control de stock
- 📊 **Historial de Ventas**: Consulta y visualización de ventas realizadas
- 📄 **Comprobantes en PDF**: Generación y compartición de comprobantes
- 💾 **Base de Datos Local**: SQLite para almacenamiento offline
- 🎨 **Interfaz Moderna**: Diseño intuitivo y responsivo

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Dispositivo Android con la app **Expo Go** instalada

### Instalación

1. **Clona o descarga el proyecto**

```bash
cd app-gestor
```

2. **Instala las dependencias** (si no están instaladas)

```bash
npm install
```

3. **Inicia el servidor de desarrollo**

```bash
npx expo start
```

4. **Escanea el código QR**
   - Abre la app **Expo Go** en tu dispositivo Android
   - Escanea el código QR que aparece en la terminal
   - ¡La app se abrirá automáticamente!

## 📱 Uso de la Aplicación

### 1. Primera Vez

Al abrir la app por primera vez:
- La base de datos SQLite se creará automáticamente
- Ve a la pestaña **"Productos"** para agregar tu catálogo

### 2. Agregar Productos

- Toca el botón **"+ Agregar Producto"**
- Completa: nombre, precio y stock inicial
- Guarda el producto

### 3. Realizar una Venta

- Ve a la pestaña **"Ventas"**
- Toca los productos para agregarlos al carrito
- Ajusta las cantidades con los botones +/-
- Toca **"Finalizar Venta"**
- Elige si deseas generar el comprobante en PDF

### 4. Comprobantes en PDF

Cuando finalizas una venta:
- Se genera un PDF del comprobante
- Puedes compartirlo por WhatsApp, email, etc.
- El PDF se guarda automáticamente en tu dispositivo
- Puedes imprimirlo desde cualquier impresora compatible

### 5. Historial de Ventas

- Ve a la pestaña **"Historial"**
- Visualiza todas tus ventas realizadas
- Consulta el total de ventas del día
- Genera de nuevo el PDF de cualquier venta

## 🛠️ Tecnologías Utilizadas

- **Expo SDK 54**: Framework de desarrollo
- **React Native**: Framework móvil
- **TypeScript**: Tipado estático
- **expo-sqlite**: Base de datos local
- **expo-print**: Generación de PDFs
- **expo-sharing**: Compartir archivos
- **React Navigation**: Navegación por tabs

## 📁 Estructura del Proyecto

```
app-gestor/
├── App.tsx                      # Componente principal con navegación
├── src/
│   ├── components/              # Componentes reutilizables
│   │   ├── ProductCard.tsx
│   │   ├── SaleItem.tsx
│   │   └── ReceiptPreview.tsx
│   ├── screens/                 # Pantallas de la app
│   │   ├── SalesScreen.tsx
│   │   ├── ProductsScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/                # Lógica de negocio
│   │   ├── database.ts          # SQLite con expo-sqlite
│   │   ├── printer.ts           # Generación de PDFs
│   │   └── salesService.ts      # Lógica de ventas
│   ├── models/                  # Interfaces TypeScript
│   │   ├── Product.ts
│   │   ├── Sale.ts
│   │   └── SaleItem.ts
│   └── utils/                   # Utilidades
│       └── formatters.ts
└── package.json
```

## 🎯 Características Técnicas

### Base de Datos (expo-sqlite)

Tres tablas principales:
- **products**: id, name, price, stock, created_at
- **sales**: id, total, date, created_at
- **sale_items**: id, sale_id, product_id, quantity, price, subtotal

### Generación de PDFs (expo-print)

- Comprobantes con formato HTML profesional
- Incluye: encabezado, items, totales y pie de página
- Compatible con cualquier impresora
- Se puede compartir por cualquier app

### Navegación

- **Bottom Tabs** para navegación principal
- 4 pestañas: Ventas, Productos, Historial, Configuración
- Iconos intuitivos para cada sección

## 📦 Comandos Disponibles

```bash
# Iniciar en desarrollo
npx expo start

# Iniciar en Android
npx expo start --android

# Iniciar en web (opcional)
npx expo start --web

# Limpiar cache
npx expo start -c

# Generar APK (requiere EAS)
eas build --platform android
```

## 🔧 Configuración Avanzada

### Personalizar Nombre del Negocio

Edita `src/services/printer.ts`:

```typescript
const businessName = 'Tu Negocio Aquí';
```

### Modificar Formato del Comprobante

En `src/services/printer.ts`, función `generateReceiptHTML()`:
- Cambia los estilos CSS
- Agrega más información
- Personaliza el diseño

## ❓ Preguntas Frecuentes

### ¿Necesito Android Studio?

**NO**. Con Expo solo necesitas:
- La app Expo Go en tu teléfono
- Node.js en tu computadora
- ¡Eso es todo!

### ¿Funciona sin internet?

**SÍ**. Toda la app funciona offline:
- La base de datos es local (SQLite)
- No necesita conexión a internet
- Los datos se guardan en tu dispositivo

### ¿Puedo imprimir en cualquier impresora?

**SÍ**. El sistema genera PDFs que puedes:
- Imprimir desde cualquier impresora (WiFi, Bluetooth, USB)
- Compartir por WhatsApp, email, etc.
- Guardar en tu dispositivo
- Abrir en cualquier app de lectura de PDFs

### ¿Los datos están seguros?

**SÍ**. Los datos se guardan localmente en tu dispositivo usando SQLite.
No se envían a ningún servidor externo.

## 🐛 Solución de Problemas

### La app no se conecta

```bash
# Limpia el cache y reinicia
npx expo start -c
```

### Error al generar PDF

- Verifica los permisos de almacenamiento
- Asegúrate de tener espacio disponible en el dispositivo

### Error de dependencias

```bash
# Reinstala las dependencias
rm -rf node_modules
npm install
```

## 🚀 Generar APK para Distribución

Para crear un APK instalable:

1. **Instala EAS CLI**:
```bash
npm install -g eas-cli
```

2. **Configura tu cuenta de Expo**:
```bash
eas login
```

3. **Genera el APK**:
```bash
eas build --platform android --profile preview
```

4. **Descarga el APK** cuando termine el build

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Haz fork del proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas:
- Revisa la sección de **Configuración** en la app
- Consulta la documentación de [Expo](https://docs.expo.dev/)
- Revisa los logs en la terminal

---

**Desarrollado con ❤️ usando Expo + React Native + TypeScript**

¡Disfruta gestionando tus ventas! 🎉

