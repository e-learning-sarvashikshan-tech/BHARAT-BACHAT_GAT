import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';

import { saveOfflineAttendance, saveOfflineMinutes } from '../services/database';
// --- THE FIX: IMPORTED NOTIFICATION SERVICES ---
import { requestNotificationPermissions, scheduleMeetingReminderLocal } from '../services/notificationService';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

const MeetingScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); 
  const { groupId, role } = route.params || {}; 
  const isAdmin = role === 'admin';

  const [step, setStep] = useState(1);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [minutesText, setMinutesText] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMembers = async () => {
    if (!groupId) {
      Alert.alert(t('common.error', 'Error'), "No Group ID provided.");
      navigation.goBack();
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get(`/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGroup(response.data.group);
      const groupMembers = response.data.members_status || [];
      setMembers(groupMembers);

      const initialAttendance = {};
      groupMembers.forEach(m => {
        initialAttendance[m.id] = 'present';
      });
      setAttendance(initialAttendance);

    } catch (error) {
      Alert.alert(t('common.error', 'Error'), "Could not load group members.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchMembers(); }, [groupId]));

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || meetingDate;
    setShowDatePicker(Platform.OS === 'ios');
    setMeetingDate(currentDate);
  };

  const toggleAttendance = (id) => {
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSaveMeeting = async () => {
    if (minutesText.trim().length === 0) {
      Alert.alert(t('common.warning', 'Validation Error'), "Please write a quick summary of the meeting before saving.");
      return;
    }

    setSaving(true);
    const presentCount = Object.values(attendance).filter(status => status === 'present').length;
    const totalCount = members.length;

    try {
      const dateString = meetingDate.toISOString().split('T')[0]; 
      
      await saveOfflineAttendance(groupId, dateString, attendance);
      await saveOfflineMinutes(groupId, dateString, minutesText);

      // --- THE FIX: TRANSLATED DYNAMIC PUSH NOTIFICATION ---
      try {
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          const title = t('push.meetingTitle', { groupName: group?.name || 'Bachat Gat' });
          const body = t('push.meetingBody');
          await scheduleMeetingReminderLocal(group?.meeting_day || 5, title, body);
        }
      } catch (notifError) {
        console.log("Silent Notification Error bypassed:", notifError);
      }

      Alert.alert(
        t('common.success', "Meeting Saved Successfully! 🎉"), 
        `Records for ${meetingDate.toDateString()} saved offline.\n\n${presentCount}/${totalCount} members present.\nMinutes recorded.`,
        [{ text: "Back to Dashboard", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Database Save Error:", error);
      Alert.alert(t('common.error', 'Error'), "Failed to save meeting records locally.");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const expectedCollection = presentCount * (parseFloat(group?.monthly_contribution) || 0);
  const progressWidth = Math.round((step / 3) * 100) + '%';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>;
  }

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed" size={50} color={COLORS.textMuted} />
        <Text style={{ marginTop: 20, color: COLORS.textDark, fontWeight: 'bold' }}>Access Denied</Text>
        <Text style={{ color: COLORS.textGray }}>Only Admins can run meetings.</Text>
        <TouchableOpacity style={{ marginTop: 20, padding: 10 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.primaryBlue }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('meeting.wizardTitle', 'Meeting Wizard')}</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
           <Text style={{color: COLORS.primaryBlue, fontWeight: 'bold'}}>{meetingDate.toDateString()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      {showDatePicker && (
        <DateTimePicker value={meetingDate} mode="date" display="default" onChange={handleDateChange} maximumDate={new Date()} />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {step === 1 && (
            <View style={styles.wizardContent}>
              <Text style={styles.stepTitle}>{t('meeting.step1Title', 'Step 1: Roll Call')}</Text>
              <Text style={styles.stepSubtitle}>{t('meeting.step1Sub', 'Who is attending the meeting today?')}</Text>
              
              <View style={styles.sectionContainer}>
                {members.map((item) => {
                  const isPresent = attendance[item.id] === 'present';
                  return (
                    <View key={item.id} style={styles.memberRow}>
                      <View style={styles.memberInfo}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={styles.memberName}>{item.name}</Text>
                          <Text style={styles.memberRole}>{item.pivot?.role === 'admin' ? t('groupDetails.roleAdmin', 'Admin') : t('groupDetails.roleMember', 'Member')}</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={[styles.toggleBtn, isPresent ? styles.btnPresent : styles.btnAbsent]}
                        onPress={() => toggleAttendance(item.id)}
                      >
                        <Ionicons name={isPresent ? "checkmark-circle" : "close-circle"} size={20} color={isPresent ? COLORS.success : COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.wizardContent}>
              <Text style={styles.stepTitle}>{t('meeting.step2Title', 'Step 2: Financial Check')}</Text>
              <Text style={styles.stepSubtitle}>{t('meeting.step2Sub', 'Verify the cash collected matches attendance.')}</Text>
              
              <View style={styles.financeCard}>
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>{t('meeting.membersPresent', 'Members Present:')}</Text>
                  <Text style={styles.financeValue}>{presentCount} / {members.length}</Text>
                </View>
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>{t('meeting.monthlyRate', 'Monthly Rate:')}</Text>
                  <Text style={styles.financeValue}>₹{group?.monthly_contribution || 0}</Text>
                </View>
                <View style={[styles.financeRow, { borderTopWidth: 1, borderColor: COLORS.borderLight, marginTop: 15, paddingTop: 15 }]}>
                  <Text style={[styles.financeLabel, { fontSize: 16, color: COLORS.textDark }]}>{t('meeting.expectedCollection', 'Expected Cash Collection:')}</Text>
                  <Text style={[styles.financeValue, { fontSize: 24, color: COLORS.success }]}>₹{expectedCollection.toLocaleString()}</Text>
                </View>
              </View>
              <Text style={{ textAlign: 'center', color: COLORS.textGray, marginTop: 15, fontSize: 13, paddingHorizontal: 20 }}>
                {t('meeting.collectionWarning', { amount: expectedCollection.toLocaleString() })}
              </Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.wizardContent}>
              <Text style={styles.stepTitle}>{t('meeting.step3Title', 'Step 3: Official Minutes')}</Text>
              <Text style={styles.stepSubtitle}>{t('meeting.step3Sub', 'Record decisions, loan requests, or issues discussed.')}</Text>
              
              <View style={[styles.sectionContainer, { marginTop: 10, padding: 0, overflow: 'hidden' }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder={"e.g., Sanket requested a loan of ₹5000 for agriculture. Approved by all members present..."}
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={10}
                  value={minutesText}
                  onChangeText={setMinutesText}
                  textAlignVertical="top" 
                />
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footerRow}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>{t('meeting.btnBack', 'Back')}</Text>
          </TouchableOpacity>
        ) : <View style={{flex: 1}} />}

        {step < 3 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(step + 1)}>
            <Text style={styles.nextBtnText}>{t('meeting.btnNext', 'Next Step')}</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.bgWhite} style={{marginLeft: 5}}/>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.saveButton, saving && {opacity: 0.6}]} onPress={handleSaveMeeting} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.nextBtnText}>{t('meeting.btnFinish', 'Finish & Save')}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.bgWhite },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark },
  progressContainer: { height: 4, backgroundColor: COLORS.borderLight, width: '100%' },
  progressBar: { height: '100%', backgroundColor: COLORS.primaryBlue },
  content: { flex: 1 },
  wizardContent: { padding: 20 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  stepSubtitle: { fontSize: 14, color: COLORS.textGray, marginBottom: 20 },
  sectionContainer: { backgroundColor: COLORS.bgWhite, borderRadius: 16, padding: 15, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryBlueLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primaryBlue },
  memberName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark },
  memberRole: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  btnPresent: { backgroundColor: '#e6f4ea', borderColor: '#cce8d5' },
  btnAbsent: { backgroundColor: '#fce8e6', borderColor: '#fad2cf' },
  financeCard: { backgroundColor: COLORS.bgWhite, borderRadius: 16, padding: 25, elevation: 2, borderWidth: 1, borderColor: COLORS.borderLight },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  financeLabel: { fontSize: 15, color: COLORS.textGray, fontWeight: '600' },
  financeValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  textInput: { backgroundColor: COLORS.bgWhite, padding: 15, fontSize: 16, color: COLORS.textDark, minHeight: 250, lineHeight: 24 },
  footerRow: { flexDirection: 'row', padding: 20, backgroundColor: COLORS.bgWhite, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  backBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.bgLight, marginRight: 10 },
  backBtnText: { color: COLORS.textDark, fontSize: 16, fontWeight: 'bold' },
  nextBtn: { flex: 2, flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryBlue },
  saveButton: { flex: 2, flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success },
  nextBtnText: { color: COLORS.bgWhite, fontSize: 16, fontWeight: 'bold' }
});

export default MeetingScreen;