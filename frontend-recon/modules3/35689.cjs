// webpack module 35689 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return c;
  }
});
var n = require("./91613.js");
var i = "accept acceptCharset accessKey action allowFullScreen allowTransparency\n    alt async autoComplete autoFocus autoPlay capture cellPadding cellSpacing challenge\n    charSet checked classID className colSpan cols content contentEditable contextMenu\n    controls coords crossOrigin data dateTime default defer dir disabled download draggable\n    encType form formAction formEncType formMethod formNoValidate formTarget frameBorder\n    headers height hidden high href hrefLang htmlFor httpEquiv icon id inputMode integrity\n    is keyParams keyType kind label lang list loop low manifest marginHeight marginWidth max maxLength media\n    mediaGroup method min minLength multiple muted name noValidate nonce open\n    optimum pattern placeholder poster preload radioGroup readOnly rel required\n    reversed role rowSpan rows sandbox scope scoped scrolling seamless selected\n    shape size sizes span spellCheck src srcDoc srcLang srcSet start step style\n    summary tabIndex target title type useMap value width wmode wrap";
var o = "onCopy onCut onPaste onCompositionEnd onCompositionStart onCompositionUpdate onKeyDown\n    onKeyPress onKeyUp onFocus onBlur onChange onInput onSubmit onClick onContextMenu onDoubleClick\n    onDrag onDragEnd onDragEnter onDragExit onDragLeave onDragOver onDragStart onDrop onMouseDown\n    onMouseEnter onMouseLeave onMouseMove onMouseOut onMouseOver onMouseUp onSelect onTouchCancel\n    onTouchEnd onTouchMove onTouchStart onScroll onWheel onAbort onCanPlay onCanPlayThrough\n    onDurationChange onEmptied onEncrypted onEnded onError onLoadedData onLoadedMetadata\n    onLoadStart onPause onPlay onPlaying onProgress onRateChange onSeeked onSeeking onStalled onSuspend onTimeUpdate onVolumeChange onWaiting onLoad onError";
var a = `${i} ${o}`.split(/[\s\n]+/);
var s = "aria-";
var u = "data-";
function l(e, t) {
  return e.indexOf(t) === 0;
}
function c(e) {
  var t;
  var r = arguments.length > 1 && arguments[1] !== undefined && arguments[1];
  t = r === false ? {
    aria: true,
    data: true,
    attr: true
  } : r === true ? {
    aria: true
  } : (0, n.Z)({}, r);
  var i = {};
  Object.keys(e).forEach(function (r) {
    if (t.aria && (r === "role" || l(r, s)) || t.data && l(r, u) || t.attr && a.includes(r)) {
      i[r] = e[r];
    }
  });
  return i;
}
};
