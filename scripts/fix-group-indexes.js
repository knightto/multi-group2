// Usage: node scripts/fix-group-indexes.js
// This script removes any legacy 'code' index from the groups collection.

const mongoose = require('mongoose');
require('dotenv').config();


const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dev-tee-time-brs';
const DB_NAME = 'dev-tee-time-brs'; // Use the correct DB name for your project

async function fixIndexes() {
  // For Atlas, append dbName if not present
  let uri = MONGO_URI;
  if (uri.includes('mongodb.net') && !/\/[a-zA-Z0-9_-]+(\?|$)/.test(uri)) {
    uri = uri.replace(/\/?$/, '/dev-tee-time-brs');
  }
  await mongoose.connect(uri, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const collection = db.collection('groups');
  const indexes = await collection.indexes();
  console.log('Current indexes:', indexes);
  const codeIndex = indexes.find(idx => idx.key && idx.key.code === 1);
  if (codeIndex) {
    console.log('Dropping legacy index:', codeIndex.name);
    await collection.dropIndex(codeIndex.name);
    console.log('Dropped index:', codeIndex.name);
  } else {
    console.log('No legacy code index found.');
  }
  await mongoose.disconnect();
}

fixIndexes().catch(err => {
  console.error('Error fixing indexes:', err);
  process.exit(1);
});
