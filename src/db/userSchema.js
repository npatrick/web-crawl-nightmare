const mongoose = require('mongoose');

let Schema = mongoose.Schema;

mongoose.Promise = global.Promise;
const db = require('./index');

const userSchema = Schema({
	username: {
		unique: true,
		type: {
			instagramLink: String,
			fullName: String,
			imageProf: String,
			followers: Number,
			website: String,
			bio: String,
			category: Array,
			email: String
		}
	}
});

const User = mongoose.model('User', userSchema);

module.exports = User;
