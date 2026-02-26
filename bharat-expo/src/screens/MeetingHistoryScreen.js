import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMeetingMinutes, deleteMeetingMinute } from '../services/database';

const MeetingHistoryScreen = ({ navigation }) => {
  const [minutesList, setMinutesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMinutes = async () => {
    setLoading(true);
    const data = await getMeetingMinutes();
    setMinutesList(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMinutes();
    }, [])
  );

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to permanently delete this meeting record?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const success = await deleteMeetingMinute(id);
            if (success) {
              fetchMinutes(); // Refresh the list after deleting
            } else {
              Alert.alert("Error", "Could not delete the record.");
            }
          } 
        }
      ]
    );
  };

  const handleEdit = (item) => {
    // Send the existing data to the input screen
    navigation.navigate('MeetingMinutes', { editData: item });
  };

  const renderMinuteCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        
        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={20} color="#2952a3" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>

      </View>
      <View style={styles.divider} />
      <Text style={styles.cardContent}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Past Records</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2952a3" style={{ marginTop: 50 }} />
      ) : minutesList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No meeting records found.</Text>
        </View>
      ) : (
        <FlatList
          data={minutesList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMinuteCard}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  listContent: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2952a3', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#888' },
  actionRow: { flexDirection: 'row', marginLeft: 10 },
  iconBtn: { padding: 5, marginLeft: 10, backgroundColor: '#f0f0f0', borderRadius: 8 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 10 },
  cardContent: { fontSize: 15, color: '#444', lineHeight: 22 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#888' }
});

export default MeetingHistoryScreen;