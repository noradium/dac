import VideoInfo from './modules/video_info';
import IgnoreIdsStorage from "./modules/storage/ignore_ids_storage";
import SelectedPairsStorage from "./modules/storage/selected_pairs_storage";
import CommentAlphaStorage from "./modules/storage/comment_alpha_storage";

SelectedPairsStorage.migration();

inject(chrome.extension.getURL('scripts/hack_fetch_thread.js'));
const watchAppJsURI = getWatchAppJsURI();
inject(`${watchAppJsURI}${watchAppJsURI.indexOf('?') === -1 ? '?' : '&'}by-danime-another-comment`);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getVideoInfo':
      sendResponse((new VideoInfo()).toJSON());
      break;
    case 'anotherThreadIdSelected':
      try {
        if (IgnoreIdsStorage.includes(sessionStorage.danimeAnotherCommentCurrentDefaultThreadId)) {
          IgnoreIdsStorage.remove(sessionStorage.danimeAnotherCommentCurrentDefaultThreadId);
        }
        SelectedPairsStorage.add(sessionStorage.danimeAnotherCommentCurrentDefaultThreadId, message.data.video);
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

// --- utils ---
function inject(src) {
  const s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', src);

  document.body.appendChild(s);
}

function getWatchAppJsURI() {
  const scriptTags = Array.from(document.getElementsByTagName('script'));
  const watchAppJsRegExp = /watch_app_.*\.js/;
  const target = scriptTags.filter((script) => {
    return watchAppJsRegExp.test(script.src);
  })[0];
  return target.src;
}
