import VideoInfo from './modules/video_info';
import IgnoreIdsStorage from "./modules/storage/ignore_ids_storage";
import SelectedPairsStorage from "./modules/storage/selected_pairs_storage";
import CommentAlphaStorage from "./modules/storage/comment_alpha_storage";

SelectedPairsStorage.migration();

inject(chrome.extension.getURL('scripts/hack_fetch_thread.js'));
inject(`${getWatchAppJsURI()}&by-danime-another-comment`);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getVideoInfo':
      sendResponse((new VideoInfo()).toJSON());
      break;
    case 'anotherThreadIdSelected':
      if (IgnoreIdsStorage.includes(sessionStorage.danimeAnotherCommentCurrentDefaultThreadId)) {
        IgnoreIdsStorage.remove(sessionStorage.danimeAnotherCommentCurrentDefaultThreadId);
      }
      SelectedPairsStorage.add(sessionStorage.danimeAnotherCommentCurrentDefaultThreadId, message.data.video);
      location.reload();
      break;
    case 'getCurrentCommentAlpha':
      sendResponse(CommentAlphaStorage.get());
      break;
    case 'commentAlphaSelected':
      CommentAlphaStorage.set(message.data.alpha);
      location.reload();
      break;
    case 'resetAllSettings':
      CommentAlphaStorage.remove();
      SelectedPairsStorage.removeAll();
      IgnoreIdsStorage.removeAll();
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
  const target = scriptTags.filter((script) => {
    return script.src.indexOf('http://nicovideo.cdn.nimg.jp/web/scripts/pages/watch/watch_app.js') >= 0;
  })[0];
  return target.src;
}
