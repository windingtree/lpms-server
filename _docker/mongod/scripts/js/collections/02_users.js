db.createCollection('users');
db.users.createIndex({ 'login': 1 }, { unique: true, name: 'login' });
