import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get('/notifications', { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(response.data.notifications || []);
      
      // Mark as read once opened
      if (response.data.unread_count > 0) {
          await api.post('/notifications/read', {}, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchNotifications(); }, []));

  const renderNotification = ({ item }) => (
    <View style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
      <View style={styles.iconBox}>
        <Ionicons name="notifications" size={24} color={!item.is_read ? "#2952a3" : "#aaa"} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2952a3" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No new notifications.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  notificationCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  unreadCard: { backgroundColor: '#eef2f9', borderColor: '#d3e0f5', borderWidth: 1 },
  iconBox: { marginRight: 15, justifyContent: 'center' },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 4 },
  unreadText: { color: '#333' },
  message: { fontSize: 14, color: '#666', lineHeight: 20 },
  time: { fontSize: 11, color: '#aaa', marginTop: 8 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 50, fontSize: 16 }
});

export default NotificationsScreen;