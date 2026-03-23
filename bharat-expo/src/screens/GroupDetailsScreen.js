import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Share, Modal, TextInput, RefreshControl, Linking } from 'react-native'; // <-- ADDED LINKING
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 
import { PieChart } from 'react-native-gifted-charts'; 

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
      console.log("Corpus access blocked (Expected if pending approval)");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCorpusStats(); }, [groupId]));

  if (loading) return <View style={styles.loaderBox}><ActivityIndicator size="small" color={COLORS.primaryBlue} /></View>;
  if (!stats) return null;

  const availableCash = Number(stats.live_corpus) || 0;
  const activeLoans = Number(stats.outstanding_loans) || 0;
  const totalNetWorth = Number(stats.total_group_value) || 0;

  return (
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsTitle}>{t('groupDetails.fundDistribution', 'Fund Distribution')}</Text>
      
      <View style={styles.chartWrapper}>
        <PieChart
          donut
          innerRadius={70}
          radius={100}
          data={[
            { 
              value: availableCash > 0 ? availableCash : 1, 
              color: COLORS.success, 
              focused: true 
            },
            { 
              value: activeLoans > 0 ? activeLoans : 0, 
              color: COLORS.warning 
            }
          ]}
          centerLabelComponent={() => {
            return (
              <View style={{justifyContent: 'center', alignItems: 'center'}}>
                <Text style={{fontSize: 12, color: COLORS.textMuted}}>{t('groupDetails.totalNetWorth', 'Total Net Worth')}</Text>
                <Text style={{fontSize: 22, color: COLORS.primaryBlue, fontWeight: '900'}}>₹{totalNetWorth.toLocaleString()}</Text>
              </View>
            );
          }}
        />
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendLabel}>{t('groupDetails.availableCash', 'Available Cash')}</Text>
          </View>
          <Text style={[styles.legendValue, { color: COLORS.success }]}>₹{availableCash.toLocaleString()}</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendLabel}>{t('groupDetails.activeLoans', 'Out on Loan')}</Text>
          </View>
          <Text style={[styles.legendValue, { color: COLORS.warning }]}>₹{activeLoans.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.flowFooter}>
        <Text style={styles.flowText}>
          In: <Text style={{ color: COLORS.success, fontWeight: 'bold' }}>₹{stats.total_deposits.toLocaleString()}</Text>  |  
          Out: <Text style={{ color: COLORS.danger, fontWeight: 'bold' }}>₹{stats.total_withdrawals.toLocaleString()}</Text>
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

  const [refreshing, setRefreshing] = useState(false);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [penaltyModalVisible, setPenaltyModalVisible] = useState(false);
  const [penaltyUser, setPenaltyUser] = useState(null);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('');
  const [submittingPenalty, setSubmittingPenalty] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchGroupData = useCallback(async () => {
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
      Alert.alert(t('common.error', 'Access Denied'), "You are not an approved member of this group.");
      navigation.goBack(); 
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { fetchGroupData(); }, [fetchGroupData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroupData();
    setRefreshing(false);
  }, [fetchGroupData]);

  const openActionSheet = (user) => {
    setSelectedMember(user);
    setActionSheetVisible(true);
  };

  const executeAction = (actionFunction, ...args) => {
    setActionSheetVisible(false);
    setTimeout(() => { actionFunction(...args); }, 300);
  };

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

  // --- UPGRADED: WHATSAPP RECEIPT LOGIC ---
  const sendWhatsAppReceipt = (tx) => {
    const isDeposit = tx.type === 'deposit';
    const actionText = isDeposit ? t('common.deposit', 'Deposit') : t('common.withdrawal', 'Withdrawal');
    const symbol = isDeposit ? '🟢' : '🔴';
    const memberName = tx.user?.name || t('groupDetails.roleMember', 'Member');
    const dateFormatted = new Date(tx.transaction_date).toLocaleDateString('en-IN');
    
    // Pull the group name from the screen's state
    const groupName = groupDetails?.name || 'Bachat Gat';
    
    // Generate a sleek Reference ID using the database ID
    const txId = `TXN-${String(tx.id).padStart(5, '0')}`;

    // Build a premium, enterprise-grade text receipt
    const message = `*Bharat Bachat E-Receipt* 📄\n` +
                    `------------------------\n` +
                    `🏢 *Gat Name:* ${groupName}\n` +
                    `👤 *Member:* ${memberName}\n\n` +
                    `💰 *Amount:* ₹${tx.amount}\n` +
                    `${symbol} *Type:* ${actionText}\n` +
                    `📅 *Date:* ${dateFormatted}\n` +
                    `🧾 *Ref ID:* ${txId}\n` +
                    `📝 *Remarks:* ${tx.method || 'N/A'}\n` +
                    `------------------------\n` +
                    `_Generated securely via Bharat Bachat App_ ✅`;

    // Encode for deep linking
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert(t('common.error', 'Error'), "WhatsApp is not installed on your device.");
        } else {
          return Linking.openURL(whatsappUrl);
        }
      })
      .catch((err) => console.error('An error occurred', err));
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

  const triggerDeleteModal = (txId) => {
    setDeletingTxId(txId);
    setDeleteReason('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!deleteReason.trim()) return Alert.alert(t('common.error', "Error"), t('alerts.reasonRequired', "You must provide a reason for voiding this record."));
    
    setSubmittingDelete(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
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

  if (loading || !groupDetails) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {groupDetails?.name || 'Group Details'}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryBlue]} />}
      >
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
                <Ionicons name="share-social" size={24} color={COLORS.primaryBlue} />
                <Text style={styles.shareBtnText}>{t('groupDetails.shareBtn', 'SHARE')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.loanBanner}>
          <TouchableOpacity 
            style={styles.loanStat} 
            onPress={() => navigation.navigate('LoanHub', { groupId: groupId, role: role, groupDetails: groupDetails })}
          >
            <Text style={styles.loanStatValue}>{activeLoansCount}</Text>
            <Text style={styles.loanStatLabel}>{t('groupDetails.activeLoans', 'Active Loans')}</Text>
          </TouchableOpacity>
          
          <View style={styles.loanDivider} />
          
          <TouchableOpacity 
            style={styles.loanStat} 
            onPress={() => navigation.navigate('LoanHub', { groupId: groupId, role: role, groupDetails: groupDetails })}
          >
            <Text style={[styles.loanStatValue, { color: COLORS.warning }]}>{pendingLoansCount}</Text>
            <Text style={styles.loanStatLabel}>{t('groupDetails.pendingRequests', 'Pending Requests')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Members', { groupId: groupId, role: role, groupDetails: groupDetails })}>
            <View style={styles.iconCircle}><Ionicons name="people-outline" size={24} color={COLORS.primaryBlue} /></View>
            <Text style={styles.actionText}>{t('groupDetails.btnMembers', 'Members')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddMeetingRecords', { groupId: groupId, role: role })}>
            <View style={styles.iconCircle}><Ionicons name="calendar-outline" size={24} color={COLORS.primaryBlue} /></View>
            <Text style={styles.actionText}>{t('groupDetails.btnMeeting', 'Record Meeting')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Ledger', { groupId: groupId })}>
            <View style={styles.iconCircle}><Ionicons name="book-outline" size={24} color={COLORS.primaryBlue} /></View>
            <Text style={styles.actionText}>{t('groupDetails.btnPassbook', 'Passbook')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('MeetingHistory', { groupId: groupId, members: members })}>
          <Ionicons name="time" size={20} color={COLORS.primaryBlue} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 15 }}>{t('groupDetails.viewHistory', 'View Past Records & Attendance')}</Text>
        </TouchableOpacity>

        {isAdmin && pendingMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.warning }]}>{t('groupDetails.pendingApprovals', 'Pending Approvals')} ({pendingMembers.length})</Text>
            {pendingMembers.map((user) => (
              <View key={user.id} style={styles.memberCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">{user.name}</Text>
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
                    <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">{user.name} {isCreator && '👑'}</Text>
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
                const isVoided = tx.category === 'voided';
                const isEdited = tx.method && tx.method.includes('[Edited:');
                
                return (
                  <View key={index} style={[styles.transactionItem, isVoided && { backgroundColor: '#fff5f5' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                      <View style={[styles.txLeft, { flex: 1, marginRight: 10, overflow: 'hidden' }]}>
                        <Text 
                          style={[styles.txName, isVoided && { textDecorationLine: 'line-through', color: '#999' }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {tx.user?.name || t('groupDetails.roleMember', 'Member')}
                        </Text>
                        
                        <Text 
                          style={[styles.txDate, isVoided && {color: COLORS.danger, fontWeight: 'bold'}, isEdited && {color: COLORS.warning, fontStyle: 'italic'}]}
                          numberOfLines={2}
                        >
                          {formatTransactionMethod(tx.method)}
                        </Text>

                        {/* --- NEW: WHATSAPP BUTTON UI --- */}
                        {!isVoided && (
                          <TouchableOpacity 
                            style={styles.whatsappBtn}
                            onPress={() => sendWhatsAppReceipt(tx)}
                          >
                            <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                            <Text style={styles.whatsappBtnText}>Send Receipt</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmount, { color: isVoided ? '#999' : (tx.type === 'deposit' ? COLORS.success : COLORS.danger) }, isVoided && { textDecorationLine: 'line-through' }]}>
                          {tx.type === 'deposit' ? '+' : '-'}₹{isVoided ? '0' : tx.amount}
                        </Text>

                        {tx.category === 'penalty' && <Text style={{fontSize: 10, color: COLORS.warning, fontWeight: 'bold', marginTop: 2}}>{t('groupDetails.fineTag', 'FINE')}</Text>}
                        {isVoided && <Text style={{fontSize: 10, color: COLORS.danger, fontWeight: 'bold', marginTop: 2}}>{t('dashboard.voidedTag', 'CANCELLED').toUpperCase()}</Text>}
                        
                        {isAdmin && !isVoided && (
                          <View style={{ flexDirection: 'row', marginTop: 10 }}>
                            <TouchableOpacity onPress={() => navigation.navigate('EditTransaction', { transactionData: tx })} style={styles.iconBtn}>
                              <Ionicons name="pencil" size={16} color="#007bff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => triggerDeleteModal(tx.id)} style={[styles.iconBtn, { marginLeft: 8 }]}>
                              <Ionicons name="trash" size={16} color={COLORS.danger} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )
              })
            ) : (
              <Text style={{ textAlign: 'center', color: COLORS.textMuted, padding: 15 }}>{t('dashboard.noTransactions', 'No transactions recorded yet.')}</Text>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={{ padding: 15, backgroundColor: COLORS.bgWhite, borderTopWidth: 1, borderTopColor: COLORS.borderLight, flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: COLORS.warning, flexDirection: 'row', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 }}
          onPress={() => navigation.navigate('LoanHub', { groupId: groupId, role: role, groupDetails: groupDetails })}
        >
          <Ionicons name="cash-outline" size={20} color={COLORS.bgWhite} style={{ marginRight: 6 }}/>
          <Text style={{ color: COLORS.bgWhite, fontSize: 14, fontWeight: 'bold' }}>{t('groupDetails.manageLoansBtn', 'Manage Loans')}</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: COLORS.primaryBlue, flexDirection: 'row', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 }}
            onPress={() => navigation.navigate('AddSavings', { groupId: groupId, members: members })}
          >
            <Ionicons name="add-circle" size={20} color={COLORS.bgWhite} style={{ marginRight: 6 }}/>
            <Text style={{ color: COLORS.bgWhite, fontSize: 14, fontWeight: 'bold' }}>{t('groupDetails.addSavingsBtn', 'Collect Savings')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={actionSheetVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetHeader}>Manage {selectedMember?.name}</Text>
            
            {selectedMember?.pivot?.role === 'member' ? (
              <TouchableOpacity style={styles.sheetAction} onPress={() => executeAction(handlePromote, selectedMember.id, selectedMember.name)}>
                <View style={[styles.sheetIconCircle, {backgroundColor: COLORS.primaryBlueLight}]}><Ionicons name="star" size={20} color={COLORS.primaryBlue} /></View>
                <Text style={styles.sheetActionText}>{t('groupDetails.promoteBtn', 'Promote to Admin')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sheetAction} onPress={() => executeAction(handleDemote, selectedMember.id, selectedMember.name)}>
                <View style={[styles.sheetIconCircle, {backgroundColor: '#fff4e5'}]}><Ionicons name="arrow-down" size={20} color={COLORS.warning} /></View>
                <Text style={styles.sheetActionText}>{t('groupDetails.demoteBtn', 'Demote to Member')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.sheetAction} onPress={() => executeAction(triggerPenaltyModal)}>
              <View style={[styles.sheetIconCircle, {backgroundColor: '#fff4e5'}]}><Ionicons name="warning" size={20} color={COLORS.warning} /></View>
              <Text style={styles.sheetActionText}>{t('groupDetails.fineBtn', 'Charge Fine / Penalty')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetAction, {borderBottomWidth: 0}]} onPress={() => executeAction(handleRemove, selectedMember.id, selectedMember.name)}>
              <View style={[styles.sheetIconCircle, {backgroundColor: '#ffebee'}]}><Ionicons name="trash" size={20} color={COLORS.danger} /></View>
              <Text style={[styles.sheetActionText, {color: COLORS.danger}]}>{t('groupDetails.removeBtn', 'Remove Member')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={penaltyModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('groupDetails.chargeFineTitle', 'Add Fine / Penalty')}</Text>
            <Text style={{color: COLORS.textGray, marginBottom: 15}}>Charging <Text style={{fontWeight: 'bold', color: COLORS.textDark}}>{penaltyUser?.name}</Text></Text>
            
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
              <TouchableOpacity onPress={() => setPenaltyModalVisible(false)} style={{padding: 10}}><Text style={{color: COLORS.textDark}}>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleChargePenalty} disabled={submittingPenalty} style={[styles.modalSubmitBtn, {backgroundColor: COLORS.warning}]}>
                {submittingPenalty ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={{color: COLORS.bgWhite, fontWeight: 'bold'}}>{t('common.submit', 'Charge Fine')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {color: COLORS.danger}]}>{t('alerts.voidPrompt', 'Void Transaction')}</Text>
            <Text style={{color: COLORS.textGray, marginBottom: 15}}>You are about to cancel this transaction. It will remain in the logs as 'Voided' for audit purposes.</Text>
            
            <TextInput 
              style={[styles.modalInput, { height: 80, borderColor: COLORS.danger, borderWidth: 1 }]} 
              value={deleteReason}
              onChangeText={setDeleteReason} 
              placeholder="Enter reason for voiding (Required)"
              multiline 
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{padding: 10}}><Text style={{color: COLORS.textDark}}>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteTransaction} disabled={submittingDelete} style={[styles.modalSubmitBtn, {backgroundColor: COLORS.danger}]}>
                {submittingDelete ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={{color: COLORS.bgWhite, fontWeight: 'bold'}}>{t('common.submit', 'Void Record')}</Text>}
              </TouchableOpacity>
            </View>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, flex: 1 }, 
  content: { padding: 20 },
  
  loaderBox: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  
  analyticsCard: { backgroundColor: COLORS.bgWhite, borderRadius: 16, padding: 20, marginBottom: 15, elevation: 4, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center' },
  analyticsTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, alignSelf: 'flex-start', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  chartWrapper: { alignItems: 'center', justifyContent: 'center', height: 200, width: '100%', marginBottom: 10 },
  legendContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 15, paddingHorizontal: 10 },
  legendItem: { alignItems: 'center' },
  legendDot: { height: 10, width: 10, borderRadius: 5, marginRight: 6 },
  legendLabel: { fontSize: 12, color: COLORS.textGray, fontWeight: '500' },
  legendValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  flowFooter: { width: '100%', borderTopWidth: 1, borderTopColor: COLORS.borderLight, marginTop: 20, paddingTop: 15, alignItems: 'center' },
  flowText: { fontSize: 13, color: COLORS.textGray },

  overviewCard: { backgroundColor: COLORS.primaryBlue, padding: 20, borderRadius: 16, marginBottom: 15, elevation: 4 },
  overviewLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, letterSpacing: 0.5 },
  overviewValue: { color: COLORS.bgWhite, fontSize: 28, fontWeight: 'bold' },
  inviteBox: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 8, alignItems: 'center' },
  inviteLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  inviteCode: { fontWeight: 'bold', color: COLORS.bgWhite, letterSpacing: 2, fontSize: 18 },
  shareBtn: { backgroundColor: COLORS.bgWhite, borderRadius: 8, padding: 10, justifyContent: 'center', alignItems: 'center', flex: 0.3 },
  shareBtnText: { color: COLORS.primaryBlue, fontSize: 10, fontWeight: 'bold', marginTop: 2 },

  loanBanner: { flexDirection: 'row', backgroundColor: COLORS.bgWhite, borderRadius: 12, padding: 15, marginBottom: 20, elevation: 1, alignItems: 'center' },
  loanStat: { flex: 1, alignItems: 'center' },
  loanStatValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.primaryBlue },
  loanStatLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  loanDivider: { width: 1, height: 30, backgroundColor: COLORS.borderLight },

  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 16, marginBottom: 15, elevation: 1 },
  actionButton: { alignItems: 'center', width: '30%' },
  iconCircle: { backgroundColor: COLORS.primaryBlueLight, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionText: { fontSize: 11, color: COLORS.textGray, fontWeight: 'bold', textAlign: 'center' },

  historyBtn: { backgroundColor: COLORS.primaryBlueLight, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25, elevation: 1 },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15 },
  
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  avatarCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: COLORS.primaryBlueLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: COLORS.primaryBlue },
  memberName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  memberEmail: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  memberRole: { fontSize: 13, color: COLORS.primaryBlue, fontWeight: 'bold', marginTop: 4 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 4, alignSelf: 'flex-end' },
  badgePaid: { backgroundColor: '#e6f4ea' },
  badgePending: { backgroundColor: '#fce8e6' },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  textPaid: { color: '#137333' },
  textPending: { color: '#c5221f' },
  paidAmountText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  approveButton: { backgroundColor: COLORS.success, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  approveButtonText: { color: COLORS.bgWhite, fontWeight: 'bold', fontSize: 14 },

  transactionsContainer: { backgroundColor: COLORS.bgWhite, borderRadius: 12, padding: 10, elevation: 1 },
  transactionItem: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  txLeft: { flex: 1, marginRight: 10, overflow: 'hidden' }, 
  txName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  iconBtn: { padding: 6, backgroundColor: COLORS.primaryBlueLight, borderRadius: 6 },
  
  // --- NEW WHATSAPP BUTTON STYLE ---
  whatsappBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#C8E6C9' },
  whatsappBtnText: { marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: '#128C7E' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.bgWhite, width: '85%', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalInput: { backgroundColor: COLORS.bgLight, borderRadius: 8, padding: 10, marginTop: 10, color: COLORS.textDark },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, alignItems: 'center', gap: 10 },
  modalSubmitBtn: { padding: 10, borderRadius: 8, paddingHorizontal: 20 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: COLORS.bgWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 5, backgroundColor: COLORS.borderLight, borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  sheetHeader: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, textAlign: 'center', marginBottom: 20 },
  sheetAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  sheetIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sheetActionText: { fontSize: 16, fontWeight: '600', color: COLORS.textDark }
});

export default GroupDetailsScreen;