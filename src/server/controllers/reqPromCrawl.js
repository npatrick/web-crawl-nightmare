const rp = require('request-promise');
const cheerio = require('cheerio');
const Nightmare = require('nightmare');
const User = require('../../db/userSchema');
const vo = require('vo');
const instaScraper = require('./instaScraper');

let reqPromCrawl = async function (url) {
  await instaScraper(url)
    .catch(err => console.error('Error occured..... see last: \n', err))
  
      // .then(userWebList => {
      //   if (userWebList === undefined) {
      //     console.log('No need to visit user webs');
      //     return;
      //   }
      //   console.log('ENTERING USER WEB CHECK...\nwhat is userWebList:', userWebList);
      //   return vo(run(userWebList, 'body'))
      //     .then(cheerioArr => {
      //      if (cheerioArr === undefined) {
      //        return;
      //      }
      //       let twitterArr = [];
      //       let facebookArr = [];
      //       cheerioArr.forEach(userObj => {
      //        if (userObj === undefined) {
      //          return;
      //        }
      //         let $userWeb = userObj.cheerioObj;
      //         let hyperLink = $userWeb('.fa-envelope').parent().attr('href') || $userWeb('.email').attr('href');
      //         let twitterAddress = $userWeb('.twitter > a').attr('href') ||
      //                              $userWeb('.twitter').attr('href') ||
      //                              $userWeb('.fa-twitter').parent().attr('href');
      //         let facebookAddress = $userWeb('.fa-facebook').parent().attr('href') ||
      //                               $userWeb('.facebook > a').attr('href') ||
      //                               $userWeb('.facebook').attr('href');

      //         let emailLink;
      //         console.log('User checks below are for', userObj.username);
      //         console.log('MY HYPERLINK RETRIEVED:***************************', hyperLink);
      //         console.log('WHAT TWIT??...??..??..', twitterAddress, '\n###################');

      //         if (hyperLink) {
      //           emailLink = hyperLink.slice(7); // specific to mailto href
      //           let qIndex;
      //           emailLink.indexOf('?') === -1 ? qIndex = undefined : qIndex = emailLink.indexOf('?');
      //           let normEmail = emailLink.slice(0, qIndex).replace('%20', '');
      //           resultSoFar[userObj.username].email = normEmail;
      //         } else {
      //           if (twitterAddress) {
      //             console.log('VISITING TWIT...', twitterAddress);
      //             twitterArr.push({ username: userObj.username, website: twitterAddress });
      //           }
      //           // need to eventually handle facebook crawling
      //           if (facebookAddress) {
      //             console.log('can visit facebook......', facebookAddress);
      //             facebookArr.push({ username: userObj.username, website: facebookAddress })
      //           }
      //         }
      //       })
      //       if (twitterArr.length !== 0) {
      //         return twitterArr;
      //       } else {
      //         console.log('SAVING TO DB !! After user site...')
      //         // turn obj into an array of obj
      //         resultSoFarArr = objToArr(resultSoFar);
      //         User.insertMany(resultSoFarArr, { ordered: false })
      //           .then((response) => {
      //             if (response.acknowledged === true) {
      //               console.log('ALL inserts have been added to DB');
      //             }
      //           })
      //           .catch((err) => {
      //             console.error('SOME users were NOT added to DB', err);
      //           })
      //         console.log('No need to visit twitter users');
      //         // res.send(resultSoFar);
      //         resultSoFar = {};
      //         return;
      //       }
      //     })
      //     .catch(err => console.error('Near user personal web:', err))
      // })
      // .then(twitterArr => {
      //   if (twitterArr) {
      //     return vo(run(twitterArr, '.ProfileHeaderCard-bio'))
      //       .then(cheerioArr => {
      //         cheerioArr.forEach(userObj => {
      //           let $twitter = userObj.cheerioObj;
      //           let $twitterBioArr = $twitter.text().split(' ');
      //           $twitterBioArr.forEach(word => {
      //             topDomain.forEach(domain => {
      //               if (word.includes('@') && word.includes(domain)) {
      //                 resultSoFar[userObj.username].email = word;
      //               }
      //             })
      //           })
      //         })
      //         console.log('=!=!=> Saving to DB... after.. twitter......');
      //         // insert to DB after crawling twitter users
      //         resultSoFarArr = objToArr(resultSoFar);

      //         User.insertMany(resultSoFarArr, { ordered: false })
      //           .then((response) => {
      //             if (response.acknowledged === true) {
      //               console.log('ALL inserts have been added to DB');
      //             }
      //           })
      //           .catch((err) => {
      //             console.error('SOME users were NOT added to DB', err);
      //           })
      //         // res.send(resultSoFar);
      //         resultSoFar = {};
      //       })
      //       .catch(err => console.error('ALL THE WAY TO TWITTER:', err))
      //   }
      // })
};

module.exports = reqPromCrawl;
