import React, { useState, useEffect } from 'react';
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
  const [declaredCard, setDeclaredCard] = useState('');
  const [declaredTransfer, setDeclaredTransfer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<CashSession | null>(null);
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
    const card = parseFloat(declaredCard);
    const transfer = parseFloat(declaredTransfer);

    if (isNaN(cash) || cash < 0) {
      Alert.alert('Error', 'Ingresa un monto válido de efectivo');
      return;
    }

    if (isNaN(card) || card < 0) {
      Alert.alert('Error', 'Ingresa un monto válido de tarjeta');
      return;
    }

    if (isNaN(transfer) || transfer < 0) {
      Alert.alert('Error', 'Ingresa un monto válido de transferencia');
      return;
    }

    Alert.alert(
      'Confirmar Cierre',
      `¿Estás seguro de cerrar la caja con estos montos?\n\nEfectivo: ${formatCurrency(cash)}\nTarjeta: ${formatCurrency(card)}\nTransferencia: ${formatCurrency(transfer)}`,
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
                card,
                transfer,
                currentUser!.id!,
                notes.trim() || undefined
              );
              
              // Obtener la sesión cerrada con los totales calculados
              const closedSession = await db.getCashSessionById(session!.id!);
              
              // Calcular diferencias finales
              const finalDiffCash = cash - (sessionData!.opening_cash + closedSession!.sales_cash_total);
              const finalDiffCard = card - closedSession!.sales_card_total;
              const finalDiffTransfer = transfer - closedSession!.sales_transfer_total;
              const finalDiffTotal = finalDiffCash + finalDiffCard + finalDiffTransfer;
              
              // Crear resumen detallado
              let summary = '📊 RESUMEN DE CIERRE\n\n';
              summary += '💰 VENTAS DEL TURNO:\n';
              summary += `  Efectivo: ${formatCurrency(closedSession!.sales_cash_total)}\n`;
              summary += `  Tarjeta: ${formatCurrency(closedSession!.sales_card_total)}\n`;
              summary += `  Transferencia: ${formatCurrency(closedSession!.sales_transfer_total)}\n`;
              summary += `  TOTAL: ${formatCurrency(closedSession!.sales_cash_total + closedSession!.sales_card_total + closedSession!.sales_transfer_total)}\n\n`;
              
              summary += '📝 DECLARADO:\n';
              summary += `  Efectivo: ${formatCurrency(cash)}\n`;
              summary += `  Tarjeta: ${formatCurrency(card)}\n`;
              summary += `  Transferencia: ${formatCurrency(transfer)}\n\n`;
              
              summary += '📈 DIFERENCIAS:\n';
              summary += `  Efectivo: ${finalDiffCash >= 0 ? '+' : ''}${formatCurrency(finalDiffCash)}\n`;
              summary += `  Tarjeta: ${finalDiffCard >= 0 ? '+' : ''}${formatCurrency(finalDiffCard)}\n`;
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
    setDeclaredCard('');
    setDeclaredTransfer('');
    setNotes('');
  };

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Cierre de Caja</Text>
          <Text style={styles.subtitle}>
            Cuenta y declara los montos recibidos en tu turno
          </Text>
        </View>

        {/* Declaración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Declarar Montos Recibidos</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>💵 Efectivo (incluye fondo inicial: {formatCurrency(sessionData.opening_cash)})</Text>
            <TextInput
              style={styles.input}
              value={declaredCash}
              onChangeText={setDeclaredCash}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
              editable={!loading}
            />
            <Text style={styles.expectedText}>
              Esperado: {formatCurrency(sessionData.opening_cash + sessionData.sales_cash_total)}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>💳 Tarjeta</Text>
            <TextInput
              style={styles.input}
              value={declaredCard}
              onChangeText={setDeclaredCard}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
              editable={!loading}
            />
            <Text style={styles.expectedText}>
              Esperado: {formatCurrency(sessionData.sales_card_total)}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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

