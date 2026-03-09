import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // <-- 1. IMPORT TRANSLATION HOOK
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  RefreshControl 
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { runSilentSync } from '../services/syncService';
import { getUnsyncedTransactions, markAsSynced } from '../services/database'; 

const DashboardScreen = ({ navigation }) => {
  const { t } = useTranslation(); // <-- 2. INITIALIZE HOOK

  const [userData, setUserData] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [groups, setGroups] = useState([]); 
  const [recentTransactions, setRecentTransactions] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [refreshing, setRefreshing] = useState(false);

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

      // --- BACKGROUND SYNC LOGIC ---
      const unsynced = await getUnsyncedTransactions();
      if (unsynced && unsynced.length > 0) {
        console.log(`Found ${unsynced.length} unsynced items. Attempting sync...`);
        for (const item of unsynced) {
          try {
            await api.post('/transactions/deposit', {
              amount: item.amount, method: item.method, type: item.type
            }, { headers: { Authorization: `Bearer ${token}` } });
            await markAsSynced(item.id);
            console.log(`Synced transaction ID: ${item.id}`);
          } catch (e) {
            console.log("Still offline, skipping sync.");
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

  const handleDeleteTransaction = (id) => {
    Alert.alert(
      t('common.warning', "Warning"),
      "Are you sure you want to permanently delete this transaction?",
      [
        { text: t('common.cancel', "Cancel"), style: "cancel" },
        { 
          text: t('common.delete', "Delete"), style: "destructive", 
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('userToken');
              await api.delete(`/transactions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setRecentTransactions(prev => prev.filter(tx => tx.id !== id));
              const deletedTx = recentTransactions.find(tx => tx.id === id);
              if (deletedTx) {
                const amount = parseFloat(deletedTx.amount);
                setTotalSavings(prev => deletedTx.type === 'withdrawal' ? prev + amount : prev - amount);
              }
              Alert.alert(t('common.success', "Success"), "Transaction deleted successfully.");
            } catch (error) {
              Alert.alert(t('common.error', "Error"), "Failed to delete the transaction.");
            }
          }
        }
      ]
    );
  };

  const handleEditTransaction = (tx) => {
    navigation.navigate('EditTransaction', { transactionData: tx });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2952a3" />
        <Text style={{ marginTop: 10, color: '#888' }}>{t('common.loading', 'Loading your account...')}</Text>
      </View>
    );
  }

  const isGlobalAdmin = groups.some(group => group.pivot?.role === 'admin');

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={['#2952a3', '#28a745']} 
          tintColor="#2952a3" 
        />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          {/* 3. REPLACED HARDCODED TEXT WITH t() */}
          <Text style={styles.greeting}>{t('dashboard.welcome', 'Hello')}, {userData?.name || t('groupDetails.roleMember', 'Member')} 👋</Text>
          <Text style={styles.groupName}>Bharat Bachat</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color="#dc3545" />
        </TouchableOpacity>
      </View>

      {/* Financial Summary & Group Hub Cards */}
      <View style={styles.cardsContainer}>
        <TouchableOpacity 
          style={[styles.card, styles.savingsCard]} 
          onPress={() => navigation.navigate('Portfolio')}
          activeOpacity={0.9}
        >
          <Ionicons name="wallet" size={32} color="#fff" />
          <Text style={styles.cardLabel}>{t('dashboard.totalSavings', 'Personal Savings')}</Text>
          <Text style={styles.cardValue}>₹{totalSavings}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 12}}>
             <Text style={{color: '#fff', fontSize: 11, opacity: 0.9, marginRight: 4, fontWeight: 'bold'}}>View Breakdown</Text>
             <Ionicons name="arrow-forward" size={12} color="#fff" style={{opacity: 0.9}} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.groupsCard]} 
          onPress={() => navigation.navigate('GroupsHub')}
        >
          <Ionicons name="people" size={32} color="#fff" />
          <Text style={styles.cardLabel}>{t('dashboard.myGroups', 'My Bachat Gats')}</Text>
          <Text style={styles.cardValue}>{groups?.length || 0} Active</Text>
        </TouchableOpacity>
      </View>

      {/* MY BACHAT GATS SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.myGroups', 'My Bachat Gats')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('GroupsHub')}>
            <Text style={{ color: '#2952a3', fontWeight: 'bold' }}>See All</Text>
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
                  {group.pivot.role === 'admin' ? `⭐ ${t('groupDetails.roleAdmin', 'Gat Adhyaksha')}` : t('groupDetails.roleMember', 'Member')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>You haven't joined any groups yet.</Text>
          </View>
        )}
      </View>

      {/* RECENT TRANSACTIONS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.recentTransactions', 'Recent Transactions')}</Text>
        <View style={styles.transactionsContainer}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Ionicons 
                    name={tx.type === 'deposit' || tx.type === 'credit' ? "arrow-down-circle" : "arrow-up-circle"} 
                    size={28} 
                    color={tx.type === 'deposit' || tx.type === 'credit' ? "#28a745" : "#dc3545"} 
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionType}>{tx.method || 'Transfer'}</Text>
                  <Text style={styles.transactionDate}>
                    {tx.group?.name ? `${tx.group.name} • ` : ''} 
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.rightAlignedGroup}>
                  <Text style={[styles.transactionAmount, { color: tx.type === 'deposit' || tx.type === 'credit' ? '#28a745' : '#dc3545' }]}>
                    {tx.type === 'deposit' || tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </Text>
                  
                  {isGlobalAdmin && (
                    <View style={styles.actionIconsRow}>
                      <TouchableOpacity onPress={() => handleEditTransaction(tx)} style={styles.smallIconButton}>
                        <Ionicons name="pencil-outline" size={18} color="#007bff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTransaction(tx.id)} style={styles.smallIconButton}>
                        <Ionicons name="trash-outline" size={18} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noTransactionsText}>{t('dashboard.noTransactions', 'No recent transactions yet.')}</Text>
          )}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  groupName: { fontSize: 16, color: '#888', marginTop: 4 },
  logoutButton: { padding: 8, backgroundColor: '#ffe6e6', borderRadius: 12 },
  
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

  transactionsContainer: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 10 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  transactionIcon: { marginRight: 15 },
  transactionDetails: { flex: 1 },
  transactionType: { fontSize: 16, fontWeight: 'bold', color: '#333', textTransform: 'capitalize' },
  transactionDate: { fontSize: 12, color: '#888', marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' },
  rightAlignedGroup: { alignItems: 'flex-end', justifyContent: 'center' },
  actionIconsRow: { flexDirection: 'row', marginTop: 6 },
  smallIconButton: { padding: 6, marginLeft: 8, backgroundColor: '#eef2f9', borderRadius: 6, elevation: 1 },
  noTransactionsText: { textAlign: 'center', color: '#888', padding: 20 }
});

export default DashboardScreen;