// watch_dll.js を改変したあとに watch_app.js をロードするためもとのリクエストは止める
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.indexOf('http://nicovideo.cdn.nimg.jp/web/scripts/pages/watch/watch_app.js') >= 0) {
      return {cancel: details.url.indexOf('by-danime-another-comment') === -1};
    }
  },
  {urls: ['<all_urls>']},
  ['blocking']
);

// コンテンツ検索APIが Access-Control-Allow-Origin ヘッダを返してこないのでつける
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.url.indexOf('http://api.search.nicovideo.jp/api/v2/video/contents/search') !== -1) {
      const additionalHeader = {
        name: "Access-Control-Allow-Origin",
        value: "http://www.nicovideo.jp"
      };
      details.responseHeaders.push(additionalHeader);
      return {responseHeaders: details.responseHeaders};
    }
  },
  {urls: ['<all_urls>']},
  ["blocking", "responseHeaders"]
);
