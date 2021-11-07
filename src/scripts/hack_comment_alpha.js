import CommentAlphaStorage from "./modules/storage/comment_alpha_storage";

let addThreadProcessorsEventListenerHacked = false;

let chunkwatchPush = window['webpackChunkwatch'].push;
window['webpackChunkwatch'].push = function (item) {
  hackLibrary(item[1]);
  chunkwatchPush.call(this, ...arguments);
}

function hackLibrary(libraryFunctions) {
  if (!addThreadProcessorsEventListenerHacked) {
    addThreadProcessorsEventListenerHacked = hackAddThreadProcessorsEventListener(libraryFunctions);
  }
}

function hackAddThreadProcessorsEventListener(libraryFunctions) {
  ///////////////////////
  // _addThreadProcessorsEventListener を書き換える

  const addThreadProcessorsEventListenerFunctionIndex = Object.keys(libraryFunctions).find((index) => {
    const item = libraryFunctions[index];

    return (
      item &&
      !!item.toString().match(/_addThreadProcessorsEventListener\(\w\)\s?\{/)
    );
  });
  if (typeof addThreadProcessorsEventListenerFunctionIndex === 'undefined') {
    return false;
  }

  const commentAlpha = CommentAlphaStorage.get();

  const libraryFunction = libraryFunctions[addThreadProcessorsEventListenerFunctionIndex];
  libraryFunctions[addThreadProcessorsEventListenerFunctionIndex] = function (t, e, n) {
    libraryFunction(t, e, n);
    const originalAddThreadProcessorsEventListener = t.exports.default.prototype._addThreadProcessorsEventListener;
    t.exports.default.prototype._addThreadProcessorsEventListener = function (threads) {
      // 元処理
      originalAddThreadProcessorsEventListener.call(this, ...arguments);
      // コメント描画が半透明に指定されている thread に対して、
      // commentAlpha をアルファ値（透明度）として利用するよう変更する
      for (const t of threads) {
        if (t.layer.isTranslucent) {
          const e = this.renderer.getLayerEffectControl(t.processor);
          e.alpha = commentAlpha;
        }
      }
    };
  };

  return true;
}
