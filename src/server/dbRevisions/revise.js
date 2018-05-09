const InstaUser = require('../../db/instaUserSchema');

let toDo = InstaUser.find({'data.website': ''}).exec();

toDo
	.then(docs => {
		console.log('Should be 276 ==>', docs.length)
		if (docs.length == 276) {
			InstaUser.updateMany({
					'data.website': ''
				}, {
					'data.website': null
				})
				.then(res => console.log('SUCCESS\n', res))
		}

	})
	.catch(err => {
		console.log('err in toDo\n', err)
	})