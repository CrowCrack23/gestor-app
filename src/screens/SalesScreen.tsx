import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Product } from '../models/Product';
import { SaleItem as SaleItemModel } from '../models/SaleItem';
import { ProductCard } from '../components/ProductCard';
import { SaleItem } from '../components/SaleItem';
import { ReceiptPreview } from '../components/ReceiptPreview';
import * as db from '../services/database';
import * as salesService from '../services/salesService';
import * as printer from '../services/printer';
import { formatCurrency } from '../utils/formatters';

export const SalesScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<SaleItemModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Cargar productos cuando la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const loadProducts = async () => {
    try {
      setLoading(true);
      const allProducts = await db.getAllProducts();
      setProducts(allProducts);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los productos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);

    if (existingItem) {
      // Si ya existe, incrementar cantidad
      updateItemQuantity(existingItem, existingItem.quantity + 1);
    } else {
      // Agregar nuevo item
      const newItem = salesService.createSaleItemFromProduct(product, 1);
      setCart([...cart, newItem]);
    }
  };

  const updateItemQuantity = (item: SaleItemModel, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(item);
      return;
    }

    const updatedCart = cart.map(cartItem =>
      cartItem.product_id === item.product_id
        ? {
            ...cartItem,
            quantity,
            subtotal: salesService.calculateSubtotal(cartItem.price, quantity),
          }
        : cartItem
    );
    setCart(updatedCart);
  };

  const removeFromCart = (item: SaleItemModel) => {
    setCart(cart.filter(cartItem => cartItem.product_id !== item.product_id));
  };

  const calculateTotal = (): number => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para realizar una venta');
      return;
    }

    Alert.alert(
      'Confirmar Venta',
      `Total: ${formatCurrency(calculateTotal())}\n¿Deseas finalizar la venta?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: processSale },
      ]
    );
  };

  const processSale = async () => {
    try {
      setLoading(true);

      // Validar stock
      for (const item of cart) {
        const hasStock = await salesService.validateStock(
          item.product_id,
          item.quantity
        );
        if (!hasStock) {
          Alert.alert(
            'Stock insuficiente',
            `No hay suficiente stock de ${item.product_name}`
          );
          return;
        }
      }

      // Procesar la venta
      const sale = await salesService.processSale(cart);

      // Preguntar si desea imprimir
      Alert.alert(
        'Venta realizada',
        '¿Deseas imprimir el comprobante?',
        [
          {
            text: 'No',
            onPress: () => {
              clearCart();
              loadProducts(); // Recargar productos para actualizar stock
            },
          },
          {
            text: 'Sí',
            onPress: async () => {
              try {
                await printer.printReceipt(sale);
                Alert.alert('Éxito', 'Comprobante impreso correctamente');
              } catch (error) {
                Alert.alert(
                  'Error de impresión',
                  'No se pudo imprimir el comprobante. Verifica la conexión con la impresora.'
                );
                console.error(error);
              } finally {
                clearCart();
                loadProducts();
              }
            },
          },
          {
            text: 'Vista previa',
            onPress: () => {
              setShowPreview(true);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la venta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = calculateTotal();

  if (showPreview && cart.length > 0) {
    const previewSale = {
      total,
      date: new Date().toISOString(),
      items: cart,
    };

    return (
      <Modal visible={showPreview} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vista Previa</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ReceiptPreview sale={previewSale} />
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => {
              setShowPreview(false);
              clearCart();
              loadProducts();
            }}
          >
            <Text style={styles.closeModalButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      {/* Lista de productos */}
      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>Productos</Text>
        {loading && products.length === 0 ? (
          <ActivityIndicator size="large" color="#2196F3" />
        ) : (
          <FlatList
            data={products}
            keyExtractor={item => item.id!.toString()}
            renderItem={({ item }) => (
              <ProductCard product={item} onPress={addToCart} />
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No hay productos disponibles. Agrega productos en la sección de Productos.
              </Text>
            }
          />
        )}
      </View>

      {/* Carrito */}
      <View style={styles.cartSection}>
        <View style={styles.cartHeader}>
          <Text style={styles.sectionTitle}>Carrito</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearButton}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {cart.length === 0 ? (
          <Text style={styles.emptyCart}>El carrito está vacío</Text>
        ) : (
          <>
            <FlatList
              data={cart}
              keyExtractor={item => item.product_id.toString()}
              renderItem={({ item }) => (
                <SaleItem
                  item={item}
                  onRemove={removeFromCart}
                  onUpdateQuantity={updateItemQuantity}
                />
              )}
              style={styles.cartList}
            />

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
            </View>

            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinalizeSale}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.finishButtonText}>Finalizar Venta</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  productsSection: {
    flex: 1,
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  cartSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
    fontSize: 16,
  },
  emptyCart: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
    fontSize: 16,
  },
  cartList: {
    flex: 1,
    marginBottom: 16,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#333',
    padding: 8,
  },
  closeModalButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

