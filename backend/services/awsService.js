const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();
const textract = new AWS.Textract();

const uploadToS3 = async (fileBuffer, mimeType) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `receipts/${uuidv4()}.jpg`,
    Body: fileBuffer,
    ContentType: mimeType
  };
  
  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.log('Error uploading to S3:', error);
    throw error;
  }
};

const analyzeReceipt = async (imageBuffer) => {
  const params = {
    Document: {
      Bytes: imageBuffer
    },
    FeatureTypes: ['TABLES', 'FORMS']
  };
  
  try {
    const result = await textract.analyzeDocument(params).promise();
    return parseTextractResponse(result);
  } catch (error) {
    console.log('Error analyzing receipt:', error);
    throw error;
  }
};

// work on this more later
const parseTextractResponse = (textractResponse) => {
  const result = {
    restaurantName: '',
    items: [],
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0,
    date: null,
  };

  if (!textractResponse?.Blocks) {
    return result;
  }

  // pull out just the lines of text
  const lines = textractResponse.Blocks
    .filter(b => b.BlockType === 'LINE' && b.Text)
    .map(b => b.Text.trim())
    .filter(text => text.length);

  for (const t of lines) {
    if (!/total|subtotal|tax|tip|amount/i.test(t)) {
      result.restaurantName = t;
      break;
    }
  }

  for (const t of lines) {
    const dateMatch = t.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
    if (dateMatch) {
      result.date = dateMatch[1];
      break;
    }
  }

  lines.forEach(t => {
    if (/subtotal|total|tax|tip/i.test(t)) return;

    const item = t.match(/^(.+)\s+\$?(\d+\.\d{2})$/);
    if (item) {
      result.items.push({ name: item[1].trim(), price: parseFloat(item[2]), quantity: 1 });
    }
  });

  lines.forEach(t => {
    const m = t.match(/\$?(\d+\.\d{2})/);
    if (!m) return;
    const amt = parseFloat(m[1]);

    if (/^subtotal/i.test(t)) result.subtotal = amt;
    else if (/^tax/i.test(t)) result.tax = amt;
    else if (/^tip|gratuity/i.test(t)) result.tip = amt;
    else if (/^total/i.test(t)) result.total = amt;
  });

  if (!result.subtotal && result.items.length) {
    result.subtotal = result.items.reduce((sum, x) => sum + x.price, 0);
  }
  if (!result.total && result.subtotal) {
    result.total = result.subtotal + result.tax + result.tip;
  }

  return result;
};

module.exports = { uploadToS3, analyzeReceipt };