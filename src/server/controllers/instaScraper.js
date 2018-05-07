const rp = require('request-promise');
const cheerio = require('cheerio');
const User = require('../../db/userSchema');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');

let resultSoFar = {};
let resultSoFarArr;

let keyword = ['food', 'foodie', 'style', 'fashion', 'beauty', 'makeup', 'stylist', 'lifestyle',
                'author', 'travel', 'adventure', 'adventurer', 'clothing', 'news', 'film', 'cinema', 'blog', 'blogger',
                'vlog', 'influencer', 'model', 'nutrition', 'fitness', 'wellness', 'home', 'kitchen'];
let topDomain = ['.com', '.Com', '.net', '.org', '.biz', '.fr', '.info', '.media', '.global', '.email', '.ly', '.us', '.nu'];

const instaScraper = async function(url) {
	let options = {
    uri: url,
    transform: (body) => cheerio.load(body)
  };

  let resultObj = {};

	await rp(options)
    .then(($) => {
      const $body = $('body');
      let gTemp = $body.find('div.g');
      let bTemp = $body.find('.b_algo');
      let resultList; 

      if ($(gTemp[0]).html()) {
      // 'div.g' => google specific query results
        resultList = gTemp;
      } else {
      // '.b_algo' => bing query results
        resultList = bTemp;
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
      resultObj.dbUserCheck = dbUserCheck;
      resultObj.tempInsta = tempInsta;
      return resultObj;
    })
    .then((resultObj) => {
      console.log('Beginning of BULK DB username checking...\n', resultObj.dbUserCheck);
      // check if users already exists in db
      return User.find({ username: { $in: resultObj.dbUserCheck } }).exec();
    })
    .then((doc) => {
      let tempInstaToVisit;
      if (doc.length !== 0) {
        console.log('****************** Detected Existing Users in DB ******************');
        let linkArr = doc.map(item => item.username);
        console.log('now filtering...');
        // filter out existing db users to visit
        tempInstaToVisit = resultObj.dbUserCheck.filter(gram => !linkArr.includes(gram));
      } else {
        // all are new
        console.log('ALL ARE NEW!', doc);
        tempInstaToVisit = resultObj.tempInsta;
      }
      console.log('!!!! FILTER RESULT !!!!! :\n', tempInstaToVisit)
      return tempInstaToVisit;
    }, (err) => {
      console.error('Something went wrong on mongo query... \n', err);
      return;
    })
    .then((instaToVisit) => {
      if (instaToVisit.length === 0) {
        console.log('All Dups... no need to visit insta');
        return;
      }
      return vo(run(instaToVisit, '#react-root', false))
        .then(cheerioArr => {
          let userWebList = [];
          cheerioArr.forEach(($insta) => {
            let imageProf = $insta('._rewi8').attr('src');
            let username = $insta('._rf3jb.notranslate').attr('title');
            let followers = $insta('._fd86t').eq(1).attr('title');
            let fullName = $insta('._kc4z2').text();
            let bio = $insta('._tb97a > span').text();
            let website = $insta('._tb97a > a').text();

            if (!resultSoFar.hasOwnProperty(username)) {
              console.log('NEW USER:', username);
              resultSoFar[username] = {
                instagramLink: `https://www.instagram.com/${username}/`,
                fullName: fullName,
                imageProf: imageProf,
                followers: followers,
                website: website,
                bio: bio,
                category: []
              };
              let bioArr = bio.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '').split(' ');
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
                  if (word.includes('@') && word.includes(domain)) {
                    let qIndex;
                    word.indexOf('?') === -1 ? qIndex = undefined : qIndex = word.indexOf('?');
                    let normEmail = word.slice(0, qIndex);
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
          return User.insertMany(resultSoFarArr, { ordered: false });
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
