
// watch_dll.js を改変したあとに watch_app.js をロードするためもとのリクエストは止める
import SearchAPI from './modules/search_api';

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (/watch_app_.*\.js/.test(details.url)) {
      return {cancel: details.url.indexOf('by-danime-another-comment') === -1};
    }
  },
  {urls: ['<all_urls>']},
  ['blocking']
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.command) {
    case 'search':
      console.info('search start', request);
      SearchAPI.fetch(request.word, request.limit)
        .then(json => {
          console.info('search success', json);
          sendResponse({result: json});
        })
        .catch(error => {
          sendResponse({error});
        });
      return true;
    case 'watchdata':
      fetch(`https://www.nicovideo.jp/watch/${request.contentId}`)
            .then(res => res.text())
            .then(html => {
              const matchArr = html.match(/id="js-initial-watch-data" data-api-data="([^"]+)"/);
              if (!matchArr) {
                throw new Error('watch')
              }
              return matchArr[1];
            }).then(htjson => {
                const patterns = {
                    '&lt;'   : '<',
                    '&gt;'   : '>',
                    '&amp;'  : '&',
                    '&quot;' : '"',
                    '&#x27;' : '\'',
                    '&#x60;' : '`'
                };
                const json = JSON.parse(htjson.replace(/&(lt|gt|amp|quot|#x27|#x60);/g, function(match) {
                    return patterns[match];
                }))
                console.log(json)
                return json
            }).then(json => {
              sendResponse({result: json});
            }).catch(error => {
              sendResponse({error});
            });
      return true
  }
});

// pageAction の表示切り替え
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url.indexOf("www.nicovideo.jp/watch") !== -1) {
    chrome.pageAction.show(tabId);
  }
});
