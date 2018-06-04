'use strict';

const express = require('express');
const logger = require('morgan');
const rp = require('request-promise');
const cheerio = require('cheerio');
const Nightmare = require('nightmare');
const vo = require('vo');
const mongoose = require('mongoose');
const db = require('../db/index');
const userSiteScraper = require('./controllers/userSiteScraper');
const twitterScraper = require('./controllers/twitterScraper');
const facebookScraper = require('./controllers/facebookScraper');
const youtubeScraper = require('./controllers/youtubeScraper');

const app = express();

app.use(logger('dev'));

db.on('open', () => {
  const reqPromCrawl = require('./controllers/reqPromCrawl');
  let searchArr = [];
  ////////////////// GOOGLE AREA //////////////////////
  // const googleQuery = 'https://www.google.com/search?q=site:www.instagram.com+%22los+angeles%22+LA+blogger+blog+influencer';
  // const gMax = 32; // 32 max
  // let segment;

  // for (let k = 0; k < gMax; k++) {
  //   segment = `&start=${k * 10}&sa=N`;
  //   searchArr.push(googleQuery + segment);
  // }

  // console.log('LISTINGS: \n', searchArr);

  // searchArr.reduce(function(accumulator, url) {
  //   return accumulator.then(function(results) {
  //     return reqPromCrawl(url);
  //   });
  // }, Promise.resolve([])).then(function(results) {
  //   console.log('Google query items ends...', results);
  // });

  // searchArr = [];
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
  facebookScraper();

////////////////////// YouTube Area //////////////////////
  // youtubeScraper();

///////////////////////////////////////////////////////////
})

module.exports = app;
