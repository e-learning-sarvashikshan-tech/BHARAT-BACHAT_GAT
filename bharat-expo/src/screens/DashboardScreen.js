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
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- NEW: OFFLINE CACHE ENGINE
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { runSilentSync } from '../services/syncService';
import { getUnsyncedTransactions, markAsSynced } from '../services/database'; 
import { COLORS } from '../constants/theme'; 

const DashboardScreen = ({ navigation }) => {
  const { t } = useTranslation(); 

  const [userData, setUserData] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [groups, setGroups] = useState([]); 
  const [recentTransactions, setRecentTransactions] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [aboutVisible, setAboutVisible] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const [meetingGroupModal, setMeetingGroupModal] = useState(false);

  const DASHBOARD_CACHE_KEY = '@bharat_bachat_dashboard_cache'; // CACHE KEY

  const fetchData = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');

      // --- 1. INSTANT OFFLINE LOAD (Optimistic UI) ---
      const cachedData = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setUserData(parsed.user);
        setTotalSavings(parsed.total_savings);
        setGroups(parsed.groups);
        setRecentTransactions(parsed.recent_transactions);
        setLoading(false); // Instantly drop the loading screen!
      }

      // --- 2. BACKGROUND SYNC (Fetch fresh data from Laravel) ---
      const userResponse = await api.get('/user', { headers: { Authorization: `Bearer ${token}` } });
      const statsResponse = await api.get('/user/dashboard', { headers: { Authorization: `Bearer ${token}` } });

      const freshUserData = userResponse.data;
      const freshTotalSavings = statsResponse.data.total_savings;
      const freshGroups = statsResponse.data.groups || [];
      const freshTransactions = statsResponse.data.recent_transactions || [];

      // Update UI with the fresh data
      setUserData(freshUserData);
      setTotalSavings(freshTotalSavings);
      setGroups(freshGroups);
      setRecentTransactions(freshTransactions);
      setLoading(false);

      // Save the fresh data to the phone's memory for the next time they open the app
      await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
        user: freshUserData,
        total_savings: freshTotalSavings,
        groups: freshGroups,
        recent_transactions: freshTransactions
      }));

      // --- 3. FETCH NOTIFICATIONS & PUSH OFFLINE ACTIONS ---
      try {
        const notifResponse = await api.get('/notifications', { headers: { Authorization: `Bearer ${token}` } });
        setUnreadCount(notifResponse.data.unread_count || 0);
      } catch (err) {
        console.log("Could not fetch notifications offline");
      }

      const unsynced = await getUnsyncedTransactions();
      if (unsynced && unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            await api.post('/transactions/deposit', { amount: item.amount, method: item.method, type: item.type }, { headers: { Authorization: `Bearer ${token}` } });
            await markAsSynced(item.id);
          } catch (e) {
            break; 
          }
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("Dead token detected. Auto-logging out...");
        await SecureStore.deleteItemAsync('userToken');
        await AsyncStorage.removeItem(DASHBOARD_CACHE_KEY); // Clear cache on logout
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return; 
      }
      console.error("Failed to fetch dashboard data (Likely Offline):", error);
      setLoading(false); // Make sure loading stops even if offline
    } 
  }, [navigation]);

  useFocusEffect(useCallback(() => { runSilentSync(); fetchData(); }, [fetchData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(); 
    setRefreshing(false);
  }, [fetchData]);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await AsyncStorage.removeItem(DASHBOARD_CACHE_KEY);
    navigation.replace('Login');
  };

  const handleEditTransaction = (tx) => {
    navigation.navigate('EditTransaction', { transactionData: tx });
  };

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
      fetchData(); 
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('alerts.voidFailed', "Failed to void transaction."));
    } finally {
      setSubmittingDelete(false);
    }
  };

  const formatTransactionMethod = (methodStr) => {
    if (!methodStr) return t('ledger.transaction', 'Transaction');
    let formatted = methodStr;
    if (formatted.includes('[Edited:')) formatted = formatted.replace('[Edited:', `[${t('dashboard.editedTag', 'Changed')}:`);
    if (formatted.includes('VOIDED:')) formatted = formatted.replace('VOIDED:', `${t('dashboard.voidedTag', 'Cancelled')}:`);
    return formatted;
  };

  const isUserAdminOfGroup = (targetGroupId) => {
    const group = groups.find(g => g.id === targetGroupId);
    return group && group.pivot?.role === 'admin';
  };

  const adminGroups = groups.filter(g => g.pivot.role === 'admin');
  
  const handleStartMeeting = () => {
    if (adminGroups.length === 1) {
      navigation.navigate('AddMeetingRecords', { groupId: adminGroups[0].id, role: 'admin' });
    } else if (adminGroups.length > 1) {
      setMeetingGroupModal(true);
    }
  };

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const renderFaqItem = (id, qKey, aKey) => {
    const isExpanded = expandedFaq === id;
    return (
      <TouchableOpacity style={[styles.faqBox, isExpanded && styles.faqBoxActive]} onPress={() => toggleFaq(id)} activeOpacity={0.7}>
        <View style={styles.faqQRow}>
          <Text style={[styles.faqQ, isExpanded && {color: COLORS.primaryBlue}]}>{t(qKey)}</Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={isExpanded ? COLORS.primaryBlue : COLORS.textMuted} />
        </View>
        {isExpanded && <View style={styles.faqAContainer}><Text style={styles.faqA}>{t(aKey)}</Text></View>}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={{ marginTop: 10, color: COLORS.textMuted }}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryBlue, COLORS.success]} tintColor={COLORS.primaryBlue} />}>
      <View style={styles.header}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Profile')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
             <Text style={styles.greeting}>{t('dashboard.welcome', 'Hello')}, </Text>
             <Text style={styles.greetingName}>{userData?.name || t('groupDetails.roleMember', 'Member')} 👋</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellButton}>
          <Ionicons name="notifications-outline" size={26} color={COLORS.textDark} />
          {unreadCount > 0 && <View style={styles.badgeContainer}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={26} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.walletContainer}>
        <TouchableOpacity style={[styles.card, styles.savingsCard]} onPress={() => navigation.navigate('Portfolio')} activeOpacity={0.9}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <View>
              <Text style={styles.cardLabel}>{t('dashboard.totalSavings', 'My Total Savings')}</Text>
              <Text style={styles.cardValue}>₹{totalSavings.toLocaleString('en-IN')}</Text>
            </View>
            <Ionicons name="wallet" size={40} color="rgba(255,255,255,0.3)" />
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 20}}>
             <Text style={{color: COLORS.bgWhite, fontSize: 13, opacity: 0.9, marginRight: 4, fontWeight: 'bold'}}>{t('dashboard.viewBreakdown', 'See Details')}</Text>
             <Ionicons name="arrow-forward" size={14} color={COLORS.bgWhite} style={{opacity: 0.9}} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('CreateGroup')}>
            <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}><Ionicons name="add-circle" size={24} color="#0284c7" /></View>
            <Text style={styles.actionPillText}>{t('dashboard.createGat', 'Create Gat')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('JoinGroup')}>
            <View style={[styles.actionIconBox, { backgroundColor: '#fef08a' }]}><Ionicons name="enter" size={24} color="#ca8a04" /></View>
            <Text style={styles.actionPillText}>{t('dashboard.joinGat', 'Join Gat')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionPill} onPress={() => setFaqVisible(true)}>
            <View style={[styles.actionIconBox, { backgroundColor: '#dcfce7' }]}><Ionicons name="help-circle" size={24} color="#16a34a" /></View>
            <Text style={styles.actionPillText}>{t('dashboard.faqHelp', 'FAQ / Help')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionPill} onPress={() => setAboutVisible(true)}>
            <View style={[styles.actionIconBox, { backgroundColor: '#f3e8ff' }]}><Ionicons name="information-circle" size={24} color="#9333ea" /></View>
            <Text style={styles.actionPillText}>{t('dashboard.aboutApp', 'About App')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {adminGroups.length > 0 && (
        <TouchableOpacity style={styles.wizardBanner} onPress={handleStartMeeting} activeOpacity={0.8}>
          <View style={styles.wizardIconBox}>
            <Ionicons name="calendar" size={28} color={COLORS.bgWhite} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.wizardTitle}>{t('dashboard.startMeeting', 'Start Monthly Meeting')}</Text>
            <Text style={styles.wizardSubtitle}>{t('dashboard.startMeetingSub', 'Take attendance & collect savings')}</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={32} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.myGroups', 'My Bachat Gats')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyGats')}><Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold' }}>{t('dashboard.seeAll', 'See All')}</Text></TouchableOpacity>
        </View>
        {groups.length > 0 ? (
          groups.slice(0, 3).map(group => ( 
            <TouchableOpacity key={group.id} style={styles.groupCard} onPress={() => navigation.navigate('GroupDetails', { groupId: group.id, role: group.pivot.role })}>
              <View style={styles.groupIconContainer}><Ionicons name="people" size={24} color={COLORS.primaryBlue} /></View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupNameText}>{group.name}</Text>
                <Text style={styles.groupRole}>{group.pivot.role === 'admin' ? `⭐ ${t('groupDetails.roleAdmin', 'Gat Pramukh')}` : t('groupDetails.roleMember', 'Member')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}><Text style={styles.emptyStateText}>{t('groupsHub.noGroups', "You haven't joined any Bachat Gats yet.")}</Text></View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>{t('dashboard.recentTransactions', 'Recent Transactions')}</Text>
        </View>
        <View style={styles.transactionsContainer}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx, index) => {
              const isVoided = tx.category === 'voided';
              const isEdited = tx.method && tx.method.includes('[Edited:');
              const hasAdminRightsForThisTx = isUserAdminOfGroup(tx.group_id);

              return (
                <View key={index} style={[styles.transactionItem, isVoided && { backgroundColor: '#fff5f5' }]}>
                  <View style={styles.transactionIcon}>
                    <Ionicons name={tx.type === 'deposit' || tx.type === 'credit' ? "arrow-down-circle" : "arrow-up-circle"} size={32} color={isVoided ? COLORS.textMuted : (tx.type === 'deposit' || tx.type === 'credit' ? COLORS.success : COLORS.danger)} />
                  </View>
                  <View style={[styles.transactionDetails, { flex: 1, marginRight: 10, flexShrink: 1 }]}>
                    <Text style={[styles.transactionType, isVoided && { textDecorationLine: 'line-through', color: COLORS.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
                        {tx.group?.name || t('ledger.transaction', 'Record')}
                    </Text>
                    <Text style={[styles.transactionDate, isEdited && {color: COLORS.warning, fontStyle: 'italic'}, isVoided && {color: COLORS.danger, fontWeight: 'bold'}]} numberOfLines={2}>
                      {new Date(tx.transaction_date).toLocaleDateString()} • {formatTransactionMethod(tx.method)}
                    </Text>
                  </View>
                  <View style={styles.rightAlignedGroup}>
                    <Text style={[styles.transactionAmount, { color: isVoided ? COLORS.textMuted : (tx.type === 'deposit' || tx.type === 'credit' ? COLORS.success : COLORS.danger) }, isVoided && { textDecorationLine: 'line-through' }]}>
                      {tx.type === 'deposit' || tx.type === 'credit' ? '+' : '-'}₹{isVoided ? '0' : tx.amount}
                    </Text>
                    {tx.category === 'penalty' && <Text style={{fontSize: 10, color: COLORS.warning, fontWeight: 'bold', marginTop: 2, textAlign: 'right'}}>{t('groupDetails.fineTag', 'FINE')}</Text>}
                    {isVoided && <Text style={{fontSize: 10, color: COLORS.danger, fontWeight: 'bold', marginTop: 2, textAlign: 'right'}}>{t('dashboard.voidedTag', 'CANCELLED').toUpperCase()}</Text>}
                    {hasAdminRightsForThisTx && !isVoided && (
                      <View style={styles.actionIconsRow}>
                        <TouchableOpacity onPress={() => handleEditTransaction(tx)} style={styles.smallIconButton}><Ionicons name="pencil-outline" size={16} color="#007bff" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => triggerDeleteModal(tx.id)} style={[styles.smallIconButton, { marginLeft: 8 }]}><Ionicons name="trash-outline" size={16} color={COLORS.danger} /></TouchableOpacity>
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

      <Modal visible={meetingGroupModal} transparent={true} animationType="fade" onRequestClose={() => setMeetingGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('dashboard.selectGroupTitle', 'Select Bachat Gat')}</Text>
            <Text style={{ color: COLORS.textGray, marginBottom: 20 }}>{t('dashboard.selectGroupSub', 'Which group are you running a meeting for?')}</Text>
            {adminGroups.map(group => (
              <TouchableOpacity 
                key={group.id} 
                style={styles.groupCard} 
                onPress={() => {
                  setMeetingGroupModal(false);
                  navigation.navigate('AddMeetingRecords', { groupId: group.id, role: 'admin' });
                }}
              >
                <View style={styles.groupIconContainer}><Ionicons name="people" size={24} color={COLORS.primaryBlue} /></View>
                <Text style={[styles.groupNameText, { flex: 1, marginLeft: 15 }]}>{group.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setMeetingGroupModal(false)} style={{ padding: 15, alignItems: 'center', marginTop: 10 }}>
              <Text style={{ color: COLORS.danger, fontWeight: 'bold' }}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {color: COLORS.danger}]}>{t('alerts.voidPrompt', 'Void Transaction')}</Text>
            <Text style={{color: COLORS.textGray, marginBottom: 15}}>You are about to cancel this transaction. It will remain in the logs as 'Cancelled' for audit purposes.</Text>
            <TextInput style={[styles.modalInput, { height: 80, borderColor: COLORS.danger, borderWidth: 1 }]} value={deleteReason} onChangeText={setDeleteReason} placeholder="Enter reason for voiding (Required)" multiline />
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{padding: 10}}><Text style={{color: COLORS.textDark}}>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteTransaction} disabled={submittingDelete} style={[styles.modalSubmitBtn, {backgroundColor: COLORS.danger}]}>{submittingDelete ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={{color: COLORS.bgWhite, fontWeight: 'bold'}}>{t('common.submit', 'Void Record')}</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={aboutVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('dashboard.aboutApp', 'About Bharat Bachat')}</Text>
              <TouchableOpacity onPress={() => setAboutVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: 400}}>
              <Text style={styles.helpText}>{t('about.p1', 'Bharat Bachat is a secure digital ledger designed specifically for Self-Help Groups (Bachat Gats).')}</Text>
              <Text style={styles.helpText}>{t('about.p2', 'Our mission is to replace easily-lost paper passbooks with a fully transparent, offline-capable mobile application. This ensures every member always knows exactly how much they have saved and what loans are active.')}</Text>
              <Text style={styles.helpText}>{t('about.p3', 'Version: 1.0.0\nMade with ❤️ in India.')}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={faqVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%', paddingBottom: 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('dashboard.faqHelp', 'Frequently Asked Questions')}</Text>
              <TouchableOpacity onPress={() => setFaqVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              <Text style={styles.faqCategoryTitle}>{t('faq.catGroups', '🏢 Group Management')}</Text>
              {renderFaqItem('q1', 'faq.q1', 'faq.a1')}
              {renderFaqItem('q2', 'faq.q2', 'faq.a2')}

              <Text style={styles.faqCategoryTitle}>{t('faq.catTx', '💰 Transactions & Savings')}</Text>
              {renderFaqItem('q3', 'faq.q3', 'faq.a3')}
              {renderFaqItem('q4', 'faq.q4', 'faq.a4')}

              <Text style={styles.faqCategoryTitle}>{t('faq.catReports', '📄 Receipts & Reports')}</Text>
              {renderFaqItem('q5', 'faq.q5', 'faq.a5')}
              {renderFaqItem('q6', 'faq.q6', 'faq.a6')}

              <Text style={styles.faqCategoryTitle}>{t('faq.catSecurity', '🔒 Security & Loans')}</Text>
              {renderFaqItem('q7', 'faq.q7', 'faq.a7')}
              {renderFaqItem('q8', 'faq.q8', 'faq.a8')}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: COLORS.bgWhite },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark },
  greetingName: { fontSize: 24, fontWeight: 'bold', color: COLORS.primaryBlue },
  bellButton: { padding: 10, position: 'relative' },
  badgeContainer: { position: 'absolute', right: 8, top: 8, backgroundColor: COLORS.danger, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.bgWhite },
  badgeText: { color: COLORS.bgWhite, fontSize: 10, fontWeight: 'bold' },
  logoutButton: { padding: 10, backgroundColor: '#ffe6e6', borderRadius: 12, marginLeft: 10 },
  
  walletContainer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  card: { padding: 25, borderRadius: 16, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  savingsCard: { backgroundColor: COLORS.primaryBlue },
  cardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  cardValue: { color: COLORS.bgWhite, fontSize: 32, fontWeight: 'bold' },
  
  quickActionsContainer: { marginBottom: 25 },
  actionPill: { backgroundColor: COLORS.bgWhite, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, marginRight: 12, alignItems: 'center', justifyContent: 'center', elevation: 2, minWidth: 90, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  actionIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionPillText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textDark },

  wizardBanner: { flexDirection: 'row', backgroundColor: '#f0f4ff', marginHorizontal: 20, padding: 15, borderRadius: 16, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: '#dbeafe', elevation: 2 },
  wizardIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primaryBlue, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  wizardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryBlue },
  wizardSubtitle: { fontSize: 13, color: '#475569', marginTop: 3 },

  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark },
  groupCard: { backgroundColor: COLORS.bgWhite, marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  groupIconContainer: { backgroundColor: COLORS.primaryBlueLight, padding: 12, borderRadius: 12 },
  groupInfo: { flex: 1, marginLeft: 15 },
  groupNameText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  groupRole: { fontSize: 13, color: COLORS.warning, fontWeight: 'bold', marginTop: 4 },
  emptyState: { padding: 20, alignItems: 'center' },
  emptyStateText: { color: COLORS.textMuted },

  transactionsContainer: { backgroundColor: COLORS.bgWhite, marginHorizontal: 20, borderRadius: 16, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  transactionIcon: { marginRight: 15 },
  transactionDetails: { flex: 1 }, 
  transactionType: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  transactionDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  transactionAmount: { fontSize: 18, fontWeight: 'bold' },
  rightAlignedGroup: { alignItems: 'flex-end', justifyContent: 'center' },
  actionIconsRow: { flexDirection: 'row', marginTop: 10 },
  smallIconButton: { padding: 8, backgroundColor: COLORS.primaryBlueLight, borderRadius: 8, elevation: 1 },
  noTransactionsText: { textAlign: 'center', color: COLORS.textMuted, padding: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.bgWhite, width: '100%', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  helpText: { fontSize: 15, color: COLORS.textGray, lineHeight: 24, marginBottom: 15 },
  
  modalInput: { backgroundColor: COLORS.bgLight, borderRadius: 10, padding: 12, marginTop: 10, color: COLORS.textDark, fontSize: 15 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25, alignItems: 'center', gap: 15 },
  modalSubmitBtn: { paddingVertical: 12, borderRadius: 10, paddingHorizontal: 25 },

  faqCategoryTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 25, marginBottom: 12 },
  faqBox: { backgroundColor: COLORS.bgWhite, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  faqBoxActive: { borderColor: COLORS.primaryBlueLight, backgroundColor: '#f0f7ff' },
  faqQRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  faqQ: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, flex: 1, paddingRight: 10, lineHeight: 22 },
  faqAContainer: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  faqA: { fontSize: 14, color: COLORS.textGray, lineHeight: 24, marginTop: 12 }
});

export default DashboardScreen;