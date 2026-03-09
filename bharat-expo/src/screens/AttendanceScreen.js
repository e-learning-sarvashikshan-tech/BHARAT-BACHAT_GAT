import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // <-- IMPORTED TRANSLATION
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveOfflineAttendance } from '../services/database';
import api from '../services/api';

const AttendanceScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); // <-- INITIALIZED HOOK
  const { groupId, role } = route.params || {}; 
  const isAdmin = role === 'admin';

  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [meetingDate, setMeetingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchMembers = async () => {
    if (!groupId) {
      Alert.alert(t('common.error', 'Error'), "No Group ID provided. Please open this from a specific Group.");
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

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [groupId])
  );

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

  const handleSaveAttendance = async () => {
    setSaving(true);
    const presentCount = Object.values(attendance).filter(status => status === 'present').length;
    const totalCount = members.length;

    try {
      const dateString = meetingDate.toISOString().split('T')[0]; 
      await saveOfflineAttendance(groupId, dateString, attendance);

      Alert.alert(
        "Meeting Saved Offline", 
        `Attendance for ${meetingDate.toDateString()} securely recorded in your vault.\n${presentCount} out of ${totalCount} members present.\n\nIt will automatically sync when you connect to the internet.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), "Failed to save attendance locally.");
    } finally {
      setSaving(false);
    }
  };

  const renderMember = ({ item }) => {
    const isPresent = attendance[item.id] === 'present';

    return (
      <View style={styles.memberRow}>
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
          <Ionicons name={isPresent ? "checkmark-circle" : "close-circle"} size={20} color={isPresent ? "#137333" : "#c5221f"} />
          <Text style={[styles.toggleText, isPresent ? styles.textPresent : styles.textAbsent]}>
            {isPresent ? t('attendance.present', 'Present') : t('attendance.absent', 'Absent')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2952a3" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('attendance.title', 'Meeting Attendance')}</Text>
      </View>

      <TouchableOpacity 
        style={styles.meetingCard} 
        onPress={() => setShowDatePicker(true)}
        disabled={!isAdmin}
      >
        <Ionicons name="calendar" size={24} color="#2952a3" />
        <View style={{ marginLeft: 15, flex: 1 }}>
          <Text style={styles.meetingLabel}>{isAdmin ? t('attendance.date', 'Meeting Date') + ' (Tap to Edit)' : t('attendance.date', 'Meeting Date')}</Text>
          <Text style={styles.meetingDate}>{meetingDate.toDateString()}</Text>
        </View>
        {isAdmin && <Ionicons name="pencil" size={20} color="#888" />}
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

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>{t('attendance.summary', 'Meeting Roster')}</Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMember}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {isAdmin && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.disabledButton]} 
            onPress={handleSaveAttendance}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t('attendance.saveBtn', 'Save Attendance Register')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  meetingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 20, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#d3e0f5', elevation: 1 },
  meetingLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  meetingDate: { fontSize: 16, fontWeight: 'bold', color: '#2952a3' },
  listContainer: { flex: 1, backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 15, elevation: 1 },
  listHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f4f6f8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  memberName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  memberRole: { fontSize: 12, color: '#888', marginTop: 2 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  btnPresent: { backgroundColor: '#e6f4ea', borderColor: '#cce8d5' },
  btnAbsent: { backgroundColor: '#fce8e6', borderColor: '#fad2cf' },
  toggleText: { fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  textPresent: { color: '#137333' },
  textAbsent: { color: '#c5221f' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { backgroundColor: '#2952a3', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { backgroundColor: '#8b9fcb' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AttendanceScreen;