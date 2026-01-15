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
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Product } from '../models/Product';
import { SaleItem as SaleItemModel } from '../models/SaleItem';
import { PaymentMethod, CashSession } from '../models/CashSession';
import { Sale } from '../models/Sale';
import * as db from '../services/database';
import * as salesService from '../services/salesService';
import * as printer from '../services/printer';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import { CashOpenScreen } from './CashOpenScreen';
import { CashCloseScreen } from './CashCloseScreen';

export const SalesScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [showCashOpenModal, setShowCashOpenModal] = useState(false);
  const [showCashCloseModal, setShowCashCloseModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<SaleItemModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [quantityInput, setQuantityInput] = useState('1');
  const [quickMode, setQuickMode] = useState(true); // Modo rápido activado por defecto
  const [showCartModal, setShowCartModal] = useState(false); // Modal del carrito
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false); // Modal de historial
  const [sessionSales, setSessionSales] = useState<Sale[]>([]); // Ventas de la sesión actual

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      checkCashSession();
    }, [])
  );

  const checkCashSession = async () => {
    try {
      const openSession = await db.getOpenCashSession();
      setCashSession(openSession);
      
      if (!openSession) {
        setShowCashOpenModal(true);
      }
    } catch (error) {
      console.error('Error al verificar sesión de caja:', error);
    }
  };

  const handleCashSessionSuccess = () => {
    checkCashSession();
  };

  const loadProducts = async () => {
    try {
      const allProducts = await db.getAllProducts();
      setProducts(allProducts);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los productos');
      console.error(error);
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

  const removeFromCart = (item: SaleItemModel) => {
    setCart(cart.filter(cartItem => cartItem.product_id !== item.product_id));
  };

  const updateCartItemQuantity = (item: SaleItemModel, newQuantity: number) => {
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

  const loadSessionSales = async () => {
    if (!cashSession?.id) {
      setSessionSales([]);
      return;
    }

    try {
      const sales = await db.getSalesByCashSession(cashSession.id);
      setSessionSales(sales);
    } catch (error) {
      console.error('Error al cargar ventas de la sesión:', error);
      setSessionSales([]);
    }
  };

  const handleShowSalesHistory = async () => {
    if (!cashSession) {
      Alert.alert('Error', 'No hay caja abierta');
      return;
    }
    await loadSessionSales();
    setShowSalesHistoryModal(true);
  };

  const getSessionTotal = (): number => {
    return sessionSales.reduce((sum, sale) => sum + sale.total, 0);
  };

  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return method;
    }
  };

  const calculateTotal = (): number => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSell = async () => {
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para realizar una venta');
      return;
    }

    if (!cashSession) {
      Alert.alert('Error', 'No hay caja abierta. Abre una caja para poder vender.');
      setShowCashOpenModal(true);
      return;
    }

    // Mostrar selector de método de pago antes de confirmar
    Alert.alert(
      'Método de Pago',
      `Total: ${formatCurrency(calculateTotal())}\nSelecciona el método de pago:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Efectivo', onPress: () => { setPaymentMethod('cash'); processSale(); } },
        { text: 'Tarjeta', onPress: () => { setPaymentMethod('card'); processSale(); } },
        { text: 'Transferencia', onPress: () => { setPaymentMethod('transfer'); processSale(); } },
      ]
    );
  };

  const processSale = async () => {
    try {
      setLoading(true);

      // Validar stock
      for (const item of cart) {
        const hasStock = await salesService.validateStock(item.product_id, item.quantity);
        if (!hasStock) {
          Alert.alert('Stock insuficiente', `No hay suficiente stock de ${item.product_name}`);
          return;
        }
      }

      // Procesar la venta
      const sale = await salesService.processSale(cart, currentUser?.id, paymentMethod, cashSession?.id);

      // Venta exitosa - limpiar carrito y recargar
      setCart([]);
      loadProducts();
      loadSessionSales(); // Actualizar historial de sesión
      
      Alert.alert('Venta realizada', `Venta #${sale.id} procesada correctamente`, [
        { text: 'OK', style: 'default' }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la venta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Buscador */}
      <View style={styles.searchSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Nueva Venta</Text>
          {cashSession && (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.salesButton}
                onPress={handleShowSalesHistory}
              >
                <Text style={styles.salesButtonText}>VENTAS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cashButton}
                onPress={() => setShowCashCloseModal(true)}
              >
                <Text style={styles.cashButtonText}>CERRAR CAJA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
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

      {/* Lista de productos disponibles - Pantalla completa */}
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
              <Text style={styles.cartSummaryTotal}>{formatCurrency(total)}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewCartButton}
              onPress={() => setShowCartModal(true)}
            >
              <Text style={styles.viewCartButtonText}>VER VENTA</Text>
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
            <Text style={styles.modalTitle}>Detalle de Venta</Text>
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
                  <Text style={styles.continueShoppingButtonText}>Seguir comprando</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer del Modal con totales y botones */}
          {cart.length > 0 && (
            <View style={styles.modalFooter}>
              <View style={styles.modalTotalContainer}>
                <Text style={styles.modalTotalLabel}>TOTAL:</Text>
                <Text style={styles.modalTotalAmount}>{formatCurrency(total)}</Text>
              </View>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.continueShoppingButtonFooter}
                  onPress={() => setShowCartModal(false)}
                >
                  <Text style={styles.continueShoppingButtonFooterText}>Seguir comprando</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={() => {
                    setShowCartModal(false);
                    handleSell();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.checkoutButtonText}>COBRAR</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Modales de Caja */}
      <CashOpenScreen
        visible={showCashOpenModal}
        onClose={() => setShowCashOpenModal(false)}
        onSuccess={handleCashSessionSuccess}
      />
      
      <CashCloseScreen
        visible={showCashCloseModal}
        session={cashSession}
        onClose={() => setShowCashCloseModal(false)}
        onSuccess={handleCashSessionSuccess}
      />

      {/* Modal de Historial de Ventas de la Sesión */}
      <Modal
        visible={showSalesHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSalesHistoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Header del Modal */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ventas de la Sesión</Text>
            <TouchableOpacity
              onPress={() => setShowSalesHistoryModal(false)}
              style={styles.closeModalButton}
            >
              <Text style={styles.closeModalButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Resumen Total */}
          <View style={styles.sessionSummary}>
            <Text style={styles.sessionSummaryLabel}>Total de la sesión:</Text>
            <Text style={styles.sessionSummaryTotal}>{formatCurrency(getSessionTotal())}</Text>
            <Text style={styles.sessionSummaryCount}>
              {sessionSales.length} {sessionSales.length === 1 ? 'venta' : 'ventas'}
            </Text>
          </View>

          {/* Lista de ventas */}
          <View style={styles.cartModalContent}>
            {sessionSales.length > 0 ? (
              <FlatList
                data={sessionSales}
                keyExtractor={item => item.id!.toString()}
                renderItem={({ item }) => (
                  <View style={styles.saleHistoryItem}>
                    <View style={styles.saleHistoryInfo}>
                      <Text style={styles.saleHistoryId}>Venta #{item.id}</Text>
                      <Text style={styles.saleHistoryDate}>{formatDate(item.date)}</Text>
                      <Text style={styles.saleHistoryPayment}>
                        {getPaymentMethodLabel(item.payment_method || 'cash')}
                      </Text>
                    </View>
                    <Text style={styles.saleHistoryTotal}>{formatCurrency(item.total)}</Text>
                  </View>
                )}
                style={styles.cartListModal}
              />
            ) : (
              <View style={styles.emptyCartModal}>
                <Text style={styles.emptyCartText}>Aún no hay ventas en esta sesión</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchSection: {
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  salesButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  salesButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cashButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cashButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCart: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 32,
    lineHeight: 24,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
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
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cartItemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666',
  },
  cartItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cartItemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
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
  sellButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  sellButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    paddingBottom: 16,
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
  checkoutButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos del Modal de Historial de Ventas
  sessionSummary: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sessionSummaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sessionSummaryTotal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  sessionSummaryCount: {
    fontSize: 12,
    color: '#666',
  },
  saleHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  saleHistoryInfo: {
    flex: 1,
  },
  saleHistoryId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  saleHistoryDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  saleHistoryPayment: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  saleHistoryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
