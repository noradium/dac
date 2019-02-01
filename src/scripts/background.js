// watch_dll.js を改変したあとに watch_app.js をロードするためもとのリクエストは止める
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (/watch_app_.*\.js/.test(details.url)) {
      return {cancel: details.url.indexOf('by-danime-another-comment') === -1};
    }
  },
  {urls: ['<all_urls>']},
  ['blocking']
);

// コンテンツ検索APIが Access-Control-Allow-Origin ヘッダを返してこないのでつける
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.url.indexOf('//api.search.nicovideo.jp/api/v2/video/contents/search') !== -1) {
      details.responseHeaders.push({
        name: "Access-Control-Allow-Origin",
        value: '*'
      });
      details.responseHeaders.push({
        name: 'Content-Type',
        value: 'application/json; charset=utf-8'
      });
      return {responseHeaders: details.responseHeaders};
    }
  },
  {urls: ['<all_urls>']},
  ["blocking", "responseHeaders"]
);

// pageAction の表示切り替え
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url.indexOf("www.nicovideo.jp/watch") !== -1) {
    chrome.pageAction.show(tabId);
  }
});
