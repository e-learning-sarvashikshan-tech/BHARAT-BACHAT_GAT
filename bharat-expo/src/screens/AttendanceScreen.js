import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const AttendanceScreen = ({ navigation }) => {
  // Pre-loaded with the 5-member team for testing
  const [members, setMembers] = useState([
    { id: '1', name: 'Sanket', isPresent: true },
    { id: '2', name: 'Kunal', isPresent: true },
    { id: '3', name: 'Sanskar', isPresent: true },
    { id: '4', name: 'Vikram', isPresent: true },
    { id: '5', name: 'Pavan', isPresent: true },
  ]);

  const toggleAttendance = (id) => {
    setMembers(members.map(member => 
      member.id === id ? { ...member, isPresent: !member.isPresent } : member
    ));
  };

  const handleSaveAttendance = () => {
    const presentCount = members.filter(m => m.isPresent).length;
    
    // In the future, this is where we will call SQLite to save offline!
    Alert.alert(
      "Meeting Recorded", 
      `Attendance saved successfully!\n${presentCount} out of 5 members present.`
    );
    navigation.goBack();
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <Text style={styles.memberName}>{item.name}</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.statusButton, item.isPresent ? styles.presentBtn : styles.absentBtn]}
        onPress={() => toggleAttendance(item.id)}
      >
        <Ionicons 
          name={item.isPresent ? "checkmark-circle" : "close-circle"} 
          size={20} 
          color={item.isPresent ? "#2e7d32" : "#c62828"} 
          style={{ marginRight: 5 }}
        />
        <Text style={[styles.statusText, item.isPresent ? styles.presentText : styles.absentText]}>
          {item.isPresent ? 'Present' : 'Absent'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly Meeting</Text>
        <Text style={styles.headerSubtitle}>Mark Member Attendance</Text>
      </View>

      <View style={styles.listContainer}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={20} color="#555" />
          <Text style={styles.dateText}>{new Date().toDateString()}</Text>
        </View>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAttendance}>
          <Text style={styles.saveButtonText}>Save Attendance Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2952a3' },
  header: { padding: 25, paddingTop: 20, paddingBottom: 30, alignItems: 'center' },
  backButton: { position: 'absolute', left: 20, top: 20, padding: 5 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 },
  listContainer: { flex: 1, backgroundColor: '#f4f6f8', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 25 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#eef2ff', paddingVertical: 8, borderRadius: 20 },
  dateText: { fontSize: 14, color: '#555', marginLeft: 8, fontWeight: '600' },
  flatListContent: { paddingBottom: 20 },
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2 },
  memberInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2952a3' },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presentBtn: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
  absentBtn: { backgroundColor: '#ffebee', borderColor: '#ffcdd2' },
  statusText: { fontSize: 14, fontWeight: '600' },
  presentText: { color: '#2e7d32' },
  absentText: { color: '#c62828' },
  saveButton: { backgroundColor: '#28a745', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 30, elevation: 3 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default AttendanceScreen;