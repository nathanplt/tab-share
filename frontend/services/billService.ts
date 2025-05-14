import api from './api';

interface BillData {
  title: string;
  restaurant?: string;
  date?: Date;
  receiptImage?: string;
  subtotal: number;
  tax?: number;
  tip?: number;
  total: number;
  items?: Array<{
    name: string;
    price: number;
    quantity?: number;
    assignedTo?: Array<{
      user: string;
      portion: number;
    }>;
  }>;
  participants?: Array<{
    user: string;
    amount: number;
    isPaid: boolean;
  }>;
  splitMethod?: 'equal' | 'itemized' | 'percentage' | 'custom';
}

export const getBills = async () => {
  try {
    const response = await api.get('/bills');
    return response.data;
  } catch (error) {
    console.error('Get bills error:', error);
    throw error;
  }
};

export const getBillById = async (id: string) => {
  try {
    const response = await api.get(`/bills/${id}`);
    return response.data;
  } catch (error) {
    console.error('Get bill error:', error);
    throw error;
  }
};

export const createBill = async (billData: BillData) => {
  try {
    const response = await api.post('/bills', billData);
    return response.data;
  } catch (error) {
    console.error('Create bill error:', error);
    throw error;
  }
};

export const updateBill = async (id: string, billData: Partial<BillData>) => {
  try {
    const response = await api.put(`/bills/${id}`, billData);
    return response.data;
  } catch (error) {
    console.error('Update bill error:', error);
    throw error;
  }
};

export const deleteBill = async (id: string) => {
  try {
    const response = await api.delete(`/bills/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete bill error:', error);
    throw error;
  }
};

export const scanReceipt = async (formData: FormData) => {
  try {
    const response = await api.post('/bills/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Scan receipt error:', error);
    throw error;
  }
};

export const addParticipant = async (billId: string, userId: string, amount: number) => {
  try {
    const response = await api.post(`/bills/${billId}/participants`, { userId, amount });
    return response.data;
  } catch (error) {
    console.error('Add participant error:', error);
    throw error;
  }
};

export const removeParticipant = async (billId: string, userId: string) => {
  try {
    const response = await api.delete(`/bills/${billId}/participants/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Remove participant error:', error);
    throw error;
  }
};

export const markAsPaid = async (billId: string, userId: string, isPaid: boolean) => {
  try {
    const response = await api.put(`/bills/${billId}/participants/${userId}/paid`, { isPaid });
    return response.data;
  } catch (error) {
    console.error('Mark as paid error:', error);
    throw error;
  }
};