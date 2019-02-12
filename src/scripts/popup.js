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
    sendMessageToCurrentTab({
      type: 'commentAlphaSelected',
      data: {
        alpha: alphaInput.value
      }
    }, response => {
      if (response.status === 'error') {
        showErrorMessage(`${response.error.name}: ${response.error.message}`);
        return;
      }
      window.close();
      sendMessageToCurrentTab({type: 'reload'});
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

  sendMessageToCurrentTab({type: 'getSelectedAnotherVideo'}, (anotherVideo) => {
    // オフセット設定UI初期化
    const playingVideo = document.querySelector('.OffsetSelector .PlayingVideo');
    const selectedVideo = document.querySelector('.OffsetSelector .SelectedVideo');
    playingVideo.querySelector('.Duration').innerText = formatDuration(videoInfoJSON.duration);
    playingVideo.querySelector('.Title').innerText = videoInfoJSON.title;

    const fitHeadButton = document.querySelector('.Offset .OffsetFitHeadButton');
    const decrementButton = document.querySelector('.Offset .OffsetDecrementButton');
    const offsetInput = document.querySelector('.Offset .OffsetInput');
    const incrementButton = document.querySelector('.Offset .OffsetIncrementButton');
    const fitTailButton = document.querySelector('.Offset .OffsetFitTailButton');
    const offsetApplyButton = document.querySelector('.Offset .OffsetApplyButton');

    if (!anotherVideo) {
      fitHeadButton.disabled = true;
      decrementButton.disabled = true;
      incrementButton.disabled = true;
      fitTailButton.disabled = true;
      offsetInput.disabled = true;
      offsetApplyButton.disabled = true;
      selectedVideo.querySelector('.Duration').innerText = '--:--';
      selectedVideo.querySelector('.Title').innerText = '-';
    } else {
      selectedVideo.querySelector('.Duration').innerText = formatDuration(anotherVideo.lengthSeconds);
      selectedVideo.querySelector('.Title').innerText = anotherVideo.title;
      fitHeadButton.addEventListener('click', () => {
        offsetInput.value = 0;
      });
      decrementButton.addEventListener('click', () => {
        offsetInput.stepDown();
      });
      incrementButton.addEventListener('click', () => {
        offsetInput.stepUp();
      });
      fitTailButton.addEventListener('click', () => {
        offsetInput.value = videoInfoJSON.duration - anotherVideo.lengthSeconds;
      });
      offsetApplyButton.addEventListener('click', () => {
        sendMessageToCurrentTab({
          type: 'setCommentOffset',
          data: {
            offset: parseInt(offsetInput.value, 10)
          }
        }, response => {
          if (response.status === 'error') {
            showErrorMessage(`${response.error.name}: ${response.error.message}`);
            return;
          }
          window.close();
          sendMessageToCurrentTab({type: 'reload'});
        });
      });
    }

    sendMessageToCurrentTab({type: 'getCurrentCommentOffset'}, (offset) => {
      offsetInput.value = offset || 0;
    });
  });

  // 検索UI初期化
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
      sendMessageToCurrentTab({
        type: 'anotherThreadIdSelected',
        data: {
          video: JSON.parse(e.currentTarget.getAttribute('data-video'))
        }
      }, response => {
        if (response.status === 'error') {
          showErrorMessage(`${response.error.name}: ${response.error.message}`);
          return;
        }
        window.close();
        sendMessageToCurrentTab({type: 'reload'});
      });
    });
  });
}

function formatDuration(lengthSeconds) {
  return `${Math.floor(lengthSeconds / 60)}:${`0${lengthSeconds % 60}`.slice(-2)}`;
}

function showErrorMessage(message) {
  document.querySelector('.Message .ErrorMessage').innerText = message;
}
