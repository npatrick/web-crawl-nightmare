const User = require('../../db/userSchema');
const InstaUser = require('../../db/instaUserSchema');


let toDo = User
	.find({})
	.exec();

	toDo
	.then((docs) => {
		InstaUser.insertMany(docs, (err, docs) => {
			if (err) {
				console.log('Error in inserting many...\n', err);
			}
			console.log('Successful inserting...\n', docs);
		})
	})
	.catch(err => console.log('problem occured on toDo ==>\n', err));
