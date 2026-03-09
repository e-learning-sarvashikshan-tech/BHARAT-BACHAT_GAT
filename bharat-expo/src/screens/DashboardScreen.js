import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { runSilentSync } from '../services/syncService';
import { getUnsyncedTransactions, markAsSynced } from '../services/database'; 

const DashboardScreen = ({ navigation }) => {
  const { t } = useTranslation(); 

  const [userData, setUserData] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [groups, setGroups] = useState([]); 
  const [recentTransactions, setRecentTransactions] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [refreshing, setRefreshing] = useState(false);

  // --- NEW: AUDIT DELETE MODAL STATE FOR DASHBOARD ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');

      const userResponse = await api.get('/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(userResponse.data);

      const statsResponse = await api.get('/user/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTotalSavings(statsResponse.data.total_savings);
      setGroups(statsResponse.data.groups || []);
      setRecentTransactions(statsResponse.data.recent_transactions || []);

      const unsynced = await getUnsyncedTransactions();
      if (unsynced && unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            await api.post('/transactions/deposit', {
              amount: item.amount, method: item.method, type: item.type
            }, { headers: { Authorization: `Bearer ${token}` } });
            await markAsSynced(item.id);
          } catch (e) {
            break; 
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      runSilentSync();
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(); 
    setRefreshing(false);
  }, [fetchData]);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    navigation.replace('Login');
  };

  // --- RESTORED: EDIT FUNCTION ---
  const handleEditTransaction = (tx) => {
    navigation.navigate('EditTransaction', { transactionData: tx });
  };

  // --- RESTORED & UPGRADED: DELETE (VOID) LOGIC ---
  const triggerDeleteModal = (txId) => {
    setDeletingTxId(txId);
    setDeleteReason('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!deleteReason.trim()) return Alert.alert(t('common.error', "Error"), t('alerts.reasonRequired', "You must provide a reason."));
    
    setSubmittingDelete(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.delete(`/transactions/${deletingTxId}`, { 
        headers: { Authorization: `Bearer ${token}` },
        data: { delete_reason: deleteReason } 
      });
      
      Alert.alert(t('common.success', "Success"), t('alerts.voidSuccess', "Transaction securely voided."));
      setDeleteModalVisible(false);
      fetchData(); // Refresh the dashboard feed
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('alerts.voidFailed', "Failed to void transaction."));
    } finally {
      setSubmittingDelete(false);
    }
  };

  const formatTransactionMethod = (methodStr) => {
    if (!methodStr) return t('ledger.transaction', 'Transaction');
    let formatted = methodStr;
    
    if (formatted.includes('[Edited:')) {
        formatted = formatted.replace('[Edited:', `[${t('dashboard.editedTag', 'Changed')}:`);
    }
    if (formatted.includes('VOIDED:')) {
        formatted = formatted.replace('VOIDED:', `${t('dashboard.voidedTag', 'Cancelled')}:`);
    }
    return formatted;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2952a3" />
        <Text style={{ marginTop: 10, color: '#888' }}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  // --- RESTORED: GLOBAL ADMIN CHECK ---
  const isGlobalAdmin = groups.some(group => group.pivot?.role === 'admin');

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2952a3', '#28a745']} tintColor="#2952a3" />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Profile')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
             <Text style={styles.greeting}>{t('dashboard.welcome', 'Hello')}, </Text>
             <Text style={styles.greetingName}>{userData?.name || t('groupDetails.roleMember', 'Member')} 👋</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={26} color="#dc3545" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity 
          style={[styles.card, styles.savingsCard]} 
          onPress={() => navigation.navigate('Portfolio')}
          activeOpacity={0.9}
        >
          <Ionicons name="wallet" size={32} color="#fff" />
          <Text style={styles.cardLabel}>{t('dashboard.totalSavings', 'My Total Savings')}</Text>
          <Text style={styles.cardValue}>₹{totalSavings}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 12}}>
             <Text style={{color: '#fff', fontSize: 11, opacity: 0.9, marginRight: 4, fontWeight: 'bold'}}>{t('dashboard.viewBreakdown', 'See Details')}</Text>
             <Ionicons name="arrow-forward" size={12} color="#fff" style={{opacity: 0.9}} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.groupsCard]} 
          onPress={() => navigation.navigate('GroupsHub')}
        >
          <Ionicons name="people" size={32} color="#fff" />
          <Text style={styles.cardLabel}>{t('dashboard.myGroups', 'My Bachat Gats')}</Text>
          <Text style={styles.cardValue}>{groups?.length || 0} {t('dashboard.activeGroups', 'Running')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.myGroups', 'My Bachat Gats')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('GroupsHub')}>
            <Text style={{ color: '#2952a3', fontWeight: 'bold' }}>{t('dashboard.seeAll', 'See All')}</Text>
          </TouchableOpacity>
        </View>
        
        {groups.length > 0 ? (
          groups.map(group => (
            <TouchableOpacity 
              key={group.id} 
              style={styles.groupCard}
              onPress={() => navigation.navigate('GroupDetails', { groupId: group.id, role: group.pivot.role })}
            >
              <View style={styles.groupIconContainer}>
                <Ionicons name="people" size={24} color="#2952a3" />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupNameText}>{group.name}</Text>
                <Text style={styles.groupRole}>
                  {group.pivot.role === 'admin' ? `⭐ ${t('groupDetails.roleAdmin', 'Gat Pramukh')}` : t('groupDetails.roleMember', 'Member')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('groupsHub.noGroups', "You haven't joined any Bachat Gats yet.")}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.recentTransactions', 'Recent Transactions')}</Text>
        <View style={styles.transactionsContainer}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx, index) => {
              const isVoided = tx.category === 'voided';
              const isEdited = tx.method && tx.method.includes('[Edited:');

              return (
                <View key={index} style={[styles.transactionItem, isVoided && { backgroundColor: '#fff5f5' }]}>
                  <View style={styles.transactionIcon}>
                    <Ionicons 
                      name={tx.type === 'deposit' || tx.type === 'credit' ? "arrow-down-circle" : "arrow-up-circle"} 
                      size={32} 
                      color={isVoided ? "#999" : (tx.type === 'deposit' || tx.type === 'credit' ? "#28a745" : "#dc3545")} 
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionType, isVoided && { textDecorationLine: 'line-through', color: '#999' }]}>
                        {tx.group?.name || t('ledger.transaction', 'Record')}
                    </Text>
                    <Text style={[styles.transactionDate, isEdited && {color: '#e67e22', fontStyle: 'italic'}, isVoided && {color: '#dc3545', fontWeight: 'bold'}]}>
                      {new Date(tx.transaction_date).toLocaleDateString()} • {formatTransactionMethod(tx.method)}
                    </Text>
                  </View>
                  
                  <View style={styles.rightAlignedGroup}>
                    <Text style={[styles.transactionAmount, { color: isVoided ? '#999' : (tx.type === 'deposit' || tx.type === 'credit' ? '#28a745' : '#dc3545') }, isVoided && { textDecorationLine: 'line-through' }]}>
                      {tx.type === 'deposit' || tx.type === 'credit' ? '+' : '-'}₹{isVoided ? '0' : tx.amount}
                    </Text>
                    
                    {/* RESTORED: ACTION ICONS FOR ADMINS */}
                    {isGlobalAdmin && !isVoided && (
                      <View style={styles.actionIconsRow}>
                        <TouchableOpacity onPress={() => handleEditTransaction(tx)} style={styles.smallIconButton}>
                          <Ionicons name="pencil-outline" size={16} color="#007bff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => triggerDeleteModal(tx.id)} style={[styles.smallIconButton, { marginLeft: 8 }]}>
                          <Ionicons name="trash-outline" size={16} color="#dc3545" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )
            })
          ) : (
            <Text style={styles.noTransactionsText}>{t('dashboard.noTransactions', 'No recent transactions yet.')}</Text>
          )}
        </View>
      </View>

      {/* NEW: VOID/DELETE TRANSACTION MODAL */}
      <Modal visible={deleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {color: '#dc3545'}]}>{t('alerts.voidPrompt', 'Void Transaction')}</Text>
            <Text style={{color: '#666', marginBottom: 15}}>You are about to cancel this transaction. It will remain in the logs as 'Cancelled' for audit purposes.</Text>
            
            <TextInput 
              style={[styles.modalInput, { height: 80, borderColor: '#dc3545', borderWidth: 1 }]} 
              value={deleteReason}
              onChangeText={setDeleteReason} 
              placeholder="Enter reason for voiding (Required)"
              multiline 
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{padding: 10}}><Text>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteTransaction} disabled={submittingDelete} style={[styles.modalSubmitBtn, {backgroundColor: '#dc3545'}]}>
                {submittingDelete ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold'}}>{t('common.submit', 'Void Record')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  greetingName: { fontSize: 24, fontWeight: 'bold', color: '#2952a3' },
  logoutButton: { padding: 10, backgroundColor: '#ffe6e6', borderRadius: 12, marginLeft: 10 },
  
  cardsContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  card: { flex: 1, padding: 20, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  savingsCard: { backgroundColor: '#2952a3', marginRight: 10 },
  groupsCard: { backgroundColor: '#e67e22', marginLeft: 10 },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 12, marginBottom: 4 },
  cardValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 20, marginBottom: 12 },
  
  groupCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  groupIconContainer: { backgroundColor: '#eef2f9', padding: 10, borderRadius: 10 },
  groupInfo: { flex: 1, marginLeft: 15 },
  groupNameText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  groupRole: { fontSize: 13, color: '#e67e22', fontWeight: 'bold', marginTop: 2 },
  emptyState: { padding: 20, alignItems: 'center' },
  emptyStateText: { color: '#888' },

  transactionsContainer: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 10, elevation: 1 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  transactionIcon: { marginRight: 15 },
  transactionDetails: { flex: 1 },
  transactionType: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  transactionDate: { fontSize: 12, color: '#888', marginTop: 2 },
  transactionAmount: { fontSize: 18, fontWeight: 'bold' },
  rightAlignedGroup: { alignItems: 'flex-end', justifyContent: 'center' },
  actionIconsRow: { flexDirection: 'row', marginTop: 8 },
  smallIconButton: { padding: 6, backgroundColor: '#eef2f9', borderRadius: 6, elevation: 1 },
  noTransactionsText: { textAlign: 'center', color: '#888', padding: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalInput: { backgroundColor: '#f4f6f8', borderRadius: 8, padding: 10, marginTop: 10, color: '#333' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, alignItems: 'center', gap: 10 },
  modalSubmitBtn: { padding: 10, borderRadius: 8, paddingHorizontal: 20 }
});

export default DashboardScreen;