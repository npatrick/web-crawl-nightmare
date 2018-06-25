const cheerio = require('cheerio');
// const InstaUser = require('../../db/instaUserSchema');
const InstaUserTemp = require('../../db/userSchemaTemp');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');

let lastId;
let nextRound;

const userSiteScraper = async function(idToStart) { // integrate accepting an array of obj {user, website}
  let resultObj = {};
	let resultSoFar = {};
	let resultSoFarArr;

	async function grabNonEmailUsers(lastIndex) {
		if (lastIndex) {
			return await InstaUserTemp
				.find({
		  		// null is better than using {$userWebexists: false}
		  		// null will return docs w/ null values and non-existent field
		  		$and: [
		  			{ 'data.website': { $ne: null } },
		  			{ 'data.email': null },
		  			{ 'data.twitter': null },
		  			{ 'data.facebook': null }
		  		],
		  		_id: { '$gt': lastIndex }
				})
				.limit(10)
		  	.sort({'_id': 1})
		  	.select('username data.website')
		  	.exec()
		}
		return await InstaUserTemp
			.find({
				// null is better than using {$exists: false}
	  		// null will return docs w/ null values and non-existent field
	  		$and: [
	  			{ 'data.email': null },
	  			{ 'data.twitter': null },
	  			{ 'data.facebook': null }
	  		],
	  	})
	  	.limit(10)
	  	.sort({'_id': 1})
	  	.select('username data.website')
	  	.exec()
	}

	await grabNonEmailUsers(idToStart)
  	.then((doc) => {
  		let userWebList = [];
			console.log('hmmmmmmm WHAT DID I GET FROM DOC?\n', doc);
  		if (doc.length === 0) {
  			console.log('All got emails :)');
  			return;
  		} else {
  			if (doc.length < 10) {
  				console.log('WE HAVE LESS THAN 10');
  				nextRound = null;
  			}
  			doc.forEach((item, index) => {
					if (index == 9) {
						lastId = item._id;
					}
					if (item.data) {
	  				if (item.data.website) {
	  					userWebList.push({ username: item.username, website: item.data.website });
	  				}
					}
  			})
  		}
  		return userWebList;
  	})
  	.then((userWebList) => {
  		console.log('DID I GET A LAST ID ?? ==>', lastId);
      if (userWebList === undefined) {
        console.log('No need to visit user webs');
        return;
      }
      console.log('ENTERING USER WEB CHECK...\nwhat is userWebList below:\n', userWebList);
      // run params => (domain, selectorStr, isUserWeb, useProxy)
      // run has the username and cheerioObj props
      return vo(run(userWebList, 'body', true, false))
        .then(async (cheerioArr) => {
	         if (cheerioArr === undefined || cheerioArr === null) {
	           return;
	         }
	          let twitterArr = [];
	          let facebookArr = [];
	          cheerioArr.forEach(userObj => {
	          	// consider blackisted cheerioObj that has a value of undefined
	           	if (userObj.cheerioObj === undefined) {
	            	return;
	          	}
	            let $userWeb = userObj.cheerioObj;
	            console.log('what is the username', userObj.username);
	            console.log('what is $userWeb ============>', typeof $userWeb);
	            let hyperLink = $userWeb('.fa-envelope').parent().attr('href') ||
	            								$userWeb('.sow-social-media-button-envelope').attr('href') ||
	            								$userWeb('.email').attr('href');
	            let twitterAddress = $userWeb('.twitter > a').attr('href') ||
	                                 $userWeb('.twitter').attr('href') ||
	                                 $userWeb('.sow-social-media-button-twitter').attr('href') ||
	                                 $userWeb('.socicon-twitter').parent().attr('href') ||
	                                 $userWeb('.social-twitter').parent().attr('href') ||
	                                 $userWeb('.fa-twitter').parent().attr('href');
	            let facebookAddress = $userWeb('.fa-facebook').parent().attr('href') ||
	            											$userWeb('.socicon-facebook').parent().attr('href') ||
	            											$userWeb('.sow-social-media-button-facebook').attr('href') ||
	            											$userWeb('.social-facebook').parent().attr('href') ||
	                                  $userWeb('.facebook > a').attr('href') ||
	                                  $userWeb('.facebook').attr('href');

	            let emailLink;
	            let hyperLinkArr = [];
            	let $a = $userWeb('body').find('a');
	            if (!hyperLink) {
	            	$a.filter((i, el) => {
	            		let currentHref = $userWeb(el).attr('href');
	            		if (currentHref) {
	            			return (
	            				currentHref.includes('mailto:') && 
	            				currentHref.includes('@') &&
	            				!currentHref.includes('?') && 
	            				!currentHref.includes('paypal.com') &&
	            				!currentHref.includes('amazon.com')
	            			);
	            		}
	            	}).each((i, elem) => hyperLinkArr.push($userWeb(elem).attr('href')))
	            }
	            if (!twitterAddress) {
	            	twitterAddress = $a.filter((i, el) => {
	            		let currentEl = $userWeb(el).attr('href');
	            		if (currentEl) {
	            			return (
	            				currentEl.includes('twitter.com/') && 
	            				!currentEl.includes('/tweet?') &&
	            				!currentEl.includes('/share?') && 
	            				!currentEl.includes('/home?')
	            			)
	            		}
	            	}).attr('href');
	            }
	            if (!facebookAddress) {
	            	facebookAddress = $a.filter((i, el) => {
	            		let currentElem = $userWeb(el).attr('href');
	            		if (currentElem) {
	            			return (
	            				currentElem.includes('facebook.com/') && 
	            				!currentElem.includes('/dialog/feed?') && 
	            				!currentElem.includes('/sharer.php') &&
	            				!currentElem.includes('/login.php')
	            			)
	            		}
	            	}).attr('href');
	            }
	            console.log('User email for', userObj.username, '=====>', hyperLink);
	            console.log('what about emailArr?', hyperLinkArr);
            	// create the resultSoFar object to prep for adding data props
            	resultSoFar[userObj.username] = {};
	            if (hyperLink) {
	              emailLink = hyperLink.slice(7); // specific to mailto href
	              let qIndex;
	              if (emailLink.indexOf('?') === -1) {
	              	qIndex = undefined;
	              } else { 
	              	qIndex = emailLink.indexOf('?');
	              }
	              let normEmail = emailLink.slice(0, qIndex).replace('%20', '');
	              resultSoFar[userObj.username].email = normEmail;
	            } else if (hyperLinkArr.length !== 0) {
	            	let normEmailArr = [];
	            	hyperLinkArr.forEach((item) => {
	            		let currentEmail = item.slice(7);
	            		let qIndex;
		              if (currentEmail.indexOf('?') === -1) {
		              	qIndex = undefined;
		              } else { 
		              	qIndex = currentEmail.indexOf('?');
		              }
		              let normEmail = currentEmail.slice(0, qIndex).replace('%20', '');
		              normEmailArr.push(normEmail);
	            	})
	            	resultSoFar[userObj.username].email = normEmailArr;
	            }
	            if (twitterAddress) {
                console.log('Got twit...', twitterAddress);
                resultSoFar[userObj.username].twitter = twitterAddress;
              }
              if (facebookAddress) {
                console.log('Got fb....', facebookAddress);
                resultSoFar[userObj.username].facebook = facebookAddress;
              }
          	}) // end of forEach
	          // turn obj into an array of obj
	          resultSoFarArr = objToArr(resultSoFar);
	          console.log('RESULT ARR TO BE SAVED ==> \n', resultSoFarArr);
	          if (resultSoFarArr.length !== 0) {
	          	let bulkUpdate = resultSoFarArr.map((obj) => {
  	          	return {
  	          		updateOne: {
  	          			filter: { username: obj.username },
  	          			update: { 
  	          				'data.email': obj.data.email,
  	          				'data.twitter': obj.data.twitter,
  	          				'data.facebook': obj.data.facebook
  	          			}
  	          		}
  	          	}
  	          });
  	          resultSoFar = {};
  	          return InstaUserTemp.bulkWrite(bulkUpdate, { ordered: false });
  	        }
  	        console.log('NOTHING TO UPDATE');
  	        return {};

          })
        	.then((response) => {
      			let timeNow = new Date();
        		if (response.insertedCount) {
        			console.log('UPDATED ALL ! Response is available check above list...\n');
	        		console.log('Insert Count:', response.insertedCount);
	        		console.log('Match Count:', response.matchedCount);
	        		console.log('Modified Count:', response.modifiedCount);
	        		console.log('Upsert Count:', response.upsertedCount);
        		} else {
        			console.log('Time @ unforseen:', timeNow.toISOString());
        			console.log('Nothing done or Something else happened... =>', response);
        		}
        		if (nextRound === null) {
        			console.log('NO MORE...', nextRound);
        			console.log('Time scraper ended:', timeNow.toISOString());
        			return null;
        		} else {
        			console.log('NEXT ROUND AGAIN...', nextRound);
        			userSiteScraper(lastId);
        		}
        	})
        	.catch((err) => {
        		let errorTime = new Date();
        		console.log('Error time is:', errorTime.toISOString());
        		console.log('ERROR down the line ==>\n', err);
        	})
        })
        .catch(err => console.error('Near user personal web:', err))
};

module.exports = userSiteScraper;
