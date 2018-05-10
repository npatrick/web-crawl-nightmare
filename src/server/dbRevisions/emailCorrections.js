const InstaUser = require('../../db/instaUserSchema');

let toDo = InstaUser.find({ 'data.email': {$regex: ".*:.*"} }).exec();

toDo
	.then((docs) => {
		console.log('Should be 8 ===> ', docs.length);
		if (docs.length === 8) {
			let bulkUpdate = docs.map((obj) => {
				let tempEmail = obj.data.email;
				let correction = tempEmail.slice(tempEmail.indexOf(':') + 1);
				return {
					updateOne: {
						filter: { username: obj.username },
						update: {
							'data.email': correction
						}
					}
				}
			});
			return InstaUser.bulkWrite(bulkUpdate);
		}
	})
	.then((response) => {
		console.log('Success on bulk writing\n', response);
	})
	.catch((err) => {
		console.log('Got error', err);
	});
