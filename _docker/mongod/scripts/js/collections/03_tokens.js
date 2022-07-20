db.createCollection('tokens');
db.tokens.createIndex({ userId: 1 }, { name: 'userId' });
db.tokens.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
); //30d
