import VideoInfo from './modules/video_info';
import IgnoreIdsStorage from "./modules/storage/ignore_ids_storage";
import SelectedPairsStorage from "./modules/storage/selected_pairs_storage";
import CommentAlphaStorage from "./modules/storage/comment_alpha_storage";
import {GlobalVars} from './modules/global_vars';
import CommentOffsetStorage from './modules/storage/comment_offset_storage';

SelectedPairsStorage.migration();

// 動的追加したスクリプトは非同期に読み込まれるので、onload を用いて同期に読み込ませる。
// 以下の順にスクリプトを読み込ませないと書き換えたライブラリが参照されなかった。
// hack_fetch_thread.js, watch_app_*?by-danime-another-comment.js, hack_comment_alpha.js
(async () => {
  await inject(chrome.extension.getURL('scripts/hack_fetch_thread.js'));
  // 他拡張機能による watchApp の遅延読み込み考慮し、inject 直前で URI を取得する
  const watchAppJsURI = getWatchAppJsURI();
  await inject(`${watchAppJsURI}${watchAppJsURI.indexOf('?') === -1 ? '?' : '&'}by-danime-another-comment`);
  await inject(chrome.extension.getURL('scripts/hack_comment_alpha.js'));
})();

// background.js と通信するためのもの
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getVideoInfo':
      sendResponse((new VideoInfo()).toJSON());
      break;
    case 'anotherThreadIdSelected':
      try {
        if (IgnoreIdsStorage.includes(GlobalVars.currentDefaultThreadId)) {
          IgnoreIdsStorage.remove(GlobalVars.currentDefaultThreadId);
        }
        SelectedPairsStorage.add(GlobalVars.currentDefaultThreadId, message.data.video);
        sendResponse({status: 'success'});
      } catch (error) {
        // error をそのまま渡すと中身が何故か空のオブジェクトになってしまうので、ここで展開してから渡す
        sendResponse({status: 'error', error: {name: error.name, message: error.message}});
      }
      break;
    case 'getCurrentCommentAlpha':
      sendResponse(CommentAlphaStorage.get());
      break;
    case 'commentAlphaSelected':
      try {
        CommentAlphaStorage.set(message.data.alpha);
        sendResponse({status: 'success'});
      } catch (error) {
        sendResponse({status: 'error', error: {name: error.name, message: error.message}});
      }
      break;
    case 'getSelectedAnotherVideo':
      sendResponse(GlobalVars.selectedAnotherVideo);
      break;
    case 'getCurrentCommentOffset':
      if (!GlobalVars.selectedAnotherVideo) {
        sendResponse(null);
        return;
      }
      CommentOffsetStorage.get(GlobalVars.currentDefaultThreadId, GlobalVars.selectedAnotherVideo.threadId)
        .then(result => sendResponse(result.offset))
        .catch(error => sendResponse(null));
      return true;
    case 'setCommentOffset':
      try {
        CommentOffsetStorage.add(GlobalVars.currentDefaultThreadId, GlobalVars.selectedAnotherVideo.threadId, message.data.offset);
        sendResponse({status: 'success'});
      } catch (error) {
        sendResponse({status: 'error', error: {name: error.name, message: error.message}});
      }
      break;
    case 'resetAllSettings':
      CommentAlphaStorage.remove();
      SelectedPairsStorage.removeAll();
      IgnoreIdsStorage.removeAll();
      break;
    case 'reload':
      location.reload();
      break;
  }
});

// injected script (hack_fetch_thread.js) と通信するためのもの
window.addEventListener('message', event => {
  if (event.origin !== location.origin || typeof event.data.type !== 'string') {
    return;
  }
  switch (event.data.type) {
    case 'danime-another-comment:background-search':
      // background へ検索リクエストを送る
      chrome.runtime.sendMessage(
        {command: 'search', word: event.data.word, limit: event.data.limit},
        (response) => {
          window.postMessage({
            type: 'danime-another-comment:background-search-result',
            response
          }, location.origin);
        }
      );
      break;
    case 'danime-another-comment:background-watchdata':
        // background へ検索リクエストを送る
        chrome.runtime.sendMessage(
          {command: 'watchdata', contentId: event.data.contentId},
          (response) => {
            window.postMessage({
              type: 'danime-another-comment:background-watchdata-result',
              response
            }, location.origin);
          }
        );
        break;
  }
});

// --- utils ---
async function inject(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', src);
    s.onload = (() => {
      resolve();
    });

    document.body.appendChild(s);
  });
}

function getWatchAppJsURI() {
  const scriptTags = Array.from(document.getElementsByTagName('script'));
  const watchAppJsRegExp = /watch_app_.*\.js/;
  const target = scriptTags.filter((script) => {
    return watchAppJsRegExp.test(script.src);
  }).pop();
  return target.src;
}
