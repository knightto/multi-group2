// scripts/clear-groups.js
// Removes all groups and their data from the database

const mongoose = require('mongoose');
const Group = require('../server/models/Group');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multi-group2';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const result = await Group.deleteMany({});
  console.log(`Deleted ${result.deletedCount} groups.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
