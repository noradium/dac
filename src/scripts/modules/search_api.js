/**
 * ニコニコ動画の検索API
 * @see http://site.nicovideo.jp/search-api-docs/search.html
 */
export default class SearchAPI {
  static fetch(word, limit = 10) {
    return window.fetch(`https://api.search.nicovideo.jp/api/v2/snapshot/video/contents/search?q=${encodeURIComponent(word)}&targets=title&_sort=-commentCounter&fields=title,contentId,lengthSeconds,thumbnailUrl,commentCounter&_limit=${limit}&_context=danime-another-comment`)
      .catch((error) => {
        console.error(error)
        return Promise.reject('search_error');
      })
      .then((response) => response.json());
  }
}
