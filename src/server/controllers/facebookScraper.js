const cheerio = require('cheerio');
const InstaUserTemp = require('../../db/userSchemaTemp');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');
const { topDomain } = require('../../misc/resource.js');

let lastId;
let nextRound;
// may need to add functionality where
// each request is from a logged in account on FB
const facebookScraper = async function(idToStart) {
	let resultSoFar = {};
	let resultSoFarArr = [];

	async function grabFbUrl(lastId) {
		if (lastId) {
			return await InstaUserTemp
				.find({
		  		// null is better than using {$exists: false}
		  		// null will return docs w/ null values and non-existent field
		  		$and: [
		  			{ 'data.email': null },
						{ 'data.facebook': { $ne: null } }
		  		],
		  		_id: { '$gt': lastId }
				})
				.limit(10)
		  	.sort({'_id': 1})
		  	.select('username data.facebook')
		  	.exec()
		}
		return await InstaUserTemp
			.find({
				$and: [
					{ 'data.email': null },
					{ 'data.facebook': { $ne: null } }
				]
			})
			.limit(10)
			.sort({'_id': 1})
			.select('username data.facebook')
			.exec()
	}

	return await grabFbUrl(idToStart)
		.then((docs) => {
			// need to normalize the objects to be passed next
			let fbList = [];
			console.log('list of fb urls:\n', docs);
			if (docs.length === 0) {
				console.log('All got emails already, none were returned from DB query');
				return;
			} else {
				if (docs.length < 10) {
					console.log('We have less than 10 !');
					nextRound = null;
					console.log('nextRound will now be null:', nextRound === null);
				}
				lastId = docs[docs.length - 1]['_id'];
				docs.forEach((item) => {
					let rawUrl = item.data.facebook;
					let fbUrl;
					let rawFbUrl;
					if (rawUrl.includes('?')) {
						rawFbUrl =  rawUrl.slice(0, rawUrl.indexOf('?'));
					} else {
						rawFbUrl = rawUrl;
					}

					// normalize by removing possible spaces on fb url
					fbUrl = rawFbUrl.split(' ').join('');

					// avoid /sharer /groups 
					if (
						fbUrl.includes('facebook.com') && 
						!fbUrl.includes('/sharer') && 
						!fbUrl.includes('/groups') &&
						!fbUrl.includes('/dialog/feed?') && 
						!fbUrl.includes('app.facebook.com')
					) {
						// use about section of fb
						let aboutSection;
						let urlArr;
						if (fbUrl.includes('/pages')) {
							urlArr = fbUrl.split('/');
							// facebook.com/pg/username-idNum/about
							aboutSection = `https://www.facebook.com/pg/${urlArr[4]}-${urlArr[5]}/about`
						} else {
							urlArr = fbUrl.split('/');
							aboutSection = `https://www.facebook.com/pg/${urlArr[3]}/about`
						}
						fbList.push({ username: item.username, website: aboutSection });
					}
				})
			}
			return fbList;
		})
		.then((fbList) => {
			console.log('My last ID:', lastId);
			if (fbList === undefined) {
				console.log('No facebook urls to visit');
				return;
			}
			console.log('Visiting facebook urls...');
			return vo(run(fbList, '#content_container', false, true))
				.then((cheerioArr) => {
					if (cheerioArr === undefined || cheerioArr === null) {
						return;
					}
					cheerioArr.forEach((userObj) => {
						resultSoFar[userObj.username] = {};
						if (userObj.cheerioObj) {
							let $ = userObj.cheerioObj;
							let userSelectorCheck = $('._2iem').text();
							console.log('FB User Selector Check:', userSelectorCheck);
							let tempEmail = $('._50f4').filter(function(i, elem) {
								let $parent = $(elem).parent().attr('href');
								if ($parent) {
									return $parent.includes('mailto');
								}
							}).parent().attr('href');
							if (tempEmail) {
								let hyperlink = tempEmail.slice(tempEmail.indexOf(':') + 1, tempEmail.indexOf('?'));
								console.log(`email to be saved for ${userObj.username}:`, hyperlink);
								resultSoFar[userObj.username].email = hyperlink;
							}
						}
					}) // end of forEach
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
						return (bulkUpdate.length !== 0) ? InstaUserTemp.bulkWrite(bulkUpdate) : 'Nothing to update';
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
						facebookScraper(lastId);
					}
				})
				.catch((err) => {
					let errorTime = new Date();
					console.log('Error time is:', errorTime.toISOString());
      		console.log('ERROR down the line ==>\n', err);
				})
		})
};

module.exports = facebookScraper;