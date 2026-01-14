import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Sale } from '../models/Sale';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ReceiptPreviewProps {
  sale: Sale;
  businessName?: string;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  sale,
  businessName = 'Mi Negocio',
}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.receipt}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.divider}>================================</Text>
          <Text style={styles.businessName}>{businessName}</Text>
          <Text style={styles.divider}>================================</Text>
        </View>

        {/* Información de la venta */}
        <View style={styles.info}>
          <Text style={styles.infoText}>Fecha: {formatDate(sale.date)}</Text>
          <Text style={styles.infoText}>Venta #: {sale.id || 'Nueva'}</Text>
          {sale.username && (
            <Text style={styles.infoText}>Vendedor: {sale.username}</Text>
          )}
          <Text style={styles.divider}>--------------------------------</Text>
        </View>

        {/* Items */}
        <View style={styles.items}>
          <Text style={styles.itemsHeader}>PRODUCTO              CANT  PRECIO</Text>
          <Text style={styles.divider}>--------------------------------</Text>
          {sale.items?.map((item, index) => {
            const productName = item.product_name || 'Producto';
            const truncatedName =
              productName.length > 20
                ? productName.substring(0, 17) + '...'
                : productName.padEnd(20, ' ');
            const quantity = item.quantity.toString().padStart(4, ' ');
            const subtotal = formatCurrency(item.subtotal).padStart(8, ' ');

            return (
              <Text key={index} style={styles.itemText}>
                {truncatedName} {quantity} {subtotal}
              </Text>
            );
          })}
        </View>

        {/* Total */}
        <View style={styles.total}>
          <Text style={styles.divider}>--------------------------------</Text>
          <Text style={styles.totalText}>
            TOTAL: {formatCurrency(sale.total)}
          </Text>
        </View>

        {/* Pie de página */}
        <View style={styles.footer}>
          <Text style={styles.divider}>================================</Text>
          <Text style={styles.footerText}>Gracias por su compra</Text>
          <Text style={styles.divider}>================================</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  receipt: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  divider: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  info: {
    marginBottom: 16,
  },
  infoText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  items: {
    marginBottom: 16,
  },
  itemsHeader: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  total: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
});

