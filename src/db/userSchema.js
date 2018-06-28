const mongoose = require('mongoose');

let Schema = mongoose.Schema;

mongoose.Promise = global.Promise;
const db = require('./index');

const userSchema = Schema({
	username: {
		type: String,
		unique: true
	},
	instagramLink: {
		type: {
			url: String,
			successVisit: Boolean
		}
	},
	youtubeLink: {
		type: {
			url: String,
			successVisit: Boolean
		}
	},
	fullName: String,
	imageProf: String,
	followers: Number,
	website: String,
	location: String,
	bio: String,
	category: Array,
	email: Array,
	twitterLink: {
		type: {
			url: String,
			successVisit: Boolean
		}
	},
	facebookLink: {
		type: {
			url: String,
			successVisit: Boolean
		}
	},
	likeItToKnowIt: String,
	rate: Number
});

const User = mongoose.model('User', userSchema);

module.exports = User;
