/**
 * ニコニコ動画の検索API
 * @see http://site.nicovideo.jp/search-api-docs/search.html
 */
export default class SearchAPI {
  static fetch(word, limit = 10) {
    return window.fetch(`https://api.search.nicovideo.jp/api/v2/video/contents/search?q=${encodeURIComponent(word)}&targets=title&_sort=-commentCounter&fields=title,threadId,channelId,lengthSeconds,thumbnailUrl,commentCounter&_limit=${limit}&_context=danime-another-comment`)
      .catch((error) => {
        return Promise.reject('search_error');
      })
      .then((response) => {
        return response.json();
      });
  }
}
