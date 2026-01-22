import React, { useState, useCallback, useMemo } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TableOrder } from '../models/TableOrder';
import { TableOrderItem } from '../models/TableOrderItem';
import { Product } from '../models/Product';
import { SaleItem } from '../models/SaleItem';
import { PaymentMethod } from '../models/CashSession';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import * as db from '../services/database';
import * as tableService from '../services/tableService';
import * as salesService from '../services/salesService';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [quantityInput, setQuantityInput] = useState('1');
  
  // Nuevos estados para carrito temporal
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [quickMode, setQuickMode] = useState(true);
  const [showCartModal, setShowCartModal] = useState(false);

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
  };

  // Lista filtrada de productos para mostrar
  const filteredProducts = useMemo(() => {
    if (searchQuery.trim() === '') {
      return products; // Mostrar todos los productos si no hay búsqueda
    }
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleSelectProduct = (product: Product) => {
    // En modo rápido siempre usar cantidad 1, sino usar el input
    const quantity = quickMode ? 1 : (parseInt(quantityInput) || 1);
    
    if (quantity <= 0) {
      Alert.alert('Cantidad inválida', 'La cantidad debe ser mayor a 0');
      return;
    }

    if (quantity > product.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles`);
      return;
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = cart.find(item => item.product_id === product.id);

    if (existingItem) {
      // Actualizar cantidad
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles`);
        return;
      }
      
      const updatedCart = cart.map(item =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: salesService.calculateSubtotal(item.price, newQuantity),
            }
          : item
      );
      setCart(updatedCart);
    } else {
      // Agregar nuevo item
      const newItem = salesService.createSaleItemFromProduct(product, quantity);
      setCart([...cart, newItem]);
    }

    // En modo rápido no limpiar la búsqueda, solo en modo cantidad
    if (!quickMode) {
      setSearchQuery('');
      setQuantityInput('1');
    }
  };

  // Funciones del carrito temporal
  const removeFromCart = (item: SaleItem) => {
    setCart(cart.filter(cartItem => cartItem.product_id !== item.product_id));
  };

  const updateCartItemQuantity = (item: SaleItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(item);
      return;
    }

    // Buscar el producto para verificar stock
    const product = products.find(p => p.id === item.product_id);
    if (product && newQuantity > product.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles`);
      return;
    }

    const updatedCart = cart.map(cartItem =>
      cartItem.product_id === item.product_id
        ? {
            ...cartItem,
            quantity: newQuantity,
            subtotal: salesService.calculateSubtotal(cartItem.price, newQuantity),
          }
        : cartItem
    );
    setCart(updatedCart);
  };

  const getTotalItems = (): number => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const calculateTotal = (): number => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleAddToTable = async () => {
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para añadir a la mesa');
      return;
    }

    try {
      setLoading(true);
      
      // Agregar cada producto del carrito a la mesa
      for (const item of cart) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await tableService.addProductToTable(tableOrderId, product, item.quantity);
        }
      }

      // Limpiar carrito y recargar pedido
      setCart([]);
      await loadTableOrder();
      setShowCartModal(false);
      
      Alert.alert('Productos agregados', 'Los productos se agregaron correctamente a la mesa');
    } catch (error: any) {
      console.error('Error al agregar productos a la mesa:', error);
      Alert.alert('Error', error.message || 'No se pudieron agregar los productos');
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

    // Mostrar modal de método de pago
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (
    method: PaymentMethod, 
    cashAmount?: number, 
    transferAmount?: number,
    receivedAmount?: number,
    changeAmount?: number
  ) => {
    setShowPaymentModal(false);
    await processCheckout(method, cashAmount, transferAmount, receivedAmount, changeAmount);
  };

  const processCheckout = async (
    paymentMethod: PaymentMethod, 
    cashAmount?: number, 
    transferAmount?: number,
    receivedAmount?: number,
    changeAmount?: number
  ) => {
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
        cashSession.id,
        cashAmount,
        transferAmount,
        receivedAmount,
        changeAmount
      );

      setLoading(false);

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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelTable}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>✕ Cancelar</Text>
            </TouchableOpacity>
            {tableOrder.items && tableOrder.items.length > 0 && (
              <TouchableOpacity
                style={styles.headerCheckoutButton}
                onPress={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.headerCheckoutText}>Cobrar</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.subtitle}>
          {tableOrder.items?.length || 0} productos
        </Text>
        {tableOrder.items && tableOrder.items.length > 0 && (
          <View style={styles.headerTotalRow}>
            <Text style={styles.headerTotalLabel}>Total:</Text>
            <Text style={styles.headerTotalAmount}>{formatCurrency(tableOrder.subtotal)}</Text>
          </View>
        )}
      </View>

      {/* Buscador */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {!quickMode && (
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
          )}
        </View>

        {/* Toggle Modo Rápido */}
        <View style={styles.modeToggleContainer}>
          <Text style={styles.modeToggleLabel}>Modo Rápido (x1)</Text>
          <Switch
            value={quickMode}
            onValueChange={setQuickMode}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={quickMode ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Lista de productos disponibles */}
      <View style={styles.productsSection}>
        {filteredProducts.length > 0 ? (
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id!.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productItem}
                onPress={() => handleSelectProduct(item)}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productStock}>Stock: {item.stock}</Text>
                </View>
                <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
              </TouchableOpacity>
            )}
            style={styles.productsList}
            contentContainerStyle={styles.productsListContent}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.noResults}>No se encontraron productos</Text>
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

      {/* Barra inferior flotante con resumen del carrito */}
      {cart.length > 0 && (
        <View style={styles.floatingCartBar}>
          <TouchableOpacity
            style={styles.cartSummaryButton}
            onPress={() => setShowCartModal(true)}
          >
            <View style={styles.cartSummaryInfo}>
              <Text style={styles.cartSummaryText}>
                {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
              </Text>
              <Text style={styles.cartSummaryTotal}>{formatCurrency(calculateTotal())}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewCartButton}
              onPress={() => setShowCartModal(true)}
            >
              <Text style={styles.viewCartButtonText}>VER CARRITO</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal del Carrito Detallado */}
      <Modal
        visible={showCartModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCartModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Header del Modal */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Carrito Temporal</Text>
            <TouchableOpacity
              onPress={() => setShowCartModal(false)}
              style={styles.closeModalButton}
            >
              <Text style={styles.closeModalButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de items del carrito */}
          <View style={styles.cartModalContent}>
            {cart.length > 0 ? (
              <FlatList
                data={cart}
                keyExtractor={item => item.product_id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.cartItemModal}>
                    <View style={styles.cartItemModalInfo}>
                      <Text style={styles.cartItemModalName}>{item.product_name}</Text>
                      <Text style={styles.cartItemModalPrice}>
                        {formatCurrency(item.price)} c/u
                      </Text>
                    </View>
                    <View style={styles.cartItemModalActions}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateCartItemQuantity(item, item.quantity - 1)}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => {
                          const product = products.find(p => p.id === item.product_id);
                          if (product && item.quantity + 1 > product.stock) {
                            Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles`);
                            return;
                          }
                          updateCartItemQuantity(item, item.quantity + 1);
                        }}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cartItemModalRight}>
                      <Text style={styles.cartItemModalTotal}>{formatCurrency(item.subtotal)}</Text>
                      <TouchableOpacity
                        onPress={() => removeFromCart(item)}
                        style={styles.removeButtonModal}
                      >
                        <Text style={styles.removeButtonModalText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                style={styles.cartListModal}
              />
            ) : (
              <View style={styles.emptyCartModal}>
                <Text style={styles.emptyCartText}>El carrito está vacío</Text>
                <TouchableOpacity
                  style={styles.continueShoppingButton}
                  onPress={() => setShowCartModal(false)}
                >
                  <Text style={styles.continueShoppingButtonText}>Seguir agregando</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer del Modal con totales y botones */}
          {cart.length > 0 && (
            <View style={styles.modalFooter}>
              <View style={styles.modalTotalContainer}>
                <Text style={styles.modalTotalLabel}>TOTAL:</Text>
                <Text style={styles.modalTotalAmount}>{formatCurrency(calculateTotal())}</Text>
              </View>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.continueShoppingButtonFooter}
                  onPress={() => setShowCartModal(false)}
                >
                  <Text style={styles.continueShoppingButtonFooterText}>Seguir agregando</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addToTableButton}
                  onPress={handleAddToTable}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.addToTableButtonText}>AGREGAR A MESA</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal de Método de Pago */}
      <PaymentMethodModal
        visible={showPaymentModal}
        total={tableOrder?.subtotal || 0}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  headerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  headerTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  headerTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  headerCheckoutButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  headerCheckoutText: {
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
  // Estilos para modo rápido
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  modeToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  // Estilos para lista de productos
  productsSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  // Barra flotante del carrito
  floatingCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    paddingBottom: 35,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  cartSummaryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cartSummaryInfo: {
    flex: 1,
  },
  cartSummaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cartSummaryTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewCartButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos del Modal del Carrito
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  cartModalContent: {
    flex: 1,
    padding: 16,
  },
  cartListModal: {
    flex: 1,
  },
  cartItemModal: {
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
    alignItems: 'center',
  },
  cartItemModalInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartItemModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cartItemModalPrice: {
    fontSize: 14,
    color: '#666',
  },
  cartItemModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemModalRight: {
    alignItems: 'flex-end',
  },
  cartItemModalTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  removeButtonModal: {
    backgroundColor: '#f44336',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCartModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCartText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 24,
  },
  continueShoppingButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueShoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFooter: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  modalTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  modalTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  continueShoppingButtonFooter: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueShoppingButtonFooterText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addToTableButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  addToTableButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
