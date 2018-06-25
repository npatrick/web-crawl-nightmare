const Nightmare = require('nightmare');
const rp = require('request-promise');
const cheerio = require('cheerio');
const { blackList } = require('../../misc/resource');
const PendingInsta = require('../../db/pendingInstaSchema')

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
  // show: true,
  // gotoTimeout => def:30s, 
  // only used if the DOM itself has not yet loaded
  gotoTimeout: 10000,
  // waitTimeout => def:30s, throws an exception if .wait()
  // didnt return true within the set timeframe
  waitTimeout: 10000,
  // executionTimeout => def:30s, max time to wait for an
  // .evaluate() statement to complete
  executionTimeout: 10000,
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
    let proxyOnAir;

    blackList.forEach((url) => {
      let tempNorm;
      domain.includes('https://www') ? tempNorm = domain : tempNorm = `https://www.${domain}`;
      if (tempNorm.toLowerCase().includes(url)) {
        // check usernames that also contain some words in blacklist
        let tempUrl = `https://www.${url}`;
        if (tempNorm === tempUrl) {
          siteBlacklisted = true;
        }
      }
    })
    if (!siteBlacklisted) {
    	if (!domain.includes('http')) {
    		normalizeDomain = `http://${domain}`;
    	} else {
    		normalizeDomain = domain;
    	}
      let domainPartsArr = normalizeDomain.split('/');
      console.log('Check on nightmare:', domainPartsArr);
      // only run line below when we need proxy to
      // check for /username existence on popular social media
      if (useProxy) {
        if (domainPartsArr[3].length < 1) {
          console.log('wrong insta user path');
          return nightmare;
        }   
      }

      if (useProxy !== false) {
        return await rp('http://localhost:8080/fetch-proxy') // rotating self-made proxy
          .then((currentProxy) => {
            console.log('fetch-proxy response:', currentProxy);
            proxyOnAir = currentProxy;
            return nightmare
              .proxy(proxyOnAir)
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
                console.log('Do I have error.details below ====>', error.details);
                console.log(`Execution failed on beginNightmare fn for ${normalizeDomain}\n Error stat:`, error);
                // case for proxy was a dud
                if (error.details === 'ERR_PROXY_CONNECTION_FAILED') {
                  console.log('Proxy is dud, trying another proxy & adding pending insta...');
                  PendingInsta.create({ instaUrl: domain });
                  nightmare.refresh();
                }
                if (error.details === 'ERR_CONNECTION_RESET') {
                  PendingInsta.create({ instaUrl: domain });
                  nightmare.refresh();
                }
                if (error.details === 'ERR_TUNNEL_CONNECTION_FAILED') {
                  console.log('Proxy error, will likely remain to be error. Closing Nightmare now...');
                  console.log('Insta url error for:', domain);
                  console.log('Err on proxy:', proxyOnAir);
                  return nightmare.end();
                }
                if (error.details == 'Navigation timed out after 10000 ms') {
                  console.log('I got error details, seeeeee =>', error.details);
                  nightmare.refresh();
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
            // case for proxy was a dud
            if (error.details === 'ERR_PROXY_CONNECTION_FAILED') {
              console.log('Proxy is dud, will add it to pending insta list...');
              PendingInsta.create({ instaUrl: domain });
              nightmare.refresh();
            }
            if (error.details === 'ERR_CONNECTION_RESET') {
              PendingInsta.create({ instaUrl: domain });
              nightmare.refresh();
            }
            if (error.details === 'ERR_TUNNEL_CONNECTION_FAILED') {
              console.log('Proxy error, will likely remain to be error. Closing Nightmare now')
              console.log('Insta url error for:', domain);
              console.log('Err on proxy:', proxyOnAir);
              return nightmare.end();
            }
            if (error.details == 'Navigation timed out after 10000 ms') {
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
