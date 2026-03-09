import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // <-- IMPORTED TRANSLATION
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveOfflineMinutes } from '../services/database';

const MeetingMinutesScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); // <-- INITIALIZED HOOK
  const { groupId, role } = route.params || {}; 
  const isAdmin = role === 'admin';

  const [meetingDate, setMeetingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [minutesText, setMinutesText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || meetingDate;
    setShowDatePicker(Platform.OS === 'ios');
    setMeetingDate(currentDate);
  };

  const handleSaveMinutes = async () => {
    if (!groupId) {
      Alert.alert(t('common.error', 'Error'), "No Group ID found. Please open from a specific Group.");
      return;
    }
    if (minutesText.trim().length === 0) {
      Alert.alert(t('common.warning', 'Validation Error'), "Please write the meeting minutes before saving.");
      return;
    }

    setSaving(true);
    
    try {
      const dateString = meetingDate.toISOString().split('T')[0];
      await saveOfflineMinutes(groupId, dateString, minutesText);

      Alert.alert(
        "Records Saved Offline", 
        `Meeting minutes for ${meetingDate.toDateString()} have been securely recorded in your vault.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), "Failed to save minutes locally.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('minutes.title', 'Meeting Records')}</Text>
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
            <Ionicons name="calendar" size={24} color="#2952a3" />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.meetingLabel}>{isAdmin ? t('minutes.date', 'Meeting Date') + ' (Tap to Edit)' : t('minutes.date', 'Meeting Date')}</Text>
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

          <View style={styles.notepadContainer}>
            <Text style={styles.notepadHeader}>{t('minutes.notes', 'Official Minutes & Decisions')}</Text>
            <Text style={styles.notepadSubHeader}>{t('minutes.subHeader', 'Record who requested loans, major group decisions, and any issues discussed.')}</Text>
            
            <TextInput
              style={[styles.textInput, !isAdmin && { backgroundColor: '#f0f0f0', color: '#666' }]}
              placeholder={isAdmin ? "e.g., Sanket requested a loan of ₹5000..." : t('minutes.noMinutes', "No minutes recorded yet.")}
              placeholderTextColor="#a0a0a0"
              multiline={true}
              numberOfLines={12}
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
            onPress={handleSaveMinutes}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t('minutes.saveBtn', 'Save Official Record')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  meetingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#d3e0f5', elevation: 1, marginBottom: 20 },
  meetingLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  meetingDate: { fontSize: 16, fontWeight: 'bold', color: '#2952a3' },
  notepadContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 15, elevation: 1 },
  notepadHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  notepadSubHeader: { fontSize: 12, color: '#888', marginBottom: 15, lineHeight: 18 },
  textInput: { backgroundColor: '#fcfcfc', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, fontSize: 15, color: '#333', minHeight: 250, lineHeight: 22 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { backgroundColor: '#2952a3', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { backgroundColor: '#8b9fcb' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default MeetingMinutesScreen;