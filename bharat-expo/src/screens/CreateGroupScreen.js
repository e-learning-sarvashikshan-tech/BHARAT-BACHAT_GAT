import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api'; 

const CreateGroupScreen = ({ navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateGroup = async () => {
    // 1. Frontend Validation
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 2. Call Kunal's Laravel API
      const response = await api.post('/create-group', {
        name: groupName.trim()
      });

      Alert.alert("Success", response.data.message || "Group created successfully!");
      
      // 3. Send the user straight to their new Dashboard
      navigation.replace('Dashboard'); 
      
    } catch (err) {
      if (!err.response) {
        Alert.alert("Connection Error", "Cannot reach the server. Is Laravel running?");
      } else {
        const serverMessage = err.response.data.message;
        const validationErrors = err.response.data.errors;
        
        // Handle specific Laravel validation errors (like duplicate group name)
        if (validationErrors && validationErrors.name) {
            setError(validationErrors.name[0]);
        } else {
            Alert.alert("Notice", serverMessage || "Failed to create group.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.formContainer}>
          <Text style={styles.headerTitle}>Start a New Bachat Gat</Text>
          <Text style={styles.subText}>As the creator, you will automatically be assigned as the group leader.</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="e.g. Mahila Vikas Gat"
              value={groupName}
              onChangeText={(text) => {
                  setGroupName(text);
                  setError(''); // Clear error when typing
              }}
              autoCapitalize="words"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity 
            style={[styles.button, loading ? styles.buttonDisabled : null]} 
            onPress={handleCreateGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2952a3',
    marginBottom: 10,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4d4d',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#2952a3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#8ba3d6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateGroupScreen;