import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMeetingMinutes } from '../services/database';

const MeetingHistoryScreen = ({ navigation }) => {
  const [minutesList, setMinutesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect ensures the list refreshes every time you open the screen
  useFocusEffect(
    useCallback(() => {
      const fetchMinutes = async () => {
        setLoading(true);
        const data = await getMeetingMinutes();
        setMinutesList(data);
        setLoading(false);
      };
      fetchMinutes();
    }, [])
  );

  const renderMinuteCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2952a3', flex: 1 },
  cardDate: { fontSize: 12, color: '#888', marginLeft: 10 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 10 },
  cardContent: { fontSize: 15, color: '#444', lineHeight: 22 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#888' }
});

export default MeetingHistoryScreen;