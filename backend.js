// Math Heroes – replaces claude.ai's db + room capabilities with Supabase
// (Postgres table for accounts, Realtime broadcast + presence for live rooms).
(function () {
  if (window.claude && window.claude.use) return; // running inside claude.ai
  var CFG = window.MH_CFG || {};
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) { window.claude = { use: async function () { return null; } }; return; }

  var LIB = "supabase.js"; // @supabase/supabase-js 2.118.0 UMD, bundled locally
  var sbP = null;
  function client() {
    if (sbP) return sbP;
    sbP = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = LIB; s.async = true;
      s.onload = function () {
        try { res(window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 40 } } })); }
        catch (e) { rej(e); }
      };
      s.onerror = function () { rej(new Error("supabase load failed")); };
      document.head.appendChild(s);
    });
    return sbP;
  }

  // ---- db: doc(path).get() / .set(data)
  var TABLE = "mh_docs";
  async function makeDb() {
    var sb = await client();
    return {
      doc: function (path) {
        return {
          get: async function () {
            var r = await sb.from(TABLE).select("data").eq("path", path).maybeSingle();
            if (r.error) throw r.error;
            var d = r.data ? r.data.data : undefined;
            return { exists: !!r.data, data: function () { return d; } };
          },
          set: async function (data) {
            var r = await sb.from(TABLE).upsert({ path: path, data: data, updated_at: new Date().toISOString() });
            if (r.error) throw r.error;
          }
        };
      }
    };
  }

  // ---- room: emit/on/presence/peers/onPeers/onConnection
  var me = (function () {
    try { var v = sessionStorage.getItem("mh_peer"); if (v) return v; v = "p_" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("mh_peer", v); return v; }
    catch (e) { return "p_" + Math.random().toString(36).slice(2, 10); }
  })();
  async function makeRoom() {
    var sb = await client();
    var ch = sb.channel("mh-lobby", { config: { broadcast: { self: false, ack: false }, presence: { key: me } } });
    var L = {}, peerCbs = [], connCbs = [], lastPres = null, live = false;
    function peers() {
      var st = ch.presenceState(), out = [];
      for (var k in st) { var m = st[k] && st[k][0]; out.push({ peer: k, kind: "viewer", sameTab: k === me, presence: (m && m.presence) || {} }); }
      if (!st[me]) out.push({ peer: me, kind: "viewer", sameTab: true, presence: lastPres || {} });
      return out;
    }
    function firePeers() { var ps = peers(); peerCbs.forEach(function (f) { try { f({ peers: ps }); } catch (e) { console.error(e); } }); }
    function fireConn(c) { connCbs.forEach(function (f) { try { f(c); } catch (e) {} }); }
    ch.on("broadcast", { event: "m" }, function (msg) {
      var p = msg.payload || {}; (L[p.t] || []).forEach(function (f) { try { f({ data: p.d, peer: p.peer, isMe: false, sameTab: false }); } catch (e) { console.error(e); } });
    });
    ch.on("presence", { event: "sync" }, firePeers);
    var ready = new Promise(function (res) {
      ch.subscribe(function (status) {
        if (status === "SUBSCRIBED") { live = true; fireConn(true); if (lastPres) ch.track({ presence: lastPres }); res(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { live = false; fireConn(false); }
      });
      setTimeout(res, 8000);
    });
    await ready;
    return {
      on: function (t, f) { (L[t] = L[t] || []).push(f); },
      emit: async function (t, d) {
        (L[t] || []).forEach(function (f) { setTimeout(function () { try { f({ data: d, peer: me, isMe: true, sameTab: true }); } catch (e) { console.error(e); } }, 0); });
        if (live) await ch.send({ type: "broadcast", event: "m", payload: { t: t, d: d, peer: me } });
      },
      presence: async function (p) { lastPres = p; if (live) await ch.track({ presence: p }); firePeers(); },
      peers: peers,
      onPeers: function (f) { peerCbs.push(f); setTimeout(function () { f({ peers: peers() }); }, 0); },
      onConnection: function (f) { connCbs.push(f); f(live); }
    };
  }

  var cache = {};
  window.claude = {
    use: function (name) {
      if (cache[name]) return cache[name];
      var p = name === "db" ? makeDb() : name === "room" ? makeRoom() : Promise.resolve(null);
      cache[name] = p.catch(function (e) { console.warn("Math Heroes backend:", name, e); return null; });
      return cache[name];
    }
  };
})();
