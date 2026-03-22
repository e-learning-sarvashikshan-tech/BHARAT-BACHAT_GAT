import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; // <-- BRAND THEME IMPORTED

const EditTransactionScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); 
  const { transactionData } = route.params;

  const [amount, setAmount] = useState(transactionData.amount.toString());
  const [method, setMethod] = useState(transactionData.method || 'Cash');
  const [editReason, setEditReason] = useState(''); 
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!editReason.trim()) {
        return Alert.alert(t('common.warning', "Validation Error"), t('alerts.editReasonRequired', "You must provide a reason for editing this financial record."));
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      await api.put(`/transactions/${transactionData.id}`, {
        amount: parseFloat(amount),
        method: method,
        edit_reason: editReason 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert(t('common.success', "Success"), t('alerts.editSuccess', "Transaction updated and securely logged."));
      navigation.goBack(); 
    } catch (error) {
      console.error("Update failed:", error.response?.data || error.message);
      Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('alerts.editFailed', "Could not update transaction."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Secure Edit Mode</Text>
      <Text style={styles.subText}>All edits are permanently tracked in the group audit log.</Text>

      <Text style={styles.label}>Edit Amount (₹)</Text>
      <TextInput 
        style={styles.input} 
        value={amount} 
        onChangeText={setAmount} 
        keyboardType="numeric" 
        color={COLORS.textDark}
      />

      <Text style={styles.label}>Payment Method</Text>
      <TextInput 
        style={styles.input} 
        value={method} 
        onChangeText={setMethod} 
        color={COLORS.textDark}
      />

      <Text style={[styles.label, { color: COLORS.warning }]}>Reason for Edit (Required)</Text>
      <TextInput 
        style={[styles.input, { borderColor: COLORS.warning, height: 80 }]} 
        value={editReason} 
        onChangeText={setEditReason} 
        placeholder="e.g., Typed 500 instead of 5000"
        placeholderTextColor={COLORS.textMuted}
        multiline
        color={COLORS.textDark}
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.buttonText}>Save & Log Edit</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.bgLight },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginTop: 10 },
  subText: { fontSize: 13, color: COLORS.textGray, marginBottom: 20, marginTop: 5 },
  label: { fontSize: 15, fontWeight: 'bold', marginBottom: 8, marginTop: 15, color: COLORS.textDark },
  input: { backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  button: { backgroundColor: COLORS.primaryBlue, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { color: COLORS.bgWhite, fontSize: 18, fontWeight: 'bold' }
});

export default EditTransactionScreen;