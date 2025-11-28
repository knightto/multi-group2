// scripts/create-demo-groups.js
// Creates 2 demo groups for visual inspection

const mongoose = require('mongoose');
const Group = require('../server/models/Group');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multi-group2';

async function main() {
  await mongoose.connect(MONGODB_URI);
  await Group.deleteMany({});
  const groups = [
    { name: 'Demo Group 1', description: 'First demo group', logoUrl: '', settings: {} },
    { name: 'Demo Group 2', description: 'Second demo group', logoUrl: '', settings: {} }
  ];
  const result = await Group.insertMany(groups);
  console.log(`Created ${result.length} demo groups.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
