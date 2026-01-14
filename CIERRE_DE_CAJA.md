# Sistema de Cierre de Caja - Gestor de Ventas

## Descripción

Sistema completo de apertura y cierre de caja tipo POS con control de turnos, métodos de pago y cálculo automático de diferencias.

## Características Implementadas

### 1. Apertura de Caja (obligatoria para vender)
- **Modal de apertura** al iniciar sesión si no hay caja abierta
- Registro del **fondo inicial en efectivo**
- Asociado al usuario que abre (cajera/vendedor)
- Bloqueo de ventas hasta que se abra la caja

### 2. Métodos de Pago
Cada venta se registra con uno de los siguientes métodos:
- 💵 **Efectivo** (`cash`)
- 💳 **Tarjeta** (`card`)
- 📱 **Transferencia** (`transfer`)

Al confirmar una venta, se pregunta el método de pago antes de procesarla.

### 3. Cierre de Caja
El cierre de caja permite:
- Ver **totales de ventas** del turno por método de pago
- **Declarar montos recibidos** por cada método
- **Calcular diferencias** automáticamente
- Agregar **notas** sobre el cierre

#### Cálculo de Diferencias
- **Efectivo**: `Declarado - (Fondo Inicial + Ventas en Efectivo)`
- **Tarjeta**: `Declarado - Ventas en Tarjeta`
- **Transferencia**: `Declarado - Ventas en Transferencia`
- **Total**: Suma de todas las diferencias

### 4. Base de Datos

#### Nueva Tabla: `cash_sessions`
```sql
CREATE TABLE cash_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  opened_by_user_id INTEGER NOT NULL,
  closed_by_user_id INTEGER,
  opening_cash REAL NOT NULL DEFAULT 0,
  declared_cash REAL,
  declared_card REAL,
  declared_transfer REAL,
  sales_cash_total REAL NOT NULL DEFAULT 0,
  sales_card_total REAL NOT NULL DEFAULT 0,
  sales_transfer_total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### Nuevas Columnas en `sales`
- `cash_session_id INTEGER` - FK a la sesión de caja
- `payment_method TEXT NOT NULL DEFAULT 'cash'` - Método de pago usado

## Flujo de Uso

### Como Vendedor/Cajera

#### 1. Apertura de Caja
1. Al entrar a "Ventas", si no hay caja abierta, aparece modal de apertura
2. Ingresa el **fondo inicial** (dinero en efectivo con el que inicias)
3. Toca "Abrir Caja"
4. Ya puedes vender

#### 2. Realizar Ventas
1. Agrega productos al carrito como siempre
2. Toca "VENDER"
3. **SELECCIONA MÉTODO DE PAGO**:
   - 💵 Efectivo
   - 💳 Tarjeta
   - 📱 Transferencia
4. Confirma la venta
5. Genera comprobante PDF si deseas

#### 3. Cierre de Caja
1. Cuando termines tu turno, toca el botón **"🔒 Cerrar Caja"**
2. Verás el resumen de ventas del turno por método
3. **Declara los montos recibidos**:
   - Efectivo (cuenta el dinero físico en la caja)
   - Tarjeta (total de comprobantes de tarjeta)
   - Transferencia (total de comprobantes de transferencias)
4. El sistema calcula las diferencias automáticamente
5. Agrega notas si hay algo que reportar
6. Toca "Cerrar Caja"
7. Confirma el cierre

### Como Admin

Los administradores tienen las mismas funcionalidades que los vendedores para la caja, más:
- Acceso al historial de cierres (próximamente)
- Gestión de usuarios y roles

## Interpretación de Diferencias

### ✅ Sin Diferencias (0.00)
Todo cuadra perfectamente. Los montos declarados coinciden con las ventas registradas.

### ⚠️ Diferencia Positiva (+)
**SOBRANTE**: Hay más dinero del esperado.
- Ejemplo: Declaraste $105 pero esperabas $100 = +$5 sobrante

Posibles causas:
- Error al contar
- Venta no registrada
- Propina incluida

### ⚠️ Diferencia Negativa (-)
**FALTANTE**: Hay menos dinero del esperado.
- Ejemplo: Declaraste $95 pero esperabas $100 = -$5 faltante

Posibles causas:
- Error al contar
- Vuelto mal dado
- Dinero retirado sin registro

## Datos Almacenados en cada Cierre

- ✅ Hora de apertura y cierre
- ✅ Usuario que abrió y cerró
- ✅ Fondo inicial
- ✅ Ventas totales por método (calculado automáticamente)
- ✅ Montos declarados por método
- ✅ Diferencias por método (calculado)
- ✅ Notas del cierre

## Archivos Principales

### Nuevos Archivos
- `src/models/CashSession.ts` - Modelo de sesión de caja
- `src/screens/CashOpenScreen.tsx` - Pantalla de apertura
- `src/screens/CashCloseScreen.tsx` - Pantalla de cierre

### Archivos Modificados
- `src/services/database.ts` - Migración v3 + helpers de caja
- `src/models/Sale.ts` - Agregado payment_method y cash_session_id
- `src/services/salesService.ts` - Procesa ventas con método de pago
- `src/screens/SalesScreen.tsx` - Integración con apertura/cierre + selector de pago

## Ventajas del Sistema

✅ **Control total**: Sabes exactamente cuánto vendiste por cada método

✅ **Detección de errores**: Las diferencias te alertan de problemas

✅ **Auditoría**: Cada turno queda registrado con su cajera

✅ **Flexible**: Soporta múltiples métodos de pago

✅ **Fácil de usar**: Interfaz clara y flujo guiado

## Reportes Futuros (próximamente)

El sistema está preparado para agregar:
- 📊 Historial de cierres de caja
- 📈 Reporte de diferencias por cajera
- 📅 Cierres por rango de fechas
- 💰 Totales por método de pago
- 👥 Desempeño por vendedor

## Solución de Problemas

### No puedo vender
- **Causa**: No hay caja abierta
- **Solución**: Abre una caja desde el modal que aparece

### Las diferencias no coinciden
- **Revisa**: Que hayas declarado los montos correctos
- **Verifica**: El fondo inicial que ingresaste al abrir
- **Cuenta de nuevo**: El dinero físico antes de declarar

### Cerré la caja por error
- **Solución**: Abre una nueva caja para continuar vendiendo
- Los datos del cierre anterior quedan guardados

## Seguridad

- ✅ Solo usuarios autenticados pueden abrir/cerrar caja
- ✅ No se puede abrir otra caja sin cerrar la anterior
- ✅ Los totales se calculan automáticamente (no se pueden manipular)
- ✅ Cada cierre queda asociado al usuario que lo realizó

## Soporte

Para consultas o reportar problemas con el sistema de caja, contacta al administrador.

---

**Sistema implementado**: Enero 2026  
**Versión de BD**: 3

