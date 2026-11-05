/* 帳號：報名頁和總部共用。角色資料平常存在瀏覽器（localStorage），有登入的話也會存到伺服器上的帳號 */
(function () {
  var KEYS = ['name', 'hair', 'hairColor', 'skin', 'outfit', 'glasses', 'face', 'cls', 'level', 'exp', 'owned', 'gear', 'seen', 'equip', 'furn', 'inv', 'vip', 'photoHd'];
  var JSON_KEYS = { owned: 1, gear: 1, seen: 1, equip: 1, furn: 1, inv: 1, vip: 1 };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* 無痕模式 */ } }

  // 這台裝置上的角色資料
  function read() {
    var s = {};
    KEYS.forEach(function (k) {
      var v = get('hq-' + k);
      if (v == null) return;
      if (JSON_KEYS[k]) { try { v = JSON.parse(v); } catch (e) { return; } }
      s[k] = v;
    });
    return s;
  }
  // 把帳號裡的存檔寫回這台裝置
  function write(save) {
    KEYS.forEach(function (k) {
      var v = save ? save[k] : null;
      set('hq-' + k, v == null ? null : JSON_KEYS[k] ? JSON.stringify(v) : String(v));
    });
  }

  function token() { return get('hq-token') || ''; }
  function api(path, body) {
    var opt = { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
    if (token()) opt.headers.Authorization = 'Bearer ' + token();
    if (body) opt.body = JSON.stringify(body);
    return fetch(path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; });
    }, function () { return { ok: false, error: '連不上伺服器，等等再試', status: 0 }; });
  }
  // 識別證上的「SINCE 年.月.日」：建立帳號的日子
  function setSince(ms) { set('hq-since', ms ? String(ms) : null); }
  function fmtDate(ms) {
    var d = new Date(Number(ms));
    if (!ms || isNaN(d)) return '';
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  // email 狀態也記一份，總部的入口畫面要用（還沒驗證不能進、沒綁的提醒一下）
  function setMail(r) { set('hq-mail', r ? JSON.stringify({ email: r.email || '', emailOk: !!r.emailOk, emailNew: r.emailNew || '', needVerify: !!r.needVerify }) : null); }
  function signedIn(res) {
    set('hq-token', res.token); set('hq-user', res.username); setSince(res.since); setMail(res);
    write(res.save);
    return res;
  }
  function mailed(r) { if (r.ok) setMail(r); return r; }

  window.HQ_ACCOUNT = {
    read: read,
    write: write,
    token: token,
    user: function () { return token() ? get('hq-user') || '' : ''; },
    since: function () { return token() ? fmtDate(get('hq-since')) : ''; },
    fmtDate: fmtDate,
    mail: function () { if (!token()) return null; try { return JSON.parse(get('hq-mail')) || null; } catch (e) { return null; } },
    register: function (username, password, save, email) {
      return api('/api/register', { username: username, password: password, save: save, email: email }).then(function (r) { return r.ok ? signedIn(r) : r; });
    },
    login: function (username, password) {
      // 還沒登入過的裝置：把這台裝置上的角色一起送上去，伺服器會把進度併進帳號
      var local = token() ? null : read();
      return api('/api/login', { username: username, password: password, local: local }).then(function (r) { return r.ok ? signedIn(r) : r; });
    },
    // 有登入就從伺服器拿最新的角色資料；登入過期的話回傳 null
    sync: function () {
      if (!token()) return Promise.resolve(null);
      return api('/api/me').then(function (r) {
        if (r.ok) { set('hq-user', r.username); setSince(r.since); setMail(r); write(r.save); return r; }
        if (r.status === 401) { set('hq-token', null); set('hq-user', null); setSince(0); setMail(null); }
        return null;
      });
    },
    save: function (patch) { return api('/api/save', patch); },
    resendVerify: function () { return api('/api/email/resend', {}).then(mailed); },
    changeEmail: function (email, password) { return api('/api/email/change', { email: email, password: password }).then(mailed); },
    forgot: function (who) { return api('/api/forgot', { who: who }); },
    checkReset: function (t) { return api('/api/reset/check', { t: t }); },
    // 用信裡的連結設新密碼，設好就直接登入
    reset: function (t, password) { return api('/api/reset', { t: t, password: password }).then(function (r) { return r.ok ? signedIn(r) : r; }); },
    changePassword: function (oldPw, password) {
      return api('/api/password', { old: oldPw, password: password }).then(function (r) { if (r.ok) set('hq-token', r.token); return r; });
    },
    // 登出：這台裝置上的角色也一起清掉，下一個人用才不會拿到你的角色
    logout: function () {
      var done = api('/api/logout', {});
      set('hq-token', null); set('hq-user', null); setSince(0); setMail(null); write(null);
      return done;
    }
  };
})();
