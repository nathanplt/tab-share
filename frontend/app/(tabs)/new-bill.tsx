import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, Alert,ActivityIndicator} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createBill } from '../../services/billService';

export default function NewBillScreen() {
  const params = useLocalSearchParams();

  const [title, setTitle] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [total, setTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ name: string; price: number; quantity: number }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'itemized' | 'percentage' | 'custom'>('equal');

  React.useEffect(() => {
    const subTotal = parseFloat(subtotal) || 0;
    const taxAmount = parseFloat(tax) || 0;
    const tipAmount = parseFloat(tip) || 0;
    setTotal((subTotal + taxAmount + tipAmount).toFixed(2));
  }, [subtotal, tax, tip]);

  React.useEffect(() => {
    if (params.receiptData) {
      try {
        const data = JSON.parse(params.receiptData as string);
        if (data.restaurantName) setRestaurant(data.restaurantName);
        if (data.subtotal) setSubtotal(data.subtotal.toString());
        if (data.tax) setTax(data.tax.toString());
        if (data.tip) setTip(data.tip.toString());
        if (data.total) setTotal(data.total.toString());
      } catch (error) {
        console.error('Error parsing receipt data:', error);
      }
    }
  }, [params.receiptData]);

  const handleScanReceipt = () => {
    router.push('/scan');
  };

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice) {
      Alert.alert('Error', 'Please enter both item name and price');
      return;
    }

    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setItems([...items, {
      name: newItemName,
      price,
      quantity: 1
    }]);

    setNewItemName('');
    setNewItemPrice('');

    const newSubtotal = [...items, { name: newItemName, price, quantity: 1 }]
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(newSubtotal.toString());
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);

    const newSubtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(newSubtotal.toString());
  };

  const handleCreateBill = async () => {
    if (!title || !total) {
      Alert.alert('Error', 'Please provide at least a title and total amount');
      return;
    }

    try {
      setLoading(true);
      
      const billData = {
        title,
        restaurant,
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        tip: parseFloat(tip) || 0,
        total: parseFloat(total),
        items: items.length > 0 ? items : [],
        splitMethod
      };

      const response = await createBill(billData);
      
      if (response.success) {
        Alert.alert('Success', 'Bill created successfully', [
          { 
            text: 'OK', 
            onPress: () => {
              setTitle('');
              setRestaurant('');
              setSubtotal('');
              setTax('');
              setTip('');
              setTotal('');
              setItems([]);
              router.push(`/bill/${response.data._id}`);
            }
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to create bill');
      }
    } catch (error) {
      console.error('Create bill error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create New Bill</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleScanReceipt}
        >
          <Text style={styles.scanButtonText}>Scan Receipt</Text>
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          
          <View style={styles.inputGroup}>
            <Text>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Lunch at Chili's"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text>Restaurant</Text>
            <TextInput
              style={styles.input}
              placeholder="Restaurant name"
              value={restaurant}
              onChangeText={setRestaurant}
            />
          </View>

          <View style={styles.amountInputGroup}>
            <View style={styles.amountInput}>
              <Text>Subtotal *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={subtotal}
                onChangeText={setSubtotal}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.amountInput}>
              <Text>Tax</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={tax}
                onChangeText={setTax}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.amountInputGroup}>
            <View style={styles.amountInput}>
              <Text>Tip</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={tip}
                onChangeText={setTip}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.amountInput}>
              <Text>Total *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={total}
                onChangeText={setTotal}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            
            <View style={styles.addItemContainer}>
              <TextInput
                style={[styles.input, styles.itemNameInput]}
                placeholder="Item name"
                value={newItemName}
                onChangeText={setNewItemName}
              />
              <TextInput
                style={[styles.input, styles.itemPriceInput]}
                placeholder="Price"
                value={newItemPrice}
                onChangeText={setNewItemPrice}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity 
                style={styles.addItemButton}
                onPress={handleAddItem}
              >
                <Text style={styles.addItemButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text>{item.name} - ${(item.price * item.quantity).toFixed(2)}</Text>
                <TouchableOpacity 
                  onPress={() => handleRemoveItem(index)}
                  style={styles.removeItemButton}
                >
                  <Text style={styles.removeItemButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Split Method</Text>
            <View style={styles.splitMethodContainer}>
              <TouchableOpacity
                style={[styles.splitMethodButton, splitMethod === 'equal' && styles.splitMethodButtonActive]}
                onPress={() => setSplitMethod('equal')}
              >
                <Text>Equal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.splitMethodButton, splitMethod === 'itemized' && styles.splitMethodButtonActive]}
                onPress={() => setSplitMethod('itemized')}
              >
                <Text>Itemized</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.splitMethodButton, splitMethod === 'percentage' && styles.splitMethodButtonActive]}
                onPress={() => setSplitMethod('percentage')}
              >
                <Text>Percentage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.splitMethodButton, splitMethod === 'custom' && styles.splitMethodButtonActive]}
                onPress={() => setSplitMethod('custom')}
              >
                <Text>Custom</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateBill}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Bill</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  content: {
    padding: 15,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
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
  inputGroup: {
    marginBottom: 12,
  },
  amountInputGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountInput: {
    width: '48%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 5,
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
  },
  addItemContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemNameInput: {
    flex: 2,
    marginRight: 10,
  },
  itemPriceInput: {
    flex: 1,
    marginRight: 10,
  },
  addItemButton: {
    backgroundColor: '#4C6ED7',
    padding: 8,
    borderRadius: 6,
    justifyContent: 'center',
  },
  addItemButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeItemButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 6,
  },
  removeItemButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  splitMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  splitMethodButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splitMethodButtonActive: {
    backgroundColor: '#4C6ED7',
  },
  button: {
    backgroundColor: '#4C6ED7',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a0b0e0',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});