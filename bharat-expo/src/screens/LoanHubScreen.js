import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import Slider from '@react-native-community/slider';
import * as Speech from 'expo-speech'; // <-- 1. ADDED SPEECH LIBRARY
import api from '../services/api';

const LoanHubScreen = ({ route, navigation }) => {
  const { t, i18n } = useTranslation(); // <-- 2. EXTRACTED i18n FOR VOICE LOGIC
  const { groupId, role, groupDetails } = route.params;
  const isAdmin = role === 'admin';

  const [loans, setLoans] = useState({ pending: [], active: [], completed: [], rejected: [] });
  const [activeTab, setActiveTab] = useState('pending'); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const maxGroupLoan = parseFloat(groupDetails?.max_loan_amount) || 50000;
  const defaultGroupInterest = parseFloat(groupDetails?.interest_rate) || 2;
  const [amount, setAmount] = useState(5000);
  const [duration, setDuration] = useState(6);

  // Modals State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingLoanId, setRejectingLoanId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [repayModalVisible, setRepayModalVisible] = useState(false);
  const [repayingLoanId, setRepayingLoanId] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');

  // Admin Approval Modal State
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approvingLoan, setApprovingLoan] = useState(null);
  const [customInterest, setCustomInterest] = useState('');

  const monthlyEMI = (amount + (amount * (defaultGroupInterest / 100) * duration)) / duration;

  const fetchLoans = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get(`/group/${groupId}/loans`, { headers: { Authorization: `Bearer ${token}` } });
      setLoans(response.data.data); 
    } catch (error) {
      console.error("Fetch Loans Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchLoans(); }, [groupId]));

  const handleRequestLoan = async () => {
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/group/${groupId}/loan/request`, { principal_amount: amount, duration_months: duration }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert(t('common.success', "Success"), t('loanHub.requestSuccess', "Loan request submitted!"));
      setActiveTab('pending'); 
      fetchLoans();
    } catch (error) {
      Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('loanHub.requestError', "Failed to request loan."));
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveModal = (loan) => {
    setApprovingLoan(loan);
    setCustomInterest(loan.interest_rate.toString()); 
    setApproveModalVisible(true);
  };

  const submitApproval = async () => {
    if (!customInterest || isNaN(customInterest) || Number(customInterest) < 0) {
      return Alert.alert(t('common.error', "Error"), t('loanHub.invalidInterest', "Please enter a valid interest rate."));
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/group/${groupId}/loan/${approvingLoan.id}/approve`, 
        { interest_rate: Number(customInterest) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // --- 3. THE MULTILINGUAL VOICE ANNOUNCEMENT ---
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
      // ----------------------------------------------

      Alert.alert(t('common.success', "Success"), t('loanHub.disburseSuccess', "Funds disbursed successfully!"));
      setApproveModalVisible(false);
      setActiveTab('active');
      fetchLoans();
    } catch (error) {
      Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('loanHub.disburseError', "Failed to approve loan. Check group balance."));
    }
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) return Alert.alert(t('common.error', "Error"), t('loanHub.reasonRequired', "Reason required."));
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/group/${groupId}/loan/${rejectingLoanId}/reject`, { rejection_reason: rejectionReason }, { headers: { Authorization: `Bearer ${token}` } });
      setRejectModalVisible(false);
      setRejectionReason('');
      fetchLoans();
    } catch (error) {
      Alert.alert(t('common.error', "Error"), t('loanHub.rejectError', "Failed to reject."));
    }
  };

  const submitRepayment = async () => {
    if (!repayAmount || isNaN(repayAmount) || Number(repayAmount) <= 0) {
      return Alert.alert(t('common.error', "Error"), t('loanHub.invalidAmount', "Enter a valid amount."));
    }
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await api.post(`/loan/${repayingLoanId}/repay`, { amount: Number(repayAmount) }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert(t('common.success', "Success"), t('loanHub.paymentSuccess', "Payment recorded successfully!"));
      setRepayModalVisible(false);
      setRepayAmount('');
      fetchLoans();
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('loanHub.paymentError', "Repayment failed.");
      Alert.alert(t('common.error', "Error"), errorMessage);
    }
  };

  const renderLoanCard = (loan) => {
    const principal = parseFloat(loan.principal_amount);
    const rate = parseFloat(loan.interest_rate);
    const months = loan.duration_months;
    const amountPaid = parseFloat(loan.amount_paid) || 0;

    const totalDue = principal + (principal * (rate / 100) * months);
    const emiAmount = totalDue / months;
    
    const fullEmisPaid = Math.floor(amountPaid / emiAmount);
    const progress = Math.min((amountPaid / totalDue) * 100, 100);

    return (
      <View key={loan.id} style={styles.loanCard}>
        <View style={styles.loanHeader}>
          <Text style={styles.loanUser}>{loan.user?.name}</Text>
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
              <Text style={styles.emiAmountText}>{t('loanHub.emi', 'EMI')}: ₹{Math.ceil(emiAmount)} <Text style={{fontSize: 12, fontWeight: 'normal'}}>/mo</Text></Text>
              <View style={styles.emiPill}>
                 <Text style={styles.emiPillText}>{fullEmisPaid} of {months} {t('loanHub.paid', 'Paid')}</Text>
              </View>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <Text style={styles.progressText}>{t('loanHub.totalPaid', 'Total Paid')}: ₹{amountPaid}</Text>
              <Text style={styles.progressText}>{t('loanHub.totalDue', 'Total Due')}: ₹{Math.ceil(totalDue)}</Text>
            </View>
          </View>
        )}

        {loan.status === 'rejected' && loan.rejection_reason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="warning" size={16} color="#dc3545" style={{marginRight: 6}}/>
            <Text style={styles.rejectionText}>{t('loanHub.reason', 'Reason')}: {loan.rejection_reason}</Text>
          </View>
        )}

        {isAdmin && loan.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fce8e6' }]} onPress={() => { setRejectingLoanId(loan.id); setRejectModalVisible(true); }}>
              <Text style={{color: '#c5221f', fontWeight: 'bold'}}>{t('loanHub.rejectBtn', 'Reject')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e6f4ea' }]} onPress={() => openApproveModal(loan)}>
              <Text style={{color: '#137333', fontWeight: 'bold'}}>{t('loanHub.approveBtn', 'Approve')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAdmin && loan.status === 'active' && (
          <TouchableOpacity style={styles.repayBtn} onPress={() => { setRepayingLoanId(loan.id); setRepayModalVisible(true); }}>
            <Ionicons name="card-outline" size={18} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.repayBtnText}>{t('loanHub.payEmiBtn', 'Record Repayment')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2952a3" /></View>;

  const currentTabLoans = loans[activeTab] || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t('loanHub.title', 'Loan Hub')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.calculatorSection}>
          <Text style={styles.sectionTitle}>{t('loanHub.estimator', 'Loan Estimator')}</Text>
          <View style={styles.sliderHeader}><Text style={styles.label}>{t('loanHub.principal', 'Principal')}</Text><Text style={styles.sliderValue}>₹{amount.toLocaleString()}</Text></View>
          <Slider style={{width: '100%', height: 40}} minimumValue={1000} maximumValue={maxGroupLoan} step={500} value={amount} onValueChange={setAmount} minimumTrackTintColor="#e67e22" maximumTrackTintColor="#d3d3d3" thumbTintColor="#e67e22" />
          
          <View style={[styles.sliderHeader, { marginTop: 15 }]}><Text style={styles.label}>{t('loanHub.duration', 'Duration')}</Text><Text style={styles.sliderValue}>{duration} {t('loanHub.months', 'Months')}</Text></View>
          <Slider style={{width: '100%', height: 40}} minimumValue={1} maximumValue={24} step={1} value={duration} onValueChange={setDuration} minimumTrackTintColor="#2952a3" maximumTrackTintColor="#d3d3d3" thumbTintColor="#2952a3" />

          <View style={styles.emiCard}>
            <Text style={styles.emiTitle}>{t('loanHub.estEmi', 'Est. Monthly EMI')} (@ {defaultGroupInterest}% / mo)</Text>
            <Text style={styles.emiValue}>₹{Math.ceil(monthlyEMI).toLocaleString()}</Text>
          </View>

          <TouchableOpacity style={[styles.submitButton, submitting && styles.disabledButton]} onPress={handleRequestLoan} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{t('loanHub.applyBtn', 'Apply for Loan')}</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          {['pending', 'active', 'completed'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.activeTabButton]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{t(`loanHub.tab_${tab}`, tab.toUpperCase())}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          {currentTabLoans.length > 0 ? currentTabLoans.map((loan) => renderLoanCard(loan)) : <Text style={styles.emptyText}>{t('loanHub.noLoans', 'No active loans at the moment.')}</Text>}
        </View>
        <View style={{height: 40}}/>
      </ScrollView>

      {/* ADMIN APPROVAL MODAL */}
      <Modal visible={approveModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('loanHub.reviewTitle', 'Review Loan Details')}</Text>
            <Text style={{color: '#666', marginBottom: 15}}>{t('loanHub.approvingFor', 'You are about to approve a loan for')} <Text style={{fontWeight: 'bold', color: '#333'}}>{approvingLoan?.user?.name}</Text>.</Text>
            
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#eee'}}>
                <Text style={styles.labelSmall}>{t('loanHub.principalReq', 'Principal Request:')}</Text>
                <Text style={styles.bold}>₹{approvingLoan?.principal_amount}</Text>
            </View>

            <Text style={styles.labelSmall}>{t('loanHub.setInterest', 'Set Monthly Interest Rate (%):')}</Text>
            <TextInput 
              style={[styles.modalInput, { height: 50, fontSize: 18, fontWeight: 'bold' }]} 
              keyboardType="numeric"
              value={customInterest}
              onChangeText={setCustomInterest} 
            />
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setApproveModalVisible(false)} style={{padding: 10}}><Text>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitApproval} style={[styles.modalSubmitBtn, {backgroundColor: '#28a745'}]}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>{t('common.submit', 'Confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REJECTION MODAL */}
      <Modal visible={rejectModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('loanHub.rejectionReasonTitle', 'Rejection Reason')}</Text>
            <TextInput style={styles.modalInput} multiline onChangeText={setRejectionReason} placeholder={t('loanHub.reasonPlaceholder', 'Explain why...')} />
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={{padding: 10}}><Text>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitRejection} style={[styles.modalSubmitBtn, {backgroundColor: '#dc3545'}]}><Text style={{color: '#fff', fontWeight: 'bold'}}>{t('loanHub.rejectBtn', 'Reject')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REPAYMENT MODAL */}
      <Modal visible={repayModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('loanHub.recordRepayment', 'Record Repayment')}</Text>
            <Text style={styles.labelSmall}>{t('loanHub.enterAmount', 'Enter the EMI or repayment amount received (₹):')}</Text>
            <TextInput 
              style={[styles.modalInput, { height: 50, fontSize: 18, fontWeight: 'bold' }]} 
              keyboardType="numeric"
              value={repayAmount}
              onChangeText={setRepayAmount} 
              placeholder="e.g. 1500" 
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={() => setRepayModalVisible(false)} style={{padding: 10}}><Text>{t('common.cancel', 'Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitRepayment} style={[styles.modalSubmitBtn, {backgroundColor: '#28a745'}]}><Text style={{color: '#fff', fontWeight: 'bold'}}>{t('common.submit', 'Save Payment')}</Text></TouchableOpacity>
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
  calculatorSection: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  sliderValue: { fontSize: 18, fontWeight: 'bold', color: '#2952a3' },
  emiCard: { backgroundColor: '#f9fafc', padding: 15, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#eef2f9', alignItems: 'center' },
  emiTitle: { fontSize: 13, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  emiValue: { fontSize: 32, fontWeight: 'bold', color: '#e67e22', marginVertical: 5 },
  submitButton: { backgroundColor: '#2952a3', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  disabledButton: { backgroundColor: '#8b9fcb' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  tabsContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#fff', borderRadius: 10, padding: 4, elevation: 1 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#2952a3' },
  tabText: { fontWeight: 'bold', color: '#666', fontSize: 12 },
  activeTabText: { color: '#fff' },

  section: { marginBottom: 20 },
  loanCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 15, elevation: 2 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  loanUser: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  loanDate: { fontSize: 12, color: '#999' },
  loanDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, marginTop: 5 },
  labelSmall: { fontSize: 11, color: '#888', marginBottom: 2 },
  bold: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  
  emiTrackerContainer: { marginTop: 15, backgroundColor: '#fdf7f2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fae3ce' },
  emiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emiAmountText: { fontSize: 16, fontWeight: 'bold', color: '#e67e22' },
  emiPill: { backgroundColor: '#e67e22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  emiPillText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  progressBarContainer: { height: 8, backgroundColor: '#e9ecef', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#28a745' },
  progressText: { fontSize: 12, color: '#666', fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  repayBtn: { backgroundColor: '#28a745', flexDirection: 'row', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center', justifyContent: 'center' },
  repayBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },
  
  rejectionBox: { flexDirection: 'row', backgroundColor: '#fff5f5', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#ffdce0', alignItems: 'center' },
  rejectionText: { color: '#dc3545', fontSize: 13, flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalInput: { backgroundColor: '#f4f6f8', borderRadius: 8, padding: 10, marginTop: 5, color: '#333' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, alignItems: 'center', gap: 10 },
  modalSubmitBtn: { padding: 10, borderRadius: 8, paddingHorizontal: 20 }
});

export default LoanHubScreen;