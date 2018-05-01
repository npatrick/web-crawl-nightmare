'use strict';

const express = require('express');
const logger = require('morgan');
const rp = require('request-promise');
const cheerio = require('cheerio');
const Nightmare = require('nightmare');

const nightmare = Nightmare({
  show: true
});

const app = express();
app.use(logger('dev'));

let resultSoFar = {};

let nightmareInstance;

app.get('/crawl', (req, res) => {
  const googleQuery = 'https://www.google.com/search?q=site:www.instagram.com+%22los+angeles%22+LA+blogger';

  const options = {
    uri: googleQuery,
    transform: (body) => cheerio.load(body)
  };
  console.log('VISITING GOOGLE QUERY');

  // helper function for browsing
  const beginNightmare = async (domain, selectorStr) => {
  	let normalizeDomain = '';
  	if (!domain.includes('http')) {
  		normalizeDomain = `http://${domain}`;
  	} else {
  		normalizeDomain = domain;
  	}
  	if (!nightmareInstance) {
  	console.log('from IF Now visiting...', normalizeDomain, '& Selector:', selectorStr);
  		// nightmareInstance is now an http object
  		// w/ props: url, code, method, referrer, and headers
			nightmareInstance = await nightmare.goto(normalizeDomain);
  	} else {
  		console.log('from ELSE Now visiting...', normalizeDomain, '& Selector:', selectorStr);
  		await nightmare.goto(normalizeDomain)
  			.catch((err) => console.error('NEXT ROUND ERROR:', err))
  	}
  	console.log('NOICE!');
  	return await nightmare
    	.wait(selectorStr)
      .evaluate((selector) => {
        return document.querySelector(selector).outerHTML;
      }, selectorStr)
      .then((el) => {
        const $ = cheerio.load(el);
        return $;
      })
      .catch(error => {
        console.log(`Execution failed on beginNightmare fn for ${normalizeDomain}\n Error stat:`, error);
      	return beginNightmare(normalizeDomain, selectorStr);
      })
  };

  rp(options)
    .then(async ($) => {
      const $body = $('body');
      const resultItem = $body.find('div.g');
      let instaToVisit = ['https://www.instagram.com/sydnesummer/'];


      console.log('INSTAS TO VISIT:', instaToVisit);
      // iterate insta url and visit each
      // use phantomjs here to open react app
      await instaToVisit.forEach(async (insta) => {
        // create nightmare instance on a domain w/ selector
        const $insta = await beginNightmare(insta, '#react-root');

        let imageProf = $insta('._rewi8').attr('src');
        let username = $insta('._rf3jb.notranslate').attr('title');
        let followers = $insta('._fd86t').eq(1).attr('title');
        let fullName = $insta('._kc4z2').text();
        let bio = $insta('._tb97a > span').text();
        let website = $insta('._tb97a > a').text();

        if (!resultSoFar.hasOwnProperty(username)) {
          console.log('NEW USER:', username);
          resultSoFar[username] = {
            instagramLink: `instagram.com/${username}/`,
            imageProf: imageProf,
            followers: followers,
            fullName: fullName,
            bio: bio,
            website: website,
            category: []
          };
          let bioArr = bio.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '').split(' ');
          let skip = {};
          // extract any kind of emails/contact & category
          let keyword = ['food', 'foodie', 'fashion', 'beauty', 'makeup', 'stylist',
            'travel', 'adventure', 'adventurer', 'clothing', 'news', 'blogger',
            'influencer', 'model', 'nutrition', 'fitness', 'wellness', 'home', 'kitchen'];
          let topDomain = ['.com', '.net', '.org', '.biz', '.info', '.email', '.ly', '.us'];
          bioArr.forEach((word, index) => {
            let lowerWord = word.toLowerCase();
            // find top level domain
            topDomain.forEach(domain => {
              if (word.includes('@') && word.includes(domain)) {
                resultSoFar[username].email = word;
              }
            })
            // find categories and skip duplicates
            keyword.forEach(item => {
              if (lowerWord == item && !skip.hasOwnProperty(lowerWord)) {
                resultSoFar[username].category.push(lowerWord);
                skip[lowerWord] = 1;
              }
            })
          });
          console.log('USER makeup so far:', resultSoFar[username]);
          // non-existent email for the insta user BUT website is included in bio
          if (!resultSoFar[username].email && website) {
          	console.log('NOW CHECKING USER WEB...');
            const $userWeb = await beginNightmare(website, 'body');

            let hyperLink = $userWeb('.fa-envelope').parent().attr('href') || $userWeb('.email').attr('href');
            let twitterAddress = $userWeb('.twitter > a').attr('href') ||
              $userWeb('.twitter').attr('href') ||
              $userWeb('.fa-twitter').parent().attr('href');
            let emailLink;
            console.log('MY HYPERLINK RETRIEVED:***************************', hyperLink);
            console.log('WHAT TWIT??...??..??..', twitterAddress);

            if (hyperLink) {
              emailLink = hyperLink.slice(7); // specific to mailto href
            } else {
              if (twitterAddress) {
                console.log('VISITING TWIT...', twitterAddress);
                const $twitter = await beginNightmare(twitterAddress, '.ProfileHeaderCard-bio');

                let $twitterBioArr = $twitter.text().split(' ');
                $twitterBioArr.forEach(word => {
                  topDomain.forEach(domain => {
                    if (word.includes('@') && word.includes(domain)) {
                      emailLink = word;
                    }
                  })
                })
              }
            }
            resultSoFar[username].email = emailLink;
            nightmare.end();
          }
        }
        console.log('RESULT so far on OBJ IS:.................................\n', resultSoFar);
      })
      await res.send(resultSoFar);
    })
})

module.exports = app;
