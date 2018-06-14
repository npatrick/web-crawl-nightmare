'use strict';

const express = require('express');
const logger = require('morgan');
const rp = require('request-promise');
const cheerio = require('cheerio');
const Nightmare = require('nightmare');
const vo = require('vo');
const mongoose = require('mongoose');
const Crawler = require('crawler');
const db = require('../db/index');
const instaScraper = require('./controllers/instaScraper');
const userSiteScraper = require('./controllers/userSiteScraper');
const twitterScraper = require('./controllers/twitterScraper');
const facebookScraper = require('./controllers/facebookScraper');
const youtubeScraper = require('./controllers/youtubeScraper');

const app = express();

app.use(logger('dev'));

db.on('open', () => {
  // const reqPromCrawl = require('./controllers/reqPromCrawl');
  let searchArr = [];
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
  ////////////////// GOOGLE AREA //////////////////////
  const googleQuery = 'https://www.google.com/search?q=site:www.instagram.com+%22los+angeles%22+LA+blogger+blog+influencer';
  const gMax = 32; // 32 max
  let segment;

  const googleSearch = async (nextCount) => {
    let resultObj = {};
    let count = nextCount || 0;
    segment = `&start=${count * 10}&sa=N`;
    console.log('Current bracket url:', googleQuery + segment);
    let $searchRes = await crawlerPromise({ uri: googleQuery + segment });

    const $body = $searchRes('body');
    let gTemp = $body.find('div.g');
    let bTemp = $body.find('.b_algo');
    let resultList; 
    if ($searchRes(gTemp[0]).html()) {
      // 'div.g' => google specific query results
      resultList = gTemp;
    } else if ($searchRes(bTemp[0]).html()){
      // '.b_algo' => bing query results
      resultList = bTemp;
    } else {
      console.log('No more results...');
      return;
      
    }
    let dbUserCheck = []; // used for bulk checking on mongo by $in utilization
    let tempInsta = [];

    if (resultList.length === 0) {
      console.log('Possibly no items to iterate on search results');
      return
    } else {
      // iterate google result items to retrieve insta url to visit
      resultList.each((index, item) => {
        // need to check from cheerio markup results because we dont exactly
        // get what we see on browser
        let hrefStr = $searchRes(item).find('.r > a').attr('href') || $searchRes(item).find('.b_attribution').text();
        let indexOfHttp = hrefStr.indexOf('http');
        let indexOfCom = hrefStr.indexOf('.com/');
        // g vs b => bing returns exact insta href, google doesn't...
        let indexAfterUsername = hrefStr.indexOf('/', indexOfCom + 5);
        if (indexAfterUsername === -1) {
          indexAfterUsername = undefined;
        }
        let instaUserPath = hrefStr.toLowerCase().slice(indexOfHttp, indexAfterUsername) + '/';
        // only add profiles urls and NOT posts urls
        if (!instaUserPath.includes('/p/') && 
            !instaUserPath.includes('/explore/') &&
            !instaUserPath.includes('/about/') &&
            !instaUserPath.includes('/blog/')) {
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
    await instaScraper(resultObj);
    count++;
    return await googleSearch(count);
  };

  googleSearch();
//////////////////////////////////////////////////////

/////////////////////// BING AREA ////////////////////
  // const bingQuery = 'https://www2.bing.com/search?q=site%3ainstagram.com+"Los+Angeles"+LA+blogger+blog+influencer';
  // const bMax = 68; // 72 max
  // let pageSector;

  // for (let j = 0; j < bMax; j++) {
  //   if (j === 0) {
  //     pageSector = `&first=1`;
  //   } else if (j === 1) {
  //     pageSector = `&first=13`;
  //   } else {
  //     pageSector = `&first=${(14 * j) - 1}`;
  //   }
  //   searchArr.push(bingQuery + pageSector);
  // }

  // console.log('BING LISTINGS', searchArr);

  // searchArr.reduce(function(accumulator, url) {
  //   return accumulator.then(function(results) {
  //     return reqPromCrawl(url);
  //   });
  // }, Promise.resolve([])).then(function(results) {
  //   console.log('Bing query items ends...', results);
  // });

  // searchArr = [];
////////////////////// USER WEB AREA ////////////////////////
  // userSiteScraper();

////////////////////// Twitter Area ////////////////////////
  // twitterScraper();

////////////////////// Facebook Area ///////////////////////
  // facebookScraper();

////////////////////// YouTube Area //////////////////////
  // youtubeScraper();

///////////////////////////////////////////////////////////
})

module.exports = app;
