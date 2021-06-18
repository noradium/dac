
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
      fetch(`https://www.nicovideo.jp/api/watch/v3_guest/${request.contentId}?additionals=pcWatchPage%2Cseries&prevIntegratedLoudness=0&actionTrackId=1g9hKPLpnU_1624006272&skips=&danime-another-comment`, {
        credentials: 'omit',
        headers: {
          'x-client-os-type': 'android',
          'x-frontend-id': '3',
          'x-frontend-version': '0.1.0'
        },      
      })
            .then(res => res.json())
            .then(json => {
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
