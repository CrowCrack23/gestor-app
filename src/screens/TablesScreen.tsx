import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as tableService from '../services/tableService';
import * as db from '../services/database';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';

type TableStatus = {
  tableNumber: number;
  isOccupied: boolean;
  tableOrder?: any;
};

export const TablesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { currentUser } = useAuth();
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxTables, setMaxTables] = useState(20);

  useFocusEffect(
    useCallback(() => {
      loadTables();
    }, [maxTables])
  );

  const loadTables = async () => {
    try {
      setLoading(true);
      const tablesStatus = await tableService.getTablesStatus(maxTables);
      setTables(tablesStatus);
    } catch (error) {
      console.error('Error al cargar mesas:', error);
      Alert.alert('Error', 'No se pudieron cargar las mesas');
    } finally {
      setLoading(false);
    }
  };

  const handleTablePress = async (table: TableStatus) => {
    if (table.isOccupied && table.tableOrder) {
      // Mesa ocupada - ir a detalles
      navigation.navigate('TableDetail', {
        tableOrderId: table.tableOrder.id,
        tableNumber: table.tableNumber,
      });
    } else {
      // Mesa libre - abrir mesa
      Alert.alert(
        `Mesa ${table.tableNumber}`,
        '¿Deseas abrir esta mesa?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir',
            onPress: async () => {
              try {
                setLoading(true);
                const cashSession = await db.getOpenCashSession();
                
                if (!cashSession) {
                  Alert.alert(
                    'Caja cerrada',
                    'Necesitas abrir una caja antes de abrir mesas'
                  );
                  return;
                }

                const tableOrderId = await tableService.openTable(
                  table.tableNumber,
                  currentUser?.id,
                  cashSession.id
                );

                // Navegar a detalles de la mesa
                navigation.navigate('TableDetail', {
                  tableOrderId,
                  tableNumber: table.tableNumber,
                });
              } catch (error: any) {
                console.error('Error al abrir mesa:', error);
                Alert.alert('Error', error.message || 'No se pudo abrir la mesa');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const renderTable = ({ item }: { item: TableStatus }) => {
    const isOccupied = item.isOccupied;
    const subtotal = item.tableOrder?.subtotal || 0;

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          isOccupied ? styles.tableOccupied : styles.tableFree,
        ]}
        onPress={() => handleTablePress(item)}
        disabled={loading}
      >
        <View style={styles.tableHeader}>
          <Text style={styles.tableNumber}>Mesa {item.tableNumber}</Text>
          <View
            style={[
              styles.statusDot,
              isOccupied ? styles.statusOccupied : styles.statusFree,
            ]}
          />
        </View>
        
        {isOccupied && (
          <View style={styles.tableInfo}>
            <Text style={styles.tableSubtotal}>
              {formatCurrency(subtotal)}
            </Text>
            <Text style={styles.tableItems}>
              {item.tableOrder?.items?.length || 0} productos
            </Text>
          </View>
        )}
        
        <Text style={styles.tableStatus}>
          {isOccupied ? 'Ocupada' : 'Disponible'}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && tables.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando mesas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesas</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.statusFree]} />
            <Text style={styles.legendText}>Libre</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.statusOccupied]} />
            <Text style={styles.legendText}>Ocupada</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={tables}
        renderItem={renderTable}
        keyExtractor={(item) => item.tableNumber.toString()}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        refreshing={loading}
        onRefresh={loadTables}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  grid: {
    padding: 16,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
  tableCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    justifyContent: 'space-between',
  },
  tableFree: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  tableOccupied: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f44336',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusFree: {
    backgroundColor: '#4CAF50',
  },
  statusOccupied: {
    backgroundColor: '#f44336',
  },
  tableInfo: {
    alignItems: 'center',
    marginVertical: 8,
  },
  tableSubtotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  tableItems: {
    fontSize: 12,
    color: '#666',
  },
  tableStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
});
