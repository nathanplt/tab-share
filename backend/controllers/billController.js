const Bill = require('../models/Bill');
const User = require('../models/User');
const { uploadToS3, analyzeReceipt } = require('../services/awsService');
const QRCode = require('qrcode');

const createBill = async (req, res) => {
  try {
    const { 
      title, 
      restaurant, 
      date,
      receiptImage,
      subtotal, 
      tax, 
      tip, 
      total, 
      items,
      participants,
      splitMethod
    } = req.body;
    
    const bill = await Bill.create({
      creator: req.user._id,
      title,
      restaurant,
      date: Date.now(),
      receiptImage,
      subtotal: parseFloat(subtotal) || 0,
      tax: parseFloat(tax) || 0,
      tip: parseFloat(tip) || 0,
      total: parseFloat(total) || 0,
      items: items || [],
      participants: participants || [{
        user: req.user._id,
        amount: parseFloat(total) || 0,
        isPaid: false
      }],
      splitMethod: splitMethod || 'equal'
    });
    
    try {
      const qrCode = await QRCode.toDataURL(`url://bills/${bill._id}`);
      bill.qrCode = qrCode;
      await bill.save();
    } catch (error) {
      console.log('QR code error:', error);
    }
    
    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    console.log('Create bill error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getBills = async (req, res) => {
  try {
    const bills = await Bill.find({
      $or: [
        { creator: req.user._id },
        { 'participants.user': req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('creator', 'name email')
    .populate('participants.user', 'name email');
    
    res.json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    console.log('Get bills error:', error);
    res.status(500).json({ success: false, message: 'Get error' });
  }
};

const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('participants.user', 'name email');
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    const canSee = bill.creator._id.toString() === req.user._id.toString() || 
      bill.participants.some(p => p.user._id.toString() === req.user._id.toString());
    
    if (!canSee) {
      return res.status(401).json({ success: false, message: 'Not allowed to see this bill' });
    }
    
    res.json({ success: true, data: bill });
  } catch (error) {
    console.log('Get bill error:', error);
    res.status(500).json({ success: false, message: 'Get error' });
  }
};

const updateBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    if (bill.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not allowed to update this bill' });
    }
    
    const { 
      title, 
      restaurant, 
      date,
      subtotal, 
      tax, 
      tip, 
      total, 
      items,
      splitMethod
    } = req.body;
    
    if (title) bill.title = title;
    if (restaurant) bill.restaurant = restaurant;
    if (date) bill.date = date;
    if (subtotal) bill.subtotal = parseFloat(subtotal);
    if (tax) bill.tax = parseFloat(tax);
    if (tip) bill.tip = parseFloat(tip);
    if (total) bill.total = parseFloat(total);
    if (items) bill.items = items;
    if (splitMethod) bill.splitMethod = splitMethod;
    
    await bill.save();
    
    res.json({ success: true, data: bill });
  } catch (error) {
    console.log('Update bill error:', error);
    res.status(500).json({ success: false, message: 'Update error' });
  }
};

const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    if (bill.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not allowed to delete this bill' });
    }
    
    await bill.remove();
    
    res.json({ success: true, message: 'Bill deleted' });
  } catch (error) {
    console.log('Delete bill error:', error);
    res.status(500).json({ success: false, message: 'Delete error' });
  }
};

const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('File info:', {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    try {
      const imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype);
      console.log('Uploaded to S3:', imageUrl);
      
      const receiptData = await analyzeReceipt(req.file.buffer);
      console.log('Analyzed receipt:', receiptData);
      
      res.json({
        success: true,
        data: {
          ...receiptData,
          receiptImage: imageUrl
        }
      });
    } catch (error) {
      console.log('AWS error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'AWS error',
        error: error.message 
      });
    }
  } catch (error) {
    console.log('Scan error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Scan error',
      error: error.message 
    });
  }
};

const addParticipantToBill = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    if (bill.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not allowed to update this bill' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
  
    const alreadyIn = bill.participants.find(
      p => p.user.toString() === userId
    );
    
    if (alreadyIn) {
      return res.status(400).json({ success: false, message: 'Already in bill' });
    }
  
    // Needs a fix
    bill.participants.push({
      user: user._id,
      amount: parseFloat(amount) || 0,
      isPaid: false
    });
    
    await bill.save();  
    
    res.json({ success: true, data: bill });
  } catch (error) {
    console.log('Add person error:', error);
    res.status(500).json({ success: false, message: 'Add error' });
  }
};

const removeParticipantFromBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    if (bill.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not allowed to update this bill' });
    }
  
    if (req.params.userId === bill.creator.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove creator' });
    }
    
    bill.participants = bill.participants.filter(
      p => p.user.toString() !== req.params.userId
    );
    
    await bill.save();
    
    res.json({ success: true, data: bill });
  } catch (error) {
    console.log('Remove person error:', error);
    res.status(500).json({ success: false, message: 'Remove error' });
  }
};

const updateParticipantAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    if (bill.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not allowed to update this bill' });
    }
    
    const personIndex = bill.participants.findIndex(p => p.user.toString() === req.params.userId);
    
    if (personIndex === -1) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }
    
    bill.participants[personIndex].amount = parseFloat(amount);

    await bill.save();
    
    res.json({ success: true, data: bill });
  } catch (error) {
    console.log('Update amount error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markAsPaid = async (req, res) => {
  try {
    const { isPaid } = req.body;
    
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    const personIndex = bill.participants.findIndex(
      p => p.user.toString() === req.params.userId
    );
    
    if (personIndex === -1) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }
    
    bill.participants[personIndex].isPaid = isPaid;
    
    await bill.save();
    
    const allPaid = bill.participants.every(p => p.isPaid);
    if (allPaid) {
      bill.status = 'settled';
      await bill.save();
    }
    
    res.json({ success: true, data: bill });
  } catch (error) {
    console.log('Mark paid error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  scanReceipt,
  addParticipantToBill,
  removeParticipantFromBill,
  updateParticipantAmount,
  markAsPaid
};