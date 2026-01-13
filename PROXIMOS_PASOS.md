# 🎯 Próximos Pasos para Ejecutar la Aplicación

## ¡Felicidades! Tu aplicación está lista 🎉

Ahora necesitas seguir estos pasos para ejecutar la aplicación en tu dispositivo Android.

## 📋 Pasos de Instalación

### 1️⃣ Instalar las Dependencias de Node.js

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

**Tiempo estimado:** 2-5 minutos dependiendo de tu conexión a internet.

### 2️⃣ Configurar el Entorno de Android

Asegúrate de tener instalado:
- ✅ Android Studio
- ✅ Java JDK 11 o superior
- ✅ Android SDK

**Variables de entorno necesarias:**

```bash
# Windows (PowerShell)
$env:ANDROID_HOME = "C:\Users\TU_USUARIO\AppData\Local\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools"

# O agrégalas de forma permanente en:
# Panel de Control → Sistema → Configuración avanzada del sistema → Variables de entorno
```

### 3️⃣ Preparar tu Dispositivo

**Opción A: Usar un Dispositivo Físico (Recomendado)**

1. Habilita las "Opciones de desarrollador" en tu Android:
   - Ve a Configuración → Acerca del teléfono
   - Toca 7 veces sobre "Número de compilación"
   
2. Habilita "Depuración USB":
   - Ve a Configuración → Sistema → Opciones de desarrollador
   - Activa "Depuración USB"

3. Conecta tu dispositivo Android a la PC con un cable USB

4. Verifica la conexión:
   ```bash
   adb devices
   ```
   Deberías ver tu dispositivo listado.

**Opción B: Usar un Emulador**

1. Abre Android Studio
2. Ve a Device Manager (AVD Manager)
3. Crea un nuevo dispositivo virtual (o usa uno existente)
4. Inicia el emulador

### 4️⃣ Ejecutar la Aplicación

Abre **DOS TERMINALES** en la carpeta del proyecto:

**Terminal 1 - Metro Bundler:**
```bash
npm start
```

**Terminal 2 - Ejecutar en Android:**
```bash
npm run android
```

O directamente:
```bash
npx react-native run-android
```

La aplicación se compilará e instalará automáticamente en tu dispositivo.

**Tiempo estimado:** 5-10 minutos la primera vez (compilación de Android).

## 📱 Configuración Inicial en la App

### Primera Vez que Abres la App

1. **La base de datos se crea automáticamente** ✅
2. **Ve a la pestaña "Productos"** y agrega algunos productos de prueba:
   - Ejemplo: "Café", precio: $2.50, stock: 100
   - Ejemplo: "Pan", precio: $1.00, stock: 50

3. **Ve a "Configuración"** y configura tu impresora MRBOSS:
   - Asegúrate de que tu impresora esté encendida
   - Asegúrate de que esté emparejada vía Bluetooth con tu dispositivo
   - Toca "Escanear Dispositivos"
   - Selecciona tu impresora
   - Haz una prueba de impresión

4. **Realiza tu primera venta** en la pestaña "Ventas":
   - Selecciona productos
   - Ajusta cantidades
   - Finaliza la venta
   - Imprime el comprobante

## 🐛 Solución de Problemas

### Error: "command not found: npm"

Necesitas instalar Node.js:
- Descarga desde: https://nodejs.org/
- Instala la versión LTS (recomendada)
- Reinicia tu terminal

### Error: "SDK location not found"

Crea el archivo `android/local.properties`:
```properties
sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Error: "JAVA_HOME not set"

Instala Java JDK 11:
- Descarga desde: https://adoptium.net/
- Configura la variable de entorno JAVA_HOME

### Error al instalar dependencias

```bash
# Limpiar todo
rm -rf node_modules
npm cache clean --force
npm install

# En Android
cd android
./gradlew clean
cd ..
```

### La app no se conecta a la impresora

1. **Verifica los permisos:**
   - Configuración → Apps → App Gestor Ventas → Permisos
   - Asegúrate de que tenga permisos de:
     - Ubicación (necesario para Bluetooth)
     - Archivos

2. **Verifica el emparejamiento:**
   - La impresora debe estar emparejada en Configuración de Android
   - No solo visible, debe estar emparejada

3. **Reinicia la impresora** y vuelve a intentar

## 📚 Comandos Útiles

```bash
# Ver dispositivos conectados
adb devices

# Ver logs en tiempo real
adb logcat | grep "ReactNative"

# Limpiar cache de Metro
npm start -- --reset-cache

# Limpiar compilación de Android
cd android
./gradlew clean
cd ..

# Generar APK para instalar en otros dispositivos
cd android
./gradlew assembleRelease
cd ..
# El APK estará en: android/app/build/outputs/apk/release/
```

## 🎓 Recursos de Aprendizaje

Si quieres personalizar la app:

- **React Native Docs:** https://reactnative.dev/docs/getting-started
- **TypeScript:** https://www.typescriptlang.org/docs/
- **React Navigation:** https://reactnavigation.org/docs/getting-started
- **SQLite:** https://github.com/andpor/react-native-sqlite-storage

## 📧 Archivos de Ayuda

- `README.md` - Documentación técnica completa
- `INSTRUCCIONES.md` - Guía de usuario detallada
- `PROYECTO_COMPLETO.md` - Resumen del proyecto

## ✅ Checklist Rápido

Antes de ejecutar, verifica:
- [ ] Node.js instalado (`node --version`)
- [ ] npm funcionando (`npm --version`)
- [ ] Android Studio configurado
- [ ] Variables de entorno ANDROID_HOME configuradas
- [ ] Dispositivo Android conectado o emulador iniciado
- [ ] Depuración USB habilitada (dispositivo físico)

## 🚀 ¡Listo!

Una vez que hayas seguido estos pasos, tu aplicación estará funcionando.

**¿Necesitas ayuda?** Revisa la sección de "Solución de Problemas" en el README.md

---

**¡Éxito con tu aplicación de gestión de ventas!** 💪

