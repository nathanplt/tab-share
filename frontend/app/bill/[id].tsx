import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,  Image, ActivityIndicator, Share, TextInput} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getBillById, markAsPaid, addParticipant, updateBill } from '../../services/billService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [editingItems, setEditingItems] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        setLoading(true);
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          setUserData(JSON.parse(userDataStr));
        }

        const response = await getBillById(id as string);
        if (response.success) {
          setBill(response.data);
        } else {
          Alert.alert('Error', 'Failed to load bill');
        }
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  const handleMarkAsPaid = async (userId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const response = await markAsPaid(bill._id, userId, !currentStatus);
      if (response.success) {
        setBill(response.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantEmail) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }
    try {
      setLoading(true);
      const response = await addParticipant(bill._id, newParticipantEmail, 0);
      if (response.success) {
        setBill(response.data);
        setShowAddParticipant(false);
        setNewParticipantEmail('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add participant');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignItem = async (itemIndex: number, userId: string) => {
    if (!bill) return;

    const newItems = [...bill.items];
    const item = newItems[itemIndex];
    if (!item.assignedTo) {
      item.assignedTo = [];
    }

    const currAssignment = item.assignedTo.find((a: any) => a.user === userId);
    if (currAssignment) {
      item.assignedTo = item.assignedTo.filter((a: any) => a.user !== userId);
    } else {
      item.assignedTo.push({
        user: userId,
        portion: 1
      });
    }

    try {
      setLoading(true);
      const response = await updateBill(bill._id, { items: newItems });
      if (response.success) {
        setBill(response.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assign item');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4C6ED7" />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.errorContainer}>
        <Text>Bill not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Bill Details</Text>

        {/* Change url when deployed */}
        <TouchableOpacity onPress={() => Share.share({ message: `Join my bill "${bill.title}" on Tab Share! url://bills/${bill._id}` })}>
          <Text style={styles.headerText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.billCard}>
          <Text style={styles.title}>{bill.title}</Text>

          {bill.restaurant && <Text>{bill.restaurant}</Text>}
          <Text>{new Date(bill.date).toLocaleDateString()}</Text>

          <View style={styles.totalSection}>
            <Text>Total: ${bill.total.toFixed(2)}</Text>
            <Text>Subtotal: ${bill.subtotal.toFixed(2)}</Text>
            <Text>Tax: ${bill.tax.toFixed(2)}</Text>
            <Text>Tip: ${bill.tip.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Text style={styles.sectionTitle}>Items</Text>

            {userData?._id === bill.creator._id && (
              <TouchableOpacity onPress={() => setEditingItems(!editingItems)}>
                <Text>{editingItems ? 'Done' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {bill.items.length === 0 && <Text>No items</Text>}

          {bill.items.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <Text>{item.name} - ${(item.price * (item.quantity || 1)).toFixed(2)}</Text>

              {editingItems && (
                <View style={styles.assignments}>
                  {bill.participants.map((participant: any) => (
                    <TouchableOpacity
                      key={participant.user._id}
                      onPress={() => handleAssignItem(index, participant.user._id)}
                      style={[
                        styles.assignButton,
                        item.assignedTo?.some((a: any) => a.user === participant.user._id) && styles.assignButtonActive
                      ]}
                    >
                      <Text>{participant.user.name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {userData?._id === bill.creator._id && (
              <TouchableOpacity onPress={() => setShowAddParticipant(!showAddParticipant)}>
                <Text>{showAddParticipant ? 'Cancel' : 'Add Participant'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddParticipant && (
            <View style={styles.addParticipant}>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                value={newParticipantEmail}
                onChangeText={setNewParticipantEmail}
              />
              <TouchableOpacity onPress={handleAddParticipant}>
                <Text>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {bill.participants.length === 0 && <Text>No participants</Text>}
          
          {bill.participants.map((participant: any) => (
            <View key={participant.user._id} style={styles.participantRow}>
              <Text>
                {participant.user.name}
                {participant.user._id === bill.creator._id && ' (Creator)'}
                {participant.user._id === userData?._id && ' (You)'}
              </Text>
              <Text>${participant.amount.toFixed(2)}</Text>
              {userData?._id === bill.creator._id && (
                <TouchableOpacity
                  onPress={() => handleMarkAsPaid(participant.user._id, participant.isPaid)}
                  style={[
                    styles.paymentButton,
                    participant.isPaid ? styles.paidButton : styles.unpaidButton
                  ]}
                >
                  <Text>{participant.isPaid ? 'Paid' : 'Mark as Paid'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {bill.qrCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share Bill</Text>
            <Image source={{ uri: bill.qrCode }} style={styles.qrCode} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4C6ED7',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  content: {
    padding: 15,
  },
  billCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  totalSection: {
    marginTop: 10,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  itemRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#4C6ED7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addParticipantButton: {
    backgroundColor: '#4C6ED7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  addParticipantButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 5,
    marginRight: 10,
    borderRadius: 5,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentButton: {
    padding: 5,
    borderRadius: 5,
  },
  assignments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  assignButton: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    marginRight: 5,
    marginBottom: 5,
  },
  assignButtonActive: {
    backgroundColor: '#4C6ED7',
  },
  addParticipant: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  paidButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unpaidButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qrCode: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginTop: 10,
  },
});