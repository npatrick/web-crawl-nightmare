'use strict';
require('dotenv').config();
const express = require('express');
const logger = require('morgan');
const rp = require('request-promise');
const cheerio = require('cheerio');
const Nightmare = require('nightmare');
const User = require('../db/userSchema');
const vo = require('vo');

const app = express();
app.use(logger('dev'));

app.get('/crawl', (req, res) => {
  const googleQuery = 'https://www.google.com/search?q=site:www.instagram.com+%22los+angeles%22+LA+blogger';
  const max = 30;
  let segment;

  const reqPromCrawl = require('./controllers/reqPromCrawl');

  let searchArr = [];

  for (let k = 0; k < 3; k++) {
    segment = `&start=${k * 10}&sa=N`;
    searchArr.push(googleQuery + segment);
  }

  console.log('LISTINGS: \n', searchArr);

  searchArr.reduce(function(accumulator, url) {
    return accumulator.then(function(results) {
      return reqPromCrawl(url);
    });
  }, Promise.resolve([])).then(function(results) {
    console.log('hmmmmmmm?', results);
    res.end();
  });

  searchArr = [];

})

module.exports = app;
