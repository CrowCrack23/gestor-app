import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as db from '../services/database';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';

interface ReportData {
  totalSales: number;
  salesCount: number;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  byVendor: { username: string; total: number; count: number }[];
  byProduct: { name: string; quantity: number; total: number }[];
  byHour: { hour: number; count: number; total: number }[];
  topProducts: { name: string; quantity: number; total: number }[];
}

export const ReportsScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const { currentUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [period])
  );

  const getDateRange = (): { start: string; end: string } => {
    const now = new Date();
    const end = now.toISOString();
    let start: Date;

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start: start.toISOString(), end };
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Usar las funciones del módulo database
      const periodData = await db.getReportByPeriod(start, end);
      const byVendorData = await db.getReportByVendor(start, end);
      const topProductsData = await db.getTopProducts(start, end, 10);
      const byHourData = await db.getSalesByHour(start, end);

      setReportData({
        totalSales: periodData.totalSales,
        salesCount: periodData.salesCount,
        cashTotal: periodData.cashTotal,
        cardTotal: periodData.cardTotal,
        transferTotal: periodData.transferTotal,
        byVendor: byVendorData,
        byProduct: topProductsData,
        byHour: byHourData,
        topProducts: topProductsData.slice(0, 5),
      });
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      Alert.alert('Error', 'No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Acceso denegado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Reportes</Text>
        
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, period === 'today' && styles.periodButtonActive]}
            onPress={() => setPeriod('today')}
          >
            <Text style={[styles.periodButtonText, period === 'today' && styles.periodButtonTextActive]}>
              Hoy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 'week' && styles.periodButtonActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.periodButtonText, period === 'week' && styles.periodButtonTextActive]}>
              7 días
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.periodButtonText, period === 'month' && styles.periodButtonTextActive]}>
              Mes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : reportData ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Resumen General */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Resumen General</Text>
            <View style={styles.card}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Ventas:</Text>
                <Text style={styles.statValue}>{formatCurrency(reportData.totalSales)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Cantidad:</Text>
                <Text style={styles.statValue}>{reportData.salesCount} ventas</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Promedio:</Text>
                <Text style={styles.statValue}>
                  {reportData.salesCount > 0
                    ? formatCurrency(reportData.totalSales / reportData.salesCount)
                    : formatCurrency(0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Por Método de Pago */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Por Método de Pago</Text>
            <View style={styles.card}>
              <View style={styles.methodRow}>
                <Text style={styles.methodLabel}>💵 Efectivo:</Text>
                <Text style={styles.methodValue}>{formatCurrency(reportData.cashTotal)}</Text>
              </View>
              <View style={styles.methodRow}>
                <Text style={styles.methodLabel}>💳 Tarjeta:</Text>
                <Text style={styles.methodValue}>{formatCurrency(reportData.cardTotal)}</Text>
              </View>
              <View style={styles.methodRow}>
                <Text style={styles.methodLabel}>📱 Transferencia:</Text>
                <Text style={styles.methodValue}>{formatCurrency(reportData.transferTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Por Vendedor */}
          {reportData.byVendor.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👤 Por Vendedor</Text>
              {reportData.byVendor.map((vendor, index) => (
                <View key={index} style={styles.card}>
                  <View style={styles.vendorHeader}>
                    <Text style={styles.vendorName}>{vendor.username || 'Sin asignar'}</Text>
                    <Text style={styles.vendorTotal}>{formatCurrency(vendor.total)}</Text>
                  </View>
                  <Text style={styles.vendorCount}>{vendor.count} ventas</Text>
                </View>
              ))}
            </View>
          )}

          {/* Top Productos */}
          {reportData.topProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Top 5 Productos</Text>
              {reportData.topProducts.map((product, index) => (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productRank}>
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productQuantity}>{product.quantity} unidades vendidas</Text>
                  </View>
                  <Text style={styles.productTotal}>{formatCurrency(product.total)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Horas Pico */}
          {reportData.byHour.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Horas Pico</Text>
              {reportData.byHour.slice(0, 5).map((hourData, index) => (
                <View key={index} style={styles.hourCard}>
                  <Text style={styles.hourTime}>
                    {hourData.hour.toString().padStart(2, '0')}:00
                  </Text>
                  <View style={styles.hourStats}>
                    <Text style={styles.hourCount}>{hourData.count} ventas</Text>
                    <Text style={styles.hourTotal}>{formatCurrency(hourData.total)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {reportData.salesCount === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay ventas en este período</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
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
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    marginRight: 8,
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: 32,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  methodLabel: {
    fontSize: 16,
    color: '#666',
  },
  methodValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  vendorTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  vendorCount: {
    fontSize: 14,
    color: '#666',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productQuantity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  productTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  hourCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hourTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  hourStats: {
    alignItems: 'flex-end',
  },
  hourCount: {
    fontSize: 14,
    color: '#666',
  },
  hourTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

