const path = require('path');
const fs = require('fs');
// const {URL} = require('url');
const murmur = require('murmurhash-js');
const cheerio = require('cheerio');
// const fetch = require('cross-fetch');
const mkdirp = require('mkdirp');

const getArgUrl = () => {
  switch (process.argv[2]) {
    case 'settings': return `https://tvtropes.org/pmwiki/pmwiki.php/Main/Settings`;
    case 'characters': return `https://tvtropes.org/pmwiki/pmwiki.php/Main/Characters`;
    case 'plotdevices': return `https://tvtropes.org/pmwiki/pmwiki.php/Main/PlotDevice`;
    default: throw new Error('invalid argument');
  }
};
const u = getArgUrl();
const getArgDataDirectory = () => {
  if ([`settings`, `characters`, `plotdevices`].includes(process.argv[2])) {
    return process.argv[2];
  } else {
    throw new Error('invalid argument');
  }
};
const dataDirectory = getArgDataDirectory();
const extraDataDirectories = [
  `settings`,
  `characters`,
  `plotdevices`,
  // `settings2`,
  // `characters2`,
  // `plotdevices2`,
];
const getFormattedDataDirectory = () => {
  if ([`settings`, `characters`, `plotdevices`].includes(process.argv[2])) {
    return `formatted-${process.argv[2]}`;
  } else {
    throw new Error('invalid argument');
  }
};
const formattedDataDirectory = getFormattedDataDirectory();
const maxDepth = 4;

// const mainRegex = /^\/pmwiki\/pmwiki\.php\/(?:Main|UsefulNotes|Literature|LightNovel|ComicBook|Manga|Fanfic|WesternAnimation|Anime|Series|Film|VideoGame|Characters)/;
const mainRegex = /^\/pmwiki\/pmwiki\.php\/(?:Main|UsefulNotes|Literature|LightNovel|ComicBook|Manga|Fanfic|WesternAnimation|Anime|Series|Film|VideoGame|Characters|Website)/;
const nameRegex = /\/pmwiki\/pmwiki\.php\/(.*)$/;

const _getKey = s => murmur.murmur3(s);
const _getPath = (dataDirectory, key) => path.join(dataDirectory, `${key}.html`);
const getUrlPath = u => _getPath(dataDirectory, _getKey(u));

const pageCache = {
  get(u) {
    const key = _getKey(u);
    const _tryGetKey = (key, dataDirectory) => {
      try {
        const p = _getPath(dataDirectory, key);
        let result = fs.readFileSync(p, 'utf8');
        /* if (result) {
          // check that it's not a 403 page
          const $ = cheerio.load(result);
          const {title} = parse($);
          if (title === '403') {
            console.log('unlink 403 page', u, p);
            fs.unlinkSync(p);
            result = null;
          }
        } */
        return result;
      } catch (err) {
        if (err.code === 'ENOENT') {
          return null;
        } else {
          throw err;
        }
      }
    };
    let result = _tryGetKey(key, dataDirectory);
    if (!result) {
      for (const extraDataDirectory of extraDataDirectories) {
        result = _tryGetKey(key, extraDataDirectory);
        if (result) {
          this.set(u, result);
          break;
        }
      }
    }
    return result;
  },
  set(u, d) {
    const key = _getKey(u);
    fs.writeFileSync(path.join(dataDirectory, `${key}.html`), d);
  },
};
const seenSet = new Set();

const _wait = (t = 0) => new Promise(accept => {
  setTimeout(() => {
    accept();
  }, t);
});

mkdirp.sync(dataDirectory);
const traverse = async (fn, {
  download = false,
} = {}) => {
  const _recurse = async (u, depth = 0) => {
    if (!seenSet.has(u)) {
      seenSet.add(u);

      const text = await (async () => {
        let cachedText = pageCache.get(u);
        if (cachedText !== null) {
          return cachedText;
        } else {
          if (download) {
            console.log(`${u} ${_getPath(dataDirectory, _getKey(u))} (${depth})`);
            const _fetchText = async () => {
              try {
                // if (depth > 0) {
                //   await _wait(100);
                // }
                const res = await fetch(u);
                if (res.ok || res.status === 404) {
                  const text = await res.text();

                  /* const $ = cheerio.load(text);
                  const {title} = parse($);
                  if (title === '403') {
                    console.warn(res);
                  } */

                  if (!text) {
                    throw new Error('fetch blank text', u, res.status, res.statusCode);
                  }

                  pageCache.set(u, text);
                  return text;
                } else {
                  console.log('delaying request due to error:', res.status, res.statusText);
                  await _wait(60 * 1000);
                  console.log('trying again');
                  return await _fetchText();
                };
              } catch(err) {
                // if (/fetch failed/i.test(err.stack)) {
                  // console.log('got redirect error, trying again');
                  // return await _fetchText();
                  console.log('ignoring error', u, err);
                  return '';
                /* } else {
                  throw err;
                } */
              }
            };
            return await _fetchText();
          } else {
            console.log('needed download but download was false', u);
            return '';
          }
        }
      })();

      const $ = cheerio.load(text.replace(/<br\s*\/?>/g, '\n'));
      const urls = getUrls($);
      const shouldContinue = depth < maxDepth;

      fn && fn(u, $);

      if (shouldContinue) {
        for (const u2 of urls) {
          await _recurse(u2, depth + 1);
        }
      }
    }
  };
  await _recurse(u);
};
const parse = $ => {
  $(`#main-article hr ~ *`).remove();
  $('.square_ad').remove();

  const title = $('h1').first().text().trim().replace(/(\s)+/g, '$1');
  const quotes = Array.from($('.indent')).map(el => $(el).text().trim().replace(/(\s)+/g, '$1'));
  const content = $('#main-article').text().trim().replace(/(\s)+/g, '$1');
  
  return {
    title,
    quotes,
    content,
  };
};
const getAnchors = ($, selector) => {
  const els = $(selector);
  const elsArray = Array.from(els);
  const urls = elsArray.map(el => {
    return el.attribs.href;
  })
    .filter(u2 => !!u2)
    .map(u2 => {
      try {
        return new URL(u2, u);
      } catch(err) {
        return new URL('https://example.com/');
      }
    })
    .filter(u2 =>
      u2.origin === `https://tvtropes.org` &&
      mainRegex.test(u2.pathname)
    )
    .map(u2 => u2 + '');
  return urls;
};
const getUrls = $ => getAnchors($, '#main-article a.twikilink');
// const getUrls = $ => getAnchors($, '#main-article h2 ~ div > ul > li > a, #main-article h2 ~ ul > li > a');
const getPageName = u => u.match(nameRegex)?.[1] ?? '';
const isTropePageName = u => /^(?:Main|UsefulNotes)/.test(u);
module.exports = {
  dataDirectory,
  formattedDataDirectory,
  getUrlPath,
  traverse,
  parse,
  getUrls,
  getPageName,
  isTropePageName,
};