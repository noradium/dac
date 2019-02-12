import Dexie from 'dexie';

export default class CommentOffsetStorage {
  /**
   * @private
   */
  static _db;

  static get(threadId, anotherThreadId) {
    return this._getDB().offsets.get({threadId, anotherThreadId});
  }

  static add(threadId, anotherThreadId, offset) {
    return this._getDB().offsets.get({threadId, anotherThreadId})
      .then(item => {
        if (!item) {
          return this._getDB().offsets.add({threadId, anotherThreadId, offset});
        }
        return this._getDB().offsets
          .where('[threadId+anotherThreadId]')
          .equals([threadId, anotherThreadId])
          .modify({threadId, anotherThreadId, offset});
      });
  }

  static removeAll() {
    return this._getDB().offsets.clear();
  }

  /**
   * @return {Dexie}
   * @private
   */
  static _getDB() {
    if (!this._db) {
      this._db = new Dexie('DACCommentOffset');
      this._db.version(1).stores({ offsets: "[threadId+anotherThreadId],offset" });
    }
    return this._db;
  }
}
