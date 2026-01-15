import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TableOrder } from '../models/TableOrder';
import { TableOrderItem } from '../models/TableOrderItem';
import { Product } from '../models/Product';
import { PaymentMethod } from '../models/CashSession';
import * as db from '../services/database';
import * as tableService from '../services/tableService';
import * as printer from '../services/printer';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';

type Props = {
  route: {
    params: {
      tableOrderId: number;
      tableNumber: number;
    };
  };
};

export const TableDetailScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { currentUser } = useAuth();
  const { tableOrderId, tableNumber } = route.params;

  const [tableOrder, setTableOrder] = useState<TableOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantityInput, setQuantityInput] = useState('1');

  useFocusEffect(
    useCallback(() => {
      loadTableOrder();
      loadProducts();
    }, [tableOrderId])
  );

  const loadTableOrder = async () => {
    try {
      const order = await db.getTableOrderById(tableOrderId);
      if (!order) {
        Alert.alert('Error', 'Pedido no encontrado');
        navigation.goBack();
        return;
      }
      setTableOrder(order);
    } catch (error) {
      console.error('Error al cargar pedido:', error);
      Alert.alert('Error', 'No se pudo cargar el pedido');
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await db.getAllProducts();
      setProducts(allProducts);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
    } else {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(true);
    }
  };

  const handleSelectProduct = async (product: Product) => {
    const quantity = parseInt(quantityInput) || 1;

    if (quantity <= 0) {
      Alert.alert('Cantidad inválida', 'La cantidad debe ser mayor a 0');
      return;
    }

    if (quantity > product.stock) {
      Alert.alert(
        'Stock insuficiente',
        `Solo hay ${product.stock} unidades disponibles`
      );
      return;
    }

    try {
      setLoading(true);
      await tableService.addProductToTable(tableOrderId, product, quantity);
      await loadTableOrder();

      // Limpiar búsqueda
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setQuantityInput('1');
    } catch (error: any) {
      console.error('Error al agregar producto:', error);
      Alert.alert('Error', error.message || 'No se pudo agregar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = (item: TableOrderItem) => {
    Alert.prompt(
      'Actualizar cantidad',
      `Cantidad actual: ${item.quantity}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async (text) => {
            const newQuantity = parseInt(text || '0');
            if (newQuantity <= 0) {
              Alert.alert('Error', 'La cantidad debe ser mayor a 0');
              return;
            }

            try {
              setLoading(true);
              await tableService.updateTableItemQuantity(item.id!, newQuantity);
              await loadTableOrder();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo actualizar');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      'plain-text',
      item.quantity.toString(),
      'number-pad'
    );
  };

  const handleRemoveItem = (item: TableOrderItem) => {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar ${item.product_name} del pedido?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await tableService.removeTableItem(item.id!);
              await loadTableOrder();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCheckout = async () => {
    if (!tableOrder || !tableOrder.items || tableOrder.items.length === 0) {
      Alert.alert('Pedido vacío', 'Agrega productos antes de cobrar');
      return;
    }

    // Seleccionar método de pago
    Alert.alert(
      'Método de Pago',
      `Total: ${formatCurrency(tableOrder.subtotal)}\nSelecciona el método de pago:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '💵 Efectivo',
          onPress: () => processCheckout('cash'),
        },
        {
          text: '💳 Tarjeta',
          onPress: () => processCheckout('card'),
        },
        {
          text: '📱 Transferencia',
          onPress: () => processCheckout('transfer'),
        },
      ]
    );
  };

  const processCheckout = async (paymentMethod: PaymentMethod) => {
    try {
      setLoading(true);

      const cashSession = await db.getOpenCashSession();
      if (!cashSession) {
        Alert.alert(
          'Error',
          'No hay caja abierta. Abre una caja para poder cobrar.'
        );
        return;
      }

      // Procesar el cobro
      const sale = await tableService.checkoutTable(
        tableOrderId,
        paymentMethod,
        currentUser?.id,
        cashSession.id
      );

      // Intentar imprimir automáticamente (o preguntar si falla)
      try {
        await printer.printReceipt(sale);
        
        // Si llegamos aquí, se imprimió o se generó PDF exitosamente
        Alert.alert(
          'Cobro exitoso', 
          'Venta registrada correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (printError) {
        console.error('Error impresión:', printError);
        // Aun si falla impresión, la venta se hizo
        Alert.alert(
          'Cobro exitoso',
          'Venta registrada, pero hubo un error al imprimir.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Error al cobrar:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar el cobro');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTable = () => {
    Alert.alert(
      'Cancelar mesa',
      '¿Estás seguro de cancelar este pedido? Se perderá toda la información.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await tableService.cancelTable(tableOrderId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cancelar');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!tableOrder) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mesa {tableNumber}</Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelTable}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>✕ Cancelar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {tableOrder.items?.length || 0} productos
        </Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto para agregar..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Cant:</Text>
            <TextInput
              style={styles.quantityInput}
              value={quantityInput}
              onChangeText={setQuantityInput}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>

        {/* Resultados de búsqueda */}
        {showSearchResults && (
          <View style={styles.searchResultsContainer}>
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id!.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultStock}>
                        Stock: {item.stock}
                      </Text>
                    </View>
                    <Text style={styles.resultPrice}>
                      {formatCurrency(item.price)}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
              />
            ) : (
              <Text style={styles.noResults}>No se encontraron productos</Text>
            )}
          </View>
        )}
      </View>

      {/* Lista de productos en el pedido */}
      <View style={styles.itemsSection}>
        <Text style={styles.sectionTitle}>Productos en la mesa:</Text>

        {!tableOrder.items || tableOrder.items.length === 0 ? (
          <Text style={styles.emptyItems}>
            No hay productos agregados.{'\n'}
            Busca y selecciona productos arriba.
          </Text>
        ) : (
          <FlatList
            data={tableOrder.items}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQuantity}>
                    Cantidad: {item.quantity}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.price)} x {item.quantity}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemTotal}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => handleUpdateQuantity(item)}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            style={styles.itemsList}
          />
        )}
      </View>

      {/* Footer con total y botón de cobrar */}
      {tableOrder.items && tableOrder.items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(tableOrder.subtotal)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutButtonText}>💰 COBRAR</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  quantityInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    width: 50,
    textAlign: 'center',
    paddingVertical: 12,
  },
  searchResultsContainer: {
    marginTop: 12,
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultStock: {
    fontSize: 12,
    color: '#666',
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  noResults: {
    padding: 16,
    textAlign: 'center',
    color: '#999',
  },
  itemsSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyItems: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 32,
    lineHeight: 24,
  },
  itemsList: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#f44336',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
