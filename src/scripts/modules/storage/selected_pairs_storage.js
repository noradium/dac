export default class SelectedPairsStorage {
  static DANIME_ANOTHER_COMMENT_SELECTED_PAIRS_KEY = 'danime-another-comment-selected-pairs';

  static get(threadId) {
    return this._getSelectedIdPairs()[threadId];
  }

  static add(threadId, anotherThreadId, title) {
    const pairs = this._getSelectedIdPairs();
    pairs[threadId] = {
      threadId: anotherThreadId,
      title: title
    };
    this._setSelectedIdPairs(pairs);
  }

  static remove(threadId) {
    const pairs = this._getSelectedIdPairs();
    delete pairs[threadId];
    this._setSelectedIdPairs(pairs);
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
