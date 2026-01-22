import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { CashSession } from '../models/CashSession';
import * as db from '../services/database';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency } from '../utils/formatters';

interface CashCloseScreenProps {
  visible: boolean;
  session: CashSession | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CashCloseScreen: React.FC<CashCloseScreenProps> = ({
  visible,
  session,
  onClose,
  onSuccess,
}) => {
  const [declaredCash, setDeclaredCash] = useState('');
  const [declaredTransfer, setDeclaredTransfer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<CashSession | null>(null);
  const [billCounts, setBillCounts] = useState<Record<number, string>>({
    1: '0',
    5: '0',
    10: '0',
    20: '0',
    50: '0',
    100: '0',
    200: '0',
    500: '0',
    1000: '0',
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    if (visible && session) {
      loadSessionData();
    }
  }, [visible, session]);

  const loadSessionData = async () => {
    if (!session) return;
    
    try {
      const data = await db.getCashSessionById(session.id!);
      if (data) {
        setSessionData(data);
      }
    } catch (error) {
      console.error('Error al cargar datos de sesión:', error);
    }
  };

  const handleCloseCash = async () => {
    const cash = parseFloat(declaredCash);
    const transfer = parseFloat(declaredTransfer);

    if (isNaN(cash) || cash < 0) {
      Alert.alert('Error', 'Ingresa un monto válido de efectivo');
      return;
    }

    if (isNaN(transfer) || transfer < 0) {
      Alert.alert('Error', 'Ingresa un monto válido de transferencia');
      return;
    }

    Alert.alert(
      'Confirmar Cierre',
      `¿Estás seguro de cerrar la caja con estos montos?\n\nEfectivo: ${formatCurrency(cash)}\nTransferencia: ${formatCurrency(transfer)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Caja',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              await db.closeCashSession(
                session!.id!,
                cash,
                0, // card (ya no se usa, pero la función aún lo requiere)
                transfer,
                currentUser!.id!,
                notes.trim() || undefined
              );
              
              // Obtener la sesión cerrada con los totales calculados
              const closedSession = await db.getCashSessionById(session!.id!);
              
              // Calcular diferencias finales
              const finalDiffCash = cash - (sessionData!.opening_cash + closedSession!.sales_cash_total);
              const finalDiffTransfer = transfer - closedSession!.sales_transfer_total;
              const finalDiffTotal = finalDiffCash + finalDiffTransfer;
              
              // Crear resumen detallado
              let summary = '📊 RESUMEN DE CIERRE\n\n';
              summary += '💰 VENTAS DEL TURNO:\n';
              summary += `  Efectivo: ${formatCurrency(closedSession!.sales_cash_total)}\n`;
              summary += `  Transferencia: ${formatCurrency(closedSession!.sales_transfer_total)}\n`;
              summary += `  TOTAL: ${formatCurrency(closedSession!.sales_cash_total + closedSession!.sales_transfer_total)}\n\n`;
              
              summary += '📝 DECLARADO:\n';
              summary += `  Efectivo: ${formatCurrency(cash)}\n`;
              summary += `  Transferencia: ${formatCurrency(transfer)}\n\n`;
              
              summary += '📈 DIFERENCIAS:\n';
              summary += `  Efectivo: ${finalDiffCash >= 0 ? '+' : ''}${formatCurrency(finalDiffCash)}\n`;
              summary += `  Transferencia: ${finalDiffTransfer >= 0 ? '+' : ''}${formatCurrency(finalDiffTransfer)}\n`;
              summary += `  ━━━━━━━━━━━━━━\n`;
              summary += `  TOTAL: ${finalDiffTotal >= 0 ? '+' : ''}${formatCurrency(finalDiffTotal)}`;
              
              if (finalDiffTotal > 0) {
                summary += ' ✅ SOBRANTE';
              } else if (finalDiffTotal < 0) {
                summary += ' ⚠️ FALTANTE';
              } else {
                summary += ' ✅ SIN DIFERENCIAS';
              }
              
              Alert.alert(
                '✅ Caja Cerrada',
                summary,
                [{ text: 'OK', onPress: () => { resetForm(); onSuccess(); onClose(); } }]
              );
            } catch (error: any) {
              console.error('Error al cerrar caja:', error);
              Alert.alert('Error', error.message || 'No se pudo cerrar la caja');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setDeclaredCash('');
    setDeclaredTransfer('');
    setNotes('');
    setBillCounts({
      1: '0',
      5: '0',
      10: '0',
      20: '0',
      50: '0',
      100: '0',
      200: '0',
      500: '0',
      1000: '0',
    });
  };

  const billTotal = useMemo(() => {
    return Object.entries(billCounts).reduce((sum, [denom, count]) => {
      const qty = parseInt(count, 10);
      if (isNaN(qty) || qty < 0) {
        return sum;
      }
      return sum + Number(denom) * qty;
    }, 0);
  }, [billCounts]);

  const handleBillCountChange = (denomination: number, value: string) => {
    const normalized = value.replace(/[^\d]/g, '');
    setBillCounts(prev => ({
      ...prev,
      [denomination]: normalized,
    }));
  };

  const clearBillCounter = () => {
    setBillCounts({
      1: '0',
      5: '0',
      10: '0',
      20: '0',
      50: '0',
      100: '0',
      200: '0',
      500: '0',
      1000: '0',
    });
    setDeclaredCash('0');
  };

  useEffect(() => {
    setDeclaredCash(billTotal.toString());
  }, [billTotal]);

  if (!session || !sessionData) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.section}>
          <View style={styles.billCounter}>
            <View style={styles.billCounterHeader}>
              <Text style={styles.billCounterTitle}>Contador de billetes</Text>
              <TouchableOpacity
                style={styles.billCounterClear}
                onPress={clearBillCounter}
                disabled={loading}
              >
                <Text style={styles.billCounterClearText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.billGrid}>
              {[1, 5, 10, 20, 50, 100, 200, 500, 1000].map(denom => (
                <View key={denom} style={styles.billRow}>
                  <Text style={styles.billLabel}>${denom}</Text>
                  <TextInput
                    style={styles.billInput}
                    value={billCounts[denom] ?? ''}
                    onChangeText={value => handleBillCountChange(denom, value)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.billCounterTotal}>
              Total: {formatCurrency(billTotal)}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📱 Transferencia</Text>
            <TextInput
              style={styles.input}
              value={declaredTransfer}
              onChangeText={setDeclaredTransfer}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
              editable={!loading}
            />
            <Text style={styles.expectedText}>
              Esperado: {formatCurrency(sessionData.sales_transfer_total)}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📝 Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
              placeholder="Observaciones sobre el cierre..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => { resetForm(); onClose(); }}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.closeButton, loading && styles.buttonDisabled]}
            onPress={handleCloseCash}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.closeButtonText}>Cerrar Caja</Text>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    elevation: 2,
  },
  icon: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 16,
    color: '#666',
  },
  rowValue: {
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  expectedText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  billCounter: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  billCounterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billCounterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  billCounterClear: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  billCounterClearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  billCounterHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  billCounterTotal: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  billGrid: {
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 60,
  },
  billInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'right',
    color: '#333',
  },
  diffValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  diffAlert: {
    color: '#FF9800',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

