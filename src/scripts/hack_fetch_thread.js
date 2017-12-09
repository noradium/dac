import VideoInfo from './modules/video_info';
import FetchThreadArguments from "./modules/fetch_thread_arguments";
import SearchAPI from "./modules/search_api";
import buildSearchWord from "./modules/build_search_word";
import IgnorePairsStorage from "./modules/storage/ignore_pairs_storage";
import IgnoreDialog from "./modules/ignore_dialog";

window.original_watch_dll = window.watch_dll;

// TODO: プロパティ名 m 固定値じゃ多分まずいよなあ
const libraryFunctions = original_watch_dll.m;
const commentClientFunctionIndex = libraryFunctions.findIndex((item) => {
  // fetchThread の定義があったらきっとそれがコメント取得するライブラリ
  return !!item.toString().match(/\.prototype\.fetchThread\s?=\s?function/);
});

// 同じ動画のときは、別動画のコメントは２回以上取得しなくてもよいので記憶しておく
// すでに別動画のコメントを取得した元動画のThreadId
let alreadyFetchedOriginalThreadId = null;

const originalCommentClientFunction = libraryFunctions[commentClientFunctionIndex];
libraryFunctions[commentClientFunctionIndex] = function (t, e, n) {
  originalCommentClientFunction(t, e, n);
  const originalFetchThread = e.default.prototype.fetchThread;
  e.default.prototype.fetchThread = function () {
    const fetchThreadArguments = new FetchThreadArguments(arguments);
    const videoInfo = new VideoInfo();

    // dアニじゃないタイトルが似た動画のthreadId
    let anotherThreadId = null;
    let anotherTitle = null;

    if (document.querySelector('.EditorMenuContainer')) {
      console.info('投稿者編集が利用できる環境のため処理しません');
      return originalFetchThread.call(this, ...fetchThreadArguments.raw);
    }
    // dアニメストア ニコニコ支店 以外は処理しません
    if (!videoInfo.isChannel || videoInfo.channelId !== 'ch2632720') {
      console.info('対象外の動画なので処理しません');
      return originalFetchThread.call(this, ...fetchThreadArguments.raw);
    }
    if (alreadyFetchedOriginalThreadId === fetchThreadArguments.defaultThreadId) {
      console.info('この動画ではすでに取得済みなので取得しません');
      return originalFetchThread.call(this, ...fetchThreadArguments.raw);
    }

    console.info(`dアニメストア ニコニコ支店の動画なので処理を開始します(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
    alreadyFetchedOriginalThreadId = fetchThreadArguments.defaultThreadId;

    return SearchAPI.fetch(buildSearchWord(videoInfo.title))
      .then((json) => {
        if (!json.data) {
          return Promise.reject('search_error');
        }

        // 動画の長さとして元動画の前後 20% を許容（25分の動画の場合20分から30分までOK）
        const allowedMinLength = videoInfo.duration * 0.8;
        const allowedMaxLength = videoInfo.duration * 1.2;
        const maybeAnotherVideo = json.data.find((video) => {
          return (
            `${video.threadId}` !== fetchThreadArguments.defaultThreadId &&
              !!video.channelId &&
              (allowedMinLength <= video.lengthSeconds && video.lengthSeconds <= allowedMaxLength)
          );
        });
        if (!maybeAnotherVideo) {
          return Promise.reject('notfound');
        }
        if (IgnorePairsStorage.includes(fetchThreadArguments.defaultThreadId, maybeAnotherVideo.threadId)) {
          return Promise.reject('included_in_ignore_list');
        }

        console.info(`別の動画が見つかりました(${maybeAnotherVideo.threadId}:${maybeAnotherVideo.title})`);
        anotherThreadId = maybeAnotherVideo.threadId;
        anotherTitle = maybeAnotherVideo.title;
      })
      .then(() => {
        fetchThreadArguments.append(this.createThread({
          id: anotherThreadId,
          isPrivate: true, // isPrivate を true にしないと取得できない。
          leafExpression: fetchThreadArguments.get(0).thread.leafExpression, // わからんので他のと同じのを渡しておく
          language: 0
        }));
        return originalFetchThread.call(this, ...fetchThreadArguments.raw);
      })
      .then((threads) => {
        const regularThreadIndex = threads.findIndex((thread) => {
          return thread.id === fetchThreadArguments.regularThreadId && !thread.isPrivate;
        });
        const anotherThreadIndex = threads.findIndex((thread) => {
          return thread.id === anotherThreadId && thread.isPrivate;
        });

        // anotherThread で取得した内容を元の動画の通常コメントを表す thread に詰め直す。ちょっと壊れそうだけど動いた
        let newIndex = 0;
        threads[anotherThreadIndex]._chatMap.forEach((value, key) => {
          while (threads[regularThreadIndex]._chatMap.has(newIndex)) {
            ++newIndex;
          }
          // thread を偽装しないとコメント一覧の方に表示されなかった
          value.thread = fetchThreadArguments.regularThreadId;

          threads[regularThreadIndex]._chatMap.set(newIndex, value);
          ++newIndex;
        });
        showIgnoreDialog(fetchThreadArguments.defaultThreadId, anotherThreadId, anotherTitle);

        return threads;
      }).catch(error => {
        switch (error) {
          case 'notfound':
            console.error(`別の動画が見つかりませんでした。(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
            return originalFetchThread.call(this, ...fetchThreadArguments.raw);
          case 'search_error':
            console.error(`検索に失敗しました。(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
            return originalFetchThread.call(this, ...fetchThreadArguments.raw);
          case 'included_in_ignore_list':
            console.error(`非表示リストに含まれているため何もしませんでした。(${fetchThreadArguments.defaultThreadId}:${videoInfo.title})`);
            return originalFetchThread.call(this, ...fetchThreadArguments.raw);
          default:
            console.error(error);
            return Promise.reject(error);
        }
      });
  };
};

const ignoreDialog = new IgnoreDialog(document.body);

function showIgnoreDialog(threadId, anotherThreadId, title) {
  ignoreDialog.show(
    title,
    () => {
      if (!IgnorePairsStorage.includes(threadId, anotherThreadId)) {
        IgnorePairsStorage.add(threadId, anotherThreadId);
      }
      location.reload();
    }
  );
}

window.watch_dll = function (r) {
  return original_watch_dll(r);
};
