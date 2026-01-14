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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CashSession } from '../models/CashSession';
import * as db from '../services/database';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const CashHistoryScreen: React.FC = () => {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const { currentUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    try {
      setLoading(true);
      const allSessions = await db.listCashSessions(100);
      setSessions(allSessions);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los cierres');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (session: CashSession) => {
    setSelectedSession(session);
    setShowDetail(true);
  };

  const generatePDF = async (session: CashSession) => {
    try {
      const diffCash = (session.declared_cash || 0) - (session.opening_cash + session.sales_cash_total);
      const diffCard = (session.declared_card || 0) - session.sales_card_total;
      const diffTransfer = (session.declared_transfer || 0) - session.sales_transfer_total;
      const diffTotal = diffCash + diffCard + diffTransfer;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { text-align: center; color: #2196F3; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; font-size: 18px; }
            .diff-positive { color: #4CAF50; }
            .diff-negative { color: #f44336; }
            .section { margin: 30px 0; }
          </style>
        </head>
        <body>
          <h1>Reporte de Cierre de Caja #${session.id}</h1>
          
          <div class="section">
            <h2>Información del Turno</h2>
            <table>
              <tr><td><strong>Abierto por:</strong></td><td>${session.opened_by_username}</td></tr>
              <tr><td><strong>Fecha apertura:</strong></td><td>${formatDate(session.opened_at)}</td></tr>
              <tr><td><strong>Cerrado por:</strong></td><td>${session.closed_by_username || 'N/A'}</td></tr>
              <tr><td><strong>Fecha cierre:</strong></td><td>${session.closed_at ? formatDate(session.closed_at) : 'N/A'}</td></tr>
              <tr><td><strong>Fondo inicial:</strong></td><td>${formatCurrency(session.opening_cash)}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Ventas del Turno</h2>
            <table>
              <tr><th>Método</th><th>Total</th></tr>
              <tr><td>Efectivo</td><td>${formatCurrency(session.sales_cash_total)}</td></tr>
              <tr><td>Tarjeta</td><td>${formatCurrency(session.sales_card_total)}</td></tr>
              <tr><td>Transferencia</td><td>${formatCurrency(session.sales_transfer_total)}</td></tr>
              <tr class="total-row"><td>TOTAL</td><td>${formatCurrency(session.sales_cash_total + session.sales_card_total + session.sales_transfer_total)}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Montos Declarados</h2>
            <table>
              <tr><th>Método</th><th>Declarado</th></tr>
              <tr><td>Efectivo</td><td>${formatCurrency(session.declared_cash || 0)}</td></tr>
              <tr><td>Tarjeta</td><td>${formatCurrency(session.declared_card || 0)}</td></tr>
              <tr><td>Transferencia</td><td>${formatCurrency(session.declared_transfer || 0)}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Diferencias</h2>
            <table>
              <tr><th>Método</th><th>Diferencia</th></tr>
              <tr><td>Efectivo</td><td class="${diffCash >= 0 ? 'diff-positive' : 'diff-negative'}">${diffCash >= 0 ? '+' : ''}${formatCurrency(diffCash)}</td></tr>
              <tr><td>Tarjeta</td><td class="${diffCard >= 0 ? 'diff-positive' : 'diff-negative'}">${diffCard >= 0 ? '+' : ''}${formatCurrency(diffCard)}</td></tr>
              <tr><td>Transferencia</td><td class="${diffTransfer >= 0 ? 'diff-positive' : 'diff-negative'}">${diffTransfer >= 0 ? '+' : ''}${formatCurrency(diffTransfer)}</td></tr>
              <tr class="total-row"><td>TOTAL</td><td class="${diffTotal >= 0 ? 'diff-positive' : 'diff-negative'}">${diffTotal >= 0 ? '+' : ''}${formatCurrency(diffTotal)}</td></tr>
            </table>
          </div>

          ${session.notes ? `<div class="section"><h2>Notas</h2><p>${session.notes}</p></div>` : ''}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Cierre de Caja #${session.id}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      console.error('Error al generar PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    }
  };

  const renderSession = ({ item }: { item: CashSession }) => {
    const diffTotal = (item.declared_cash || 0) + (item.declared_card || 0) + (item.declared_transfer || 0) -
      (item.opening_cash + item.sales_cash_total + item.sales_card_total + item.sales_transfer_total);
    
    const isOpen = !item.closed_at;

    return (
      <View style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.sessionId}>Cierre #{item.id}</Text>
            <Text style={styles.sessionDate}>{formatDate(item.opened_at)}</Text>
            <Text style={styles.sessionUser}>👤 {item.opened_by_username}</Text>
          </View>
          {isOpen ? (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>ABIERTA</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.sessionTotal}>
                {formatCurrency(item.sales_cash_total + item.sales_card_total + item.sales_transfer_total)}
              </Text>
              {diffTotal !== 0 && (
                <Text style={[styles.diffBadge, diffTotal > 0 ? styles.diffPositive : styles.diffNegative]}>
                  {diffTotal > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(diffTotal))}
                </Text>
              )}
            </View>
          )}
        </View>

        {!isOpen && (
          <View style={styles.sessionActions}>
            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => handleViewDetail(item)}
            >
              <Text style={styles.detailButtonText}>Ver Detalle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pdfButton}
              onPress={() => generatePDF(item)}
            >
              <Text style={styles.pdfButtonText}>📄 PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (currentUser?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Acceso denegado</Text>
          <Text style={styles.errorSubtext}>Solo administradores</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Cierres</Text>
      </View>

      {loading && sessions.length === 0 ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id!.toString()}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay cierres registrados</Text>
          }
        />
      )}

      {/* Modal de Detalle */}
      {selectedSession && (
        <Modal visible={showDetail} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cierre #{selectedSession.id}</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Información del Turno</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Abierto por:</Text>
                  <Text style={styles.infoValue}>{selectedSession.opened_by_username}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Apertura:</Text>
                  <Text style={styles.infoValue}>{formatDate(selectedSession.opened_at)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cerrado por:</Text>
                  <Text style={styles.infoValue}>{selectedSession.closed_by_username || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cierre:</Text>
                  <Text style={styles.infoValue}>
                    {selectedSession.closed_at ? formatDate(selectedSession.closed_at) : 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fondo inicial:</Text>
                  <Text style={styles.infoValue}>{formatCurrency(selectedSession.opening_cash)}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ventas del Turno</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>💵 Efectivo:</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(selectedSession.sales_cash_total)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>💳 Tarjeta:</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(selectedSession.sales_card_total)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>📱 Transferencia:</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(selectedSession.sales_transfer_total)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>TOTAL:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(
                        selectedSession.sales_cash_total +
                        selectedSession.sales_card_total +
                        selectedSession.sales_transfer_total
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedSession.declared_cash !== null && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Montos Declarados</Text>
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>💵 Efectivo:</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(selectedSession.declared_cash || 0)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>💳 Tarjeta:</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(selectedSession.declared_card || 0)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>📱 Transferencia:</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(selectedSession.declared_transfer || 0)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Diferencias</Text>
                    <View style={styles.summaryCard}>
                      {(() => {
                        const diffCash = (selectedSession.declared_cash || 0) - (selectedSession.opening_cash + selectedSession.sales_cash_total);
                        const diffCard = (selectedSession.declared_card || 0) - selectedSession.sales_card_total;
                        const diffTransfer = (selectedSession.declared_transfer || 0) - selectedSession.sales_transfer_total;
                        const diffTotal = diffCash + diffCard + diffTransfer;
                        
                        return (
                          <>
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>💵 Efectivo:</Text>
                              <Text style={[styles.diffValue, diffCash !== 0 && styles.diffAlert]}>
                                {diffCash > 0 ? '+' : ''}{formatCurrency(diffCash)}
                              </Text>
                            </View>
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>💳 Tarjeta:</Text>
                              <Text style={[styles.diffValue, diffCard !== 0 && styles.diffAlert]}>
                                {diffCard > 0 ? '+' : ''}{formatCurrency(diffCard)}
                              </Text>
                            </View>
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>📱 Transferencia:</Text>
                              <Text style={[styles.diffValue, diffTransfer !== 0 && styles.diffAlert]}>
                                {diffTransfer > 0 ? '+' : ''}{formatCurrency(diffTransfer)}
                              </Text>
                            </View>
                            <View style={[styles.summaryRow, styles.totalRow]}>
                              <Text style={styles.totalLabel}>TOTAL:</Text>
                              <Text style={[styles.totalValue, diffTotal !== 0 && styles.diffAlert]}>
                                {diffTotal > 0 ? '+' : ''}{formatCurrency(diffTotal)}
                              </Text>
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                </>
              )}

              {selectedSession.notes && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notas</Text>
                  <Text style={styles.notesText}>{selectedSession.notes}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalPdfButton}
                onPress={() => generatePDF(selectedSession)}
              >
                <Text style={styles.modalPdfButtonText}>📄 Generar PDF</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sessionUser: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sessionTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  openBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  diffBadge: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
  diffPositive: {
    color: '#4CAF50',
  },
  diffNegative: {
    color: '#FF9800',
  },
  sessionActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  detailButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  detailButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pdfButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  modalContent: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  diffValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  diffAlert: {
    color: '#FF9800',
  },
  notesText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
  },
  modalPdfButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalPdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

