import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

const PortfolioScreen = ({ navigation }) => {
  const { t } = useTranslation(); 
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get('/user/portfolio', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setPortfolio(response.data.data);
      }
    } catch (error) {
      console.error("Fetch Portfolio Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPortfolio();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.success} />
      </View>
    );
  }

  const renderDistributionItem = ({ item }) => {
    const percentage = portfolio.total_invested > 0 
      ? ((item.amount_invested / portfolio.total_invested) * 100).toFixed(1) 
      : 0;

    return (
      // --- UPGRADED: NOW CLICKABLE AND ROUTES TO THE GROUP ---
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('GroupDetails', { 
            groupId: item.group_id, 
            role: item.role || 'member' // Defaults to member if backend doesn't pass it
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="pie-chart" size={20} color={COLORS.primaryBlue} />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.groupName}>{item.group_name}</Text>
            <Text style={styles.percentageText}>{percentage}% {t('portfolio.breakdown', 'of your portfolio')}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
             <Text style={styles.amountText}>₹{item.amount_invested.toLocaleString()}</Text>
             <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{marginTop: 4}} />
          </View>
        </View>
        
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${percentage}%` }]} />
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
        <Text style={styles.headerTitle}>{t('portfolio.title', 'Savings Portfolio')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={portfolio?.distribution || []}
        keyExtractor={(item) => item.group_id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>{t('dashboard.totalSavings', 'Total Personal Savings')}</Text>
            <Text style={styles.totalAmount}>₹{portfolio?.total_invested?.toLocaleString() || 0}</Text>
          </View>
        }
        renderItem={renderDistributionItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{t('portfolio.noInvestments', 'No investments yet.')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  listContent: { padding: 20 },
  totalCard: { backgroundColor: COLORS.success, padding: 25, borderRadius: 16, marginBottom: 25, alignItems: 'center', elevation: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  totalAmount: { color: COLORS.bgWhite, fontSize: 36, fontWeight: 'bold' },
  card: { backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryBlueLight, justifyContent: 'center', alignItems: 'center' },
  groupName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  percentageText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  amountText: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryBlue },
  barBackground: { height: 6, backgroundColor: COLORS.borderLight, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.primaryBlue, borderRadius: 3 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.textMuted, marginTop: 15, fontSize: 16 }
});

export default PortfolioScreen;