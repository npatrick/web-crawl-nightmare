const InstaUser = require('../../db/instaUserSchema');
const InstaUserTemp = require('../../db/userSchemaTemp');


let toDo = InstaUser
	.find({})
	.exec();

	toDo
	.then((docs) => {
		InstaUserTemp.insertMany(docs, (err, docs) => {
			if (err) {
				console.log('Error in inserting many...\n', err);
			}
			console.log('Successful inserting...\n', docs);
		})
	})
	.catch(err => console.log('problem occured on toDo ==>\n', err));
