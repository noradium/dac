import VideoInfo from './modules/video_info';
import FetchThreadArguments from "./modules/fetch_thread_arguments";
import SearchAPI from "./modules/search_api";
import buildSearchWord from "./modules/build_search_word";
import IgnoreIdsStorage from "./modules/storage/ignore_ids_storage";
import Dialog from "./modules/dialog";
import SelectedPairsStorage from "./modules/storage/selected_pairs_storage";

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

    // 今見ている動画の so なしIDをdocument経由でとる良い方法がわからないのでsessionStorageにさすクソみたいな方法で用意する。
    sessionStorage.danimeAnotherCommentCurrentDefaultThreadId = fetchThreadArguments.defaultThreadId;

    const videoInfo = new VideoInfo();

    console.log(fetchThreadArguments.raw);
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

    return fetchAnotherVideo(fetchThreadArguments.defaultThreadId, videoInfo)
      .then((data) => {
        anotherThreadId = data.video.threadId;
        anotherTitle = data.video.title;

        fetchThreadArguments.append(this.createThread({
          id: anotherThreadId,
          isPrivate: !!data.video.channelId, // チャンネル動画のときは true, チャンネルじゃないときは false で取得されてる。
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
            return Promise.reject(error);
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
          `${video.threadId}` !== threadId &&
          !!video.channelId &&
          (allowedMinLength <= video.lengthSeconds && video.lengthSeconds <= allowedMaxLength)
        );
      });
      if (!maybeAnotherVideo) {
        return Promise.reject('notfound');
      }
      if (IgnoreIdsStorage.includes(threadId)) {
        return Promise.reject('included_in_ignore_list');
      }

      console.info(`別の動画が見つかりました(${maybeAnotherVideo.threadId}:${maybeAnotherVideo.title})`);
      return {
        video: maybeAnotherVideo
      };
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

window.watch_dll = function (r) {
  return original_watch_dll(r);
};
