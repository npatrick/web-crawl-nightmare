const rp = require('request-promise');
const cheerio = require('cheerio');
const InstaUser = require('../../db/instaUserSchema');
const vo = require('vo');
const run = require('../helperFn/run');
const objToArr = require('../helperFn/objToArr');
const { keyword, topDomain } = require('../../misc/resource');

let resultSoFar = {};
let resultSoFarArr;

const instaScraper = async function(resultObj) {
  // DB check on the url listings
  await Promise.resolve(resultObj)
    .then((resultObj) => {
      // check if users already exists in db
      console.log('Checking on resultObj:\n', resultObj);
      if (resultObj === null) {
        return null;
      }
      if (resultObj) {
        return InstaUser.find({ username: { $in: resultObj.dbUserCheck } }).exec()
      } else {
        return [];
      }
    })
    .then((doc) => {
      let tempInstaToVisit;
      if (doc === null) {
        return null;
      }
      if (doc.length !== 0) {
        console.log('****************** Detected Existing Users in DB ******************');
        let linkArr = doc.map(item => item.username);
        console.log('now filtering...');
        // filter out existing db users to visit
        tempInstaToVisit = resultObj.dbUserCheck.filter(gram => !linkArr.includes(gram));
      	// filter undefined urls
        tempInstaToVisit = tempInstaToVisit.filter(item => {
          if (item === undefined || item === 'undefined') {
            return false;
          } else {
            return true;
          }
        }).map(item => `instagram.com/${item}`);
      } else {
        // all are new
        console.log('ALL ARE NEW!', resultObj);
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
      if (instaToVisit === null) {
        return 'Nothing to visit';
      } else if (instaToVisit.length === 0) {
        console.log('All Dups... no need to visit insta for current batch');
        return 'All are duplicates';
      }
      //run params => (domain, selectorStr, isUserWeb, useProxy)
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
            if (typeof $insta !== 'function') {
              console.log('$insta param not a function');
              return;
            }
            let imageProf = $insta('._6q-tv').attr('src');
            let username = $insta('.AC5d8').attr('title');
            let followers = $insta('.-nal3 ').eq(1).find('span').attr('title');
            let fullName = $insta('.rhpdm').text();
            let bio = $insta('.-vDIg > span').text();
            let website = $insta('.-vDIg > a').text();
            // use this log to check the validity of the selectors above
            // console.log('what i got:', `\n
            //   username: ${username},\n
            //   imageProf: ${imageProf},\n
            //   followers: ${followers},\n
            //   bio: ${bio},\n
            //   website: ${website}
            //   `);

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
              // remove emojis & replace them with spaces, bulletpoints and split by spaces and comma
              // check mongo shell for emails with non standard ASCII => [[:^print:]]
              // 
              let bioArr = bio.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]|\u2022)/g, ' ').split(/[, ]+/g);
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
                    (tempEmail.includes(':')) ? normEmail = tempEmail.slice(tempEmail.indexOf(':') + 1).replace(/[^\x00-\xFF]/g, '') : normEmail = tempEmail.replace(/[^\x00-\xFF]/g, '');

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
          resultSoFarArr = objToArr(resultSoFar);
          resultSoFarArr.length > 0 ? console.log('NOW SAVING to DB... After instassss') : console.log('1 or some items are not valid for storing...');
          resultSoFar = {};
          return InstaUser.insertMany(resultSoFarArr, { ordered: false });
        })
        .then((response) => {
          if (response === 'Nothing to visit') {
            console.log('Search Engine returned none');
          }
          if (response === 'All are duplicates') {
            console.log('Nothing was stored, all are duplicates');
          }
          console.log('Received response from DB after saving...');
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
