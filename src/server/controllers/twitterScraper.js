const cheerio = require('cheerio');
const InstaUser = require('../../db/instaUserSchema');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');
const { topDomain } = require('../../misc/resource');

let lastId;
let nextRound;

const twitterScraper = async function (idToStart) {
	let resultSoFar = {};
	let resultSoFarArr = [];

	async function grabTwitUrl(lastId) {
		if (lastId) {
			return await InstaUser
				.find({
		  		// null is better than using {$exists: false}
		  		// null will return docs w/ null values and non-existent field
		  		$and: [
		  			{ 'data.email': null },
						{ 'data.twitter': { $ne: null } }
		  		],
		  		_id: { '$gt': lastId }
				})
				.limit(10)
		  	.sort({'_id': 1})
		  	.select('username data.twitter')
		  	.exec()
		}
		return await InstaUser
			.find({
				$and: [
					{ 'data.email': null },
					{ 'data.twitter': { $ne: null } }
				]
			})
			.limit(10)
			.sort({'_id': 1})
			.select('username data.twitter')
			.exec()
	}

	return await grabTwitUrl(idToStart)
		.then((docs) => {
			let twitList = [];
			console.log('list of twitter urls:\n', docs);
			if (docs.length === 0) {
				console.log('All got the emails already from selected twitter urls');
				return;
			} else {
				if (docs.length < 10) {
					console.log('We have less than 10 !');
					nextRound = null;
					console.log('nextRound will now be null:', nextRound === null);
				}
				lastId = docs[docs.length - 1]['_id'];
				docs.forEach((item) => {
					let twitUrl = item.data.twitter;
					if (twitUrl) {
						if (twitUrl.includes('?status=') || 
								twitUrl.includes('tweet?') || 
								!twitUrl.includes('twitter.com') ||
								twitUrl.includes('share?')) {
							console.log('WRONG twitter url for user!!', item.username);
							return;
						}
						twitList.push({ username: item.username, website: twitUrl });
					}
				})	
			}
			return twitList;
		})
		.then((twitList) => {
			console.log('My last ID:', lastId);
			if (twitList === undefined) {
				console.log('No twitter urls to visit');
				return
			}
			console.log('Visiting twitter urls...');
			return vo(run(twitList, '.ProfileHeaderCard-bio', false))
				.then((cheerioArr) => {
					if (cheerioArr === undefined || cheerioArr === null) {
						return;
					}
					cheerioArr.forEach((userObj) => {
						if (userObj.cheerioObj) {
							let $twitter = userObj.cheerioObj;
							let $twitterBioArr = $twitter.text().split(' ');
							resultSoFar[userObj.username] = {};
							$twitterBioArr.forEach((word) => {
								topDomain.forEach((domain) => {
									if (word.includes('@') && word.includes(domain)) {
										resultSoFar[userObj.username].email = word;
									}
								})
							})
						}
					}) // end of forEach
					// insert to DB after crawling twitter users
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
						return (bulkUpdate.length !== 0) ? InstaUser.bulkWrite(bulkUpdate) : 'Nothing to update';
					}
				})
				.then((response) => {
					let timeNow = new Date();
					if (response == 'Nothing to update') {
						console.log(response);
					} else {
						console.log('Updated all ! @ time:', timeNow.toISOString());
					}
					if (nextRound === null) {
						console.log('nextRound is now null');
						return;
					} else {
						console.log('Next round in the db retrieval with lastId...', lastId);
						twitterScraper(lastId);
					}
				})
				.catch((err) => {
					let errorTime = new Date();
					console.log('Error time is:', errorTime.toISOString());
      		console.log('ERROR down the line ==>\n', err);
				})
		})
		.catch(err => console.error('Near end of Twitter scraper:', err));
};

module.exports = twitterScraper;
