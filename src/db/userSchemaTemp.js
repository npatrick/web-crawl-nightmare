const mongoose = require('mongoose');

let Schema = mongoose.Schema;

mongoose.Promise = global.Promise;
const db = require('./index');

const instaUserSchemaTemp = Schema({
	username: {
		type: String,
		unique: true
	},
	data: {
		type: {
			instagramLink: String,
			fullName: String,
			imageProf: String,
			followers: Number,
			website: String,
			bio: String,
			category: Array,
			email: Array,
			twitter: String,
			facebook: String,
			likeItToKnowIt: String
		}
	}
});

const InstaUserTemp = mongoose.model('InstaUserTemp', instaUserSchemaTemp);

module.exports = InstaUserTemp;

