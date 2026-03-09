import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // ADDED
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech'; // <-- ADDED SPEECH LIBRARY

const AddSavingsScreen = ({ route, navigation }) => {
  const { t, i18n } = useTranslation(); // <-- ADDED i18n
  const { groupId, members } = route.params;
  
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSelection = (userId) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const selectAll = () => {
    if (selectedUsers.size === members.length) {
      setSelectedUsers(new Set()); 
    } else {
      setSelectedUsers(new Set(members.map(m => m.id))); 
    }
  };

  const handleBatchSubmit = async () => {
    if (selectedUsers.size === 0) {
      Alert.alert(t('common.error', 'Error'), t('alerts.selectMemberError', "Please select at least one member."));
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert(t('common.error', 'Error'), t('alerts.invalidAmountError', "Please enter a valid amount."));
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.post(`/group/${groupId}/transactions/batch`, {
        user_ids: Array.from(selectedUsers),
        amount: Number(amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        
        // --- CLEAN MULTILINGUAL VOICE ANNOUNCEMENT ---
        let speechText = `Deposit of ${amount} rupees is successful.`;
        let voiceLang = 'en-IN';

        if (i18n.language === 'mr') {
            speechText = `${amount} रुपये यशस्वीरित्या जमा झाले.`;
            voiceLang = 'mr-IN';
        } else if (i18n.language === 'hi') {
            speechText = `${amount} रुपये सफलतापूर्वक जमा हो गए हैं।`;
            voiceLang = 'hi-IN';
        }

        Speech.speak(speechText, { language: voiceLang, rate: 0.85 });
        // ----------------------------------------

        Alert.alert(t('common.success', 'Success'), response.data.message || t('alerts.depositSuccess', 'Deposits saved successfully!'));
        navigation.goBack(); 
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.message || t('alerts.depositFailed', "Failed to save transactions. Check your connection.");
      Alert.alert(t('common.error', 'Transaction Failed'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderMemberRow = ({ item }) => {
    const isSelected = selectedUsers.has(item.id);
    return (
      <TouchableOpacity 
        style={[styles.row, isSelected && styles.rowSelected]} 
        onPress={() => toggleSelection(item.id)}
      >
        <Ionicons 
          name={isSelected ? "checkbox" : "square-outline"} 
          size={24} 
          color={isSelected ? "#2952a3" : "#ccc"} 
        />
        <View style={{ marginLeft: 15 }}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberStatus}>{t('groupDetails.installmentStatus', 'Status')}: {item.installment_status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER IS HERE */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addSavings.title', 'Deposit Funds')}</Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>{t('addSavings.amountLabel', 'Deposit Amount (Per Member)')}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 500"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{t('addSavings.selectMember', 'Select Members')} ({selectedUsers.size} Selected)</Text>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.selectAllText}>
            {selectedUsers.size === members.length ? "Deselect All" : "Select All"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMemberRow}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, selectedUsers.size === 0 && { backgroundColor: '#ccc' }]} 
          onPress={handleBatchSubmit}
          disabled={selectedUsers.size === 0 || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{t('addSavings.confirmBtn', 'Submit')} {selectedUsers.size} {t('dashboard.recentTransactions', 'Deposits')}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  inputSection: { padding: 20, backgroundColor: '#fff', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  input: { backgroundColor: '#f4f6f8', padding: 15, borderRadius: 10, fontSize: 18, fontWeight: 'bold' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  selectAllText: { color: '#2952a3', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  rowSelected: { backgroundColor: '#e6eeff', borderColor: '#2952a3', borderWidth: 1 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberStatus: { fontSize: 12, color: '#888', marginTop: 2 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', elevation: 10 },
  submitBtn: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default AddSavingsScreen;