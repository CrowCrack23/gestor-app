# Sistema Multiusuario - Gestor de Ventas

## Descripción

La aplicación ahora incluye un sistema completo de autenticación local con dos roles de usuario: **Administrador** y **Vendedor**.

## Características Implementadas

### 1. Autenticación Local
- Sistema de login con usuario y PIN
- Persistencia de sesión con `expo-secure-store`
- Hash seguro de PINs usando SHA-256 con salt

### 2. Roles de Usuario

#### Administrador (admin)
- Acceso completo a todas las funcionalidades
- Puede gestionar productos (crear, editar, eliminar)
- Puede ver el historial de ventas
- Puede gestionar usuarios (crear vendedores, activar/desactivar, resetear PINs)
- Puede acceder a la configuración

#### Vendedor (seller)
- Solo puede acceder a la pantalla de Ventas
- Puede realizar ventas e imprimir comprobantes
- No puede gestionar productos ni ver historial completo
- Tiene botón "Salir" para cerrar sesión

### 3. Gestión de Usuarios
Los administradores pueden:
- Crear nuevos usuarios (admin o vendedor)
- Activar/desactivar usuarios
- Resetear PINs de vendedores
- Ver lista de todos los usuarios

### 4. Registro de Ventas
- Cada venta queda asociada al usuario que la realizó
- El nombre del vendedor aparece en los comprobantes PDF y vista previa

## Primer Uso

### Configuración Inicial
1. Al abrir la app por primera vez, se mostrará la pantalla de "Configuración Inicial"
2. Crea tu cuenta de administrador ingresando:
   - Nombre de usuario (mínimo 3 caracteres)
   - PIN (mínimo 4 dígitos)
   - Confirmación del PIN
3. Una vez creado, se iniciará sesión automáticamente

### Crear Vendedores
1. Inicia sesión como administrador
2. Ve a la pestaña "Usuarios" (👥)
3. Toca "+ Crear Usuario"
4. Completa el formulario:
   - Nombre de usuario
   - Rol (Vendedor)
   - PIN
5. El vendedor ya puede iniciar sesión

## Flujo de Uso

### Como Administrador
1. Inicia sesión con tu usuario admin
2. Accede a todas las pestañas: Ventas, Productos, Historial, Usuarios, Configuración
3. Gestiona vendedores desde la pestaña Usuarios
4. Cierra sesión desde la pestaña Configuración

### Como Vendedor
1. Inicia sesión con tu usuario vendedor
2. Solo verás la pestaña "Ventas"
3. Realiza ventas normalmente
4. Cierra sesión con el botón "Salir" en la esquina superior derecha

## Seguridad

- Los PINs se almacenan hasheados con SHA-256 + salt
- La sesión se guarda de forma segura con `expo-secure-store`
- No se puede desactivar el último administrador activo
- No puedes desactivar tu propia cuenta

## Base de Datos

### Nuevas Tablas
- `users`: almacena usuarios, roles, PINs hasheados
- Columna `user_id` agregada a `sales` para registrar quién hizo cada venta

### Migraciones
El sistema usa `PRAGMA user_version` para manejar migraciones automáticas. Al actualizar la app:
1. Se detecta la versión actual de la BD
2. Se aplican migraciones pendientes
3. Se actualiza la versión

## Archivos Principales

### Nuevos Archivos
- `src/models/User.ts` - Modelo de usuario
- `src/auth/cryptoService.ts` - Funciones de hash y verificación de PIN
- `src/auth/AuthContext.tsx` - Context de autenticación global
- `src/screens/SetupAdminScreen.tsx` - Configuración inicial
- `src/screens/LoginScreen.tsx` - Pantalla de login
- `src/screens/UsersScreen.tsx` - Gestión de usuarios (solo admin)

### Archivos Modificados
- `App.tsx` - Flujo de navegación condicional por rol
- `src/services/database.ts` - Migraciones y funciones de usuarios
- `src/services/salesService.ts` - Procesa ventas con user_id
- `src/models/Sale.ts` - Incluye user_id y username
- `src/screens/SalesScreen.tsx` - Pasa user_id al procesar venta
- `src/components/ReceiptPreview.tsx` - Muestra vendedor
- `src/services/printer.ts` - Incluye vendedor en PDF

## Dependencias Agregadas
- `expo-secure-store` - Almacenamiento seguro de sesión
- `expo-crypto` - Hash de PINs

## Instalación de Dependencias

Después de hacer pull de estos cambios, ejecuta:

```bash
npm install
```

O si usas Expo:

```bash
npx expo install expo-secure-store expo-crypto
```

## Solución de Problemas

### No puedo iniciar sesión
- Verifica que el usuario esté activo
- Asegúrate de ingresar el PIN correcto
- Si olvidaste el PIN del admin, necesitarás resetear la base de datos

### La app se queda en "Inicializando..."
- Verifica que las migraciones se hayan aplicado correctamente
- Revisa los logs de la consola para más detalles

### ¿Cómo resetear todo?
Para empezar de cero, elimina la base de datos:
- Android: `adb shell run-as <package_name> rm databases/app_gestor.db`
- iOS: Desinstala y reinstala la app

## Soporte

Para reportar problemas o sugerencias, contacta al desarrollador.

