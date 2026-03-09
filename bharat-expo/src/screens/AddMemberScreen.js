import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';

// FIX 1: We must pass 'route' into the component props here
const AddMemberScreen = ({ route, navigation }) => {
  
  // FIX 2: Moved this INSIDE the component so it knows what 'route' is!
  const { groupId } = route.params; 

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMember = async () => {
    // Strict check: Name, 10-digit Phone, AND Email are all required
    if (!name || !phone || phone.length !== 10 || !email) {
      Alert.alert("Error", "Please enter a valid Name, a 10-digit Mobile Number, and an Email Address.");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      // FIX 3: Here is the api.post! We added group_id right here in the payload box.
      const response = await api.post('/members/add', {
        group_id: groupId, // <-- The missing puzzle piece!
        name: name,
        email: email,
        phone: phone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("Success", "Member added successfully!");
      navigation.goBack(); // Go back to the members list

    } catch (error) {
      console.error("Failed to add member:", error);
      
      // FIX 4: This will now pop up Laravel's exact error message on your phone screen!
      const errorMessage = error.response?.data?.message || "Make sure the email and phone are not already registered.";
      Alert.alert("Error", errorMessage);
      
      console.log("LARAVEL REJECTION REASON:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Member</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Full Name *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter member's name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text style={styles.label}>Email Address * (For OTP Login)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter member's email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Mobile Number * (10 Digits)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="numeric"
            maxLength={10} 
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleAddMember}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Member</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  backButton: { padding: 5 },
  formContainer: { padding: 20, marginTop: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, elevation: 1 },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
  submitButton: { backgroundColor: '#2952a3', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, elevation: 3 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default AddMemberScreen;