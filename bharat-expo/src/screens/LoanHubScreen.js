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
  TextInput, 
  Modal, 
  RefreshControl,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import Slider from '@react-native-community/slider';
import * as Speech from 'expo-speech'; 
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

import { requestNotificationPermissions, scheduleEmiReminderLocal, cancelAllReminders } from '../services/notificationService';

const LoanHubScreen = ({ route, navigation }) => {
  const { t, i18n } = useTranslation(); 
  
  const isGlobalMode = !route.params?.groupId;
  const groupId = route.params?.groupId;
  const role = route.params?.role || 'member';
  const groupDetails = route.params?.groupDetails;
  const isAdmin = role === 'admin';

  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroupToApply, setSelectedGroupToApply] = useState(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  const [loans, setLoans] = useState({ pending: [], active: [], completed: [], rejected: [] });
  const [activeTab, setActiveTab] = useState('pending'); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const activeGroupRules = isGlobalMode ? selectedGroupToApply : groupDetails;
  const maxGroupLoan = parseFloat(activeGroupRules?.max_loan_amount) || 50000;
  const defaultGroupInterest = parseFloat(activeGroupRules?.interest_rate) || 2;
  
  const [amount, setAmount] = useState(5000);
  const [duration, setDuration] = useState(6);
  const [proposedInterest, setProposedInterest] = useState('');

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingLoanId, setRejectingLoanId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonMode, setRejectionReasonMode] = useState(''); // NEW STATE FOR SMART CHIPS

  const [repayModalVisible, setRepayModalVisible] = useState(false);
  const [repayingLoanId, setRepayingLoanId] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMaxAmount, setRepayMaxAmount] = useState(0);

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approvingLoan, setApprovingLoan] = useState(null);
  const [customInterest, setCustomInterest] = useState('');

  // --- NEW: SMART CHIPS FOR REJECTIONS ---
  const REJECT_REASONS = [
    t('quickReasons.lowFunds', 'Insufficient Group Funds'), 
    t('quickReasons.prevPending', 'Previous Loan Pending'), 
    t('quickReasons.lowTrust', 'Low Trust Score'), 
    t('quickReasons.highAmount', 'Amount Too High'), 
    t('quickReasons.other', 'Other')
  ];

  const effectiveInterest = proposedInterest !== '' && !isNaN(proposedInterest) ? parseFloat(proposedInterest) : defaultGroupInterest;
  const monthlyEMI = (amount + (amount * (effectiveInterest / 100) * duration)) / duration;

  const fetchData = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      let fetchedLoans = { pending: [], active: [], completed: [], rejected: [] };

      if (isGlobalMode) {
        const loansResponse = await api.get(`/user/all-loans`, { headers: { Authorization: `Bearer ${token}` } });
        
        let rawLoans = loansResponse.data.data;
        if (!Array.isArray(rawLoans) && typeof rawLoans === 'object') {
            fetchedLoans = rawLoans;
        }
        setLoans(fetchedLoans);
        
        const groupsResponse = await api.get('/user/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        const activeGroups = groupsResponse.data.groups.filter(g => g.pivot.status === 'approved');
        setUserGroups(activeGroups);
        if (activeGroups.length > 0 && !selectedGroupToApply) {
            setSelectedGroupToApply(activeGroups[0]);
        }
      } else {
        const response = await api.get(`/group/${groupId}/loans`, { headers: { Authorization: `Bearer ${token}` } });
        
        let rawLoans = response.data.data;
        if (!Array.isArray(rawLoans) && typeof rawLoans === 'object') {
            fetchedLoans = rawLoans;
        }
        setLoans(fetchedLoans); 
      }

      if (fetchedLoans?.active && fetchedLoans.active.length > 0) {
         const hasPermission = await requestNotificationPermissions();
         if (hasPermission) {
            await cancelAllReminders();
            const firstLoan = fetchedLoans.active[0];
            
            const principal = parseFloat(firstLoan.principal_amount);
            const rate = parseFloat(firstLoan.interest_rate);
            const months = firstLoan.duration_months;
            const totalDue = principal + (principal * (rate / 100) * months);
            const calcEmiAmount = Math.ceil(totalDue / months);

            const title = t('push.emiTitle');
            const body = t('push.emiBody', { emiAmount: calcEmiAmount, groupName: firstLoan.group?.name || 'Bachat Gat' });

            await scheduleEmiReminderLocal(firstLoan.group?.meeting_day || 5, title, body);
         }
      }

    } catch (error) {
      console.error("Fetch Loans Error:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId, isGlobalMode, selectedGroupToApply]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleRequestLoan = async () => {
    const targetGroupId = isGlobalMode ? selectedGroupToApply?.id : groupId;
    if (!targetGroupId) return Alert.alert(t('common.error', "Error"), "Please select a group first.");

    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const payload = {
        principal_amount: amount,
        duration_months: duration,
        proposed_interest_rate: effectiveInterest
      };

      await api.post(`/group/${targetGroupId}/loan/request`, payload, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert(t('common.success', "Success"), t('alerts.loanRequested', "Loan request submitted!"));
      setActiveTab('pending'); 
      setProposedInterest(''); 
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('alerts.loanRequestFailed', "Failed to request loan."));
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveModal = (loan) => {
    setApprovingLoan(loan);
    setCustomInterest(loan.interest_rate ? loan.interest_rate.toString() : defaultGroupInterest.toString()); 
    setApproveModalVisible(true);
  };

  const submitApproval = async () => {
    if (!customInterest || isNaN(customInterest) || Number(customInterest) < 0) {
      return Alert.alert(t('common.error', "Error"), t('alerts.invalidInterest', "Please enter a valid interest rate."));
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/group/${approvingLoan.group_id}/loan/${approvingLoan.id}/approve`, 
        { interest_rate: Number(customInterest) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const approvedAmount = approvingLoan?.principal_amount;
      let speechText = `Loan of ${approvedAmount} rupees has been approved.`;
      let voiceLang = 'en-IN';

      if (i18n.language === 'mr') {
          speechText = `${approvedAmount} रुपयांचे कर्ज मंजूर झाले आहे.`; 
          voiceLang = 'mr-IN';
      } else if (i18n.language === 'hi') {
          speechText = `${approvedAmount} रुपये का लोन स्वीकृत हो गया है।`;
          voiceLang = 'hi-IN';
      }

      Speech.speak(speechText, { language: voiceLang, rate: 0.85 });

      Alert.alert(t('common.success', "Success"), t('alerts.loanApproved', "Funds disbursed successfully!"));
      setApproveModalVisible(false);
      setActiveTab('active');
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('alerts.loanApproveFailed', "Failed to approve loan. Check group balance."));
    }
  };

  const submitRejection = async () => {
    if (!rejectionReasonMode) return Alert.alert(t('common.error', "Error"), "Please select a reason.");
    if (rejectionReasonMode === 'custom' && !rejectionReason.trim()) return Alert.alert(t('common.error', "Error"), t('alerts.reasonRequired', "Reason required."));
    
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const loanToReject = [...loans.pending, ...loans.active].find(l => l.id === rejectingLoanId);
      await api.post(`/group/${loanToReject.group_id}/loan/${rejectingLoanId}/reject`, { rejection_reason: rejectionReason }, { headers: { Authorization: `Bearer ${token}` } });
      
      setRejectModalVisible(false);
      setRejectionReason('');
      Alert.alert(t('common.success', "Success"), t('alerts.loanRejected', "Loan rejected."));
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error', "Error"), t('alerts.loanRejectFailed', "Failed to reject."));
    }
  };

  const submitRepayment = async () => {
    const numAmount = Number(repayAmount);
    if (!repayAmount || isNaN(numAmount) || numAmount <= 0) {
      return Alert.alert(t('common.error', "Error"), t('alerts.invalidAmountError', "Enter a valid amount."));
    }

    if (numAmount > Math.ceil(repayMaxAmount)) {
      return Alert.alert(
        t('common.error', "Error"), 
        `Payment cannot exceed the pending balance of ₹${Math.ceil(repayMaxAmount)}`
      );
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/loan/${repayingLoanId}/repay`, { amount: numAmount }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert(t('common.success', "Success"), t('alerts.paymentSaved', "Payment recorded successfully!"));
      setRepayModalVisible(false);
      setRepayAmount('');
      fetchData(); 
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('alerts.paymentFailed', "Repayment failed.");
      Alert.alert(t('common.error', "Error"), errorMessage);
    }
  };

  const sendEmiReminder = (loan, emiAmount, pendingBalance) => {
    const groupName = loan.group?.name || activeGroupRules?.name || 'Bachat Gat';
    const memberName = loan.user?.name || 'Member';
    
    const message = t('whatsapp.emiReminder', {
      memberName: memberName,
      groupName: groupName,
      emiAmount: Math.ceil(emiAmount),
      pendingBalance: Math.ceil(pendingBalance)
    });

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(whatsappUrl).then((supported) => {
      if (!supported) Alert.alert('Error', 'WhatsApp is not installed.');
      else Linking.openURL(whatsappUrl);
    });
  };

  const renderLoanCard = (loan) => {
    const principal = parseFloat(loan.principal_amount);
    const rate = parseFloat(loan.interest_rate);
    const months = loan.duration_months;
    const amountPaid = parseFloat(loan.amount_paid) || 0;

    const totalDue = principal + (principal * (rate / 100) * months);
    const emiAmount = totalDue / months;
    
    const pendingBalance = totalDue - amountPaid;
    const fullEmisPaid = Math.floor(amountPaid / emiAmount);
    const progress = Math.min((amountPaid / totalDue) * 100, 100);

    const isLocalAdmin = isGlobalMode ? (loan.group?.users?.find(u => u.pivot?.role === 'admin') !== undefined || isAdmin) : isAdmin;

    return (
      <View key={loan.id} style={styles.loanCard}>
        <View style={styles.loanHeader}>
          <View>
            <Text style={styles.loanUser}>{loan.user?.name}</Text>
            {isGlobalMode && (
              <Text style={{fontSize: 12, color: COLORS.primaryBlue, fontWeight: 'bold'}}>
                {loan.group?.name}
              </Text>
            )}
          </View>
          <Text style={styles.loanDate}>{new Date(loan.created_at).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.loanDetailsRow}>
          <View>
            <Text style={styles.labelSmall}>{t('loanHub.principal', 'Principal')}</Text>
            <Text style={styles.bold}>₹{principal}</Text>
          </View>
          <View>
            <Text style={styles.labelSmall}>{t('loanHub.interest', 'Interest')}</Text>
            <Text style={styles.bold}>{rate}% p.m.</Text>
          </View>
          <View>
            <Text style={styles.labelSmall}>{t('loanHub.duration', 'Duration')}</Text>
            <Text style={styles.bold}>{months} {t('loanHub.monthsLabel', 'mo')}</Text>
          </View>
        </View>

        {activeTab === 'active' && (
          <View style={styles.emiTrackerContainer}>
            <View style={styles.emiHeader}>
              <Text style={styles.emiAmountText}>
                {t('loanHub.estEmi', 'EMI')}: ₹{Math.ceil(emiAmount)} 
                <Text style={{fontSize: 12, fontWeight: 'normal'}}>/mo</Text>
              </Text>
              <View style={styles.emiPill}>
                 <Text style={styles.emiPillText}>{fullEmisPaid} / {months} {t('groupDetails.statusPaid', 'Paid')}</Text>
              </View>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <Text style={styles.progressText}>{t('loanHub.totalPaid', 'Total Paid')}: ₹{amountPaid}</Text>
              <Text style={styles.progressText}>{t('loanHub.totalDue', 'Pending')}: ₹{Math.ceil(pendingBalance)}</Text>
            </View>
          </View>
        )}

        {loan.status === 'rejected' && loan.rejection_reason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="warning" size={16} color={COLORS.danger} style={{marginRight: 6}}/>
            <Text style={styles.rejectionText}>{t('loanHub.reason', 'Reason')}: {loan.rejection_reason}</Text>
          </View>
        )}

        {isLocalAdmin && loan.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: COLORS.danger, borderWidth: 1 }]} 
              onPress={() => { 
                setRejectingLoanId(loan.id); 
                setRejectionReasonMode(''); 
                setRejectionReason(''); 
                setRejectModalVisible(true); 
              }}
            >
              <Text style={{color: COLORS.danger, fontWeight: 'bold'}}>{t('common.cancel', 'Reject')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]} 
              onPress={() => openApproveModal(loan)}
            >
              <Text style={{color: COLORS.bgWhite, fontWeight: 'bold'}}>{t('groupDetails.approveBtn', 'Approve')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLocalAdmin && (loan.status === 'active' || loan.status === 'approved') && (
          <View style={{ flexDirection: 'row', marginTop: 15, gap: 10 }}>
            <TouchableOpacity 
              style={[styles.repayBtn, { flex: 1, marginTop: 0 }]} 
              onPress={() => { 
                setRepayingLoanId(loan.id); 
                setRepayMaxAmount(pendingBalance);
                const suggestedPayment = Math.ceil(Math.min(emiAmount, pendingBalance));
                setRepayAmount(suggestedPayment.toString());
                setRepayModalVisible(true); 
              }}
            >
              <Ionicons name="cash-outline" size={18} color={COLORS.bgWhite} style={{marginRight: 8}} />
              <Text style={styles.repayBtnText}>{t('loanHub.recordRepayment', 'Record Installment')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.whatsappReminderBtn} 
              onPress={() => sendEmiReminder(loan, emiAmount, pendingBalance)}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>;

  const currentTabLoans = loans[activeTab] || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {!isGlobalMode && (
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
           </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, isGlobalMode && {textAlign: 'center'}]}>
          {t('loanHub.title', 'Loan Hub')}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryBlue]} />}
      >
        <View style={styles.calculatorSection}>
          <Text style={styles.sectionTitle}>{t('loanHub.estimator', 'Loan Request & Estimator')}</Text>
          
          {isGlobalMode && (
              <View style={{ marginBottom: 20 }}>
                  <Text style={styles.label}>{t('loanHub.selectGroup', 'Select Group to Apply From')}</Text>
                  <TouchableOpacity 
                      style={styles.groupSelectorBtn}
                      onPress={() => setShowGroupSelector(!showGroupSelector)}
                  >
                      <Text style={{fontWeight: 'bold', color: COLORS.textDark}}>
                          {selectedGroupToApply ? selectedGroupToApply.name : t('loanHub.dropdownPlaceholder', "Select a Bachat Gat")}
                      </Text>
                      <Ionicons name={showGroupSelector ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textGray} />
                  </TouchableOpacity>
                  
                  {showGroupSelector && (
                      <View style={styles.groupDropdown}>
                          {userGroups.map(group => (
                              <TouchableOpacity 
                                  key={group.id} 
                                  style={styles.groupOption}
                                  onPress={() => {
                                      setSelectedGroupToApply(group);
                                      setShowGroupSelector(false);
                                  }}
                              >
                                  <Text style={{color: COLORS.textDark}}>{group.name}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>
                  )}
              </View>
          )}

          <View style={styles.sliderHeader}>
            <Text style={styles.label}>{t('loanHub.principal', 'Principal')}</Text>
            <Text style={styles.sliderValue}>₹{amount.toLocaleString()}</Text>
          </View>
          <Slider 
            style={{width: '100%', height: 40}} 
            minimumValue={1000} 
            maximumValue={maxGroupLoan} 
            step={500} 
            value={amount} 
            onValueChange={setAmount} 
            minimumTrackTintColor={COLORS.warning} 
            maximumTrackTintColor={COLORS.borderLight} 
            thumbTintColor={COLORS.warning} 
          />
          
          <View style={[styles.sliderHeader, { marginTop: 15 }]}>
            <Text style={styles.label}>{t('loanHub.duration', 'Duration')}</Text>
            <Text style={styles.sliderValue}>{duration} {t('loanHub.months', 'Months')}</Text>
          </View>
          <Slider 
            style={{width: '100%', height: 40}} 
            minimumValue={1} 
            maximumValue={24} 
            step={1} 
            value={duration} 
            onValueChange={setDuration} 
            minimumTrackTintColor={COLORS.primaryBlue} 
            maximumTrackTintColor={COLORS.borderLight} 
            thumbTintColor={COLORS.primaryBlue} 
          />

          <View style={[styles.sliderHeader, { marginTop: 15 }]}>
            <Text style={styles.label}>{t('loanHub.proposedInterest', 'Proposed Interest Rate (%)')}</Text>
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="pie-chart-outline" size={20} color={COLORS.textMuted} style={{marginRight: 10}} />
            <TextInput
              style={styles.textInput}
              value={proposedInterest}
              onChangeText={setProposedInterest}
              placeholder={`${t('loanHub.defaultInterest', 'Default is ')} ${defaultGroupInterest}%`}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.emiCard}>
            <Text style={styles.emiTitle}>{t('loanHub.estEmi', 'Est. Monthly EMI')} (@ {effectiveInterest}% / mo)</Text>
            <Text style={styles.emiValue}>₹{Math.ceil(monthlyEMI).toLocaleString()}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.disabledButton]} 
            onPress={handleRequestLoan} 
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.submitButtonText}>{t('loanHub.applyBtn', 'Ask for Loan')}</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
          <View style={styles.tabsContainer}>
            {['pending', 'active', 'completed', 'rejected'].map((tab) => (
              <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.activeTabButton]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{t(`loanHub.tab_${tab}`, tab.toUpperCase())}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.section}>
          {currentTabLoans.length > 0 ? currentTabLoans.map((loan) => renderLoanCard(loan)) : <Text style={styles.emptyText}>{t('loanHub.noLoans', 'No active loans at the moment.')}</Text>}
        </View>
        <View style={{height: 40}}/>
      </ScrollView>

      {/* MODALS */}
      <Modal visible={approveModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('loanHub.reviewTitle', 'Review Loan Details')}</Text>
            <Text style={{color: COLORS.textGray, marginBottom: 15}}>
              {t('loanHub.approvingFor', 'Approving for')} <Text style={{fontWeight: 'bold', color: COLORS.textDark}}>{approvingLoan?.user?.name}</Text>.
            </Text>
            
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: COLORS.borderLight}}>
                <Text style={styles.labelSmall}>{t('loanHub.principal', 'Principal:')}</Text>
                <Text style={styles.bold}>₹{approvingLoan?.principal_amount}</Text>
            </View>

            <Text style={styles.labelSmall}>{t('loanHub.setInterest', 'Monthly Interest Rate (%):')}</Text>
            <TextInput 
              style={[styles.modalInput, { height: 50, fontSize: 18, fontWeight: 'bold' }]} 
              keyboardType="numeric"
              value={customInterest}
              onChangeText={setCustomInterest} 
              color={COLORS.textDark}
            />
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setApproveModalVisible(false)} style={{padding: 10}}>
                <Text style={{color: COLORS.textDark}}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitApproval} style={[styles.modalSubmitBtn, {backgroundColor: COLORS.success}]}>
                <Text style={{color: COLORS.bgWhite, fontWeight: 'bold'}}>{t('common.submit', 'Confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('loanHub.reason', 'Reason')}</Text>
            
            {/* --- NEW: SMART CHIPS FOR REJECTIONS --- */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, marginTop: 10 }}>
              {REJECT_REASONS.map((reason, index) => {
                const isSelected = rejectionReasonMode === 'chip' && rejectionReason === reason;
                const isOther = reason === t('quickReasons.other', 'Other');
                const isOtherSelected = isOther && rejectionReasonMode === 'custom';
                return (
                  <TouchableOpacity
                    key={index}
                    style={{ 
                      backgroundColor: isSelected || isOtherSelected ? COLORS.primaryBlue : COLORS.bgLight, 
                      paddingHorizontal: 15, 
                      paddingVertical: 8, 
                      borderRadius: 20, 
                      marginRight: 10, 
                      borderWidth: 1, 
                      borderColor: isSelected || isOtherSelected ? COLORS.primaryBlue : COLORS.borderLight 
                    }}
                    onPress={() => {
                      if (isOther) {
                        setRejectionReasonMode('custom');
                        setRejectionReason('');
                      } else {
                        setRejectionReasonMode('chip');
                        setRejectionReason(reason);
                      }
                    }}
                  >
                    <Text style={{ 
                      color: isSelected || isOtherSelected ? COLORS.bgWhite : COLORS.textGray, 
                      fontSize: 13, 
                      fontWeight: 'bold' 
                    }}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {rejectionReasonMode === 'custom' && (
              <TextInput 
                style={styles.modalInput} 
                multiline 
                value={rejectionReason} 
                onChangeText={setRejectionReason} 
                placeholder="Type custom reason..." 
                placeholderTextColor={COLORS.textMuted} 
                color={COLORS.textDark} 
              />
            )}
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={{padding: 10}}>
                <Text style={{color: COLORS.textDark}}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRejection} style={[styles.modalSubmitBtn, {backgroundColor: COLORS.danger}]}>
                <Text style={{color: COLORS.bgWhite, fontWeight: 'bold'}}>{t('common.submit', 'Submit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={repayModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('loanHub.recordRepayment', 'Record Installment')}</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 10, backgroundColor: COLORS.bgLight, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderLight }}>
              <Text style={{color: COLORS.textGray, fontSize: 12}}>{t('loanHub.pendingBalance', 'Pending Balance:')}</Text>
              <Text style={{color: COLORS.success, fontSize: 14, fontWeight: 'bold'}}>₹{Math.ceil(repayMaxAmount)}</Text>
            </View>

            <Text style={styles.labelSmall}>{t('loanHub.enterAmount', 'Enter the amount received (₹):')}</Text>
            <TextInput 
              style={[styles.modalInput, { height: 50, fontSize: 18, fontWeight: 'bold' }]} 
              keyboardType="numeric"
              value={repayAmount}
              onChangeText={setRepayAmount} 
              color={COLORS.textDark}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setRepayModalVisible(false)} style={{padding: 10}}>
                <Text style={{color: COLORS.textDark}}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRepayment} style={[styles.modalSubmitBtn, {backgroundColor: COLORS.success}]}>
                <Text style={{color: COLORS.bgWhite, fontWeight: 'bold'}}>{t('common.submit', 'Save')}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, flex: 1 },
  content: { padding: 20 },
  calculatorSection: { backgroundColor: COLORS.bgWhite, padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.textGray },
  sliderValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryBlue },
  groupSelectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f4ff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primaryBlueLight, marginTop: 8 },
  groupDropdown: { backgroundColor: COLORS.bgWhite, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, marginTop: 5, elevation: 2 },
  groupOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.bgLight },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 15, borderRadius: 12, height: 50, marginTop: 5 },
  textInput: { flex: 1, fontSize: 16, color: COLORS.textDark },
  emiCard: { backgroundColor: COLORS.bgLight, padding: 15, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center' },
  emiTitle: { fontSize: 13, color: COLORS.textGray, textTransform: 'uppercase', letterSpacing: 1 },
  emiValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.warning, marginVertical: 5 },
  submitButton: { backgroundColor: COLORS.primaryBlue, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  disabledButton: { opacity: 0.6 },
  submitButtonText: { color: COLORS.bgWhite, fontSize: 16, fontWeight: 'bold' },
  tabsContainer: { flexDirection: 'row', backgroundColor: COLORS.bgWhite, borderRadius: 10, padding: 4, elevation: 1, minWidth: '100%' },
  tabButton: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: COLORS.primaryBlue },
  tabText: { fontWeight: 'bold', color: COLORS.textGray, fontSize: 12 },
  activeTabText: { color: COLORS.bgWhite },
  section: { marginBottom: 20 },
  loanCard: { backgroundColor: COLORS.bgWhite, padding: 16, borderRadius: 12, marginBottom: 15, elevation: 2 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  loanUser: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark },
  loanDate: { fontSize: 12, color: COLORS.textMuted },
  loanDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgLight, padding: 10, borderRadius: 8, marginTop: 5 },
  labelSmall: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
  bold: { fontWeight: 'bold', color: COLORS.textDark, fontSize: 14 },
  emiTrackerContainer: { marginTop: 15, backgroundColor: COLORS.bgWhite, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.warning },
  emiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emiAmountText: { fontSize: 16, fontWeight: 'bold', color: COLORS.warning },
  emiPill: { backgroundColor: COLORS.warning, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  emiPillText: { color: COLORS.bgWhite, fontSize: 10, fontWeight: 'bold' },
  progressBarContainer: { height: 8, backgroundColor: COLORS.borderLight, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: COLORS.success },
  progressText: { fontSize: 12, color: COLORS.textGray, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  repayBtn: { backgroundColor: COLORS.success, flexDirection: 'row', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  repayBtnText: { color: COLORS.bgWhite, fontWeight: 'bold', fontSize: 15 },
  whatsappReminderBtn: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9', width: 55 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 20 },
  rejectionBox: { flexDirection: 'row', backgroundColor: COLORS.bgWhite, padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: COLORS.danger, alignItems: 'center' },
  rejectionText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.bgWhite, width: '85%', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalInput: { backgroundColor: COLORS.bgLight, borderRadius: 8, padding: 10, marginTop: 5, color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.borderLight },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, alignItems: 'center', gap: 10 },
  modalSubmitBtn: { padding: 10, borderRadius: 8, paddingHorizontal: 20 }
});

export default LoanHubScreen;