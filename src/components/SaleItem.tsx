import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SaleItem as SaleItemModel } from '../models/SaleItem';
import { formatCurrency } from '../utils/formatters';

interface SaleItemProps {
  item: SaleItemModel;
  onRemove?: (item: SaleItemModel) => void;
  onUpdateQuantity?: (item: SaleItemModel, quantity: number) => void;
  showActions?: boolean;
}

export const SaleItem: React.FC<SaleItemProps> = ({
  item,
  onRemove,
  onUpdateQuantity,
  showActions = true,
}) => {
  const handleIncrement = () => {
    if (onUpdateQuantity) {
      onUpdateQuantity(item, item.quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (onUpdateQuantity && item.quantity > 1) {
      onUpdateQuantity(item, item.quantity - 1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.productName}>{item.product_name}</Text>
        <Text style={styles.price}>{formatCurrency(item.price)}</Text>
      </View>

      {showActions ? (
        <View style={styles.actions}>
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleDecrement}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={handleIncrement}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove && onRemove(item)}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readOnlyInfo}>
          <Text style={styles.quantity}>x{item.quantity}</Text>
        </View>
      )}

      <View style={styles.subtotal}>
        <Text style={styles.subtotalText}>{formatCurrency(item.subtotal)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
  },
  info: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#f44336',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  readOnlyInfo: {
    marginRight: 16,
  },
  subtotal: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

