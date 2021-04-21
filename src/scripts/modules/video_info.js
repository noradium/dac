/**
 * インスタンス化した時点のページの情報を収集・保持するクラス
 */
export default class VideoInfo {
  /**
   * チャンネルの動画の場合はチャンネルID
   * @type {string|null}
   */
  _channelId;
  /**
   * 動画のタイトル
   * @type {string}
   */
  _title;
  /**
   * @type {number}
   */
  _duration;

  constructor() {
    // この辺りのデータは`#js-initial-watch-data`から取れると良かったのですが、これだと説明文などから動画を移動したときに正しい値にならない。
    const channelLink = document.querySelector('.ChannelInfo-pageLink');
    this._channelId = channelLink ? channelLink.getAttribute('href').match(/^https?:\/\/ch\.nicovideo\.jp\/(ch[0-9]+)/)[1] : null;
    this._title = document.querySelector('.VideoTitle').innerText;
  }

  get channelId() {
    return this._channelId;
  }

  get isChannel() {
    return !!this._channelId;
  }

  get title() {
    return this._title;
  }

  /**
   * duration は最初 0:00 の状態なので遅延させる。利用時はタイミングによっては0になるかも。注意
   */
  get duration() {
    if (typeof this._duration === 'undefined') {
      this._duration = document.querySelector('.PlayerPlayTime-duration').innerText.split(':').reduce((prev, current, index, source) => {
        return prev + current * Math.pow(60, source.length - 1 - index);
      }, 0);
    }
    return this._duration;
  }

  toJSON() {
    const json = {};
    Object.getOwnPropertyNames(this).forEach((key) => {
      if (key.indexOf('_') === 0) {
        json[key.slice(1)] = this[key];
      }
    });
    return json;
  }
}
