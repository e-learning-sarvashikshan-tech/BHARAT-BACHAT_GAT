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
import api from '../services/api';
import { COLORS } from '../constants/theme'; // <-- BRAND THEME IMPORTED

const MeetingScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); 
  const { groupId, role } = route.params || {}; 
  const isAdmin = role === 'admin';

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

      const groupMembers = response.data.members_status || [];
      setMembers(groupMembers);

      const initialAttendance = {};
      groupMembers.forEach(m => {
        initialAttendance[m.id] = 'present';
      });
      setAttendance(initialAttendance);

    } catch (error) {
      console.error("Fetch Members Error:", error);
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
      Alert.alert(t('common.warning', 'Validation Error'), "Please write the meeting minutes before saving.");
      return;
    }

    setSaving(true);
    const presentCount = Object.values(attendance).filter(status => status === 'present').length;
    const totalCount = members.length;

    try {
      const dateString = meetingDate.toISOString().split('T')[0]; 
      
      await saveOfflineAttendance(groupId, dateString, attendance);
      await saveOfflineMinutes(groupId, dateString, minutesText);

      Alert.alert(
        "Meeting Saved Successfully", 
        `Records for ${meetingDate.toDateString()} saved offline.\n\n👥 ${presentCount}/${totalCount} members present.\n📝 Minutes recorded.\n\nThis will sync automatically when online.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), "Failed to save meeting records locally.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('meeting.title', 'Record Meeting')}</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity 
            style={styles.meetingCard} 
            onPress={() => setShowDatePicker(true)}
            disabled={!isAdmin}
          >
            <Ionicons name="calendar" size={24} color={COLORS.primaryBlue} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.meetingLabel}>{isAdmin ? t('attendance.date', 'Meeting Date') + ' (Tap to Edit)' : t('attendance.date', 'Meeting Date')}</Text>
              <Text style={styles.meetingDate}>{meetingDate.toDateString()}</Text>
            </View>
            {isAdmin && <Ionicons name="pencil" size={20} color={COLORS.textMuted} />}
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={meetingDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()} 
            />
          )}

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>{t('attendance.summary', 'Take Attendance')}</Text>
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
                      <Text style={styles.memberRole}>{item.pivot?.role === 'admin' ? `⭐ ${t('groupDetails.roleAdmin', 'Admin')}` : t('groupDetails.roleMember', 'Member')}</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.toggleBtn, isPresent ? styles.btnPresent : styles.btnAbsent, !isAdmin && { opacity: 0.8 }]}
                    onPress={() => toggleAttendance(item.id)}
                    disabled={!isAdmin} 
                  >
                    <Ionicons name={isPresent ? "checkmark-circle" : "close-circle"} size={20} color={isPresent ? COLORS.success : COLORS.danger} />
                    <Text style={[styles.toggleText, isPresent ? styles.textPresent : styles.textAbsent]}>
                      {isPresent ? t('attendance.present', 'Present') : t('attendance.absent', 'Absent')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <View style={[styles.sectionContainer, { marginTop: 20 }]}>
            <Text style={styles.sectionHeader}>{t('minutes.notes', 'Official Minutes & Decisions')}</Text>
            <Text style={styles.notepadSubHeader}>{t('minutes.subHeader', 'Record who requested loans, major group decisions, and any issues discussed.')}</Text>
            
            <TextInput
              style={[styles.textInput, !isAdmin && { backgroundColor: COLORS.bgLight, color: COLORS.textMuted }]}
              placeholder={isAdmin ? "e.g., Sanket requested a loan of ₹5000..." : t('minutes.noMinutes', "No minutes recorded yet.")}
              placeholderTextColor={COLORS.textMuted}
              multiline={true}
              numberOfLines={8}
              value={minutesText}
              onChangeText={setMinutesText}
              textAlignVertical="top" 
              editable={isAdmin} 
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {isAdmin && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.disabledButton]} 
            onPress={handleSaveMeeting}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.saveButtonText}>{t('meeting.saveBtn', 'Save Complete Meeting')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  content: { padding: 20 },
  meetingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primaryBlueLight, elevation: 1, marginBottom: 20 },
  meetingLabel: { fontSize: 12, color: COLORS.textGray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  meetingDate: { fontSize: 16, fontWeight: 'bold', color: COLORS.primaryBlue },
  sectionContainer: { backgroundColor: COLORS.bgWhite, borderRadius: 16, padding: 15, elevation: 1 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textGray },
  memberName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark },
  memberRole: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  btnPresent: { backgroundColor: '#e6f4ea', borderColor: '#cce8d5' },
  btnAbsent: { backgroundColor: '#fce8e6', borderColor: '#fad2cf' },
  toggleText: { fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  textPresent: { color: COLORS.success },
  textAbsent: { color: COLORS.danger },
  notepadSubHeader: { fontSize: 12, color: COLORS.textGray, marginBottom: 15, lineHeight: 18, marginTop: -10 },
  textInput: { backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, padding: 15, fontSize: 15, color: COLORS.textDark, minHeight: 180, lineHeight: 22 },
  footer: { padding: 20, backgroundColor: COLORS.bgWhite, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  saveButton: { backgroundColor: COLORS.primaryBlue, padding: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: COLORS.bgWhite, fontSize: 16, fontWeight: 'bold' }
});

export default MeetingScreen;