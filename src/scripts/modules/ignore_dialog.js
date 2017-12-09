export default class IgnoreDialog {
  _dialog;
  _currentOnClick;
  _timeoutId;

  constructor(
    rootNode
  ) {
    this._dialog = document.createElement('div');
    this._dialog.style.position = 'fixed';
    this._dialog.style.width = '200px';
    this._dialog.style.right = '20px';
    this._dialog.style.bottom = '20px';
    this._dialog.style.backgroundColor = '#ea5632';
    this._dialog.style.color = '#fff';
    this._dialog.style.padding = '12px';
    this._dialog.style.borderRadius = '12px';
    this._dialog.style.zIndex = 999999;
    this._dialog.style.cursor = 'pointer';
    this._dialog.style.display = 'none';
    rootNode.appendChild(this._dialog);
  }

  show(title, onClick) {
    this._dialog.innerHTML = `「<span style="font-weight: bold;">${title}</span>」のコメントも表示しています<br/>>今後別動画のコメントを表示しない`;
    this._dialog.removeEventListener('click', this._currentOnClick);
    this._currentOnClick = onClick;
    this._dialog.addEventListener('click', this._currentOnClick);
    this._dialog.style.display = 'block';
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }
    this._timeoutId = setTimeout(() => {
      this._dialog.style.display = 'none';
      this._timeoutId = null;
    }, 5000);
  }
}
