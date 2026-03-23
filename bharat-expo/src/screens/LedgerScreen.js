import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print'; 
import * as Sharing from 'expo-sharing'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { COLORS } from '../constants/theme';

const LedgerScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { groupId } = route.params || {};

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBalance, setGroupBalance] = useState(0);
  
  // Export Modal States
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1))); // Default: 1 month ago
  const [endDate, setEndDate] = useState(new Date());
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'start' or 'end'

  const fetchPassbook = async () => {
    if (!groupId) {
      Alert.alert(t('common.error', "Error"), "No Group ID provided.");
      navigation.goBack();
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get(`/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTransactions(response.data.recent_transactions || []);
      setGroupBalance(response.data.group_balance || 0);
      
    } catch (error) {
      console.error("Fetch Passbook Error:", error);
      Alert.alert(t('common.error', "Error"), t('ledger.fetchError', "Could not load the group passbook."));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPassbook(); }, [groupId]));

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setDatePickerTarget(null); // Close picker on Android after selection
    }
    if (selectedDate) {
      if (datePickerTarget === 'start') setStartDate(selectedDate);
      if (datePickerTarget === 'end') setEndDate(selectedDate);
    }
  };

  const generateFilteredPassbookPDF = async () => {
    if (startDate > endDate) {
      Alert.alert(t('common.error', "Error"), "Start date cannot be after the end date.");
      return;
    }

    setIsGenerating(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      // Hit our new backend endpoint to get the exact date range
      const response = await api.post(`/group/${groupId}/ledger/export`, {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filteredTransactions = response.data.transactions;

      if (filteredTransactions.length === 0) {
          Alert.alert(t('common.warning', "No Data"), "There are no transactions recorded in this date range.");
          setIsGenerating(false);
          return;
      }

      let tableRows = '';
      let totalDeposited = 0;
      let totalWithdrawn = 0;

      filteredTransactions.forEach((tx) => {
          const date = new Date(tx.transaction_date).toLocaleDateString();
          const typeColor = tx.type === 'deposit' ? COLORS.success : COLORS.danger;
          const sign = tx.type === 'deposit' ? '+' : '-';
          
          if (tx.type === 'deposit' && tx.category !== 'voided') totalDeposited += parseFloat(tx.amount);
          if (tx.type === 'withdrawal' && tx.category !== 'voided') totalWithdrawn += parseFloat(tx.amount);

          tableRows += `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: ${COLORS.textDark};">${date}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: ${COLORS.textDark};">${tx.user?.name || 'Member'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: ${COLORS.textGray};">${tx.method || 'Transfer'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: ${typeColor}; font-weight: bold; text-align: right;">${sign}₹${tx.amount}</td>
            </tr>
          `;
      });

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: ${COLORS.textDark}; }
              .header { text-align: center; border-bottom: 2px solid ${COLORS.primaryBlue}; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 32px; font-weight: bold; color: ${COLORS.primaryBlue}; margin: 0; }
              .sub-logo { font-size: 16px; color: ${COLORS.textGray}; margin-top: 5px; }
              .summary-box { background-color: ${COLORS.bgLight}; padding: 20px; border-radius: 10px; margin-bottom: 30px; display: flex; justify-content: space-between;}
              .summary-item { text-align: center; }
              .summary-title { font-size: 12px; color: ${COLORS.textMuted}; text-transform: uppercase; margin: 0; }
              .summary-amount { font-size: 24px; margin: 5px 0 0 0; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: ${COLORS.primaryBlueLight}; color: ${COLORS.primaryBlue}; font-weight: bold; text-align: left; padding: 12px 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <p class="logo">Bharat Bachat</p>
              <p class="sub-logo">Official Group Statement</p>
              <p style="font-size: 14px; color: ${COLORS.textMuted}; margin-top: 10px;">Period: ${startDate.toDateString()} to ${endDate.toDateString()}</p>
            </div>
            
            <div class="summary-box">
              <div class="summary-item">
                <p class="summary-title">Total In (+)</p>
                <p class="summary-amount" style="color: ${COLORS.success};">₹${totalDeposited.toLocaleString()}</p>
              </div>
              <div class="summary-item">
                <p class="summary-title">Total Out (-)</p>
                <p class="summary-amount" style="color: ${COLORS.danger};">₹${totalWithdrawn.toLocaleString()}</p>
              </div>
              <div class="summary-item">
                <p class="summary-title">Net Flow</p>
                <p class="summary-amount" style="color: ${COLORS.primaryBlue};">₹${(totalDeposited - totalWithdrawn).toLocaleString()}</p>
              </div>
            </div>

            <h3>Transaction History</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member Name</th>
                  <th>Details</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            
            <p style="text-align: center; color: ${COLORS.textMuted}; font-size: 12px; margin-top: 50px;">
              Generated securely by the Bharat Bachat App.
            </p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (Platform.OS === 'android') {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, `Statement_${startDate.toISOString().split('T')[0]}.pdf`, 'application/pdf');
            await FileSystem.writeAsStringAsync(savedUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert(t('common.success', "Success"), "Statement downloaded successfully to your device!");
            setExportModalVisible(false);
          } else {
            await Sharing.shareAsync(uri);
            setExportModalVisible(false);
          }
        } catch (e) {
          await Sharing.shareAsync(uri);
          setExportModalVisible(false);
        }
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        setExportModalVisible(false);
      }

    } catch (error) {
      console.error("PDF Gen Error:", error);
      Alert.alert(t('common.error', "Error"), "Could not generate PDF statement.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.txIconContainer}>
        <Ionicons name={item.type === 'deposit' ? 'arrow-down-circle' : 'arrow-up-circle'} size={32} color={item.type === 'deposit' ? COLORS.success : COLORS.danger} />
      </View>
      <View style={styles.txDetails}>
        <Text style={styles.txTitle}>{item.method || t('ledger.transaction', 'Transaction')}</Text>
        <Text style={styles.txUser}>{item.user?.name || t('groupDetails.roleMember', 'Member')}</Text>
        <Text style={styles.txDate}>{new Date(item.transaction_date).toDateString()}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: item.type === 'deposit' ? COLORS.success : COLORS.danger }]}>
          {item.type === 'deposit' ? '+' : '-'}₹{item.amount}
        </Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ledger.title', 'Group Passbook')}</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('groupDetails.liveCorpus', 'Available Group Corpus')}</Text>
        <Text style={styles.balanceAmount}>₹{groupBalance.toLocaleString()}</Text>
        
        <TouchableOpacity 
          style={styles.downloadBtn} 
          onPress={() => setExportModalVisible(true)}
        >
          <Ionicons name="filter-circle-outline" size={18} color={COLORS.primaryBlue} style={{marginRight: 6}} />
          <Text style={styles.downloadBtnText}>Export Custom Statement</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.recentText}>Showing recent 10 transactions</Text>
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('ledger.noRecords', 'No transactions recorded in this group yet.')}</Text>}
        />
      </View>

      {/* --- EXPORT MODAL --- */}
      <Modal visible={exportModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Statement</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            
            <Text style={{color: COLORS.textGray, marginBottom: 20}}>Select a date range to filter and download the group's financial records.</Text>

            <Text style={styles.dateLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('start')}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} style={{marginRight: 10}} />
              <Text style={styles.dateText}>{startDate.toDateString()}</Text>
            </TouchableOpacity>

            <Text style={styles.dateLabel}>End Date</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('end')}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} style={{marginRight: 10}} />
              <Text style={styles.dateText}>{endDate.toDateString()}</Text>
            </TouchableOpacity>

            {datePickerTarget && (
              <DateTimePicker
                value={datePickerTarget === 'start' ? startDate : endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
            
            {Platform.OS === 'ios' && datePickerTarget && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setDatePickerTarget(null)}>
                <Text style={{color: COLORS.primaryBlue, fontWeight: 'bold'}}>Done</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]} 
              onPress={generateFilteredPassbookPDF}
              disabled={isGenerating}
            >
              {isGenerating ? <ActivityIndicator color={COLORS.bgWhite} /> : (
                <>
                  <Ionicons name="download" size={20} color={COLORS.bgWhite} style={{marginRight: 8}} />
                  <Text style={styles.generateBtnText}>Generate PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  
  balanceCard: { backgroundColor: COLORS.primaryBlue, margin: 20, padding: 25, borderRadius: 16, elevation: 4, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  balanceAmount: { color: COLORS.bgWhite, fontSize: 36, fontWeight: 'bold' },
  
  downloadBtn: { flexDirection: 'row', backgroundColor: COLORS.bgWhite, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginTop: 15, alignItems: 'center' },
  downloadBtnText: { color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 14 },

  listContainer: { flex: 1, backgroundColor: COLORS.bgWhite, marginHorizontal: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 15, elevation: 1 },
  recentText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 15, fontStyle: 'italic', textAlign: 'center' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  txIconContainer: { marginRight: 15 },
  txDetails: { flex: 1 },
  txTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  txUser: { fontSize: 13, color: COLORS.textGray, marginTop: 2 },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end', justifyContent: 'center' },
  txAmount: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, padding: 20, marginTop: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  dateLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.borderLight, padding: 15, borderRadius: 12, marginBottom: 20 },
  dateText: { fontSize: 16, color: COLORS.textDark },
  doneBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  generateBtn: { flexDirection: 'row', backgroundColor: COLORS.primaryBlue, padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  generateBtnText: { color: COLORS.bgWhite, fontSize: 16, fontWeight: 'bold' }
});

export default LedgerScreen;
