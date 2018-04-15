export default class IgnoreIdsStorage {
  static DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY = 'danime-another-comment-ignore-ids';

  static includes(threadId) {
    return this._getThreadIds().includes(threadId);
  }

  static add(threadId) {
    const threadIds = this._getThreadIds();
    threadIds.push(threadId);
    this._setThreadIds(threadIds);
  }

  static remove(threadId) {
    const threadIds = this._getThreadIds();
    this._setThreadIds(threadIds.filter((id) => id !== threadId));
  }

  static removeAll() {
    window.localStorage.removeItem(this.DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY);
  }

  /**
   * ignorePair の配列を localStorage から取得して返します
   * @return {string[]}
   * @private
   */
  static _getThreadIds() {
    const threadIds = window.localStorage.getItem(this.DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY);
    try {
      return threadIds ? JSON.parse(threadIds) : [];
    } catch (e) {
      console.error('ignore-ids のパースに失敗', e, threadIds);
    }
    return [];
  }

  /**
   * ignoreIds を localStorage に保存します
   * @param threadIds
   * @private
   */
  static _setThreadIds(threadIds) {
    window.localStorage.setItem(this.DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY, JSON.stringify(threadIds));
  }
}
