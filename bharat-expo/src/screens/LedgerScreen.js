import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print'; // <-- NEW: PDF Generator
import * as Sharing from 'expo-sharing'; // <-- NEW: Share Menu
import api from '../services/api';

const LedgerScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { groupId } = route.params || {};

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBalance, setGroupBalance] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false); // To show loading state on button

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

  // ==========================================
  // NEW: THE MAGIC PDF GENERATOR FUNCTION
  // ==========================================
  const generatePassbookPDF = async () => {
    if (transactions.length === 0) {
        Alert.alert(t('common.error', "No Data"), "There are no transactions to generate a passbook.");
        return;
    }

    setIsGenerating(true);
    try {
      let tableRows = '';
      transactions.forEach((tx) => {
          const date = new Date(tx.transaction_date).toLocaleDateString();
          const typeColor = tx.type === 'deposit' ? '#137333' : '#c5221f';
          const sign = tx.type === 'deposit' ? '+' : '-';
          
          tableRows += `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${date}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${tx.user?.name || 'Member'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${tx.method || 'Transfer'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: ${typeColor}; font-weight: bold; text-align: right;">${sign}₹${tx.amount}</td>
            </tr>
          `;
      });

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #2952a3; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 32px; font-weight: bold; color: #2952a3; margin: 0; }
              .sub-logo { font-size: 16px; color: #666; margin-top: 5px; }
              .summary-box { background-color: #f4f6f8; padding: 20px; border-radius: 10px; margin-bottom: 30px; text-align: center;}
              .summary-title { font-size: 14px; color: #888; text-transform: uppercase; margin: 0; }
              .summary-amount { font-size: 36px; color: #28a745; margin: 10px 0 0 0; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #eef2f9; color: #2952a3; font-weight: bold; text-align: left; padding: 12px 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <p class="logo">Bharat Bachat</p>
              <p class="sub-logo">Official Group Passbook Statement</p>
            </div>
            
            <div class="summary-box">
              <p class="summary-title">Live Group Corpus Balance</p>
              <p class="summary-amount">₹${groupBalance.toLocaleString()}</p>
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
            
            <p style="text-align: center; color: #888; font-size: 12px; margin-top: 50px;">
              Generated securely by the Bharat Bachat App.
            </p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // TRUE DOWNLOAD LOGIC
      if (Platform.OS === 'android') {
        try {
          // Asks user where they want to save the file (Downloads folder, etc.)
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, 'BharatBachat_Passbook', 'application/pdf');
            await FileSystem.writeAsStringAsync(savedUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert(t('common.success', "Success"), "Passbook downloaded successfully to your device!");
          } else {
            // If they cancel the download dialog, fallback to sharing
            await Sharing.shareAsync(uri);
          }
        } catch (e) {
          console.log("Save error, falling back to share", e);
          await Sharing.shareAsync(uri);
        }
      } else {
        // iOS naturally handles saving to device via the Share sheet's "Save to Files" option
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
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
        <Ionicons name={item.type === 'deposit' ? 'arrow-down-circle' : 'arrow-up-circle'} size={32} color={item.type === 'deposit' ? '#28a745' : '#dc3545'} />
      </View>
      <View style={styles.txDetails}>
        <Text style={styles.txTitle}>{item.method || t('ledger.transaction', 'Transaction')}</Text>
        <Text style={styles.txUser}>{item.user?.name || t('groupDetails.roleMember', 'Member')}</Text>
        <Text style={styles.txDate}>{new Date(item.transaction_date).toDateString()}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: item.type === 'deposit' ? '#28a745' : '#dc3545' }]}>
          {item.type === 'deposit' ? '+' : '-'}₹{item.amount}
        </Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2952a3" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ledger.title', 'Group Passbook')}</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('groupDetails.liveCorpus', 'Available Group Corpus')}</Text>
        <Text style={styles.balanceAmount}>₹{groupBalance.toLocaleString()}</Text>
        
        {/* NEW DOWNLOAD BUTTON */}
        <TouchableOpacity 
          style={styles.downloadBtn} 
          onPress={generatePassbookPDF}
          disabled={isGenerating}
        >
          {isGenerating ? (
             <ActivityIndicator color="#2952a3" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={16} color="#2952a3" style={{marginRight: 6}} />
              <Text style={styles.downloadBtnText}>{t('ledger.downloadBtn', 'Download Statement')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('ledger.noRecords', 'No transactions recorded in this group yet.')}</Text>}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  balanceCard: { backgroundColor: '#2952a3', margin: 20, padding: 25, borderRadius: 16, elevation: 4, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  
  // New Styles for Download Button
  downloadBtn: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 15, alignItems: 'center' },
  downloadBtnText: { color: '#2952a3', fontWeight: 'bold', fontSize: 12 },

  listContainer: { flex: 1, backgroundColor: '#fff', marginHorizontal: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 15, elevation: 1 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  txIconContainer: { marginRight: 15 },
  txDetails: { flex: 1 },
  txTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  txUser: { fontSize: 13, color: '#555', marginTop: 2 },
  txDate: { fontSize: 12, color: '#888', marginTop: 2 },
  txRight: { alignItems: 'flex-end', justifyContent: 'center' },
  txAmount: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#888', padding: 20, marginTop: 20 }
});

export default LedgerScreen;