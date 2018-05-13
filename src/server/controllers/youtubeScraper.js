const Crawler = require('crawler');
const cheerio = require('cheerio');
const InstaUser = require('../../db/instaUserSchema');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');
const { keyword, topDomain } = require('../../misc/resource');
const simpleRun = require('../helperFn/simpleRun');

// const c = new Crawler({ rateLimit: 3000 });
let lastId;
let nextRound;

// function crawlerPromise(options, userObj) {
// 	return new Promise((resolve, reject) => {
// 		options.callback = (err, res, done) => {
// 			if (err) {
// 				reject(err)
// 			} else {
// 				let $ = res.$;
// 				resolve({ username: userObj.username, $cheerioObj: $ });
// 			}
// 			done();
// 		}
// 		c.queue(options);
// 	});
// }


const youtubeScraper = async function(idToStart) {
	let resultSoFar = {};
	let resultSoFarArr;

	async function grabYoutubeUrl(lastId) {
		if (lastId) {
			return await InstaUser
				.find({
		  		// null is better than using {$exists: false}
		  		// null will return docs w/ null values and non-existent field
		  		$and: [
		  			{ 'data.email': null },
						{ 'data.website': { $regex: 'youtu' } }
		  		],
		  		_id: { '$gt': lastId }
				})
				.limit(10)
		  	.sort({'_id': 1})
		  	.select('username data.website')
		  	.exec()
		}
		return await InstaUser
			.find({
				$and: [
					{ 'data.email': null },
					{ 'data.website': { $regex: 'youtu' } }
				]
			})
			.limit(10)
			.sort({'_id': 1})
			.select('username data.website')
			.exec()
	}

	return await grabYoutubeUrl(idToStart)
		.then((docs) => {
			let youtubeList = [];
			console.log('List of youtube urls:\n', docs);

			if (docs.length === 0) {
				console.log('All got emails already, none were returned from DB');
				return
			} else {
				if (docs.length < 10) {
					console.log('We have less than 10 !');
					nextRound = null;
					console.log('nextRound will now be null:', nextRound === null);
				}
				lastId = docs[docs.length - 1]['_id'];
				console.log('Last ID:', lastId);
				docs.forEach((item) => {
					let rawUrl = item.data.website;
					let youtubeUrl;
					let aboutTemp;
					if (rawUrl.includes('?')) {
						youtubeUrl = rawUrl.slice(0, rawUrl.indexOf('?'));
					} else {
						youtubeUrl = rawUrl;
					}
					// organize the youtube url that will be used
					// check for video
					if (youtubeUrl.includes('youtu.be') || youtubeUrl.includes('/watch?')) {
						youtubeList.push({ username: item.username, video: 'https://' + youtubeUrl });
					// check for user profile
					} else if (youtubeUrl.includes('/user/')) {
						if (youtubeUrl[youtubeUrl.length - 1] === '/') {
							aboutTemp = youtubeUrl + 'about';
						} else {
							aboutTemp = youtubeUrl + '/about';
						}
						youtubeList.push({ username: item.username, about: 'https://' + aboutTemp });
					// check for channel profile
					} else if (youtubeUrl.includes('/channel/')) {
						if (youtubeUrl[youtubeUrl.length - 1] === '/') {
							aboutTemp = youtubeUrl + 'about';
						} else {
							aboutTemp = youtubeUrl + '/about';
						}
						youtubeList.push({ username: item.username, about: 'https://' + aboutTemp });
					// check for actual user url ==> youtube.com/username
					} else {
						if (youtubeUrl[youtubeUrl.length - 1] === '/') {
							aboutTemp = youtubeUrl + 'about';
						} else {
							aboutTemp = youtubeUrl + '/about';
						}
						youtubeList.push({ username: item.username, about: 'https://' + aboutTemp });
					}
				})
			}
			return youtubeList;
		})
		.then((youtubeList) => {
			console.log('Now running simpleRun...');
			let youtubeListToVisit = youtubeList.map((item) => {
				if (item.video) {
					return simpleRun({ uri: item.video }, item);
				} else {
					return simpleRun({ uri: item.about }, item);
				}
			});

			function responseHandler(responses) {
				return responses.map(res => res);
			}

			return vo(youtubeListToVisit, responseHandler)
				.then((resArr) => {
					let profCheck = [];

					resArr.forEach((resObj, index) => {
						let username = resObj.username;
						resultSoFar[username] = {};  // i have username access
						let $ = resObj.$cheerioObj;
						// desccription from a video
						let description = $('#eow-description').text();
						// description from a profile about section
						let userDescription = $('.about-description').text().replace('\n', ' ');
						let userChannel = $('#watch7-user-header > a').attr('href');

						// disect description for email from either
						// video description or from the /about section
						if (description || userDescription) {
							console.log('NOW DISECTING DESCRIPTION FROM VIDEO OR PROF !! !! !!...');
							let descArr = (description) ? description.split(' ') : userDescription.split(' ');
							descArr.forEach((word) => {
								let lowerWord = word.toLowerCase();
								topDomain.forEach((domain) => {
									if (lowerWord.includes('@') && lowerWord.includes(domain)) {
										let qIndex;
		                word.indexOf('?') === -1 ? qIndex = undefined : qIndex = word.indexOf('?');
		                let tempEmail = word.slice(0, qIndex);
		              	resultSoFar[username].email = tempEmail;
									}
								})
							})
						}
					 	// else if (#details-container)
						// grab the selector for button "View Email Address" & click behavior
						// do nightmare to do captcha & wait for response from 3rd party
						// api such as 2captcha or deathbycaptcha
						// click submit
						// wait('#email-container > a').attr('href')
						// remove mailto


						// check that we dont have email on specific user
						// => check from /channel or /user
						if (!resultSoFar[username].email && (resObj.uri.includes('/channel/') || resObj.uri.includes('/user/'))) {
							// wont be adding to profCheck
							console.log('Came from /user OR /channel... still no email retrieved for user:', username);
						// => check on video
						} else if (!resultSoFar[username].email && (resObj.uri.includes('youtu.be') || resObj.uri.includes('/watch?'))) {
							console.log('Came from VIDEO.. adding to profCheck for user:', username);
							profCheck.push({ username: username, about: `https://youtube.com${userChannel}/about` });
						// => check on actual user url such as ==> youtube.com/clothesencounters
						} else if (!resultSoFar[username].email && resObj.uri.includes('youtube.com/')) {
							console.log('Came from ACTUAL user url... still no email retrieved for user', username);
						}
					}); // end of forEach
					console.log('Prepping arr with:\n', resultSoFar);
					resultSoFarArr = objToArr(resultSoFar);
					if (resultSoFarArr.length !== 0) {
						let bulkUpdate = resultSoFarArr.reduce((acc, obj) => {
							if (obj.data.email) {
								acc.push({
									updateOne: {
										filter: { username: obj.username },
										update: {
											'data.email': obj.data.email
										}
									}
								});
							}
							return acc;
						}, []);
						resultSoFar = {};
						console.log('Bulk updating to be done ==>\n', bulkUpdate);
						(bulkUpdate.length !== 0) ? InstaUser.bulkWrite(bulkUpdate) : 'Nothing to update';
					}
					return profCheck;
				})
			})
			// expecting an array of str and/or obj to check again to go to user/channel profile
			.then((arr) => {
				// to visit arr
				console.log('What did I actually get from profCheck?', arr);
			})
			.catch((err) => {
				console.log('Got an error chained at the end:\n', err);
			})

};

module.exports = youtubeScraper;
