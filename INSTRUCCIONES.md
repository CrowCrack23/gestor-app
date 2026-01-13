# Instrucciones de Instalación y Uso - App Gestor Ventas

## 🚀 Instalación Rápida

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Ejecutar en Android

```bash
# Terminal 1 - Metro Bundler
npm start

# Terminal 2 - Ejecutar en dispositivo/emulador
npm run android
```

## 📱 Primeros Pasos

### Configuración Inicial

1. **Primera vez que abres la app:**
   - La app creará automáticamente la base de datos SQLite
   - Verás las tres pestañas principales: Ventas, Productos, Historial y Configuración

2. **Agregar productos:**
   - Ve a la pestaña "Productos"
   - Toca "+ Agregar Producto"
   - Completa: nombre, precio y stock inicial
   - Guarda

3. **Configurar impresora MRBOSS:**
   - Ve a la pestaña "Configuración"
   - Asegúrate de que tu impresora esté emparejada vía Bluetooth
   - Toca "Escanear Dispositivos"
   - Selecciona tu impresora de la lista
   - Prueba la conexión con "Prueba de Impresión"

### Realizar tu Primera Venta

1. Ve a la pestaña "Ventas"
2. Toca los productos que deseas vender
3. Ajusta las cantidades con los botones +/-
4. Toca "Finalizar Venta"
5. Confirma la venta
6. Elige si deseas imprimir el comprobante

## 🔧 Solución de Problemas Comunes

### La aplicación no compila

```bash
# Limpiar cache
cd android
./gradlew clean
cd ..

# Reinstalar dependencias
rm -rf node_modules
npm install
```

### Error de permisos en Android

1. Ve a Configuración del dispositivo
2. Apps → App Gestor Ventas → Permisos
3. Asegúrate de que estén activados:
   - Ubicación (necesario para Bluetooth)
   - Archivos y multimedia
   - Ubicación física

### La impresora no se conecta

1. **Verificar emparejamiento:**
   - Ve a Configuración de Android → Bluetooth
   - Verifica que la impresora esté emparejada
   - Si no lo está, emparéjala primero

2. **Verificar que esté encendida:**
   - Asegúrate de que la impresora MRBOSS esté encendida
   - Verifica que tenga papel

3. **Permisos de Bluetooth:**
   - La app necesita permisos de ubicación para escanear Bluetooth
   - Acepta los permisos cuando la app los solicite

4. **Reiniciar conexión:**
   - Desconecta la impresora desde la app
   - Vuelve a escanear dispositivos
   - Conecta nuevamente

### La impresión no funciona correctamente

1. **Formato de caracteres:**
   - Algunos caracteres especiales pueden no imprimirse correctamente
   - La impresora MRBOSS debe ser compatible con ESC/POS

2. **Ajustar formato:**
   - Puedes modificar el archivo `src/services/printer.ts`
   - Ajusta el ancho de columnas según tu modelo de impresora

## 📋 Flujo de Trabajo Recomendado

### Para un Día de Ventas

1. **Al inicio del día:**
   - Verifica que tengas productos con stock
   - Conecta la impresora
   - Realiza una prueba de impresión

2. **Durante el día:**
   - Registra cada venta desde la pestaña "Ventas"
   - Imprime comprobantes según necesites
   - El stock se actualiza automáticamente

3. **Al final del día:**
   - Ve a "Historial"
   - Revisa el total de ventas del día
   - Puedes reimprimir comprobantes si es necesario

## 🔒 Backup de Datos

Los datos se almacenan localmente en:
```
/data/data/com.appgestor/databases/app_gestor.db
```

Para hacer backup (requiere dispositivo rooteado o adb):
```bash
adb backup -f backup.ab com.appgestor
```

## 📝 Personalización

### Cambiar nombre del negocio en comprobantes

Edita `src/services/printer.ts`:
```typescript
const businessName = 'Tu Negocio Aquí';
```

### Modificar formato de comprobante

En `src/services/printer.ts` puedes ajustar:
- Tamaño de fuente
- Alineación de texto
- Información adicional en el comprobante

### Cambiar colores de la app

Edita los archivos de estilos en cada pantalla (`StyleSheet.create`)

## 🆘 Soporte

### Reportar problemas

Si encuentras algún bug:
1. Verifica los logs de la consola
2. Toma captura de pantalla del error
3. Reporta con detalles del dispositivo y versión de Android

### Compatibilidad

- **Android mínimo:** 5.0 (API 21)
- **Android recomendado:** 8.0+ (API 26+)
- **Impresora:** Compatible con ESC/POS (MRBOSS)

## 📚 Recursos Adicionales

- [Documentación React Native](https://reactnative.dev/)
- [Comandos ESC/POS](https://reference.epson-biz.com/modules/ref_escpos/)
- [Configuración Bluetooth Android](https://developer.android.com/guide/topics/connectivity/bluetooth)

---

**¿Necesitas ayuda?** Consulta el archivo README.md para información técnica detallada.

