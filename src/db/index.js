const mongoose = require('mongoose');

let mongoUri = `mongodb://${process.env.dbUser}:${process.env.dbPass}@ds014648.mlab.com:14648/email-list`;

const dbOptions = {
	useMongoClient: true,
	autoReconnect: true,
	reconnectTries: Number.MAX_VALUE,
	reconnectInterval: 500,
	bufferMaxEntries: 0,
	keepAlive: 300000,
	connectTimeoutMS: 300000,
	socketTimeoutMS: 300000,
	poolSize: 5
};

mongoose.connect(mongoUri, dbOptions);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'DB connection error: '));
db.on('open', () => console.log('We are connected to DB!'));

module.exports = db;
