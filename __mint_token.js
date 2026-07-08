require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const uri = process.env.MONGO_DEV || process.env.MONGO_PROD;

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ userRole: 'STUDENT' }, { projection: { _id: 1, userRole: 1, userName: 1 } });
  if (!user) { console.log('NO STUDENT USER FOUND'); process.exit(1); }
  const payload = { userId: user._id.toString(), userRole: user.userRole, groups: [] };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
  console.log('USER:', user.userName, user._id.toString());
  console.log('TOKEN:', token);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
