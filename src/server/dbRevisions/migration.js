const User = require('../../db/userSchema');
const InstaUserTemp = require('../../db/userSchemaTemp');


let toDo = InstaUserTemp
	.find({})
	.exec();

	toDo
	.then((docs) => {
		let docsArr = [];

		docs.forEach((profile, index) => {
			let resultObj;
			let tempObj = {};
			let profileData = {};

			// turn obj into arr
			let tempProfile = profile[Object.keys(profile)[3]];

			Object.keys(tempProfile).forEach((key) => {
				if (key === 'username') {
					tempObj[key] = tempProfile[key];
				}
				if (key === 'data') {
					const dataProp = tempProfile.data;
					Object.keys(dataProp).forEach((dataKey) => {
						if (dataKey === 'instagramLink') {
							profileData[dataKey] = {
								url: dataProp[dataKey],
								successVisit: true
							}
						} else if (dataKey === 'twitter') {
							profileData['twitterLink'] = {
								url: dataProp[dataKey],
								successVisit: true
							}
						} else if (dataKey === 'facebook') {
							profileData['facebookLink'] = {
								url: dataProp[dataKey],
								successVisit: true
							}
						} else if (dataKey === 'email') {
							if (typeof dataProp[dataKey] === 'string') {
								profileData[dataKey] = [dataProp[dataKey]];
							} else {
								profileData[dataKey] = dataProp[dataKey];
							}
						} else if (dataKey === 'followers') {
							profileData[dataKey] = parseInt(dataProp[dataKey].replace(/,/g, ''), 10);
						} else {
							profileData[dataKey] = dataProp[dataKey];
						}
					})
				}
			});

			resultObj = Object.assign(tempObj, profileData);
			docsArr.push(resultObj);
		});


		User.insertMany(docsArr, (err, docs) => {
			if (err) {
				console.log('Error in inserting many...\n', err);
			}
			console.log('Successful inserting...\n', docs);
		})
	})
	.catch(err => console.log('problem occured on toDo ==>\n', err));
