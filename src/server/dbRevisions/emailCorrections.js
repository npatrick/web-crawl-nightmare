const InstaUser = require('../../db/instaUserSchema');

// let toDo = InstaUser.find({ 'data.email': {$regex: ".*:.*"} }).exec();

// toDo
// 	.then((docs) => {
// 		console.log('Should be 8 ===> ', docs.length);
// 		if (docs.length === 8) {
// 			let bulkUpdate = docs.map((obj) => {
// 				let tempEmail = obj.data.email;
// 				let correction = tempEmail.slice(tempEmail.indexOf(':') + 1);
// 				return {
// 					updateOne: {
// 						filter: { username: obj.username },
// 						update: {
// 							'data.email': correction
// 						}
// 					}
// 				}
// 			});
// 			return InstaUser.bulkWrite(bulkUpdate);
// 		}
// 	})
// 	.then((response) => {
// 		console.log('Success on bulk writing\n', response);
// 	})
// 	.catch((err) => {
// 		console.log('Got error', err);
// 	});

// find users' email that has non standard ASCII characters in email
let toDo = InstaUser.find({ 'data.email': {$regex: "[[:^print:]]"} }).exec();

toDo
	.then((docs) => {
		console.log('Remaining should be 2 ===> ', docs.length);
		if (docs.length === 2) {
			let bulkUpdate = docs.map((obj) => {
				let tempEmail = obj.data.email;
				let correction = tempEmail.replace(/\s/g, ''); //remove spaces
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