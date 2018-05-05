const cheerio = require('cheerio');
const User = require('../../db/userSchema');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');


const userSiteScraper = async function() { // integrate accepting an array of obj {user, website}
  let resultObj = {};
	let resultSoFar = {};
	let resultSoFarArr;

  await User
  	.find({
  		// null is better than using {$exists: false}
  		// null will return docs w/ null values and non-existent field
  		'data.email': null
  	})
  	.limit(10)
  	.select('username data.website')
  	.exec()
  	.then((doc) => {
  		let userWebList = [];
			console.log('hmmmmmmm WHAT DID I GET FROM DOC?\n', doc);
  		if (doc.length === 0) {
  			console.log('All got emails :)');
  			return;
  		} else {
  			doc.forEach((item) => {
  				if (item.data.website) {
  					userWebList.push({ username: item.username, website: item.data.website });
  				}
  			})
  		}
  		return userWebList;
  	})
  	.then((userWebList) => {
      if (userWebList === undefined) {
        console.log('No need to visit user webs');
        return;
      }
      console.log('ENTERING USER WEB CHECK...\nwhat is userWebList:', userWebList);
      return vo(run(userWebList, 'body', true))
        .then(cheerioArr => {
	         if (cheerioArr === undefined) {
	           return;
	         }
	          let twitterArr = [];
	          let facebookArr = [];
	          cheerioArr.forEach(userObj => {
	           if (userObj === undefined) {
	             return;
	           }
	            let $userWeb = userObj.cheerioObj;
	            let hyperLink = $userWeb('.fa-envelope').parent().attr('href') || $userWeb('.email').attr('href');
	            let twitterAddress = $userWeb('.twitter > a').attr('href') ||
	                                 $userWeb('.twitter').attr('href') ||
	                                 $userWeb('.fa-twitter').parent().attr('href');
	            let facebookAddress = $userWeb('.fa-facebook').parent().attr('href') ||
	                                  $userWeb('.facebook > a').attr('href') ||
	                                  $userWeb('.facebook').attr('href');

	            let emailLink;
	            console.log('User email for', userObj.username, '=====>', hyperLink);

            	// create the resultSoFar object to prep for adding data props
            	resultSoFar[userObj.username] = {};
	            if (hyperLink) {
	              emailLink = hyperLink.slice(7); // specific to mailto href
	              let qIndex;
	              emailLink.indexOf('?') === -1 ? qIndex = undefined : qIndex = emailLink.indexOf('?');
	              let normEmail = emailLink.slice(0, qIndex).replace('%20', '');
	              resultSoFar[userObj.username].email = normEmail;
	            }
	            if (twitterAddress) {
                console.log('Got twit...', twitterAddress);
                resultSoFar[userObj.username].website = twitterAddress;
              }
              if (facebookAddress) {
                console.log('Got fb....', facebookAddress);
                resultSoFar[userObj.username].website = facebookAddress;
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
  	          			update: { 'data.email': obj.data.email }
  	          		}
  	          	}
  	          });
  
  	          resultSoFar = {};
  	          return User.bulkWrite(bulkUpdate, { ordered: false });
  	        }
  	        console.log('NOTHING TO UPDATE');
  	        return;
          })
        	.then((response) => {
        		console.log('UPDATED ALL ! Response is here...\n', response);
        		return;
        	})
        	.catch((err) => {
        		console.log('ERROR IN BULK WRITE ==>\n', err);
        	})
        })
        .catch(err => console.error('Near user personal web:', err))
};

module.exports = userSiteScraper;
