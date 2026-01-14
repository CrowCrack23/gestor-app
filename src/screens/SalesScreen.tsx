import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Product } from '../models/Product';
import { SaleItem as SaleItemModel } from '../models/SaleItem';
import { PaymentMethod, CashSession } from '../models/CashSession';
import * as db from '../services/database';
import * as salesService from '../services/salesService';
import * as printer from '../services/printer';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import { CashOpenScreen } from './CashOpenScreen';
import { CashCloseScreen } from './CashCloseScreen';
import { HouseAccountModal } from './HouseAccountModal';

export const SalesScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [showCashOpenModal, setShowCashOpenModal] = useState(false);
  const [showCashCloseModal, setShowCashCloseModal] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [cart, setCart] = useState<SaleItemModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [quantityInput, setQuantityInput] = useState('1');

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
    
    if (text.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(true);
    }
  };

  const handleSelectProduct = (product: Product) => {
    const quantity = parseInt(quantityInput) || 1;
    
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

    // Limpiar búsqueda
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setQuantityInput('1');
  };

  const removeFromCart = (item: SaleItemModel) => {
    setCart(cart.filter(cartItem => cartItem.product_id !== item.product_id));
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
        { text: '💵 Efectivo', onPress: () => { setPaymentMethod('cash'); processSale(); } },
        { text: '💳 Tarjeta', onPress: () => { setPaymentMethod('card'); processSale(); } },
        { text: '📱 Transferencia', onPress: () => { setPaymentMethod('transfer'); processSale(); } },
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

      Alert.alert(
        'Venta realizada',
        '¿Deseas generar el comprobante en PDF?',
        [
          {
            text: 'No',
            onPress: () => {
              setCart([]);
              loadProducts();
            },
          },
          {
            text: 'Sí',
            onPress: async () => {
              try {
                await printer.printReceipt(sale);
              } catch (error) {
                console.error(error);
              } finally {
                setCart([]);
                loadProducts();
              }
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

  const handleHouseAccount = () => {
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para realizar una salida');
      return;
    }

    // No requiere sesión de caja abierta
    setShowHouseModal(true);
  };

  const processHouseAccount = async (notes: string) => {
    try {
      setLoading(true);
      setShowHouseModal(false);

      // Validar stock
      for (const item of cart) {
        const hasStock = await salesService.validateStock(item.product_id, item.quantity);
        if (!hasStock) {
          Alert.alert('Stock insuficiente', `No hay suficiente stock de ${item.product_name}`);
          return;
        }
      }

      // Procesar como cuenta casa (sin sesión de caja, total 0)
      await salesService.processSale(
        cart, 
        currentUser?.id, 
        'cash', 
        undefined, // No requiere cashSessionId
        undefined, // No tiene tableOrderId
        'house',   // Tipo de salida
        notes      // Notas opcionales
      );

      Alert.alert(
        '✅ Salida Registrada',
        'La salida de cuenta casa se registró correctamente. Los productos se descontaron del inventario.',
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              loadProducts();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la salida');
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
            <TouchableOpacity
              style={styles.cashButton}
              onPress={() => setShowCashCloseModal(true)}
            >
              <Text style={styles.cashButtonText}>🔒 Cerrar Caja</Text>
            </TouchableOpacity>
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
                keyExtractor={item => item.id!.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultStock}>Stock: {item.stock}</Text>
                    </View>
                    <Text style={styles.resultPrice}>{formatCurrency(item.price)}</Text>
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

      {/* Lista de productos en el carrito */}
      <View style={styles.cartSection}>
        <Text style={styles.sectionTitle}>Productos agregados:</Text>
        
        {cart.length === 0 ? (
          <Text style={styles.emptyCart}>
            No hay productos agregados.{'\n'}
            Busca y selecciona productos arriba.
          </Text>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={item => item.product_id.toString()}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.product_name}</Text>
                  <Text style={styles.cartItemQuantity}>Cantidad: {item.quantity}</Text>
                  <Text style={styles.cartItemPrice}>
                    {formatCurrency(item.price)} x {item.quantity}
                  </Text>
                </View>
                <View style={styles.cartItemRight}>
                  <Text style={styles.cartItemTotal}>{formatCurrency(item.subtotal)}</Text>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            style={styles.cartList}
          />
        )}
      </View>

      {/* Total y botón de vender */}
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.sellButton}
              onPress={handleSell}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sellButtonText}>💰 VENDER</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.houseButton}
              onPress={handleHouseAccount}
              disabled={loading}
            >
              <Text style={styles.houseButtonText}>🏠 CUENTA CASA</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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

      {/* Modal de Cuenta Casa */}
      <HouseAccountModal
        visible={showHouseModal}
        items={cart}
        onConfirm={processHouseAccount}
        onCancel={() => setShowHouseModal(false)}
      />
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
  cartSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sellButton: {
    flex: 1,
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
  houseButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  houseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
