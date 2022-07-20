db.createCollection('tokens');
db.tokens.createIndex({ 'userId': 1 }, { name: 'userId' });
