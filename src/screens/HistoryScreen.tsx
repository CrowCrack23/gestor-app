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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Sale } from '../models/Sale';
import { ReceiptPreview } from '../components/ReceiptPreview';
import * as db from '../services/database';
import * as printer from '../services/printer';
import { formatCurrency, formatDate } from '../utils/formatters';

export const HistoryScreen: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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
      .filter(sale => sale.date.startsWith(today))
      .reduce((sum, sale) => sum + sale.total, 0);
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleId}>Venta #{item.id}</Text>
        <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
      </View>

      <Text style={styles.saleTotal}>{formatCurrency(item.total)}</Text>

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
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
    </View>
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
    marginBottom: 12,
  },
  saleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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

