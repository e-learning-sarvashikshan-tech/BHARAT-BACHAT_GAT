import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Share, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const CorpusDashboardCard = ({ groupId }) => {
  const { t } = useTranslation(); 
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCorpusStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get(`/group/${groupId}/corpus`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch corpus stats", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCorpusStats(); }, [groupId]));

  if (loading) return <View style={styles.loaderBox}><ActivityIndicator size="small" color="#28a745" /></View>;
  if (!stats) return null;

  return (
    <View style={styles.corpusCardContainer}>
      <View style={styles.corpusHeaderRow}>
        <Ionicons name="wallet" size={24} color="#28a745" />
        <Text style={styles.corpusTitle}>{t('groupDetails.liveCorpus', 'Live Group Corpus')}</Text>
      </View>
      <View style={styles.mainBalance}>
        <Text style={styles.balanceLabel}>{t('groupDetails.availableCash', 'Available Cash in Gat')}</Text>
        <Text style={styles.balanceAmount}>₹{stats.live_corpus.toLocaleString()}</Text>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('groupDetails.totalNetWorth', 'Total Net Worth')}</Text>
          <Text style={[styles.statValue, { color: '#2952a3' }]}>₹{stats.total_group_value.toLocaleString()}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('groupDetails.activeLoans', 'Active Loans')}</Text>
          <Text style={[styles.statValue, { color: '#e67e22' }]}>₹{stats.outstanding_loans.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.footerDetails}>
        <Text style={styles.footerText}>
          {t('groupDetails.totalIn', 'Total In')}: <Text style={{ color: '#28a745', fontWeight: 'bold' }}>₹{stats.total_deposits.toLocaleString()}</Text>  |  
          {t('groupDetails.totalOut', 'Total Out')}: <Text style={{ color: '#dc3545', fontWeight: 'bold' }}>₹{stats.total_withdrawals.toLocaleString()}</Text>
        </Text>
      </View>
    </View>
  );
};

const GroupDetailsScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); 
  const { groupId, role } = route.params; 
  const isAdmin = role === 'admin';

  const [groupDetails, setGroupDetails] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [currentMonthName, setCurrentMonthName] = useState('');
  
  const [activeLoansCount, setActiveLoansCount] = useState(0);
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [penaltyModalVisible, setPenaltyModalVisible] = useState(false);
  const [penaltyUser, setPenaltyUser] = useState(null);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('');
  const [submittingPenalty, setSubmittingPenalty] = useState(false);

  // --- NEW: AUDIT DELETE MODAL STATE ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchGroupData = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get(`/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      setGroupDetails(data.group);
      setMembers(data.members_status || []);
      setPendingMembers(data.pending_members || []);
      setRecentTransactions(data.recent_transactions || []);
      setCurrentMonthName(data.current_month_name);
      setActiveLoansCount(data.active_loans_count || 0);
      setPendingLoansCount(data.pending_loans_count || 0);
    } catch (error) {
      console.error("Failed to fetch group details:", error);
      Alert.alert(t('common.error', 'Error'), "Could not load group data.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchGroupData(); }, [groupId]));

  const openActionSheet = (user) => {
    setSelectedMember(user);
    setActionSheetVisible(true);
  };

  const executeAction = (actionFunction, ...args) => {
    setActionSheetVisible(false);
    setTimeout(() => { actionFunction(...args); }, 300);
  };

  // --- NEW: SMART TRANSLATOR FOR AUDIT TAGS ---
  const formatTransactionMethod = (methodStr) => {
    if (!methodStr) return t('ledger.transaction', 'Record');
    let formatted = methodStr;
    
    if (formatted.includes('[Edited:')) {
        formatted = formatted.replace('[Edited:', `[${t('dashboard.editedTag', 'Changed')}:`);
    }
    if (formatted.includes('VOIDED:')) {
        formatted = formatted.replace('VOIDED:', `${t('dashboard.voidedTag', 'Cancelled')}:`);
    }
    return formatted;
  };

  const handleApprove = async (userId) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/group/${groupId}/approve/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert(t('common.success', 'Success'), t('alerts.memberApproved', "Member approved!"));
      fetchGroupData(); 
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('alerts.memberApproveFailed', "Failed to approve member."));
    }
  };

  const handlePromote = (userId, userName) => {
    Alert.alert(t('groupDetails.promoteBtn', "Promote to Admin"), t('alerts.promotePrompt', `Make ${userName} a Co-Admin?`), [
        { text: t('common.cancel', "Cancel"), style: "cancel" },
        { text: t('common.submit', "Promote"), onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('userToken');
              await api.post(`/group/${groupId}/promote/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
              Alert.alert(t('common.success', 'Success'), t('alerts.promoteSuccess', `${userName} is now an Admin!`));
              fetchGroupData(); 
            } catch (error) {
              Alert.alert(t('common.error', 'Error'), t('alerts.promoteFailed', "Failed to promote."));
            }
          }
        }
      ]
    );
  };

  const handleDemote = (userId, userName) => {
    Alert.alert(t('groupDetails.demoteBtn', "Demote Admin"), t('alerts.demotePrompt', `Remove Admin privileges from ${userName}?`), [
      { text: t('common.cancel', "Cancel"), style: "cancel" },
      { text: t('common.submit', "Demote"), onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync('userToken');
            await api.post(`/group/${groupId}/demote/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert(t('common.success', 'Success'), t('alerts.demoteSuccess', "Member is now a regular member."));
            fetchGroupData();
          } catch (error) {
            Alert.alert(t('common.error', 'Error'), t('alerts.demoteFailed', "Failed to demote member."));
          }
        }
      }
    ]);
  };

  const handleRemove = (userId, userName) => {
    Alert.alert(t('groupDetails.removeBtn', "Remove Member"), t('alerts.removePrompt', `WARNING: Kick ${userName} out of the group?`), [
      { text: t('common.cancel', "Cancel"), style: "cancel" },
      { text: t('common.delete', "Remove"), style: "destructive", onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync('userToken');
            await api.delete(`/group/${groupId}/remove/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert(t('common.success', 'Success'), t('alerts.removeSuccess', "Member removed successfully."));
            fetchGroupData();
          } catch (error) {
            Alert.alert(t('common.error', 'Error'), t('alerts.removeFailed', "Failed to remove member."));
          }
        }
      }
    ]);
  };

  const handleShareGroup = async () => {
    try {
      const shareMessage = `📈 *${groupDetails?.name}* - Bachat Gat\n\n📅 Monthly Contribution: ₹${groupDetails?.monthly_contribution}\n\n🤝 *Want to join our group?*\nDownload the Bharat Bachat app and use our secure Invite Code: *${groupDetails?.invite_code}*`;
      await Share.share({ message: shareMessage, title: 'Bharat Bachat Group' });
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), "Could not open the share menu.");
    }
  };

  const triggerPenaltyModal = () => {
    setPenaltyUser(selectedMember); 
    setPenaltyAmount('');
    setPenaltyReason('');
    setPenaltyModalVisible(true);
  };

  const handleChargePenalty = async () => {
    if (!penaltyAmount || isNaN(penaltyAmount) || Number(penaltyAmount) <= 0) return Alert.alert(t('common.error', "Error"), t('alerts.invalidAmountError', "Enter a valid amount."));
    if (!penaltyReason.trim()) return Alert.alert(t('common.error', "Error"), t('alerts.reasonRequired', "Please enter a reason for the fine."));

    setSubmittingPenalty(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/group/${groupId}/penalty`, {
        user_id: penaltyUser.id,
        amount: Number(penaltyAmount),
        reason: penaltyReason
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      Alert.alert(t('common.success', "Success"), t('alerts.fineSuccess', "Fine charged and added to Corpus!"));
      setPenaltyModalVisible(false);
      fetchGroupData(); 
    } catch (error) {
      Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('alerts.fineFailed', "Failed to charge penalty."));
    } finally {
      setSubmittingPenalty(false);
    }
  };

  // --- NEW: INITIATE DELETE (VOID) ---
  const triggerDeleteModal = (txId) => {
    setDeletingTxId(txId);
    setDeleteReason('');
    setDeleteModalVisible(true);
  };

  // --- NEW: EXECUTE DELETE (VOID) ---
  const confirmDeleteTransaction = async () => {
    if (!deleteReason.trim()) return Alert.alert(t('common.error', "Error"), t('alerts.reasonRequired', "You must provide a reason for voiding this record."));
    
    setSubmittingDelete(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // Axios DELETE requests pass body data via the 'data' property
      await api.delete(`/transactions/${deletingTxId}`, { 
        headers: { Authorization: `Bearer ${token}` },
        data: { delete_reason: deleteReason } 
      });
      
      Alert.alert(t('common.success', "Success"), t('alerts.voidSuccess', "Transaction securely voided."));
      setDeleteModalVisible(false);
      fetchGroupData(); 
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('alerts.voidFailed', "Failed to void transaction."));
    } finally {
      setSubmittingDelete(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2952a3" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupDetails?.name || 'Group Details'}</Text>
      </View>

      <ScrollView style={styles.content}>
        <CorpusDashboardCard groupId={groupId} />

        <View style={styles.overviewCard}>
          <View style={{ flexDirection: 'column', marginBottom: 10 }}>
            <Text style={styles.overviewLabel}>{t('groupDetails.monthlyRule', 'MONTHLY CONTRIBUTION RULE')}</Text>
            <Text style={styles.overviewValue}>₹{groupDetails?.monthly_contribution}</Text>
          </View>
          {isAdmin && (
            <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
              <View style={[styles.inviteBox, { flex: 1 }]}>
                <Text style={styles.inviteLabel}>{t('groupDetails.inviteCode', 'Group Invite Code')}</Text>
                <Text style={styles.inviteCode}>{groupDetails?.invite_code}</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareGroup}>
                <Ionicons name="share-social" size={24} color="#2952a3" />
                <Text style={styles.shareBtnText}>{t('groupDetails.shareBtn', 'SHARE')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.loanBanner}>
          <View style={styles.loanStat}>
            <Text style={styles.loanStatValue}>{activeLoansCount}</Text>
            <Text style={styles.loanStatLabel}>{t('groupDetails.activeLoans', 'Active Loans')}</Text>
          </View>
          <View style={styles.loanDivider} />
          <View style={styles.loanStat}>
            <Text style={[styles.loanStatValue, { color: '#e67e22' }]}>{pendingLoansCount}</Text>
            <Text style={styles.loanStatLabel}>{t('groupDetails.pendingRequests', 'Pending Requests')}</Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Members', { groupId: groupId, role: role, groupDetails: groupDetails })}>
            <View style={styles.iconCircle}><Ionicons name="people-outline" size={24} color="#2952a3" /></View>
            <Text style={styles.actionText}>{t('groupDetails.btnMembers', 'Members')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Attendance', { groupId: groupId, role: role })}>
            <View style={styles.iconCircle}><Ionicons name="clipboard-outline" size={24} color="#2952a3" /></View>
            <Text style={styles.actionText}>{t('groupDetails.btnAttendance', 'Attendance')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('MeetingMinutes', { groupId: groupId, role: role })}>
            <View style={styles.iconCircle}><Ionicons name="document-text-outline" size={24} color="#2952a3" /></View>
            <Text style={styles.actionText}>{t('groupDetails.btnRecords', 'Records')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Ledger', { groupId: groupId })}>
            <View style={styles.iconCircle}><Ionicons name="book-outline" size={24} color="#2952a3" /></View>
            <Text style={styles.actionText}>{t('groupDetails.btnPassbook', 'Passbook')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('MeetingHistory', { groupId: groupId, members: members })}>
          <Ionicons name="time" size={20} color="#2952a3" style={{ marginRight: 8 }} />
          <Text style={{ color: '#2952a3', fontWeight: 'bold', fontSize: 15 }}>{t('groupDetails.viewHistory', 'View Past Records & Attendance')}</Text>
        </TouchableOpacity>

        {isAdmin && pendingMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#e67e22' }]}>{t('groupDetails.pendingApprovals', 'Pending Approvals')} ({pendingMembers.length})</Text>
            {pendingMembers.map((user) => (
              <View key={user.id} style={styles.memberCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{user.name}</Text>
                  <Text style={styles.memberEmail}>{user.email}</Text>
                </View>
                <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(user.id)}>
                  <Text style={styles.approveButtonText}>{t('groupDetails.approveBtn', 'Approve')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('groupDetails.installmentStatus', 'Installment Status')} ({currentMonthName})</Text>
          {members.map((user) => {
            const isPaid = user.installment_status === 'Paid';
            const isUserAdmin = user.pivot.role === 'admin';
            const isCreator = groupDetails?.created_by === user.id; 
            return (
              <TouchableOpacity 
                key={user.id} 
                style={[styles.memberCard, { flexDirection: 'column', alignItems: 'stretch' }]}
                activeOpacity={isAdmin && !isCreator ? 0.6 : 1}
                onPress={() => { if (isAdmin && !isCreator) openActionSheet(user); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.memberName}>{user.name} {isCreator && '👑'}</Text>
                    <Text style={styles.memberRole}>{isUserAdmin ? `⭐ ${t('groupDetails.roleAdmin', 'Admin')}` : t('groupDetails.roleMember', 'Member')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge, isPaid ? styles.badgePaid : styles.badgePending]}>
                      <Text style={[styles.statusBadgeText, isPaid ? styles.textPaid : styles.textPending]}>
                        {isPaid ? t('groupDetails.statusPaid', 'PAID') : t('groupDetails.statusPending', 'PENDING')}
                      </Text>
                    </View>
                    <Text style={styles.paidAmountText}>₹{user.current_month_paid} / ₹{groupDetails?.monthly_contribution}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('groupDetails.recentTx', 'Recent Transactions')}</Text>
          <View style={styles.transactionsContainer}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, index) => {
                // VISUAL CUES FOR VOIDED OR EDITED
                const isVoided = tx.category === 'voided';
                const isEdited = tx.method && tx.method.includes('[Edited:');
                
                return (
                  <View key={index} style={[styles.transactionItem, isVoided && { backgroundColor: '#fff5f5' }]}>
                    <View style={styles.txLeft}>
                      <Text style={[styles.txName, isVoided && { textDecorationLine: 'line-through', color: '#999' }]}>{tx.user?.name || t('groupDetails.roleMember', 'Member')}</Text>
                      <Text style={styles.txDate}>{new Date(tx.transaction_date).toDateString()}</Text>
                      {/* FIXED: Now uses the formatTransactionMethod so tags translate properly! */}
                      <Text style={[styles.txDate, isVoided && {color: '#dc3545', fontWeight: 'bold'}, isEdited && {color: '#e67e22', fontStyle: 'italic'}]}>
                        {formatTransactionMethod(tx.method)}
                      </Text>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color: isVoided ? '#999' : (tx.type === 'deposit' ? '#28a745' : '#dc3545') }, isVoided && { textDecorationLine: 'line-through' }]}>
                        {tx.type === 'deposit' ? '+' : '-'}₹{isVoided ? '0' : tx.amount}
                      </Text>

                      {tx.category === 'penalty' && <Text style={{fontSize: 10, color: '#e67e22', fontWeight: 'bold', marginTop: 2}}>{t('groupDetails.fineTag', 'FINE')}</Text>}
                      {/* FIXED: Now pulls from the dynamic language dictionary! */}
                      {isVoided && <Text style={{fontSize: 10, color: '#dc3545', fontWeight: 'bold', marginTop: 2}}>{t('dashboard.voidedTag', 'CANCELLED').toUpperCase()}</Text>}
                      
                      {isAdmin && !isVoided && (
                        <View style={{ flexDirection: 'row', marginTop: 5 }}>
                          <TouchableOpacity onPress={() => navigation.navigate('EditTransaction', { transactionData: tx })} style={styles.iconBtn}>
                            <Ionicons name="pencil" size={16} color="#007bff" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => triggerDeleteModal(tx.id)} style={[styles.iconBtn, { marginLeft: 8 }]}>
                            <Ionicons name="trash" size={16} color="#dc3545" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )
              })
            ) : (
              <Text style={{ textAlign: 'center', color: '#888', padding: 15 }}>{t('dashboard.noTransactions', 'No transactions recorded yet.')}</Text>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* UNIVERSAL ACTION BAR */}
      <View style={{ padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: '#e67e22', flexDirection: 'row', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 }}
          onPress={() => navigation.navigate('LoanHub', { groupId: groupId, role: role, groupDetails: groupDetails })}
        >
          <Ionicons name="cash-outline" size={20} color="#fff" style={{ marginRight: 6 }}/>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{t('groupDetails.manageLoansBtn', 'Manage Loans')}</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#2952a3', flexDirection: 'row', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 }}
            onPress={() => navigation.navigate('AddSavings', { groupId: groupId, members: members })}
          >
            <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 6 }}/>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{t('groupDetails.addSavingsBtn', 'Collect Savings')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* THE SLIDING ACTION SHEET */}
      <Modal visible={actionSheetVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetHeader}>Manage {selectedMember?.name}</Text>
            
            {selectedMember?.pivot?.role === 'member' ? (
              <TouchableOpacity style={styles.sheetAction} onPress={() => executeAction(handlePromote, selectedMember.id, selectedMember.name)}>
                <View style={[styles.sheetIconCircle, {backgroundColor: '#eef2ff'}]}><Ionicons name="star" size={20} color="#2952a3" /></View>
                <Text style={styles.sheetActionText}>{t('groupDetails.promoteBtn', 'Promote to Admin')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sheetAction} onPress={() => executeAction(handleDemote, selectedMember.id, selectedMember.name)}>
                <View style={[styles.sheetIconCircle, {backgroundColor: '#fff4e5'}]}><Ionicons name="arrow-down" size={20} color="#e67e22" /></View>
                <Text style={styles.sheetActionText}>{t('groupDetails.demoteBtn', 'Demote to Member')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.sheetAction} onPress={() => executeAction(triggerPenaltyModal)}>
              <View style={[styles.sheetIconCircle, {backgroundColor: '#fff4e5'}]}><Ionicons name="warning" size={20} color="#e67e22" /></View>
              <Text style={styles.sheetActionText}>{t('groupDetails.fineBtn', 'Charge Fine / Penalty')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetAction, {borderBottomWidth: 0}]} onPress={() => executeAction(handleRemove, selectedMember.id, selectedMember.name)}>
              <View style={[styles.sheetIconCircle, {backgroundColor: '#ffebee'}]}><Ionicons name="trash" size={20} color="#dc3545" /></View>
              <Text style={[styles.sheetActionText, {color: '#dc3545'}]}>{t('groupDetails.removeBtn', 'Remove from Group')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PENALTY MODAL */}
      <Modal visible={penaltyModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('groupDetails.chargeFineTitle', 'Add Fine / Penalty')}</Text>
            <Text style={{color: '#666', marginBottom: 15}}>Charging <Text style={{fontWeight: 'bold', color: '#333'}}>{penaltyUser?.name}</Text></Text>
            
            <TextInput 
              style={[styles.modalInput, { height: 50, fontSize: 18, fontWeight: 'bold' }]} 
              keyboardType="numeric"
              value={penaltyAmount}
              onChangeText={setPenaltyAmount} 
              placeholder={t('groupDetails.amountPlaceholder', 'Amount (e.g. ₹50)')} 
            />
            
            <TextInput 
              style={styles.modalInput} 
              value={penaltyReason}
              onChangeText={setPenaltyReason} 
              placeholder={t('groupDetails.reasonPlaceholder', 'Reason (e.g. Late for meeting)')} 
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setPenaltyModalVisible(false)} style={{padding: 10}}><Text>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleChargePenalty} disabled={submittingPenalty} style={[styles.modalSubmitBtn, {backgroundColor: '#e67e22'}]}>
                {submittingPenalty ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold'}}>{t('common.submit', 'Charge Fine')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: VOID/DELETE TRANSACTION MODAL */}
      <Modal visible={deleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {color: '#dc3545'}]}>{t('alerts.voidPrompt', 'Void Transaction')}</Text>
            <Text style={{color: '#666', marginBottom: 15}}>You are about to cancel this transaction. It will remain in the logs as 'Voided' for audit purposes.</Text>
            
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

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  
  // Corpus Dashboard Styles
  loaderBox: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  corpusCardContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 3, borderWidth: 1, borderColor: '#eef2f9' },
  corpusHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  corpusTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  mainBalance: { backgroundColor: '#f0fdf4', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#dcfce7' },
  balanceLabel: { fontSize: 14, color: '#166534', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#15803d', marginTop: 5 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  statLabel: { fontSize: 12, color: '#6c757d', fontWeight: '600', marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  footerDetails: { borderTopWidth: 1, borderTopColor: '#f1f3f5', paddingTop: 12, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#495057' },

  // Group Info Styles
  overviewCard: { backgroundColor: '#2952a3', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 4 },
  overviewLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, letterSpacing: 0.5 },
  overviewValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  inviteBox: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 8, alignItems: 'center' },
  inviteLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  inviteCode: { fontWeight: 'bold', color: '#fff', letterSpacing: 2, fontSize: 18 },
  shareBtn: { backgroundColor: '#fff', borderRadius: 8, padding: 10, justifyContent: 'center', alignItems: 'center', flex: 0.3 },
  shareBtnText: { color: '#2952a3', fontSize: 10, fontWeight: 'bold', marginTop: 2 },

  // Loan Banner
  loanBanner: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 20, elevation: 1, alignItems: 'center' },
  loanStat: { flex: 1, alignItems: 'center' },
  loanStatValue: { fontSize: 22, fontWeight: 'bold', color: '#2952a3' },
  loanStatLabel: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '600' },
  loanDivider: { width: 1, height: 30, backgroundColor: '#eee' },

  // Action Grid
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 1 },
  actionButton: { alignItems: 'center', width: '23%' },
  iconCircle: { backgroundColor: '#eef2f9', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionText: { fontSize: 11, color: '#555', fontWeight: 'bold', textAlign: 'center' },

  historyBtn: { backgroundColor: '#e6eeff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25, elevation: 1 },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  avatarCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#2952a3' },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  memberRole: { fontSize: 13, color: '#2952a3', fontWeight: 'bold', marginTop: 4 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 4, alignSelf: 'flex-end' },
  badgePaid: { backgroundColor: '#e6f4ea' },
  badgePending: { backgroundColor: '#fce8e6' },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  textPaid: { color: '#137333' },
  textPending: { color: '#c5221f' },
  paidAmountText: { fontSize: 12, color: '#666', fontWeight: '500' },

  approveButton: { backgroundColor: '#28a745', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  approveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  transactionsContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 10, elevation: 1 },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  txLeft: { flex: 1 },
  txName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  txDate: { fontSize: 12, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  iconBtn: { padding: 6, backgroundColor: '#eef2f9', borderRadius: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalInput: { backgroundColor: '#f4f6f8', borderRadius: 8, padding: 10, marginTop: 10, color: '#333' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, alignItems: 'center', gap: 10 },
  modalSubmitBtn: { padding: 10, borderRadius: 8, paddingHorizontal: 20 },

  // --- SLIDING ACTION SHEET STYLES ---
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#ccc', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  sheetHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  sheetAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sheetIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sheetActionText: { fontSize: 16, fontWeight: '600', color: '#333' }
});

export default GroupDetailsScreen;