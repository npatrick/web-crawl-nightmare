const mongoose = require('mongoose');

let Schema = mongoose.Schema;

mongoose.Promise = global.Promise;
const db = require('./index');

const pendingInstaSchema = Schema({
	instaUrl: {
		type: String,
		unique: true
	}
});

const PendingInsta = mongoose.model('PendingInsta', pendingInstaSchema);

module.exports = PendingInsta;
