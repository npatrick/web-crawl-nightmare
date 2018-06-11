const Nightmare = require('nightmare');
const rp = require('request-promise');
const cheerio = require('cheerio');

Nightmare.action('proxy',
  function(name, options, parent, win, renderer, done) {
      parent.respondTo('proxy', function(host, done) {
          win.webContents.session.setProxy({
              proxyRules: 'http=' + host + ';https='+ host +';ftp=' + host,

          }, function() {
              done();
          });
      });

      done();
  },
  function(host, done) {
      this.child.call('proxy', host, done);
  }
);

const nightmare = Nightmare({
  show: true,
  // gotoTimeout => def:30s, 
  // only used if the DOM itself has not yet loaded
  gotoTimeout: 30000,
  // waitTimeout => def:30s, throws an exception if .wait()
  // didnt return true within the set timeframe
  waitTimeout: 30000,
  // executionTimeout => def:30s, max time to wait for an
  // .evaluate() statement to complete
  executionTimeout: 30000,
  // pollInterval => def:250ms, wait time between checks
  // for the .wait() condition to be successful
  pollInterval: 50,
  // switches => command line switches used by Chrome
  // and supported by Electron
  switches: {
    'ignore-certificate-errors': true
  }
});

/**
 * @param  {String} domain      a url string that is normalized
 *                              for nightmare to visit
 * @param  {String} selectorStr the queryString to retrieve
 *                              from the html
 * @param  {Boolean} isUserWeb  are you passing a user's personal site?
 * @return {Function}           returns a cheerio fn that can
 *                              be interacted w/ .html(),
 *                              .find(), .text(), etc.
 */
const beginNightmare = async (domain, selectorStr, isUserWeb, useProxy) => {
  	let normalizeDomain = '';
    let siteBlacklisted = false;
    const blackList = ['instagram.com/blog', 'vogue.com', 'vogue', 'consumingla.com', 'okayafrica.com', 
                      'amodelsguide.com', 'theclothing-twpm.com', 'amazon.com',
                      'dodgers.com'];
    blackList.forEach((url) => {
      if (domain.toLowerCase().includes(url)) {
        siteBlacklisted = true;
      }
    })
    if (!siteBlacklisted) {
    	if (!domain.includes('http')) {
    		normalizeDomain = `http://${domain}`;
    	} else {
    		normalizeDomain = domain;
    	}
      let domainPartsArr = normalizeDomain.split('/');
      if (domainPartsArr[3].length < 1) {
        console.log('wrong insta user path');
        return nightmare;
      }

      if (useProxy !== false) {
        return await rp('http://localhost:8080/fetch-proxy') // rotating self-made proxy
          .then((currentProxy) => {
            console.log('fetch-proxy response:', currentProxy);
            return nightmare
              .proxy(currentProxy)
              .authentication(process.env.PROXYUSER, process.env.PROXYPASS)
              .goto(normalizeDomain)
              .wait(selectorStr)
              .evaluate((selector) => {
                return document.querySelector(selector).outerHTML;
              }, selectorStr)
              .then((el) => {
                let $ = cheerio.load(el);

                $.prototype.exists = function (selector) {
                  return this.find(selector).length > 0;
                }
                return $;
              })
              .catch(error => {
                console.log('Do I have error.details below ====>\n', error.details);
                console.log(`Execution failed on beginNightmare fn for ${normalizeDomain}\n Error stat:`, error);
                if (error.details == 'Navigation timed out after 30000 ms') {
                  console.log('I got error details, seeeeee =>', error.details);
                  return undefined;
                }
                if (error.details == 'ERR_NAME_NOT_RESOLVED') {
                  console.log('Probably did not get the html at all');
                  return undefined;
                }
                if (error.details == 'ERR_INTERNET_DISCONNECTED') {
                  let time = new Date();
                  console.log('Time internet disconnected', time.toISOString());
                }
                return undefined;
              })
          })
          .catch((err) => {
            console.log('Error in fetching proxy:\n', err);
          })
      } else {
        console.log('now checking in ', normalizeDomain);
    		return nightmare
          .goto(normalizeDomain)
        	.wait(selectorStr)
          .evaluate((selector) => {
            return document.querySelector(selector).outerHTML;
          }, selectorStr)
          .then((el) => {
            let $ = cheerio.load(el);

            $.prototype.exists = function (selector) {
              return this.find(selector).length > 0;
            }
            return $;
          })
          .catch(error => {
            console.log('Do I have error.details below ====>\n', error.details);
            console.log(`Execution failed on beginNightmare fn for ${normalizeDomain}\n Error stat:`, error);
            if (error.details == 'Navigation timed out after 30000 ms') {
              console.log('I got error details, seeeeee =>', error.details);
              return undefined;
            }
            if (error.details == 'ERR_NAME_NOT_RESOLVED') {
              console.log('Probably did not get the html at all');
              return undefined;
            }
            if (error.details == 'ERR_INTERNET_DISCONNECTED') {
              let time = new Date();
              console.log('Time internet disconnected', time.toISOString());
            }
            return undefined;
          })
      }
    }
    console.log('BLACKLISTED:', domain);
    return nightmare;
  };

module.exports = beginNightmare;
