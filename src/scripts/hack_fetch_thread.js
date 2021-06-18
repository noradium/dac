import VideoInfo from './modules/video_info';
import FetchThreadArguments from "./modules/fetch_thread_arguments";
import SearchAPI from "./modules/search_api";
import buildSearchWord from "./modules/build_search_word";
import IgnoreIdsStorage from "./modules/storage/ignore_ids_storage";
import Dialog from "./modules/dialog";
import SelectedPairsStorage from "./modules/storage/selected_pairs_storage";
import CommentAlphaStorage from "./modules/storage/comment_alpha_storage";
import {GlobalVars} from './modules/global_vars';
import CommentOffsetStorage from './modules/storage/comment_offset_storage';

let fetchThreadHacked = false;
let renderCanvasHacked = false;

try {
  init();
} catch (error) {
  console.error('Failed to initialize danime-another-comment', error);
}

function init() {
  for (let i = 0; i < window['webpackChunkwatch'].length; ++i) {
    const libraryFunctions = window['webpackChunkwatch'][i][1];
    hackLibrary(libraryFunctions);
  }
  console.info('danime-another-comment successfully initialized.');
}
let chunkwatchPush = window['webpackChunkwatch'].push;
window['webpackChunkwatch'].push = function (item) {
  hackLibrary(item[1]);
  chunkwatchPush.call(this, ...arguments);
}

function hackLibrary(libraryFunctions) {
  if (!fetchThreadHacked) {
    fetchThreadHacked = hackFetchThread(libraryFunctions);
  }
  if (!renderCanvasHacked) {
    renderCanvasHacked = hackRenderCanvas(libraryFunctions);
  }
}

function hackFetchThread(libraryFunctions) {
  /////////////////////////
  // fetchThread を書き換える
  const commentClientFunctionIndex = Object.keys(libraryFunctions).find((index) => {
    const item = libraryFunctions[index];
    // fetchThread の定義があったらきっとそれがコメント取得するライブラリ
    return item && !!item.toString().match(/\.fetchThread\s?=\s?function/);
  });

  if (typeof commentClientFunctionIndex === 'undefined') {
    return false;
  }

  // 同じ動画のときは、別動画のコメントは２回以上取得しなくてもよいので記憶しておく
  // すでに別動画のコメントを取得した元動画のThreadId
  let alreadyFetchedOriginalThreadId = null;

  const originalCommentClientFunction = libraryFunctions[commentClientFunctionIndex];
  libraryFunctions[commentClientFunctionIndex] = function (e, t, n) {
    originalCommentClientFunction(e, t, n);
    const fetchThreadBlockPropertyName = Object.getOwnPropertyNames(e.exports).find((propertyName) => {
      return e.exports[propertyName].prototype && typeof e.exports[propertyName].prototype.fetchThread === 'function';
    });

    const originalFetchThread = e.exports[fetchThreadBlockPropertyName].prototype.fetchThread;
    e.exports[fetchThreadBlockPropertyName].prototype.fetchThread = function () {
      const fetchThreadArguments = new FetchThreadArguments(arguments);

      // 今見ている動画の so なしIDをdocument経由でとる良い方法がわからないのでsessionStorageにさすクソみたいな方法で用意する。
      GlobalVars.currentDefaultThreadId = fetchThreadArguments.defaultThreadId;

      const videoInfo = new VideoInfo();

      console.log(fetchThreadArguments.raw);
      // dアニじゃないタイトルが似た動画のthreadId
      let anotherThreadId = null;
      let anotherTitle = null;

      if (document.querySelector('.EditorMenuContainer')) {
        console.info('投稿者編集が利用できる環境のため処理しません');
        alreadyFetchedOriginalThreadId = null;
        return originalFetchThread.call(this, ...fetchThreadArguments.raw);
      }
      // dアニメストア ニコニコ支店 以外は処理しません
      if (!videoInfo.isChannel || videoInfo.channelId !== 'ch2632720') {
        console.info('対象外の動画なので処理しません');
        alreadyFetchedOriginalThreadId = null;
        return originalFetchThread.call(this, ...fetchThreadArguments.raw);
      }
      if (fetchThreadArguments.isOfficialAnotherThreadExist()) {
        console.info('公式の引用コメントが存在するので処理しません');
        alreadyFetchedOriginalThreadId = null;
        return originalFetchThread.call(this, ...fetchThreadArguments.raw);
      }
      // whenSec(過去ログのとき値が入っている)が指定されておらず、すでに取得済みだったら新しく取得しない
      if (!fetchThreadArguments.get(0).thread._whenSec && alreadyFetchedOriginalThreadId === fetchThreadArguments.defaultThreadId) {
        console.info('この動画ではすでに取得済みなので取得しません');
        return originalFetchThread.call(this, ...fetchThreadArguments.raw);
      }

      console.info(`dアニメストア ニコニコ支店の動画なので処理を開始します(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
      alreadyFetchedOriginalThreadId = fetchThreadArguments.defaultThreadId;
      GlobalVars.selectedAnotherVideo = null;

      return fetchAnotherVideo(fetchThreadArguments.defaultThreadId, videoInfo)
        .then(async (data) => {
          const videojson = await fetchAnotherVideoWatchData(data.video.contentId)
          const anotherThread = videojson.data.comment.threads.find(thread => thread.label === 'community')
          anotherThreadId = anotherThread.id
          data.video.threadId = anotherThreadId
          data.video.channelId = videojson.data.channel.id
          data.video.threadkey = anotherThread.threadkey
          GlobalVars.selectedAnotherVideo = data.video;
          // anotherThreadId = data.video.threadId;
          anotherTitle = data.video.title;

          fetchThreadArguments.append(this.createThread({
            id: anotherThreadId,
            threadkey: anotherThread.threadkey,
            isPrivate: !!data.video.channelId, // チャンネル動画のときは true, チャンネルじゃないときは false で取得されてる。
            leafExpression: fetchThreadArguments.get(0).thread.leafExpression, // わからんので他のと同じのを渡しておく
            language: 0,
            whenSec: fetchThreadArguments.get(0).thread.whenSec ? fetchThreadArguments.get(0).thread.whenSec : void 0
          }));
          return Promise.all([
            originalFetchThread.call(this, ...fetchThreadArguments.raw),
            CommentOffsetStorage.get(fetchThreadArguments.defaultThreadId, anotherThreadId)
          ]);
        })
        .then(([threads, offset]) => {
          const regularThreadIndex = threads.findIndex((thread) => {
            return thread.id === fetchThreadArguments.regularThreadId && !thread.isPrivate;
          });
          const anotherThreadIndex = threads.findIndex((thread) => {
            return thread.id === anotherThreadId;
          });

          // anotherThread で取得した内容を元の動画の通常コメントを表す thread に詰め直す。ちょっと壊れそうだけど動いた
          let newIndex = 0;
          threads[anotherThreadIndex]._chatMap.forEach((value, key) => {
            while (threads[regularThreadIndex]._chatMap.has(newIndex)) {
              ++newIndex;
            }
            // thread を偽装しないとコメント一覧の方に表示されなかった
            value.thread = fetchThreadArguments.regularThreadId;

            if (offset) {
              // vpos がコメント位置。単位はセンチ秒
              value.vpos += offset.offset * 100;
            }

            threads[regularThreadIndex]._chatMap.set(newIndex, value);
            ++newIndex;
          });
          showIgnoreDialog(fetchThreadArguments.defaultThreadId, anotherTitle);

          return threads;
        }).catch(error => {
          switch (error) {
            case 'notfound':
              console.error(`別の動画が見つかりませんでした。(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
              showNoCommentDialog('似たタイトルの動画が見つかりませんでした');
              return originalFetchThread.call(this, ...fetchThreadArguments.raw);
            case 'search_error':
              console.error(`検索に失敗しました。(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
              return originalFetchThread.call(this, ...fetchThreadArguments.raw);
            case 'included_in_ignore_list':
              console.error(`非表示リストに含まれているため何もしませんでした。(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
              showNoCommentDialog('この動画はコメント非表示リストに含まれています');
              return originalFetchThread.call(this, ...fetchThreadArguments.raw);
            default:
              console.error(error);
              return originalFetchThread.call(this, ...fetchThreadArguments.raw);
          }
        });
    };
  };

  function fetchAnotherVideo(threadId, videoInfo) {
    const selectedAnotherVideo = SelectedPairsStorage.get(threadId);
    if (selectedAnotherVideo) {
      console.info(`指定された動画があったのでそれを採用しました(${selectedAnotherVideo.threadId}:${selectedAnotherVideo.title})`);
      return Promise.resolve({
        video: selectedAnotherVideo
      });
    }

    return fetchWithContentScript(buildSearchWord(videoInfo.title), 10)
      .then((json) => {
        if (!json.data) {
          return Promise.reject('search_error');
        }

        // 動画の長さとして元動画の前後 20% を許容（25分の動画の場合20分から30分までOK）
        const allowedMinLength = videoInfo.duration * 0.8;
        const allowedMaxLength = videoInfo.duration * 1.2;
        const maybeAnotherVideo = json.data.find((video) => {
          return (
            (allowedMinLength <= video.lengthSeconds && video.lengthSeconds <= allowedMaxLength)
          );
        });
        if (!maybeAnotherVideo) {
          return Promise.reject('notfound');
        }
        if (IgnoreIdsStorage.includes(threadId)) {
          return Promise.reject('included_in_ignore_list');
        }

        console.info(`別の動画が見つかりました(${maybeAnotherVideo.contentId}:${maybeAnotherVideo.title})`);
        return {
          video: maybeAnotherVideo
        };
      });
  }

  // content_script を経由して background で検索APIを叩き結果を返す
  // windows で CORB に引っかかるようになったのでそれを回避するため
  function fetchWithContentScript(word, limit) {
    return new Promise((resolve, reject) => {
      function onWindowMessage(event) {
        if (event.origin !== location.origin) {
          return;
        }
        if (typeof event.data.type !== 'string' || event.data.type !== 'danime-another-comment:background-search-result') {
          return;
        }
        window.removeEventListener('message', onWindowMessage);
        if (event.data.response.error) {
          reject(event.data.response.error);
        }
        resolve(event.data.response.result);
      }

      window.addEventListener('message', onWindowMessage);
      // content_script(index.js)に向けたメッセージ
      window.postMessage({type: 'danime-another-comment:background-search', word, limit}, location.origin);

      setTimeout(() => {
        window.removeEventListener('message', onWindowMessage);
        reject('background-search timeout');
      }, 5000);
    });
  }

  function fetchAnotherVideoWatchData(contentId) {
    return new Promise((resolve, reject) => {
      function onWindowMessage(event) {
        if (event.origin !== location.origin) {
          return;
        }
        if (typeof event.data.type !== 'string' || event.data.type !== 'danime-another-comment:background-watchdata-result') {
          return;
        }
        window.removeEventListener('message', onWindowMessage);
        if (event.data.response.error) {
          reject(event.data.response.error);
        }
        resolve(event.data.response.result);
      }

      window.addEventListener('message', onWindowMessage);
      // content_script(index.js)に向けたメッセージ
      window.postMessage({type: 'danime-another-comment:background-watchdata', contentId}, location.origin);

      setTimeout(() => {
        window.removeEventListener('message', onWindowMessage);
        reject('background-search timeout');
      }, 5000);
    });
  }

  const dialog = new Dialog(document.body);

  function showIgnoreDialog(threadId, title) {
    dialog.show(
      `「<span style="font-weight: bold;">${title}</span>」のコメントも表示しています<br/>>この動画では別動画のコメントを表示しない`,
      '#ea5632',
      () => {
        if (!IgnoreIdsStorage.includes(threadId)) {
          IgnoreIdsStorage.add(threadId);
        }
        SelectedPairsStorage.remove(threadId);
        location.reload();
      }
    );
  }

  function showNoCommentDialog(message) {
    dialog.show(
      `<span style="font-weight: bold;">${message}</span><br/>ブラウザ右上のアイコンから流すコメントの動画を選択できます`,
      '#ea5632'
    );
  }

  return true;
}


function hackRenderCanvas(libraryFunctions) {
  ///////////////////////
  // _renderCanvas を書き換える

  const renderCanvasFunctionIndex = Object.keys(libraryFunctions).find((index) => {
    const item = libraryFunctions[index];
    // _renderCanvas の定義とか globalAlpha の設定箇所があったらそれが、コメントをcanvasレンダリングするライブラリ
    return (
      item &&
      !!item.toString().match(/\.prototype\._renderCanvas\s?=\s?function/) &&
      !!item.toString().match(/\.context\.globalAlpha\s?=\s?this\.worldAlpha/) &&
      !!item.toString().match(/texture\.crop\.width/)
    );
  });
  if (typeof renderCanvasFunctionIndex === 'undefined') {
    return false;
  }

  const commentAlpha = CommentAlphaStorage.get();
  
  const libraryFunction = libraryFunctions[renderCanvasFunctionIndex];
  libraryFunctions[renderCanvasFunctionIndex] = function (t, e, n) {
    libraryFunction(t, e, n);
    const originalRenderCanvas = t.exports.prototype._renderCanvas;
    t.exports.prototype._renderCanvas = function (t) {
      // この時点で this.worldAlpha に指定されているアルファ値でコメントがレンダリングされる
      // dアニメの動画を見た時、
      // dアニメ側のコメントを表示しているチャンネルコメントは this.worldAlpha === 1
      // 別動画のコメントを表示している通常コメントは this.worldAlpha === 0.5
      if (this.worldAlpha === 0.5) {
        this.worldAlpha = commentAlpha;
      }
      originalRenderCanvas.call(this, ...arguments);
    };
  };

  return true;
}