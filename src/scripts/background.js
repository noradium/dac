
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
      SearchAPI.fetch(request.word, request.limit)
        .then(json => {
          sendResponse({result: json});
        })
        .catch(error => {
          sendResponse({error});
        });
      return true;
  }
});

// pageAction の表示切り替え
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url.indexOf("www.nicovideo.jp/watch") !== -1) {
    chrome.pageAction.show(tabId);
  }
});
