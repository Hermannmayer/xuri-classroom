// webpack module 83639 — body from webcrack
module.exports = function (module, exports, require) {
var n;
(function (i, o) {
  "use strict";

  var a = "1.0.37";
  var s = "";
  var u = "?";
  var l = "function";
  var c = "undefined";
  var p = "object";
  var d = "string";
  var f = "major";
  var g = "model";
  var m = "name";
  var v = "type";
  var y = "vendor";
  var h = "version";
  var b = "architecture";
  var w = "console";
  var x = "mobile";
  var E = "tablet";
  var k = "smarttv";
  var S = "wearable";
  var T = "embedded";
  var C = 500;
  var A = "Amazon";
  var _ = "Apple";
  var O = "ASUS";
  var M = "BlackBerry";
  var P = "Browser";
  var q = "Chrome";
  var N = "Edge";
  var R = "Firefox";
  var I = "Google";
  var j = "Huawei";
  var D = "LG";
  var L = "Microsoft";
  var F = "Motorola";
  var Z = "Opera";
  var z = "Samsung";
  var U = "Sharp";
  var B = "Sony";
  var V = "Xiaomi";
  var H = "Zebra";
  var W = "Facebook";
  var Y = "Chromium OS";
  var Q = "Mac OS";
  function $(e, t) {
    var r = {};
    for (var n in e) {
      if (t[n] && t[n].length % 2 === 0) {
        r[n] = t[n].concat(e[n]);
      } else {
        r[n] = e[n];
      }
    }
    return r;
  }
  function G(e) {
    var t = {};
    for (var r = 0; r < e.length; r++) {
      t[e[r].toUpperCase()] = e[r];
    }
    return t;
  }
  function K(e, t) {
    return typeof e === d && J(t).indexOf(J(e)) !== -1;
  }
  function J(e) {
    return e.toLowerCase();
  }
  function X(e) {
    if (typeof e === d) {
      return e.replace(/[^\d\.]/g, s).split(".")[0];
    } else {
      return o;
    }
  }
  function ee(e, t) {
    if (typeof e === d) {
      e = e.replace(/^\s\s*/, s);
      if (typeof t === c) {
        return e;
      } else {
        return e.substring(0, C);
      }
    }
  }
  function te(e, t) {
    var r;
    var n;
    var i;
    var a;
    var s;
    var u;
    var c = 0;
    while (c < t.length && !s) {
      var d = t[c];
      var f = t[c + 1];
      r = n = 0;
      while (r < d.length && !s) {
        if (!d[r]) {
          break;
        }
        s = d[r++].exec(e);
        if (s) {
          for (i = 0; i < f.length; i++) {
            u = s[++n];
            a = f[i];
            if (typeof a === p && a.length > 0) {
              if (a.length === 2) {
                if (typeof a[1] == l) {
                  this[a[0]] = a[1].call(this, u);
                } else {
                  this[a[0]] = a[1];
                }
              } else if (a.length === 3) {
                if (typeof a[1] !== l || a[1].exec && a[1].test) {
                  this[a[0]] = u ? u.replace(a[1], a[2]) : o;
                } else {
                  this[a[0]] = u ? a[1].call(this, u, a[2]) : o;
                }
              } else if (a.length === 4) {
                this[a[0]] = u ? a[3].call(this, u.replace(a[1], a[2])) : o;
              }
            } else {
              this[a] = u || o;
            }
          }
        }
      }
      c += 2;
    }
  }
  function re(e, t) {
    for (var r in t) {
      if (typeof t[r] === p && t[r].length > 0) {
        for (var n = 0; n < t[r].length; n++) {
          if (K(t[r][n], e)) {
            if (r === u) {
              return o;
            } else {
              return r;
            }
          }
        }
      } else if (K(t[r], e)) {
        if (r === u) {
          return o;
        } else {
          return r;
        }
      }
    }
    return e;
  }
  var ne = {
    "1.0": "/8",
    1.2: "/1",
    1.3: "/3",
    "2.0": "/412",
    "2.0.2": "/416",
    "2.0.3": "/417",
    "2.0.4": "/419",
    "?": "/"
  };
  var ie = {
    ME: "4.90",
    "NT 3.11": "NT3.51",
    "NT 4.0": "NT4.0",
    2000: "NT 5.0",
    XP: ["NT 5.1", "NT 5.2"],
    Vista: "NT 6.0",
    7: "NT 6.1",
    8: "NT 6.2",
    8.1: "NT 6.3",
    10: ["NT 6.4", "NT 10.0"],
    RT: "ARM"
  };
  var oe = {
    browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [h, [m, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [h, [m, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [m, h], [/opios[\/ ]+([\w\.]+)/i], [h, [m, Z + " Mini"]], [/\bopr\/([\w\.]+)/i], [h, [m, Z]], [/\bb[ai]*d(?:uhd|[ub]*[aekoprswx]{5,6})[\/ ]?([\w\.]+)/i], [h, [m, "Baidu"]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant|iemobile|slim)\s?(?:browser)?[\/ ]?([\w\.]*)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [m, h], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [h, [m, "UC" + P]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i, /micromessenger\/([\w\.]+)/i], [h, [m, "WeChat"]], [/konqueror\/([\w\.]+)/i], [h, [m, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [h, [m, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [h, [m, "Yandex"]], [/slbrowser\/([\w\.]+)/i], [h, [m, "Smart Lenovo " + P]], [/(avast|avg)\/([\w\.]+)/i], [[m, /(.+)/, "$1 Secure " + P], h], [/\bfocus\/([\w\.]+)/i], [h, [m, R + " Focus"]], [/\bopt\/([\w\.]+)/i], [h, [m, Z + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [h, [m, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [h, [m, "Dolphin"]], [/coast\/([\w\.]+)/i], [h, [m, Z + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [h, [m, "MIUI " + P]], [/fxios\/([-\w\.]+)/i], [h, [m, R]], [/\bqihu|(qi?ho?o?|360)browser/i], [[m, "360 " + P]], [/(oculus|sailfish|huawei|vivo)browser\/([\w\.]+)/i], [[m, /(.+)/, "$1 " + P], h], [/samsungbrowser\/([\w\.]+)/i], [h, [m, z + " Internet"]], [/(comodo_dragon)\/([\w\.]+)/i], [[m, /_/g, " "], h], [/metasr[\/ ]?([\d\.]+)/i], [h, [m, "Sogou Explorer"]], [/(sogou)mo\w+\/([\d\.]+)/i], [[m, "Sogou Mobile"], h], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|2345Explorer)[\/ ]?([\w\.]+)/i], [m, h], [/(lbbrowser)/i, /\[(linkedin)app\]/i], [m], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[m, W], h], [/(Klarna)\/([\w\.]+)/i, /(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(alipay)client\/([\w\.]+)/i, /(chromium|instagram|snapchat)[\/ ]([-\w\.]+)/i], [m, h], [/\bgsa\/([\w\.]+) .*safari\//i], [h, [m, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [h, [m, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [h, [m, q + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[m, q + " WebView"], h], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [h, [m, "Android " + P]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [m, h], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [h, [m, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [h, m], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [m, [h, re, ne]], [/(webkit|khtml)\/([\w\.]+)/i], [m, h], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[m, "Netscape"], h], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [h, [m, R + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [m, h], [/(cobalt)\/([\w\.]+)/i], [m, [h, /master.|lts./, ""]]],
    cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[b, "amd64"]], [/(ia32(?=;))/i], [[b, J]], [/((?:i[346]|x)86)[;\)]/i], [[b, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[b, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[b, "armhf"]], [/windows (ce|mobile); ppc;/i], [[b, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[b, /ower/, s, J]], [/(sun4\w)[;\)]/i], [[b, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[b, J]]],
    device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [g, [y, z], [v, E]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [g, [y, z], [v, x]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [g, [y, _], [v, x]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [g, [y, _], [v, E]], [/(macintosh);/i], [g, [y, _]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [g, [y, U], [v, x]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [g, [y, j], [v, E]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [g, [y, j], [v, x]], [/\b(poco[\w ]+|m2\d{3}j\d\d[a-z]{2})(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /oid[^\)]+; (m?[12][0-389][01]\w{3,6}[c-y])( bui|; wv|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[g, /_/g, " "], [y, V], [v, x]], [/oid[^\)]+; (2\d{4}(283|rpbf)[cgl])( bui|\))/i, /\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[g, /_/g, " "], [y, V], [v, E]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [g, [y, "OPPO"], [v, x]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [g, [y, "Vivo"], [v, x]], [/\b(rmx[1-3]\d{3})(?: bui|;|\))/i], [g, [y, "Realme"], [v, x]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [g, [y, F], [v, x]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [g, [y, F], [v, E]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [g, [y, D], [v, E]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [g, [y, D], [v, x]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [g, [y, "Lenovo"], [v, E]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[g, /_/g, " "], [y, "Nokia"], [v, x]], [/(pixel c)\b/i], [g, [y, I], [v, E]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [g, [y, I], [v, x]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [g, [y, B], [v, x]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[g, "Xperia Tablet"], [y, B], [v, E]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [g, [y, "OnePlus"], [v, x]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [g, [y, A], [v, E]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[g, /(.+)/g, "Fire Phone $1"], [y, A], [v, x]], [/(playbook);[-\w\),; ]+(rim)/i], [g, y, [v, E]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [g, [y, M], [v, x]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [g, [y, O], [v, E]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [g, [y, O], [v, x]], [/(nexus 9)/i], [g, [y, "HTC"], [v, E]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [y, [g, /_/g, " "], [v, x]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [g, [y, "Acer"], [v, E]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [g, [y, "Meizu"], [v, x]], [/; ((?:power )?armor(?:[\w ]{0,8}))(?: bui|\))/i], [g, [y, "Ulefone"], [v, x]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron|infinix|tecno)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [y, g, [v, x]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [y, g, [v, E]], [/(surface duo)/i], [g, [y, L], [v, E]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [g, [y, "Fairphone"], [v, x]], [/(u304aa)/i], [g, [y, "AT&T"], [v, x]], [/\bsie-(\w*)/i], [g, [y, "Siemens"], [v, x]], [/\b(rct\w+) b/i], [g, [y, "RCA"], [v, E]], [/\b(venue[\d ]{2,7}) b/i], [g, [y, "Dell"], [v, E]], [/\b(q(?:mv|ta)\w+) b/i], [g, [y, "Verizon"], [v, E]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [g, [y, "Barnes & Noble"], [v, E]], [/\b(tm\d{3}\w+) b/i], [g, [y, "NuVision"], [v, E]], [/\b(k88) b/i], [g, [y, "ZTE"], [v, E]], [/\b(nx\d{3}j) b/i], [g, [y, "ZTE"], [v, x]], [/\b(gen\d{3}) b.+49h/i], [g, [y, "Swiss"], [v, x]], [/\b(zur\d{3}) b/i], [g, [y, "Swiss"], [v, E]], [/\b((zeki)?tb.*\b) b/i], [g, [y, "Zeki"], [v, E]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[y, "Dragon Touch"], g, [v, E]], [/\b(ns-?\w{0,9}) b/i], [g, [y, "Insignia"], [v, E]], [/\b((nxa|next)-?\w{0,9}) b/i], [g, [y, "NextBook"], [v, E]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[y, "Voice"], g, [v, x]], [/\b(lvtel\-)?(v1[12]) b/i], [[y, "LvTel"], g, [v, x]], [/\b(ph-1) /i], [g, [y, "Essential"], [v, x]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [g, [y, "Envizen"], [v, E]], [/\b(trio[-\w\. ]+) b/i], [g, [y, "MachSpeed"], [v, E]], [/\btu_(1491) b/i], [g, [y, "Rotor"], [v, E]], [/(shield[\w ]+) b/i], [g, [y, "Nvidia"], [v, E]], [/(sprint) (\w+)/i], [y, g, [v, x]], [/(kin\.[onetw]{3})/i], [[g, /\./g, " "], [y, L], [v, x]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [g, [y, H], [v, E]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [g, [y, H], [v, x]], [/smart-tv.+(samsung)/i], [y, [v, k]], [/hbbtv.+maple;(\d+)/i], [[g, /^/, "SmartTV"], [y, z], [v, k]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[y, D], [v, k]], [/(apple) ?tv/i], [y, [g, _ + " TV"], [v, k]], [/crkey/i], [[g, q + "cast"], [y, I], [v, k]], [/droid.+aft(\w+)( bui|\))/i], [g, [y, A], [v, k]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [g, [y, U], [v, k]], [/(bravia[\w ]+)( bui|\))/i], [g, [y, B], [v, k]], [/(mitv-\w{5}) bui/i], [g, [y, V], [v, k]], [/Hbbtv.*(technisat) (.*);/i], [y, g, [v, k]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[y, ee], [g, ee], [v, k]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[v, k]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [y, g, [v, w]], [/droid.+; (shield) bui/i], [g, [y, "Nvidia"], [v, w]], [/(playstation [345portablevi]+)/i], [g, [y, B], [v, w]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [g, [y, L], [v, w]], [/((pebble))app/i], [y, g, [v, S]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [g, [y, _], [v, S]], [/droid.+; (glass) \d/i], [g, [y, I], [v, S]], [/droid.+; (wt63?0{2,3})\)/i], [g, [y, H], [v, S]], [/(quest( 2| pro)?)/i], [g, [y, W], [v, S]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [y, [v, T]], [/(aeobc)\b/i], [g, [y, A], [v, T]], [/droid .+?; ([^;]+?)(?: bui|; wv\)|\) applew).+? mobile safari/i], [g, [v, x]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [g, [v, E]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[v, E]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[v, x]], [/(android[-\w\. ]{0,9});.+buil/i], [g, [y, "Generic"]]],
    engine: [[/windows.+ edge\/([\w\.]+)/i], [h, [m, N + "HTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [h, [m, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [m, h], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [h, m]],
    os: [[/microsoft (windows) (vista|xp)/i], [m, h], [/(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i], [m, [h, re, ie]], [/windows nt 6\.2; (arm)/i, /windows[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i, /(?:win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[h, re, ie], [m, "Windows"]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /(?:ios;fbsv\/|iphone.+ios[\/ ])([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[h, /_/g, "."], [m, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[m, Q], [h, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [h, m], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [m, h], [/\(bb(10);/i], [h, [m, M]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [h, [m, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [h, [m, R + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [h, [m, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [h, [m, "watchOS"]], [/crkey\/([\d\.]+)/i], [h, [m, q + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[m, Y], h], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [m, h], [/(sunos) ?([\w\.\d]*)/i], [[m, "Solaris"], h], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [m, h]]
  };
  function ae(e, t) {
    if (typeof e === p) {
      t = e;
      e = o;
    }
    if (!(this instanceof ae)) {
      return new ae(e, t).getResult();
    }
    var r = typeof i !== c && i.navigator ? i.navigator : o;
    var n = e || (r && r.userAgent ? r.userAgent : s);
    var a = r && r.userAgentData ? r.userAgentData : o;
    var u = t ? $(oe, t) : oe;
    var w = r && r.userAgent == n;
    this.getBrowser = function () {
      var e = {
        [m]: o,
        [h]: o
      };
      te.call(e, n, u.browser);
      e[f] = X(e[h]);
      if (w && r && r.brave && typeof r.brave.isBrave == l) {
        e[m] = "Brave";
      }
      return e;
    };
    this.getCPU = function () {
      var e = {
        [b]: o
      };
      te.call(e, n, u.cpu);
      return e;
    };
    this.getDevice = function () {
      var e = {
        [y]: o,
        [g]: o,
        [v]: o
      };
      te.call(e, n, u.device);
      if (w && !e[v] && a && a.mobile) {
        e[v] = x;
      }
      if (w && e[g] == "Macintosh" && r && typeof r.standalone !== c && r.maxTouchPoints && r.maxTouchPoints > 2) {
        e[g] = "iPad";
        e[v] = E;
      }
      return e;
    };
    this.getEngine = function () {
      var e = {
        [m]: o,
        [h]: o
      };
      te.call(e, n, u.engine);
      return e;
    };
    this.getOS = function () {
      var e = {
        [m]: o,
        [h]: o
      };
      te.call(e, n, u.os);
      if (w && !e[m] && a && a.platform != "Unknown") {
        e[m] = a.platform.replace(/chrome os/i, Y).replace(/macos/i, Q);
      }
      return e;
    };
    this.getResult = function () {
      return {
        ua: this.getUA(),
        browser: this.getBrowser(),
        engine: this.getEngine(),
        os: this.getOS(),
        device: this.getDevice(),
        cpu: this.getCPU()
      };
    };
    this.getUA = function () {
      return n;
    };
    this.setUA = function (e) {
      n = typeof e === d && e.length > C ? ee(e, C) : e;
      return this;
    };
    this.setUA(n);
    return this;
  }
  ae.VERSION = a;
  ae.BROWSER = G([m, h, f]);
  ae.CPU = G([b]);
  ae.DEVICE = G([g, y, v, w, x, k, E, S, T]);
  ae.ENGINE = ae.OS = G([m, h]);
  if (typeof exports !== c) {
    if (c !== "object" && module.exports) {
      exports = module.exports = ae;
    }
    exports.UAParser = ae;
  } else if (l === "function" && require.amdO) {
    n = function () {
      return ae;
    }.call(exports, require, exports, module);
    if (n !== o) {
      module.exports = n;
    }
  } else if (typeof i !== c) {
    i.UAParser = ae;
  }
  var se = typeof i !== c && (i.jQuery || i.Zepto);
  if (se && !se.ua) {
    var ue = new ae();
    se.ua = ue.getResult();
    se.ua.get = function () {
      return ue.getUA();
    };
    se.ua.set = function (e) {
      ue.setUA(e);
      var t = ue.getResult();
      for (var r in t) {
        se.ua[r] = t[r];
      }
    };
  }
})(typeof window === "object" ? window : this);
};
