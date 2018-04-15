export default class CommentAlphaStorage {
  static DANIME_ANOTHER_COMMENT_COMMENT_ALPHA_KEY = 'danime-another-comment-comment-alpha';

  /**
   * alpha を localStorage から取得して返します
   * @return {number}
   */
  static get() {
    const value = parseFloat(window.localStorage.getItem(this.DANIME_ANOTHER_COMMENT_COMMENT_ALPHA_KEY));
    return value ? value : 0.5;
  }

  /**
   * alpha を localStorage に保存します
   * @param {number} alpha
   */
  static set(alpha) {
    window.localStorage.setItem(this.DANIME_ANOTHER_COMMENT_COMMENT_ALPHA_KEY, alpha);
  }

  static remove() {
    window.localStorage.removeItem(this.DANIME_ANOTHER_COMMENT_COMMENT_ALPHA_KEY);
  }
}
