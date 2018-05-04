const rp = require('request-promise');
const cheerio = require('cheerio');
const Nightmare = require('nightmare');
const User = require('../../db/userSchema');
const vo = require('vo');

const nightmare = Nightmare({
  show: true,
  gotoTimeout: 60000,
  waitTimeout: 60000,
  executionTimeout: 60000,
  pollInterval: 500
});

let resultSoFar = {};
let resultSoFarArr;

let keyword = ['food', 'foodie', 'style', 'fashion', 'beauty', 'makeup', 'stylist', 'lifestyle',
                'author', 'travel', 'adventure', 'adventurer', 'clothing', 'news', 'film', 'cinema', 'blog', 'blogger',
                'vlog', 'influencer', 'model', 'nutrition', 'fitness', 'wellness', 'home', 'kitchen'];
let topDomain = ['.com', '.net', '.org', '.biz', '.fr', '.info', '.media', '.global', '.email', '.ly', '.us', '.nu'];

let reqPromCrawl = async function (url) {
	let options = {
    uri: url,
    transform: (body) => cheerio.load(body)
  };

  // helper function for browsing
  const beginNightmare = (domain, selectorStr) => {
  	let normalizeDomain = '';
  	if (!domain.includes('http')) {
  		normalizeDomain = `http://${domain}`;
  	} else {
  		normalizeDomain = domain;
  	}
    console.log('now checking in ', normalizeDomain);
		return nightmare
      .goto(normalizeDomain)
      .wait(2000)
    	.wait(selectorStr)
      .evaluate((selector) => {
        return window.document.querySelector(selector).outerHTML;
      }, selectorStr)
      .then((el) => {
        const $ = cheerio.load(el);
        return $;
      })
      .catch(error => {
        console.log(`Execution failed on beginNightmare fn for ${normalizeDomain}\n Error stat:`, error);
        return;
      })
  };

  // iterate the insta urls and sequentialy visit each
  let run = function * (destination, qSelect) {
    let normalizeParam;
    let cheerioArr = [];

    if (typeof destination === 'string') {
      normalizeParam = [destination];
    } else {
      normalizeParam = destination;
    }
    for (let i = 0; i < normalizeParam.length; i++ ) {
      let $cheerioObj;
      if (normalizeParam[i] !== null && typeof normalizeParam[i] === 'object') {
        $cheerioObj = yield beginNightmare(normalizeParam[i].website, qSelect);
        cheerioArr.push({ username: normalizeParam[i].username, cheerioObj: $cheerioObj });
      } else {
        $cheerioObj = yield beginNightmare(normalizeParam[i], qSelect);
        cheerioArr.push($cheerioObj);
      }
    } // end of for loop
    return cheerioArr;
  }; // end of run fn

  const objToArr = (obj) => {
    let result = [];
    /* Schema needs to be in DB
     *
     * {
     *   username: String,
     *   data: Object
     * }
     *
    */
    for (let key in obj) {
      result.push({ username: key, data: obj[key] })
    }

    return result;
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
          let instaUserPath = hrefStr.slice(indexOfHttp, indexAfterUsername) + '/';
  
          // only add profiles urls and NOT posts urls
          if (!instaUserPath.includes('/p/')) {
            // retrieve username from a hyperlink and set it to instaUser
            let temp = instaUserPath.slice(instaUserPath.indexOf('.com/') + 5);
            let instaUser = temp.replace('/', '');
            tempInsta.push(instaUserPath);
            dbUserCheck.push(instaUser);
          }
        })
      }
      // resultObj.instaToVisit = instaToVisit;
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
        let linkArr = doc.map(item => item.data.instagramLink);
        console.log('now filtering...');
        // filter out existing db users to visit
        tempInstaToVisit = resultObj.tempInsta.filter(gram => !linkArr.includes(gram));
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
      // console.log('INSTAS TO VISIT:', instaToVisit);
      if (instaToVisit === undefined) {
        console.log('All Dups... no need to visit insta');
        return;
      }
      return vo(run(instaToVisit, '#react-root'))
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
          console.log('IS THERE REALLY USER WEBS TO CHECK? #######\n', userWebList);
          if (userWebList.length !== 0) {
            return userWebList;
          } else {
            console.log('NOW SAVING to DB... After instassss');
            resultSoFarArr = objToArr(resultSoFar);
            User.insertMany(resultSoFarArr, { ordered: false })
              .then((response) => {
                if (response.acknowledged === true) {
                  console.log('ALL inserts have been added to DB');
                }
              })
              .catch((err) => {
                console.error('SOME users were NOT added to DB', err);
              })
            // res.send(resultSoFar);
            resultSoFar = {};
            return;
          }
        })
        .catch(err => console.error('@ insta having an error of: \n', err))
      })
      .then(userWebList => {
        if (userWebList === undefined) {
          console.log('No need to visit user webs');
          return;
        }
        console.log('ENTERING USER WEB CHECK...\nwhat is userWebList:', userWebList);
        return vo(run(userWebList, 'body'))
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
              console.log('User checks below are for', userObj.username);
              console.log('MY HYPERLINK RETRIEVED:***************************', hyperLink);
              console.log('WHAT TWIT??...??..??..', twitterAddress, '\n###################');

              if (hyperLink) {
                emailLink = hyperLink.slice(7); // specific to mailto href
                let qIndex;
                emailLink.indexOf('?') === -1 ? qIndex = undefined : qIndex = emailLink.indexOf('?');
                let normEmail = emailLink.slice(0, qIndex).replace('%20', '');
                resultSoFar[userObj.username].email = normEmail;
              } else {
                if (twitterAddress) {
                  console.log('VISITING TWIT...', twitterAddress);
                  twitterArr.push({ username: userObj.username, website: twitterAddress });
                }
                // need to eventually handle facebook crawling
                if (facebookAddress) {
                  console.log('can visit facebook......', facebookAddress);
                  facebookArr.push({ username: userObj.username, website: facebookAddress })
                }
              }
            })
            if (twitterArr.length !== 0) {
              return twitterArr;
            } else {
              console.log('SAVING TO DB !! After user site...')
              // turn obj into an array of obj
              resultSoFarArr = objToArr(resultSoFar);
              User.insertMany(resultSoFarArr, { ordered: false })
                .then((response) => {
                  if (response.acknowledged === true) {
                    console.log('ALL inserts have been added to DB');
                  }
                })
                .catch((err) => {
                  console.error('SOME users were NOT added to DB', err);
                })
              console.log('No need to visit twitter users');
              // res.send(resultSoFar);
              resultSoFar = {};
              return;
            }
          })
          .catch(err => console.error('Near user personal web:', err))
      })
      .then(twitterArr => {
        if (twitterArr) {
          return vo(run(twitterArr, '.ProfileHeaderCard-bio'))
            .then(cheerioArr => {
              cheerioArr.forEach(userObj => {
                let $twitter = userObj.cheerioObj;
                let $twitterBioArr = $twitter.text().split(' ');
                $twitterBioArr.forEach(word => {
                  topDomain.forEach(domain => {
                    if (word.includes('@') && word.includes(domain)) {
                      resultSoFar[userObj.username].email = word;
                    }
                  })
                })
              })
              console.log('=!=!=> Saving to DB... after.. twitter......');
              // insert to DB after crawling twitter users
              resultSoFarArr = objToArr(resultSoFar);

              User.insertMany(resultSoFarArr, { ordered: false })
                .then((response) => {
                  if (response.acknowledged === true) {
                    console.log('ALL inserts have been added to DB');
                  }
                })
                .catch((err) => {
                  console.error('SOME users were NOT added to DB', err);
                })
              // res.send(resultSoFar);
              resultSoFar = {};
            })
            .catch(err => console.error('ALL THE WAY TO TWITTER:', err))
        }
      })
      .catch(err => console.error('Error occured..... see last: \n', err))
};

module.exports = reqPromCrawl;
