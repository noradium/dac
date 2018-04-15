import buildSearchWord from "./modules/build_search_word";
import SearchAPI from "./modules/search_api";

/**
 * コメント透明度の初期化
 */
sendMessageToCurrentTab({type: 'getCurrentCommentAlpha'}, (currentCommentAlpha) => {
  const alphaInput = document.querySelector('.AlphaInput');
  const alphaValueSpan = document.querySelector('.AlphaValue');
  const alphaApplyButton = document.querySelector('.AlphaApplyButton');

  alphaInput.value = currentCommentAlpha;
  alphaValueSpan.innerText = currentCommentAlpha;

  alphaInput.addEventListener('input', (e) => {
    alphaValueSpan.innerText = e.target.value;
  });
  alphaInput.addEventListener('change', (e) => {
    alphaValueSpan.innerText = e.target.value;
  });
  alphaApplyButton.addEventListener('click', (e) => {
    window.close();
    sendMessageToCurrentTab({
      type: 'commentAlphaSelected',
      data: {
        alpha: alphaInput.value
      }
    });
  });
});

/**
 * 動画リストの初期化やらなんやら
 */
sendMessageToCurrentTab({type: 'getVideoInfo'}, (videoInfoJSON) => {
  if (videoInfoJSON.channelId !== 'ch2632720') {
    document.querySelector('.Selector').style.display = 'none';
    document.querySelector('.NoTargetMessage').style.display = 'block';
    return;
  }
  const searchWord = buildSearchWord(videoInfoJSON.title).split(' ')[0];
  updateSearchInput(searchWord);
  searchAndUpdateList(searchWord);
});

document.querySelector('.SearchButton').addEventListener('click', () => {
  searchAndUpdateList(document.querySelector('.SearchInput').value);
});

document.querySelector('.SearchInput').addEventListener('keypress', (e) => {
  // Enter
  if (e.keyCode === 13) {
    searchAndUpdateList(document.querySelector('.SearchInput').value);
  }
});

document.querySelector('.ResetAllSettings').addEventListener('click', (e) => {
  sendMessageToCurrentTab({type: 'resetAllSettings'}, () => {
    document.querySelector('.ResetAllSettingsMessage').innerText = '削除しました';
    setTimeout(() => {
      document.querySelector('.ResetAllSettingsMessage').innerText = '';
    }, 3000);
  });
});

function searchAndUpdateList(word) {
  SearchAPI.fetch(word, 100)
    .then(json => {
      updateList(json);
    });
}

function sendMessageToCurrentTab(message, onReceiveResponse) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0];
    chrome.tabs.sendMessage(currentTab.id, message, onReceiveResponse);
  });
}

function updateSearchInput(value) {
  document.querySelector('.SearchInput').value = value;
}

function updateList(searchAPIResponse) {
  document.querySelector('.List').innerText = '';
  document.querySelector('.NoItemMessage').style.display = 'none';
  if (!searchAPIResponse.data || searchAPIResponse.data.length === 0) {
    document.querySelector('.NoItemMessage').style.display = 'block';
    return;
  }
  const documentFragment = document.createDocumentFragment();

  const filteredVideos = searchAPIResponse.data
    .filter((video) => {
      return video.channelId !== 'ch2632720';
    })
    .sort((a, b) => {
      if (a.channelId && !b.channelId) return -1;
      if (!a.channelId && b.channelId) return 1;
      return b.commentCounter - a.commentCounter;
    });

  filteredVideos.forEach((video) => {
    const template = document.getElementById('list-item-template');
    const clone = document.importNode(template.content, true);
    clone.querySelector('.ListItem .Thumbnail .Image').src = video.thumbnailUrl;
    clone.querySelector('.ListItem .Thumbnail .Duration').innerText = formatDuration(video.lengthSeconds);
    if (!video.channelId) {
      clone.querySelector('.ListItem .Thumbnail .ChannelLabel').style.display = 'none';
    }
    clone.querySelector('.ListItem .Info .Title').innerText = video.title;
    clone.querySelector('.ListItem .Info .CommentCounter').innerText = video.commentCounter;
    clone.querySelector('.ListItem').setAttribute('data-video', JSON.stringify(video));
    documentFragment.appendChild(clone);
  });
  document.querySelector('.List').appendChild(documentFragment);
  document.querySelectorAll('.List .ListItem').forEach(item => {
    item.addEventListener('click', (e) => {
      window.close();
      sendMessageToCurrentTab({
        type: 'anotherThreadIdSelected',
        data: {
          video: JSON.parse(e.currentTarget.getAttribute('data-video'))
        }
      });
    });
  });
}

function formatDuration(lengthSeconds) {
  return `${Math.floor(lengthSeconds / 60)}:${`0${lengthSeconds % 60}`.slice(-2)}`;
}
