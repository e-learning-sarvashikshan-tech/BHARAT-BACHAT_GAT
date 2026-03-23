import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next'; // <-- ADDED HOOK
import { COLORS } from '../constants/theme';

const TermsScreen = ({ navigation }) => {
  const { t } = useTranslation(); // <-- INITIALIZED HOOK

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('terms.title', 'Terms & Privacy')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{t('terms.platformNatureTitle', '1. Platform Nature (Not a Bank)')}</Text>
        <Text style={styles.paragraph}>
          {t('terms.platformNatureDesc', 'Bharat Bachat is strictly a technology platform and Software-as-a-Service (SaaS) product designed for digital record-keeping. We are NOT a bank, Non-Banking Financial Company (NBFC), lender, or payment aggregator.')}
        </Text>
        
        <Text style={styles.sectionTitle}>{t('terms.financialTxTitle', '2. Financial Transactions')}</Text>
        <Text style={styles.paragraph}>
          {t('terms.financialTxDesc', 'The App does not hold, transfer, disburse, or collect real money. All financial transactions, savings, and loans are conducted offline and independently by the users within their respective Self-Help Groups (Bachat Gats).')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms.disputeTitle', '3. Dispute Resolution')}</Text>
        <Text style={styles.paragraph}>
          {t('terms.disputeDesc', 'Bharat Bachat, its parent company, and its developers are not responsible for any financial disputes, defaults, or mismanagement of funds between group members.')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms.dataPrivacyTitle', '4. Data Privacy (DPDP Act Compliance)')}</Text>
        <Text style={styles.paragraph}>
          {t('terms.dataPrivacyDesc', 'We securely store your phone number and ledger data solely for the purpose of providing this service. We do not sell your personal data to third-party marketers.')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms.userRespTitle', '5. User Responsibilities')}</Text>
        <Text style={styles.paragraph}>
          {t('terms.userRespDesc', 'By using this App, group administrators (Gat Pramukhs) take full responsibility for ensuring the accuracy of the data entered. Entering false records is strictly prohibited.')}
        </Text>
        
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgWhite },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primaryBlue, marginBottom: 8, marginTop: 20 },
  paragraph: { fontSize: 14, color: COLORS.textGray, lineHeight: 22, textAlign: 'justify' }
});

export default TermsScreen;