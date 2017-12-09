export default class IgnorePairsStorage {
  static DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY = 'danime-another-comment-ignore-thread-ids';

  static includes(threadId, anotherThreadId) {
    return this._getThreadIdPairs().includes(this._generatePairString(threadId, anotherThreadId));
  }

  static add(threadId, anotherThreadId) {
    const threadIdPairs = this._getThreadIdPairs();
    threadIdPairs.push(this._generatePairString(threadId, anotherThreadId));
    this._setThreadIdPairs(threadIdPairs);
  }

  /**
   * @param threadId
   * @param anotherThreadId
   * @return {string}
   * @private
   */
  static _generatePairString(threadId, anotherThreadId) {
    return `${threadId}:${anotherThreadId}`;
  }

  /**
   * ignorePair の配列を localStorage から取得して返します
   * @return {string[]}
   * @private
   */
  static _getThreadIdPairs() {
    const threadIdPairs = window.localStorage.getItem(this.DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY);
    return threadIdPairs ? threadIdPairs.split(',') : [];
  }

  /**
   * ignorePairs を localStorage に保存します
   * @param threadIdPairs
   * @private
   */
  static _setThreadIdPairs(threadIdPairs) {
    window.localStorage.setItem(this.DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY, threadIdPairs.join(','));
  }
}
