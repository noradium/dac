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
    const args = arguments;

    const channelLink = document.querySelector('.ChannelInfo-pageLink');
    const channelId = channelLink ? channelLink.getAttribute('href').match(/^http:\/\/ch\.nicovideo\.jp\/(ch[0-9]+)/)[1] : null;
    const title = document.querySelector('.VideoTitle').innerText;
    const videoDuration = document.querySelector('.PlayerPlayTime-duration').innerText.split(':').reduce((prev, current, index, source) => {
      return prev + current * Math.pow(60, source.length - 1 - index);
    }, 0);

    console.log(args);
    // dアニ動画のthreadId
    // args には２個入ってくる。１個はdアニの動画が表示された時に見えるコメントのスレッド。isPrivate が true。
    const defaultThreadId = (() => {
      for (let i = 0; i < args.length; ++i) {
        if (args[i].thread.isPrivate) {
          return args[i].thread.id;
        }
      }
    })();
    // もう１個はコメント一覧で切り替え可能な「通常コメント」だと思う。チャンネル限定動画では使われないと思うので、ここに別動画のコメントを突っ込むことにする。
    const regularThreadId = (() => {
      for (let i = 0; i < args.length; ++i) {
        if (!args[i].thread.isPrivate) {
          return args[i].thread.id;
        }
      }
    })();
    // dアニじゃない動画のthreadId
    let anotherThreadId = null;
    let anotherTitle = null;

    if (document.querySelector('.EditorMenuContainer')) {
      console.info('投稿者編集が利用できる環境のため処理しません');
      return originalFetchThread.call(this, ...args);
    }
    // dアニメストア ニコニコ支店 以外は処理しません
    if (!channelId || channelId !== 'ch2632720') {
      console.info('対象外の動画なので処理しません');
      return originalFetchThread.call(this, ...args);
    }
    if (alreadyFetchedOriginalThreadId === defaultThreadId) {
      console.info('この動画ではすでに取得済みなので取得しません');
      return originalFetchThread.call(this, ...args);
    }

    console.info(`dアニメストア ニコニコ支店の動画なので処理を開始します(${defaultThreadId}:${title})`);
    alreadyFetchedOriginalThreadId = defaultThreadId;

    return window.fetch(`http://api.search.nicovideo.jp/api/v2/video/contents/search?q=${buildSearchWord(title)}&targets=title&_sort=-commentCounter&fields=title,threadId,channelId,lengthSeconds&_context=danime-another-comment`, {
      mode: 'cors'
    })
      .catch((error) => {
        return Promise.reject('search_error');
      })
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        if (!json.data) {
          return Promise.reject('search_error');
        }

        // 動画の長さとして元動画の前後 20% を許容（25分の動画の場合20分から30分までOK）
        const allowedMinLength = videoDuration * 0.8;
        const allowedMaxLength = videoDuration * 1.2;
        const maybeAnotherVideo = json.data.find((video) => {
          return (
            `${video.threadId}` !== defaultThreadId &&
              !!video.channelId &&
              (allowedMinLength <= video.lengthSeconds && video.lengthSeconds <= allowedMaxLength)
          );
        });
        if (!maybeAnotherVideo) {
          return Promise.reject('notfound');
        }
        if (isIncludedIgnoreList(defaultThreadId, maybeAnotherVideo.threadId)) {
          return Promise.reject('included_in_ignore_list');
        }

        console.info(`別の動画が見つかりました(${maybeAnotherVideo.threadId}:${maybeAnotherVideo.title})`);
        anotherThreadId = maybeAnotherVideo.threadId;
        anotherTitle = maybeAnotherVideo.title;
      })
      .then(() => {
        args[args.length] = {
          thread: this.createThread({
            id: anotherThreadId,
            isPrivate: true, // isPrivate を true にしないと取得できない。
            // noLeaf: false, // ?
            leafExpression: args[0].thread.leafExpression, // わからんので他のと同じのを渡しておく
            language: 0
          }),
          scores: 1
        };
        args.length += 1;
        return originalFetchThread.call(this, ...args);
      })
      .then((threads) => {
        const regularThreadIndex = threads.findIndex((thread) => {
          return thread.id === regularThreadId && !thread.isPrivate;
        });
        const defaultThreadIndex = threads.findIndex((thread) => {
          return thread.id === defaultThreadId && thread.isPrivate;
        });
        const anotherThreadIndex = threads.findIndex((thread) => {
          return thread.id === anotherThreadId && thread.isPrivate;
        });

        // anotherThread で取得した内容を元の動画のほうの thread に詰め直す。ちょっと壊れそうだけど動いた
        let newIndex = 0;
        threads[anotherThreadIndex]._chatMap.forEach((value, key) => {
          while (threads[regularThreadIndex]._chatMap.has(newIndex)) {
            ++newIndex;
          }
          // thread を偽装しないとコメント一覧の方に表示されなかった
          value.thread = regularThreadId;

          threads[regularThreadIndex]._chatMap.set(newIndex, value);
          ++newIndex;
        });
        showIgnoreDialog(defaultThreadId, anotherThreadId, anotherTitle);

        return threads;
      }).catch(error => {
        switch (error) {
          case 'notfound':
            console.error(`別の動画が見つかりませんでした。(${defaultThreadId}:${title})`);
            return originalFetchThread.call(this, ...args);
          case 'search_error':
            console.error(`検索に失敗しました。(${defaultThreadId}:${title})`);
            return originalFetchThread.call(this, ...args);
          case 'included_in_ignore_list':
            console.error(`非表示リストに含まれているため何もしませんでした。(${defaultThreadId}:${title})`);
            return originalFetchThread.call(this, ...args);
          default:
            console.error(error);
            return Promise.reject(error);
        }
      });
  };
};

function buildSearchWord(title) {
  return encodeURIComponent(
    title
      .replace('　', ' ') // 全角スペースは半角に直しておく
      .replace(/第(\d+)/g, '$1') // 第◯話 の第はない場合もあるので消しておく(けもフレ対応)
      .replace(/[「」『』]/g, ' ') // 括弧も表記揺れがあるので消しておく(バカテス対応)
      .replace(/0+([0-9]+)/, "$1" ) // ゼロサプレス(とある魔術の禁書目録対応)
      // TODO: ゼロサプレスするとファンタシースターオンラインが死ぬので何か考えないとだめそう... (複数回検索するなど)
      .replace(/[#.\-"'<>]/g, ' ') // 記号系はスペースに変換しちゃっていいんじゃないかなあ。ダメなケースもあるかも(君に届け対応)
      .replace(/【.*】/, ' ') // 日テレオンデマンド対応
      // 特殊系
      .replace('STEINS;GATE', 'シュタインズ ゲート ') // (シュタゲ対応)
  );
}

const DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY = 'danime-another-comment-ignore-thread-ids';
function showIgnoreDialog(originalThreadId, anotherThreadId, title) {
  const dialog = document.createElement('div');
  dialog.innerHTML = `「<span style="font-weight: bold;">${title}</span>」のコメントも表示しています<br/>>今後別動画のコメントを表示しない`;
  dialog.addEventListener('click', () => {
    const threadIdPairs = window.localStorage.getItem(DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY);
    const threadIdPairsArray = threadIdPairs ? threadIdPairs.split(',') : [];
    const pair = `${originalThreadId}:${anotherThreadId}`;
    if (!threadIdPairsArray.includes(pair)) {
      threadIdPairsArray.push(pair);
      window.localStorage.setItem(DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY, threadIdPairsArray.join(','));
    }
    location.reload();
  });
  dialog.style.position = 'fixed';
  dialog.style.width = '200px';
  dialog.style.right = '20px';
  dialog.style.bottom = '20px';
  dialog.style.backgroundColor = '#ea5632';
  dialog.style.color = '#fff';
  dialog.style.padding = '12px';
  dialog.style.borderRadius = '12px';
  dialog.style.zIndex = 999999;
  dialog.style.cursor = 'pointer';
  document.body.appendChild(dialog);
  setTimeout(() => {
    document.body.removeChild(dialog);
  }, 5000);
}

function isIncludedIgnoreList(originalThreadId, anotherThreadId) {
  const threadIdPairs = window.localStorage.getItem(DANIME_ANOTHER_COMMENT_IGNORE_THREAD_IDS_KEY);
  const threadIdPairsArray = threadIdPairs ? threadIdPairs.split(',') : [];
  const pair = `${originalThreadId}:${anotherThreadId}`;
  return threadIdPairsArray.includes(pair);
}

window.watch_dll = function (r) {
  return original_watch_dll(r);
};
