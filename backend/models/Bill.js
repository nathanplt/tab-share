const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  restaurant: String,
  date: {
    type: Date,
    default: Date.now
  },
  receiptImage: String,
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  tip: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  items: [{
    name: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1
    },
    assignedTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      portion: {
        type: Number,
        default: 1
      }
    }]
  }],
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    isPaid: {
      type: Boolean,
      default: false
    }
  }],
  splitMethod: {
    type: String,
    enum: ['equal', 'itemized', 'percentage', 'custom'],
    default: 'equal'
  },
  qrCode: String,
  status: {
    type: String,
    enum: ['active', 'settled'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bill', BillSchema);