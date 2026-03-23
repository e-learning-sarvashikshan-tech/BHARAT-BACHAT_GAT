import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../constants/theme'; // <-- BRAND THEME IMPORTED

const MeetingHistoryScreen = ({ route, navigation }) => {
  const { groupId, members = [] } = route.params; 
  
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]); 
  
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get(`/groups/${groupId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        setHistoryData(response.data.data); 
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      Alert.alert("Error", "Could not load past records.");
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (id) => {
    const member = members.find(m => m.id.toString() === id.toString());
    return member ? member.name : `Member #${id}`;
  };

  const openDetails = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const renderDateCard = ({ item }) => (
    <TouchableOpacity style={styles.dateCard} onPress={() => openDetails(item)}>
      <View style={styles.dateCardLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar" size={24} color={COLORS.primaryBlue} />
        </View>
        <View>
          <Text style={styles.dateTitle}>Meeting on</Text>
          <Text style={styles.dateValue}>{new Date(item.meeting_date).toDateString()}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const renderAttendanceDetails = () => {
    if (!selectedRecord || !selectedRecord.attendance_data) {
      return <Text style={styles.missingText}>No attendance recorded for this date.</Text>;
    }

    const data = typeof selectedRecord.attendance_data === 'string' 
      ? JSON.parse(selectedRecord.attendance_data) 
      : selectedRecord.attendance_data;
    
    const presentIds = Object.keys(data || {}).filter(id => data[id] === 'present');
    const absentIds = Object.keys(data || {}).filter(id => data[id] === 'absent');

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailCardHeader}>
          <Ionicons name="people" size={20} color={COLORS.success} />
          <Text style={styles.detailCardTitle}>Attendance Log</Text>
        </View>
        
        <View style={styles.attendanceStats}>
          <Text style={styles.presentText}>Present ({presentIds.length})</Text>
          <Text style={styles.absentText}>Absent ({absentIds.length})</Text>
        </View>

        <View style={styles.namesSection}>
          <Text style={styles.namesLabel}>Members Present:</Text>
          <Text style={styles.namesList}>
            {presentIds.length > 0 ? presentIds.map(id => getMemberName(id)).join(', ') : 'None'}
          </Text>
          
          <Text style={[styles.namesLabel, { marginTop: 15 }]}>Members Absent:</Text>
          <Text style={styles.namesList}>
            {absentIds.length > 0 ? absentIds.map(id => getMemberName(id)).join(', ') : 'None'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
          <Text style={{marginTop: 10, color: COLORS.textGray}}>Fetching records...</Text>
        </View>
      ) : (
        <FlatList
          data={historyData}
          keyExtractor={(item) => item.meeting_date}
          renderItem={renderDateCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No meetings have been recorded yet.</Text>
          }
        />
      )}

      <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={COLORS.textDark} />
            </TouchableOpacity>
            <View style={{alignItems: 'center'}}>
              <Text style={styles.modalHeaderTitle}>Meeting Details</Text>
              <Text style={styles.modalHeaderDate}>{selectedRecord ? new Date(selectedRecord.meeting_date).toDateString() : ''}</Text>
            </View>
            <View style={{width: 28}} />
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Ionicons name="document-text" size={20} color={COLORS.primaryBlue} />
                <Text style={styles.detailCardTitle}>Meeting Minutes</Text>
              </View>
              {selectedRecord?.minutes_text ? (
                <Text style={styles.recordText}>{selectedRecord.minutes_text}</Text>
              ) : (
                <Text style={styles.missingText}>No minutes recorded for this date.</Text>
              )}
            </View>

            {renderAttendanceDetails()}
            
            <View style={{height: 40}}/>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  backButton: { padding: 5 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 15 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 50, fontSize: 16 },

  dateCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  dateCardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryBlueLight, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  dateTitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginTop: 2 },

  modalContainer: { flex: 1, backgroundColor: COLORS.bgLight },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  closeButton: { padding: 5 },
  modalHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  modalHeaderDate: { fontSize: 13, color: COLORS.primaryBlue, fontWeight: 'bold', marginTop: 2 },
  modalScroll: { padding: 15 },

  detailCard: { backgroundColor: COLORS.bgWhite, padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: 10 },
  detailCardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 10 },
  recordText: { fontSize: 15, color: COLORS.textGray, lineHeight: 24 },
  missingText: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic' },

  attendanceStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  presentText: { fontSize: 16, color: COLORS.success, fontWeight: 'bold' },
  absentText: { fontSize: 16, color: COLORS.danger, fontWeight: 'bold' },
  namesSection: { marginTop: 5 },
  namesLabel: { fontSize: 13, fontWeight: 'bold', color: COLORS.textGray, marginBottom: 4 },
  namesList: { fontSize: 14, color: COLORS.textMuted, lineHeight: 22 },
});

export default MeetingHistoryScreen;