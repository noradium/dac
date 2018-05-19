export default class FetchThreadArguments {
  _arguments;

  constructor(args) {
    this._arguments = args;
  }

  get raw() {
    return this._arguments;
  }

  /**
   * コメント一覧で切り替え可能な「通常コメント」。チャンネル限定動画では使われないと思うので、ここに別動画のコメントを突っ込むことにする。
   * @return {string|null}
   */
  get regularThreadId() {
    for (let i = 0; i < this._arguments.length; ++i) {
      if (!this._arguments[i].thread.isPrivate) {
        return this._arguments[i].thread.id;
      }
    }
    return null;
  }

  /**
   * dアニの動画が表示された時に見えるチャンネルコメントのスレッド。isPrivate が true。
   * @return {string|null}
   */
  get defaultThreadId() {
    for (let i = 0; i < this._arguments.length; ++i) {
      if (this._arguments[i].thread.isPrivate) {
        return this._arguments[i].thread.id;
      }
    }
    return null;
  }

  get(index) {
    return this._arguments[index];
  }

  append(thread) {
    this._arguments[this._arguments.length] = {
      thread: thread,
      scores: 1
    };
    this._arguments.length += 1;
  }

  isOfficialAnotherThreadExist() {
    const ids = [];
    for (let i = 0; i < this._arguments.length; ++i) {
      const id = this._arguments[i].thread.id;
      if (!ids.includes(id)) {
        ids.push(id);
      }
    }
    // 公式の引用コメントが存在しない時は2種類のidがあり、存在する場合idは3種類
    return ids.length > 2;
  }
}
