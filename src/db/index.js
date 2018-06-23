const mongoose = require('mongoose');

let mongoUri;

// testing uri => @ds014648.mlab.com:14648/email-list

if (process.env.NODE_ENV !== 'production') {
	mongoUri = `mongodb://localhost/web-crawl`;
} else {
	mongoUri = `mongodb://${process.env.dbUser}:${process.env.dbPass}@ds018318-a0.mlab.com:18318,ds018318-a1.mlab.com:18316/crawlingdb?replicaSet=rs-ds018318`;
}

const dbOptions = {
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
