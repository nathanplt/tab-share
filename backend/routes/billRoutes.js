const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/billController');
const { protect } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

router.use(protect);

router.get('/', getBills);
router.get('/:id', getBillById);
router.post('/', createBill);
router.put('/:id', updateBill);
router.delete('/:id', deleteBill);

router.post('/scan', upload.single('receipt'), scanReceipt);

router.post('/:id/participants', addParticipantToBill);
router.delete('/:id/participants/:userId', removeParticipantFromBill);
router.put('/:id/participants/:userId', updateParticipantAmount);
router.put('/:id/participants/:userId/paid', markAsPaid);

module.exports = router;