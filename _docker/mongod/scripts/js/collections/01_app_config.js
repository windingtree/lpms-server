db.createCollection('app_config');
db.app_config.createIndex({ 'key': 1 }, { unique: true, name: 'key' });
