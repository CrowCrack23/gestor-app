import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Product } from '../models/Product';
import { formatCurrency } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const isOutOfStock = product.stock <= 0;

  return (
    <TouchableOpacity
      style={[styles.card, isOutOfStock && styles.cardDisabled]}
      onPress={() => !isOutOfStock && onPress(product)}
      disabled={isOutOfStock}
    >
      <View style={styles.cardContent}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        <Text style={[styles.stock, isOutOfStock && styles.stockOut]}>
          Stock: {product.stock}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'column',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  stock: {
    fontSize: 14,
    color: '#666',
  },
  stockOut: {
    color: '#f44336',
    fontWeight: '600',
  },
});

