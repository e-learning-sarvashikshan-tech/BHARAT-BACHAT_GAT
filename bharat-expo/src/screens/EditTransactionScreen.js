import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

const EditTransactionScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); 
  const { transactionData } = route.params;

  const [amount, setAmount] = useState(transactionData.amount.toString());
  const [method, setMethod] = useState(transactionData.method || 'Cash');
  const [editReason, setEditReason] = useState(''); 
  const [editReasonMode, setEditReasonMode] = useState(''); // NEW STATE FOR SMART CHIPS
  const [loading, setLoading] = useState(false);

  // --- NEW: SMART CHIPS ARRAYS ---
  const EDIT_REASONS = [
    t('quickReasons.typo', 'Typo in Amount'), 
    t('quickReasons.wrongMember', 'Wrong Member Selected'), 
    t('quickReasons.cashNotRec', 'Cash Not Received'), 
    t('quickReasons.duplicate', 'Duplicate Entry'), 
    t('quickReasons.other', 'Other')
  ];

  const handleUpdate = async () => {
    if (!editReasonMode) {
      return Alert.alert(t('common.error', "Error"), "Please select a reason for editing.");
    }
    if (editReasonMode === 'custom' && !editReason.trim()) {
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      
      {/* Custom Header for better UX */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Edit Mode</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.warningBox}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primaryBlue} style={{marginRight: 8}} />
            <Text style={styles.subText}>All edits are permanently tracked in the group audit log.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Edit Amount (₹)</Text>
            <TextInput 
              style={styles.input} 
              value={amount} 
              onChangeText={setAmount} 
              keyboardType="numeric" 
              color={COLORS.textDark}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Method / Remarks</Text>
            <TextInput 
              style={styles.input} 
              value={method} 
              onChangeText={setMethod} 
              color={COLORS.textDark}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: COLORS.warning }]}>Reason for Edit (Required)</Text>
            
            {/* --- SMART CHIPS UI --- */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15, marginTop: 5 }}>
              {EDIT_REASONS.map((reason, index) => {
                const isSelected = editReasonMode === 'chip' && editReason === reason;
                const isOther = reason === t('quickReasons.other', 'Other');
                const isOtherSelected = isOther && editReasonMode === 'custom';
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={{ 
                      backgroundColor: isSelected || isOtherSelected ? COLORS.primaryBlue : COLORS.bgLight, 
                      paddingHorizontal: 15, 
                      paddingVertical: 10, 
                      borderRadius: 20, 
                      marginRight: 10, 
                      borderWidth: 1, 
                      borderColor: isSelected || isOtherSelected ? COLORS.primaryBlue : COLORS.borderLight 
                    }}
                    onPress={() => {
                      if (isOther) {
                        setEditReasonMode('custom');
                        setEditReason(''); // Clear the reason when switching to custom
                      } else {
                        setEditReasonMode('chip');
                        setEditReason(reason);
                      }
                    }}
                  >
                    <Text style={{ 
                      color: isSelected || isOtherSelected ? COLORS.bgWhite : COLORS.textGray, 
                      fontSize: 14, 
                      fontWeight: 'bold' 
                    }}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* ONLY SHOW TEXT INPUT IF 'OTHER' IS SELECTED */}
            {editReasonMode === 'custom' && (
              <TextInput 
                style={[styles.input, { borderColor: COLORS.warning, height: 80, marginTop: 10 }]} 
                value={editReason} 
                onChangeText={setEditReason} 
                placeholder="e.g., Typed 500 instead of 5000"
                placeholderTextColor={COLORS.textMuted}
                multiline
                textAlignVertical="top"
                color={COLORS.textDark}
              />
            )}
          </View>

          <TouchableOpacity 
            style={[styles.button, (!editReasonMode || (editReasonMode === 'custom' && !editReason.trim())) && styles.buttonDisabled]} 
            onPress={handleUpdate} 
            disabled={loading || !editReasonMode || (editReasonMode === 'custom' && !editReason.trim())}
          >
            {loading ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.buttonText}>Save & Log Edit</Text>}
          </TouchableOpacity>

          <View style={{height: 40}}/>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgWhite },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, flex: 1 },
  content: { padding: 20 },
  warningBox: { flexDirection: 'row', backgroundColor: '#e0f2fe', padding: 15, borderRadius: 8, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: '#bae6fd' },
  subText: { fontSize: 13, color: '#0369a1', fontWeight: '500', flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: COLORS.textDark },
  input: { backgroundColor: COLORS.bgLight, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  button: { backgroundColor: COLORS.primaryBlue, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.bgWhite, fontSize: 16, fontWeight: 'bold' }
});

export default EditTransactionScreen;