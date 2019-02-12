export class GlobalVars {
  static set currentDefaultThreadId(value) {
    sessionStorage.danimeAnotherCommentCurrentDefaultThreadId = value;
  }
  static get currentDefaultThreadId() {
    return sessionStorage.danimeAnotherCommentCurrentDefaultThreadId;
  }
  static set selectedAnotherVideo(value) {
    sessionStorage.danimeAnotherCommentSelectedAnotherVideo = JSON.stringify(value);
  }
  static get selectedAnotherVideo() {
    try {
      return JSON.parse(sessionStorage.danimeAnotherCommentSelectedAnotherVideo);
    } catch (e) {
      return null;
    }
  }
}
