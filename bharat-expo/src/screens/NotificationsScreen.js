import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; // <-- BRAND THEME IMPORTED

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get('/notifications', { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(response.data.notifications || []);
      
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

  const handleNotificationPress = (item) => {
    if (item.group_id) {
      if (item.title && item.title.includes('Meeting')) {
        navigation.navigate('MeetingHistory', { groupId: item.group_id });
      } else {
        navigation.navigate('Ledger', { groupId: item.group_id });
      }
    } else {
      navigation.navigate('Portfolio'); 
    }
  };

  const renderNotification = ({ item }) => {
    let actionLabel = "Passbook";
    if (item.group_id) {
      actionLabel = item.title && item.title.includes('Meeting') ? "Meeting Records" : "Group Ledger";
    }

    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconBox}>
          <Ionicons name="notifications" size={24} color={!item.is_read ? COLORS.primaryBlue : COLORS.textMuted} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          
          <View style={styles.footerRow}>
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
            <View style={styles.actionLink}>
              <Text style={styles.actionText} numberOfLines={1} ellipsizeMode="tail">
                {actionLabel}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.primaryBlue} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>
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
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.bgWhite, elevation: 2 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  notificationCard: { flexDirection: 'row', backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  unreadCard: { backgroundColor: COLORS.primaryBlueLight, borderColor: COLORS.primaryBlueLight, borderWidth: 1 },
  iconBox: { marginRight: 15, justifyContent: 'center' },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.textGray, marginBottom: 4 },
  unreadText: { color: COLORS.textDark },
  message: { fontSize: 14, color: COLORS.textGray, lineHeight: 20 },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 10 },
  time: { fontSize: 11, color: COLORS.textMuted, flexShrink: 0 },
  actionLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryBlueLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexShrink: 1 },
  actionText: { fontSize: 11, color: COLORS.primaryBlue, fontWeight: 'bold', marginRight: 2, flexShrink: 1 },
  
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 50, fontSize: 16 }
});

export default NotificationsScreen;