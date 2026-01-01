const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://admindata:Can123que1@cluster0.yabcdy2.mongodb.net/pinly_store?appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'pinly_store';

async function updateOrder() {
  console.log('Connecting to MongoDB...');
  
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  
  console.log('Connected!');
  
  const db = client.db(DB_NAME);
  
  const result = await db.collection('orders').updateOne(
    { id: 'efa63659-af81-41be-8648-0bdaeffd1ad2' },
    {
      $set: {
        amount: 3100,
        totalAmount: 3100,
        verification: {
          required: true,
          status: 'pending',
          identityPhoto: null,
          paymentReceipt: null,
          submittedAt: null
        },
        'delivery.status': 'verification_required',
        'delivery.message': 'Yuksek tutarli siparis - Kimlik ve odeme dekontu dogrulamasi gerekli'
      }
    }
  );
  
  console.log('Update result:', result);
  console.log('Matched:', result.matchedCount);
  console.log('Modified:', result.modifiedCount);
  
  await client.close();
  console.log('Done!');
}

updateOrder().catch(console.error);
