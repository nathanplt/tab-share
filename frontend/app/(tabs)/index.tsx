import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getBills } from '../../services/billService';

interface Bill {
  _id: string;
  title: string;
  restaurant: string;
  date: string;
  total: number;
  participants: Array<{
    user: {
      _id: string;
      name: string;
    };
    amount: number;
    isPaid: boolean;
  }>;
  status: 'active' | 'settled';
}

export default function HomeScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await getBills();

      if (response.success) {
        setBills(response.data);
      } else {
        Alert.alert('Error', 'Failed to load bills');
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      Alert.alert('Error', 'Failed to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBills();
    }, [])
  );

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const calculateProgress = (bill: Bill) => {
    const totalPaid = bill.participants.reduce(
      (sum, p) => sum + (p.isPaid ? p.amount : 0), 
      0
    );

    if (bill.total > 0)
        return totalPaid / bill.total;
    return 0;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
  };

  const renderBillItem = ({ item }: { item: Bill }) => {
    const progress = calculateProgress(item);
    
    return (
      <TouchableOpacity
        style={styles.billCard}
        onPress={() => router.push(`/bill/${item._id}`)}
      >
        <View style={styles.billHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.billTitle}>{item.title}</Text>
            <Text style={styles.restaurantName}>{item.restaurant || 'No restaurant'}</Text>
          </View>
          {item.status === 'settled' && (
            <View style={styles.settledBadge}>
              <Text style={styles.settledText}>Settled</Text>
            </View>
          )}
        </View>
        <View style={styles.billInfoRow}>
          <Text style={styles.billDate}>{formatDate(item.date)}</Text>
          <Text style={styles.billTotal}>{formatCurrency(item.total)}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(100, progress * 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {progress === 1 ? 'Fully paid' : `${Math.round(progress * 100)}% paid`}
          </Text>
        </View>
        <Text style={styles.participantsText}>
          {item.participants.length} {item.participants.length === 1 ? 'person' : 'people'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Bills Yet</Text>
      <Text style={styles.emptyText}>
        Create your first bill by tapping the plus sign
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bills</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4C6ED7" />
        </View>
      ) : (
        <FlatList
          data={bills}
          renderItem={renderBillItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={bills.length ? styles.listContent : styles.emptyListContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4C6ED7']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4C6ED7',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  billHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  billInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  restaurantName: {
    fontSize: 16,
    color: '#444',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 14,
    color: '#666',
  },
  billTotal: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4C6ED7',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  participantsText: {
    fontSize: 14,
    color: '#666',
  },
  settledBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  settledText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});