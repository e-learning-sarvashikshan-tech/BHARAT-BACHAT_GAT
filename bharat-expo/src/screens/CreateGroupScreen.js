import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const CreateGroupScreen = ({ navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [contribution, setContribution] = useState('500'); // Default ₹500
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateGroup = async () => {
    // 1. Frontend Validation
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name.");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      const response = await api.post('/group/create', {
        name: groupName,
        monthly_contribution: parseFloat(contribution)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        Alert.alert(
          "Success!", 
          `Group '${response.data.group.name}' created. Invite Code: ${response.data.group.invite_code}`
        );
        navigation.goBack(); 
      }
    } catch (error) {
      console.error("Create Group Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Failed to create group. Check the server logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Bachat Gat Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., Mahila Bachat Gat Aundh"
          value={groupName}
          onChangeText={setGroupName}
        />

        <Text style={styles.label}>Monthly Saving Amount (₹)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="500"
          keyboardType="numeric"
          value={contribution}
          onChangeText={setContribution}
        />

        <TouchableOpacity 
          style={[styles.createButton, loading && styles.disabledButton]} 
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  formContainer: { padding: 20, marginTop: 10 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', elevation: 1 },
  createButton: { backgroundColor: '#2952a3', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 35, elevation: 3 },
  disabledButton: { backgroundColor: '#8aa6d8' },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default CreateGroupScreen;