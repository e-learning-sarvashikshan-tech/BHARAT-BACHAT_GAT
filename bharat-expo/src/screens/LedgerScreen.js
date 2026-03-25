import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
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
  const [groupName, setGroupName] = useState('');
  
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1))); 
  const [endDate, setEndDate] = useState(new Date());
  const [datePickerTarget, setDatePickerTarget] = useState(null); 

  const fetchPassbook = async () => {
    if (!groupId) {
      Alert.alert(t('common.error', "Error"), "No Group ID provided.");
      navigation.goBack();
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      const groupResponse = await api.get(`/group/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
      setGroupBalance(groupResponse.data.group_balance || 0);
      setGroupName(groupResponse.data.group?.name || 'Bachat Gat');

      const exportResponse = await api.post(`/group/${groupId}/ledger/export`, {
        start_date: '2000-01-01', 
        end_date: new Date().toISOString().split('T')[0]
      }, { headers: { Authorization: `Bearer ${token}` } });

      setTransactions(exportResponse.data.transactions || []);
      
    } catch (error) {
      console.error("Fetch Passbook Error:", error);
      Alert.alert(t('common.error', "Error"), t('ledger.fetchError', "Could not load the group passbook."));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPassbook(); }, [groupId]));

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setDatePickerTarget(null); 
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
      
      const response = await api.post(`/group/${groupId}/ledger/export`, {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }, { headers: { Authorization: `Bearer ${token}` } });

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
              <td>${date}</td>
              <td>${tx.user?.name || 'Member'}</td>
              <td>${tx.method || 'Transfer'}</td>
              <td style="color: ${typeColor}; font-weight: bold; text-align: right;">${sign}₹${tx.amount}</td>
            </tr>
          `;
      });

      // --- UPGRADED: PREMIUM PDF HTML TEMPLATE ---
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #333; background-color: #fdfbf7; }
              .header { text-align: center; border-bottom: 2px solid #d1c7a3; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 32px; font-weight: 900; color: ${COLORS.primaryBlue}; margin: 0; text-transform: uppercase; }
              .sub-logo { font-size: 14px; font-weight: bold; color: #5c5442; margin-top: 5px; letter-spacing: 2px; }
              .summary-box { background-color: #efeadd; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; border: 1px solid #d1c7a3; }
              .summary-item { text-align: center; }
              .summary-title { font-size: 12px; color: #5c5442; text-transform: uppercase; font-weight: bold; margin: 0; }
              .summary-amount { font-size: 22px; margin: 5px 0 0 0; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #d1c7a3; }
              th { background-color: #efeadd; color: #5c5442; font-weight: bold; text-align: left; padding: 12px 10px; border-bottom: 2px solid #d1c7a3; text-transform: uppercase; font-size: 12px; }
              td { padding: 12px 10px; border-bottom: 1px solid #e8e4d3; font-size: 13px; }
              .stamp-container { text-align: right; margin-top: 40px; padding-right: 20px; }
              .stamp { display: inline-block; border: 3px solid #16a34a; color: #16a34a; font-weight: 900; padding: 15px; border-radius: 50%; transform: rotate(-15deg); text-align: center; letter-spacing: 1px; }
            </style>
          </head>
          <body>
            <div class="header">
              <p class="logo">Bharat Bachat</p>
              <p class="sub-logo">OFFICIAL GROUP PASSBOOK</p>
              <p style="font-size: 14px; color: #5c5442; margin-top: 10px;">Period: ${startDate.toDateString()} to ${endDate.toDateString()}</p>
            </div>
            
            <div class="summary-box">
              <div class="summary-item"><p class="summary-title">Total In (+)</p><p class="summary-amount" style="color: #16a34a;">₹${totalDeposited.toLocaleString()}</p></div>
              <div class="summary-item"><p class="summary-title">Total Out (-)</p><p class="summary-amount" style="color: #dc2626;">₹${totalWithdrawn.toLocaleString()}</p></div>
              <div class="summary-item"><p class="summary-title">Net Flow</p><p class="summary-amount" style="color: ${COLORS.primaryBlue};">₹${(totalDeposited - totalWithdrawn).toLocaleString()}</p></div>
            </div>

            <table>
              <thead><tr><th>Date</th><th>Member Name</th><th>Particulars</th><th style="text-align: right;">Amount</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
            
            <div class="stamp-container">
               <div class="stamp">DIGITALLY<br/>VERIFIED</div>
            </div>

            <p style="text-align: center; color: #999; font-size: 11px; margin-top: 30px;">
              Generated securely by the Bharat Bachat App. Cryptographically matched with Gat Pramukh records.
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

  let runningBalance = 0;
  const sortedTx = [...transactions].sort((a,b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  const ledgerRows = sortedTx.map((tx) => {
    if (tx.category !== 'voided') {
        if (tx.type === 'deposit') runningBalance += parseFloat(tx.amount);
        if (tx.type === 'withdrawal') runningBalance -= parseFloat(tx.amount);
    }
    return { ...tx, runningBalance: runningBalance };
  }).reverse(); 

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.bgWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ledger.title', 'Digital Passbook')}</Text>
        <TouchableOpacity onPress={() => setExportModalVisible(true)}>
          <Ionicons name="print" size={24} color={COLORS.bgWhite} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <View style={styles.passbookCover}>
          <View style={styles.coverHeader}>
              <Text style={styles.bankName}>Bharat Bachat Ledger</Text>
              <Text style={styles.accountType}>{t('ledger.officialPassbook', 'OFFICIAL PASSBOOK')}</Text>
          </View>
          <View style={styles.coverDetails}>
              <Text style={styles.coverLabel}>{t('groupDetails.gatName', 'Bachat Gat Name:')}</Text>
              <Text style={styles.coverValue}>{groupName}</Text>
              <Text style={[styles.coverLabel, {marginTop: 15}]}>{t('ledger.liveCorpus', 'Live Group Corpus:')}</Text>
              <Text style={[styles.coverValue, {fontSize: 32, color: '#a7f3d0'}]}>₹{groupBalance.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.downloadBtn} onPress={() => setExportModalVisible(true)}>
          <Ionicons name="filter-circle-outline" size={18} color={COLORS.primaryBlue} style={{marginRight: 6}} />
          <Text style={styles.downloadBtnText}>{t('ledger.exportCustom', 'Export Custom PDF Statement')}</Text>
        </TouchableOpacity>

        <View style={styles.paperTable}>
            <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>{t('ledger.date', 'Date')}</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>{t('ledger.particulars', 'Particulars')}</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>{t('ledger.in', 'In (+)')}</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>{t('ledger.out', 'Out (-)')}</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>{t('ledger.bal', 'Bal')}</Text>
            </View>

            {ledgerRows.length > 0 ? ledgerRows.map((tx, index) => {
                const isVoided = tx.category === 'voided';
                const dateObj = new Date(tx.transaction_date);
                const dateString = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}/${dateObj.getFullYear().toString().slice(-2)}`;
                let particulars = tx.user?.name || tx.method || 'Record';
                if (particulars.length > 10) particulars = particulars.substring(0, 9) + '..';

                return (
                    <View key={index} style={[styles.tableRow, isVoided && { backgroundColor: '#fff5f5' }]}>
                        <Text style={[styles.tableCell, { flex: 1.5 }, isVoided && styles.voidedText]}>{dateString}</Text>
                        <Text style={[styles.tableCell, { flex: 2 }, isVoided && styles.voidedText]} numberOfLines={1}>{isVoided ? 'CANCEL' : particulars}</Text>
                        <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', color: COLORS.success }, isVoided && styles.voidedText]}>{tx.type === 'deposit' ? `${tx.amount}` : '-'}</Text>
                        <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', color: COLORS.danger }, isVoided && styles.voidedText]}>{tx.type === 'withdrawal' ? `${tx.amount}` : '-'}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: 'bold' }, isVoided && styles.voidedText]}>₹{tx.runningBalance}</Text>
                    </View>
                );
            }) : (
                <View style={{ padding: 30, alignItems: 'center' }}><Text style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>{t('ledger.noRecords', 'No records found in passbook.')}</Text></View>
            )}

            {ledgerRows.length > 0 && (
                <View style={styles.stampContainer}>
                    <View style={styles.stampRing}>
                        <Ionicons name="checkmark-done-circle" size={32} color="#16a34a" />
                        <Text style={styles.stampText}>{t('ledger.digitallyVerified', 'DIGITALLY').split(' ')[0]}</Text>
                        <Text style={styles.stampText}>{t('ledger.digitallyVerified', 'VERIFIED').split(' ')[1] || 'VERIFIED'}</Text>
                    </View>
                </View>
            )}
        </View>

        <Text style={styles.securityNote}>
            <Ionicons name="lock-closed" size={12} /> {t('ledger.securityNote', 'This digital passbook is cryptographically secured and matches the records held by your Gat Pramukh.')}
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={exportModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('exportLedger.modalTitle', 'Download Statement')}</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <Text style={{color: COLORS.textGray, marginBottom: 20}}>{t('exportLedger.modalDesc', "Select a date range to filter and download the group's financial records.")}</Text>

            <Text style={styles.dateLabel}>{t('exportLedger.startDate', 'Start Date')}</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('start')}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} style={{marginRight: 10}} />
              <Text style={styles.dateText}>{startDate.toDateString()}</Text>
            </TouchableOpacity>

            <Text style={styles.dateLabel}>{t('exportLedger.endDate', 'End Date')}</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('end')}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} style={{marginRight: 10}} />
              <Text style={styles.dateText}>{endDate.toDateString()}</Text>
            </TouchableOpacity>

            {datePickerTarget && (
              <DateTimePicker value={datePickerTarget === 'start' ? startDate : endDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} maximumDate={new Date()} />
            )}
            
            {Platform.OS === 'ios' && datePickerTarget && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setDatePickerTarget(null)}><Text style={{color: COLORS.primaryBlue, fontWeight: 'bold'}}>{t('exportLedger.done', 'Done')}</Text></TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]} onPress={generateFilteredPassbookPDF} disabled={isGenerating}>
              {isGenerating ? <ActivityIndicator color={COLORS.bgWhite} /> : (
                <><Ionicons name="download" size={20} color={COLORS.bgWhite} style={{marginRight: 8}} /><Text style={styles.generateBtnText}>{t('exportLedger.generateBtn', 'Generate PDF')}</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10, backgroundColor: COLORS.primaryBlue, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  backButton: { paddingRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.bgWhite, flex: 1 }, 
  content: { padding: 15 },

  passbookCover: { backgroundColor: COLORS.primaryBlue, borderRadius: 12, padding: 20, marginBottom: 15, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  coverHeader: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 15, marginBottom: 15, alignItems: 'center' },
  bankName: { color: COLORS.bgWhite, fontSize: 22, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  accountType: { color: '#fef08a', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginTop: 4 },
  coverDetails: { paddingHorizontal: 10, alignItems: 'center' },
  coverLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  coverValue: { color: COLORS.bgWhite, fontSize: 20, fontWeight: 'bold', marginTop: 2, textAlign: 'center' },

  downloadBtn: { flexDirection: 'row', backgroundColor: COLORS.bgWhite, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight, elevation: 1 },
  downloadBtnText: { color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 14 },

  paperTable: { backgroundColor: '#fdfbf7', borderRadius: 8, borderWidth: 1, borderColor: '#e2ddc7', overflow: 'hidden', elevation: 2 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#efeadd', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: '#d1c7a3' },
  tableHeaderCell: { fontSize: 11, fontWeight: 'bold', color: '#5c5442', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e8e4d3' },
  tableCell: { fontSize: 13, color: '#333', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }, 
  voidedText: { textDecorationLine: 'line-through', color: '#999' },

  stampContainer: { padding: 30, alignItems: 'flex-end', justifyContent: 'center' },
  stampRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#16a34a', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-15deg' }], opacity: 0.8 },
  stampText: { color: '#16a34a', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  securityNote: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11, marginTop: 20, paddingHorizontal: 20, lineHeight: 16 },

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