inject(chrome.extension.getURL('scripts/hack_fetch_thread.js'));
inject(`${getWatchAppJsURI()}&by-danime-another-comment`);


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
