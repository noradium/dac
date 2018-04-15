export default class SelectedPairsStorage {
  static DANIME_ANOTHER_COMMENT_SELECTED_PAIRS_KEY = 'danime-another-comment-selected-pairs';
  static VERSION = '1';

  static migration() {
    if (window.localStorage.getItem(this.DANIME_ANOTHER_COMMENT_SELECTED_PAIRS_KEY + '-version') === this.VERSION) {
      return;
    }
    window.localStorage.setItem(this.DANIME_ANOTHER_COMMENT_SELECTED_PAIRS_KEY + '-version', this.VERSION);

    // 今回チャンネルIDなどを増やすがそれらを取得する準備ができてないので消しちゃう
    this._setSelectedIdPairs({});
  }

  static get(threadId) {
    return this._getSelectedIdPairs()[threadId];
  }

  static add(threadId, video) {
    const pairs = this._getSelectedIdPairs();
    pairs[threadId] = video;
    this._setSelectedIdPairs(pairs);
  }

  static remove(threadId) {
    const pairs = this._getSelectedIdPairs();
    delete pairs[threadId];
    this._setSelectedIdPairs(pairs);
  }

  static removeAll() {
    window.localStorage.removeItem(this.DANIME_ANOTHER_COMMENT_SELECTED_PAIRS_KEY);
  }

  /**
   * selectedIdPairs の配列を localStorage から取得して返します
   * @return {object}
   * @private
   */
  static _getSelectedIdPairs() {
    const pairs = window.localStorage.getItem(this.DANIME_ANOTHER_COMMENT_SELECTED_PAIRS_KEY);
    try {
      return pairs ? JSON.parse(pairs) : {};
    } catch (e) {
      console.error('selected-id-pairs のパースに失敗', e, pairs);
    }
    return {};
  }

  /**
   * ignorePairs を localStorage に保存します
   * @param pairs
   * @private
   */
  static _setSelectedIdPairs(pairs) {
    window.localStorage.setItem(this.DANIME_ANOTHER_COMMENT_SELECTED_PAIRS_KEY, JSON.stringify(pairs));
  }
}
