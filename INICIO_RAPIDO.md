# 🚀 Inicio Rápido - App Gestor de Ventas

## ¿Qué necesitas?

1. ✅ Node.js instalado en tu computadora
2. ✅ Un teléfono Android
3. ✅ La app **Expo Go** (gratis en Play Store)

## Pasos para Ejecutar

### 1️⃣ Abre una terminal en la carpeta del proyecto

```bash
cd app-gestor
```

### 2️⃣ Instala las dependencias (si no están instaladas)

```bash
npm install
```

**Tiempo estimado:** 2-3 minutos

### 3️⃣ Inicia el servidor

```bash
npx expo start
```

Verás algo como esto:

```
› Metro waiting on exp://192.168.1.10:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### 4️⃣ Abre la app en tu teléfono

**En Android:**
1. Abre la app **Expo Go** en tu teléfono
2. Toca "Scan QR Code"
3. Escanea el código QR que aparece en la terminal
4. ¡La app se abrirá automáticamente! 🎉

**Asegúrate de:**
- ✅ Tu teléfono y tu computadora estén en la **misma red WiFi**
- ✅ Tu firewall no bloquee la conexión

## 🎯 ¡Listo para Usar!

### Primera vez en la app:

1. **Agrega productos**
   - Ve a la pestaña "📦 Productos"
   - Toca "+ Agregar Producto"
   - Completa: nombre, precio y stock
   - Ejemplo: "Café", $2.50, Stock: 100

2. **Realiza tu primera venta**
   - Ve a "💰 Ventas"
   - Toca productos para agregarlos al carrito
   - Ajusta cantidades con +/-
   - Toca "Finalizar Venta"

3. **Genera el comprobante**
   - Se creará un PDF automáticamente
   - Puedes compartirlo o imprimirlo

## 📱 Ventajas de Usar Expo Go

- ⚡ **Hot Reload**: Los cambios se ven al instante
- 🔄 **Sin compilación**: No necesitas Android Studio
- 🚀 **Rápido**: De código a teléfono en segundos
- 🌐 **Desarrollo remoto**: Prueba en varios dispositivos

## 🐛 Problemas Comunes

### "Could not connect to Metro"

**Solución:**
```bash
# Limpia cache y reinicia
npx expo start -c
```

### No aparece el código QR

**Solución:**
```bash
# Usa túnel si hay problemas de red
npx expo start --tunnel
```

### Error al escanear QR

**Verifica:**
- Ambos dispositivos en la misma red WiFi
- Firewall no bloquea el puerto 8081
- Expo Go actualizado a la última versión

## 💡 Consejos

1. **Mantén la terminal abierta** mientras usas la app
2. **Recarga la app** sacudiendo el teléfono → "Reload"
3. **Ver logs** en la terminal para debuggear
4. **Modo túnel** si tienes problemas de red: `npx expo start --tunnel`

## 🎓 Próximos Pasos

Una vez que la app funcione:

1. ✅ Familiarízate con las 4 pestañas
2. ✅ Agrega varios productos de prueba
3. ✅ Realiza algunas ventas
4. ✅ Genera PDFs de comprobantes
5. ✅ Revisa el historial

## 🆘 ¿Necesitas Ayuda?

- 📖 Lee el **README.md** completo
- 🌐 Consulta [docs.expo.dev](https://docs.expo.dev/)
- ⚙️ Revisa la pestaña "Configuración" en la app

---

**¡Disfruta tu nueva app de gestión de ventas!** 🎉

**Tiempo total desde cero hasta app funcionando: ~5 minutos** ⏱️

