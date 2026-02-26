import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saveMeetingMinutes, updateMeetingMinute } from '../services/database';

// Notice we added `route` here to receive the parameters from the history screen
const MeetingMinutesScreen = ({ route, navigation }) => {
  const editData = route.params?.editData || null;

  // If editData exists, pre-fill the inputs. Otherwise, leave them blank.
  const [title, setTitle] = useState(editData ? editData.title : '');
  const [content, setContent] = useState(editData ? editData.content : '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required", "Please provide a title and meeting notes.");
      return;
    }

    setIsSaving(true);
    try {
      let success = false;
      
      if (editData) {
        // We are updating an existing record
        success = await updateMeetingMinute(editData.id, title, content);
      } else {
        // We are saving a brand new record
        success = await saveMeetingMinutes(title, content);
      }

      if (success) {
        Alert.alert("Success", editData ? "Minutes updated!" : "Minutes saved locally!");
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to save to database.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editData ? "Edit Minutes" : "New Meeting"}</Text>
        
        {/* Only show the history icon if we are making a NEW record */}
        {!editData && (
          <TouchableOpacity onPress={() => navigation.navigate('MeetingHistory')}>
            <Ionicons name="time-outline" size={28} color="#2952a3" />
          </TouchableOpacity>
        )}
        {editData && <View style={{width: 28}} />}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Meeting Agenda / Title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="e.g., Monthly Savings Review"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Decisions & Minutes</Text>
        <TextInput
          style={styles.contentInput}
          placeholder="Summarize the discussion here..."
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={10}
          textAlignVertical="top"
        />

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons name={editData ? "checkmark-circle-outline" : "cloud-upload-outline"} size={20} color="#fff" style={{marginRight: 10}} />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : (editData ? 'Update Minutes' : 'Save Minutes')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  scrollContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginLeft: 4 },
  titleInput: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 25, borderWidth: 1, borderColor: '#ddd' },
  contentInput: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 16, minHeight: 200, borderWidth: 1, borderColor: '#ddd' },
  saveButton: { backgroundColor: '#2952a3', flexDirection: 'row', marginTop: 30, padding: 18, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default MeetingMinutesScreen;