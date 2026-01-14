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
import { Sale } from '../models/Sale';
import { ReceiptPreview } from '../components/ReceiptPreview';
import * as db from '../services/database';
import * as printer from '../services/printer';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';

export const HistoryScreen: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const { currentUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, [])
  );

  const loadSales = async () => {
    try {
      setLoading(true);
      const allSales = await db.getAllSales();
      setSales(allSales);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las ventas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSale = async (sale: Sale) => {
    try {
      setLoading(true);
      const saleWithItems = await db.getSaleById(sale.id!);
      if (saleWithItems) {
        setSelectedSale(saleWithItems);
        setShowPreview(true);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la venta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSale = async (sale: Sale) => {
    Alert.alert(
      'Generar PDF',
      `¿Deseas generar el PDF del comprobante de la venta #${sale.id}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar PDF',
          onPress: async () => {
            try {
              setLoading(true);
              const saleWithItems = await db.getSaleById(sale.id!);
              if (saleWithItems) {
                await printer.printReceipt(saleWithItems);
              }
            } catch (error) {
              Alert.alert(
                'Error',
                'No se pudo generar el PDF'
              );
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getTodayTotal = (): number => {
    const today = new Date().toISOString().split('T')[0];
    return sales
      .filter(sale => sale.date.startsWith(today) && !sale.voided_at)
      .reduce((sum, sale) => sum + sale.total, 0);
  };

  const handleVoidSale = (sale: Sale) => {
    if (sale.voided_at) {
      Alert.alert('Error', 'Esta venta ya está anulada');
      return;
    }

    setSelectedSale(sale);
    setShowVoidModal(true);
  };

  const confirmVoidSale = async () => {
    if (!voidReason.trim()) {
      Alert.alert('Error', 'Debes ingresar un motivo de anulación');
      return;
    }

    if (!selectedSale) return;

    try {
      setLoading(true);
      await db.voidSale(selectedSale.id!, currentUser!.id!, voidReason.trim());
      Alert.alert('Éxito', 'Venta anulada correctamente');
      setShowVoidModal(false);
      setVoidReason('');
      setSelectedSale(null);
      loadSales();
    } catch (error) {
      console.error('Error al anular venta:', error);
      Alert.alert('Error', 'No se pudo anular la venta');
    } finally {
      setLoading(false);
    }
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <View style={[styles.saleCard, item.voided_at && styles.voidedCard]}>
      <View style={styles.saleHeader}>
        <View>
          <Text style={styles.saleId}>Venta #{item.id}</Text>
          <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
          {item.voided_at && (
            <Text style={styles.voidedBadge}>❌ ANULADA</Text>
          )}
        </View>
        <Text style={[styles.saleTotal, item.voided_at && styles.voidedTotal]}>
          {formatCurrency(item.total)}
        </Text>
      </View>

      <View style={styles.saleActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleViewSale(item)}
        >
          <Text style={styles.viewButtonText}>👁 Ver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.printButton}
          onPress={() => handlePrintSale(item)}
        >
          <Text style={styles.printButtonText}>📄 PDF</Text>
        </TouchableOpacity>
        {!item.voided_at && currentUser?.role === 'admin' && (
          <TouchableOpacity
            style={styles.voidButton}
            onPress={() => handleVoidSale(item)}
          >
            <Text style={styles.voidButtonText}>❌</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Ventas</Text>
        <View style={styles.todayTotal}>
          <Text style={styles.todayTotalLabel}>Ventas de hoy:</Text>
          <Text style={styles.todayTotalAmount}>
            {formatCurrency(getTodayTotal())}
          </Text>
        </View>
      </View>

      {loading && sales.length === 0 ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={item => item.id!.toString()}
          renderItem={renderSale}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No hay ventas registradas. Realiza tu primera venta.
            </Text>
          }
        />
      )}

      {/* Modal de Vista Previa */}
      <Modal visible={showPreview} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Venta #{selectedSale?.id}
            </Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedSale && <ReceiptPreview sale={selectedSale} />}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalPrintButton}
              onPress={async () => {
                if (selectedSale) {
                  try {
                    await printer.printReceipt(selectedSale);
                  } catch (error) {
                    Alert.alert(
                      'Error',
                      'No se pudo generar el PDF'
                    );
                    console.error(error);
                  }
                }
              }}
            >
              <Text style={styles.modalPrintButtonText}>Generar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Anulación */}
      <Modal
        visible={showVoidModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVoidModal(false)}
      >
        <View style={styles.voidModalOverlay}>
          <View style={styles.voidModalContent}>
            <Text style={styles.voidModalTitle}>Anular Venta #{selectedSale?.id}</Text>
            <Text style={styles.voidModalSubtitle}>
              Esta acción revertirá el stock de los productos
            </Text>

            <Text style={styles.voidLabel}>Motivo de anulación:</Text>
            <TextInput
              style={styles.voidInput}
              value={voidReason}
              onChangeText={setVoidReason}
              placeholder="Ej: Error en el cobro, devolución, etc."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <View style={styles.voidButtons}>
              <TouchableOpacity
                style={styles.voidCancelButton}
                onPress={() => {
                  setShowVoidModal(false);
                  setVoidReason('');
                }}
              >
                <Text style={styles.voidCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.voidConfirmButton}
                onPress={confirmVoidSale}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.voidConfirmText}>Anular Venta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  todayTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  todayTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  todayTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  loader: {
    marginTop: 32,
  },
  list: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
    fontSize: 16,
  },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  voidedCard: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
  },
  saleTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  voidedTotal: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  voidedBadge: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: 'bold',
    marginTop: 4,
  },
  saleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  viewButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  printButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  printButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  voidButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  voidButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  voidModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voidModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  voidModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  voidModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  voidLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  voidInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  voidButtons: {
    flexDirection: 'row',
  },
  voidCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    marginRight: 8,
  },
  voidCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  voidConfirmButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  voidConfirmText: {
    color: '#fff',
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
    backgroundColor: '#fff',
    elevation: 2,
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
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    elevation: 4,
  },
  modalPrintButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalPrintButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

