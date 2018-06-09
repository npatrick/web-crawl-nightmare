const rp = require('request-promise');
const cheerio = require('cheerio');
const InstaUser = require('../../db/instaUserSchema');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');
const Crawler = require('crawler');
const { keyword, topDomain } = require('../../misc/resource');

const c = new Crawler({ rateLimit: 3000 });

function crawlerPromise(options) {
	return new Promise((resolve, reject) => {
		options.callback = (err, res, done) => {
			if (err) {
				reject(err);
			} else {
				let $ = res.$;
				resolve($);
			}
			done();
		}
		c.queue(options);
	});
}

let resultSoFar = {};
let resultSoFarArr;

const instaScraper = async function(url) {

  let resultObj = {};

	await crawlerPromise({ uri: url })
    .then(($) => {
      const $body = $('body');
      let gTemp = $body.find('div.g');
      let bTemp = $body.find('.b_algo');
      let resultList; 
      if ($(gTemp[0]).html()) {
      	// 'div.g' => google specific query results
        resultList = gTemp;
      } else if ($(bTemp[0]).html()){
      	// '.b_algo' => bing query results
        resultList = bTemp;
      } else {
      	return;
      }
      let dbUserCheck = []; // used for bulk checking on mongo by $in utilization
      let tempInsta = [];

      if (resultList.length === 0) {
        return
      } else {
        // iterate google result items to retrieve insta url to visit
        resultList.each((index, item) => {
          // need to check from cheerio markup results because we dont exactly
          // get what we see on browser
          let hrefStr = $(item).find('.r > a').attr('href') || $(item).find('.b_attribution').text();
          let indexOfHttp = hrefStr.indexOf('http');
          let indexOfCom = hrefStr.indexOf('.com/');
          // g vs b => bing returns exact insta href, google doesn't...
          let indexAfterUsername = hrefStr.indexOf('/', indexOfCom + 5);
          if (indexAfterUsername === -1) {
            indexAfterUsername = undefined;
          }
          let instaUserPath = hrefStr.toLowerCase().slice(indexOfHttp, indexAfterUsername) + '/';
          // only add profiles urls and NOT posts urls
          if (!instaUserPath.includes('/p/') && !instaUserPath.includes('/explore/')) {
            // retrieve username from a hyperlink and set it to instaUser
            let temp = instaUserPath.slice(instaUserPath.indexOf('.com/') + 5);
            let instaUser = temp.replace('/', '');
            tempInsta.push(instaUserPath);
            dbUserCheck.push(instaUser);
          }
        })
      }
      resultObj.dbUserCheck = dbUserCheck; // array of usernames
      resultObj.tempInsta = tempInsta; // array of insta urls
      return resultObj;
    })
    .then((resultObj) => {
      // check if users already exists in db
      return resultObj ? InstaUser.find({ username: { $in: resultObj.dbUserCheck } }).exec() : [];
    })
    .then((doc) => {
      let tempInstaToVisit;
      if (doc.length !== 0) {
        console.log('****************** Detected Existing Users in DB ******************');
        let linkArr = doc.map(item => item.username);
        console.log('now filtering...');
        // filter out existing db users to visit
        tempInstaToVisit = resultObj.dbUserCheck.filter(gram => !linkArr.includes(gram));
      	tempInstaToVisit = tempInstaToVisit.filter(item => {
          if (item === undefined || item === 'undefined') {
            return false;
          } else {
            return true;
          }
        }).map(item => `instagram.com/${item}`);
      } else {
        // all are new
        console.log('ALL ARE NEW!', doc);
        tempInstaToVisit = resultObj.tempInsta.filter(item => {
          if (item === undefined || item === 'undefined') {
            return false;
          } else {
            return true;
          }
        }).map(item => `instagram.com/${item}`);
      }
      console.log('!!!! FILTER Insta URL RESULT !!!!! :\n', tempInstaToVisit)
      return tempInstaToVisit;
    }, (err) => {
      console.error('Something went wrong on mongo query... \n', err);
      return;
    })
    // /////////////////////////////////////////////// //
    // 2nd main part => visit insta profiles to scrape //
    // /////////////////////////////////////////////// //
    .then((instaToVisit) => {
      if (!instaToVisit || instaToVisit.length === 0) {
        console.log('All Dups... no need to visit insta for current batch');
        return;
      }
      return vo(run(instaToVisit, '#react-root', false, true))
        .then(cheerioArr => {
          let userWebList = [];
          cheerioArr.forEach(($insta) => {
            // TODO: Need to update these fields when insta updates their selectors...
            // imageProf = $insta('._rewi8').attr('src');
            // username = $insta('._rf3jb.notranslate').attr('title');
            // followers = $insta('._fd86t').eq(1).attr('title');
            // fullName = $insta('._kc4z2').text();
            // bio = $insta('._tb97a > span').text();
            // website = $insta('._tb97a > a').text();

            let imageProf = $insta('._6q-tv').attr('src');
            let username = $insta('.AC5d8').attr('title');
            let followers = $insta('.-nal3 ').eq(1).find('span').attr('title');
            let fullName = $insta('.rhpdm').text();
            let bio = $insta('.-vDIg > span').text();
            let website = $insta('.-vDIg > a').text();

            console.log('what i got:', `\n
              username: ${username},\n
              imageProf: ${imageProf},\n
              bio: ${bio},\n
              website: ${website}
              `);

            if (!resultSoFar.hasOwnProperty(username)) {
              console.log('NEW USER:', username);
              resultSoFar[username] = {
                instagramLink: `https://www.instagram.com/${username}/`,
                fullName: fullName,
                imageProf: imageProf,
                followers: followers,
                website: website.length > 1 ? website : null,
                bio: bio,
                category: []
              };
              // remove emojis and split by spaces and comma
              let bioArr = bio.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '').split(/[, ]+/g);
              let skip = {};
              // extract any kind of emails/contact & category
              bioArr.forEach((word) => {
                let lowerWord = word.toLowerCase();
                // find categories and skip duplicates
                keyword.forEach(item => {
                  if (lowerWord == item && !skip.hasOwnProperty(lowerWord)) {
                    resultSoFar[username].category.push(lowerWord);
                    skip[lowerWord] = 1;
                  }
                })

                // find top level domain
                topDomain.forEach(domain => {
                	// using lowercase to normalize top domain used by users
                  if (lowerWord.includes('@') && lowerWord.includes(domain)) {
                    let qIndex;
                    word.indexOf('?') === -1 ? qIndex = undefined : qIndex = word.indexOf('?');
                    let tempEmail = word.slice(0, qIndex);
                    let normEmail;
                    (tempEmail.includes(':')) ? normEmail = tempEmail.slice(tempEmail.indexOf(':') + 1) : normEmail = tempEmail;

                    resultSoFar[username].email = normEmail;
                  }
                })
              });
              if (!resultSoFar[username].email && website) {
                userWebList.push({ username: username, website: website });
              }
            }
            console.log('USER makeup so far:', resultSoFar[username]);
            
          }) // end of forEach
          console.log('NOW SAVING to DB... After instassss');
          resultSoFarArr = objToArr(resultSoFar);
          resultSoFar = {};
          return InstaUser.insertMany(resultSoFarArr, { ordered: false });
        })
        .then((response) => {
          if (response.acknowledged === true) {
            console.log('ALL inserts have been added to DB');
          }
        })
        .catch((err) => {
          console.error('SOME users were NOT added to DB', err);
          if (err.writeErrors) {
          	err.writeErrors.forEach((item, index) => {
            	console.log(`==> Error ${index + 1}\n`, item);
            })
          } else {
          	console.log(err.errmsg);
          }
        })
      })
    	.catch(err => console.error('@ insta having an error of: \n', err))
}

module.exports = instaScraper;
