import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../services/database';

const MeetingMinutesScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const meetingDate = new Date().toLocaleDateString();

  const handleSave = () => {
    if (!title || !content) {
      Alert.alert("Error", "Please fill in both the title and the minutes.");
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO meeting_minutes (title, date, content) VALUES (?, ?, ?)',
        [title, meetingDate, content],
        () => {
          Alert.alert("Success", "Meeting minutes saved successfully!");
          navigation.goBack();
        },
        (_, error) => {
          console.error("SQL Error: ", error);
          Alert.alert("Error", "Could not save the meeting minutes.");
        }
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Minutes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MeetingHistory')}>
          <Ionicons name="time-outline" size={28} color="#2952a3" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color="#666" />
          <Text style={styles.dateLabel}>Date: {meetingDate}</Text>
        </View>

        <TextInput
          style={styles.titleInput}
          placeholder="Meeting Title (e.g., March Monthly Meet)"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.contentInput}
          placeholder="What was discussed? Type the minutes here..."
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <TouchableOpacity style={styles.mainSaveButton} onPress={handleSave}>
        <Ionicons name="save-outline" size={20} color="#fff" style={{marginRight: 10}} />
        <Text style={styles.buttonText}>Finalize Minutes</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  saveText: { color: '#2952a3', fontWeight: 'bold', fontSize: 16 },
  content: { padding: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dateLabel: { marginLeft: 8, color: '#666', fontSize: 16 },
  titleInput: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 18, fontWeight: 'bold', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  contentInput: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 16, height: 300, elevation: 1 },
  mainSaveButton: { backgroundColor: '#2952a3', flexDirection: 'row', margin: 20, padding: 18, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default MeetingMinutesScreen;