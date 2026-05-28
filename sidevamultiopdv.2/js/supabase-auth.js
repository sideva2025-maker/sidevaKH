// ============================================================
//  SI-DEVA — Supabase Auth Layer v2.0
//  File: js/supabase-auth.js
//  Tanggung jawab: login/logout/session/role/invite user
//  Dependency: js/supabase-db.js harus dimuat SEBELUM file ini
//              karena memakai SUPABASE_URL, SUPABASE_ANON_KEY, sbFetch
// ============================================================
'use strict';

(function(global){
  const URL = global.SUPABASE_URL || window.SUPABASE_URL;
  const KEY = global.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;

  if(!URL || !KEY){
    console.error('[SBAuth] SUPABASE_URL / ANON_KEY belum di-set');
  }

  // State internal
  let _session = null;
  let _user = null;
  let _role = 'viewer';
  let _ready = false;
  const _listeners = new Set();

  // Helpers
  const lsKey = 'sideva_sb_session';
  const emit = (evt, detail) => {
    _listeners.forEach(fn => { try{ fn(evt, detail); }catch(_){} });
    window.dispatchEvent(new CustomEvent('sb-auth:'+evt, { detail }));
  };
  const saveSession = (s) => {
    _session = s;
    _user = s?.user || null;
    if(s) localStorage.setItem(lsKey, JSON.stringify(s));
    else localStorage.removeItem(lsKey);
    // sync ke global untuk kompatibilitas lama
    global._session = _session;
    global._userRole = _role;
  };
  const loadSession = () => {
    try{
      const raw = localStorage.getItem(lsKey);
      if(!raw) return null;
      const s = JSON.parse(raw);
      if(s.expires_at && s.expires_at*1000 < Date.now()+60000) return null;
      return s;
    }catch(_){ return null; }
  };
  const authHeaders = () => {
    const h = { 'apikey': KEY, 'Content-Type': 'application/json' };
    if(_session?.access_token) h['Authorization'] = 'Bearer '+_session.access_token;
    return h;
  };

  async function fetchAuth(path, method='POST', body=null){
    const res = await fetch(URL + '/auth/v1' + path, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){
      const msg = data.msg || data.message || data.error_description || 'Auth error';
      throw new Error(msg);
    }
    return data;
  }

  async function fetchRole(userId){
    if(!userId) return 'viewer';
    try{
      if(typeof global.sbFetch === 'function'){
        const rows = await global.sbFetch(`/rest/v1/user_roles?user_id=eq.${userId}&select=role`, 'GET');
        return rows?.[0]?.role || 'viewer';
      } else {
        const res = await fetch(`${URL}/rest/v1/user_roles?user_id=eq.${userId}&select=role`, {
          headers: authHeaders()
        });
        const rows = await res.json();
        return rows?.[0]?.role || 'viewer';
      }
    }catch(_){ return 'viewer'; }
  }

  // Public API
  async function login(email, password){
    const data = await fetchAuth('/token?grant_type=password', 'POST', { email, password });
    saveSession(data);
    _role = await fetchRole(data.user?.id);
    global._userRole = _role;
    _ready = true;
    emit('login', { user: _user, role: _role });
    if(typeof global.loadAllData === 'function'){
      global.loadAllData().catch(()=>{});
    }
    return { user: _user, role: _role, session: _session };
  }

  async function logout(){
    try{ await fetchAuth('/logout', 'POST', {}); }catch(_){}
    saveSession(null);
    _role = 'viewer';
    global._userRole = _role;
    emit('logout', {});
    if(typeof global._stopRealtime === 'function') global._stopRealtime();
    return true;
  }

  async function restoreSession(){
    if(_ready) return !!_session;
    const s = loadSession();
    if(!s){ _ready = true; emit('ready', { loggedIn:false }); return false; }
    saveSession(s);
    try{
      const me = await fetchAuth('/user', 'GET');
      _user = me;
      _session.user = me;
      saveSession(_session);
      _role = await fetchRole(me.id);
      global._userRole = _role;
      _ready = true;
      emit('restore', { user: _user, role: _role });
      return true;
    }catch(_){
      saveSession(null);
      _ready = true;
      emit('ready', { loggedIn:false });
      return false;
    }
  }

  async function inviteUser(email, password, role='viewer', displayName=''){
    if(!isAdmin()) throw new Error('Hanya admin yang bisa tambah user');
    const res = await fetch(URL + '/auth/v1/signup', {
      method: 'POST',
      headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        data: { full_name: displayName || email }
      })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){
      throw new Error(data.msg || data.message || 'Gagal membuat akun');
    }
    const newUserId = data?.user?.id || data?.id;
    if(!newUserId) throw new Error('ID user baru tidak ditemukan');

    try{
      if(typeof global.sbFetch === 'function'){
        await global.sbFetch('/rest/v1/user_roles', 'POST', {
          user_id: newUserId,
          email,
          display_name: displayName || email,
          role,
          created_at: new Date().toISOString()
        }, { 'Prefer': 'resolution=ignore-duplicates,return=minimal' });
      }
      if(typeof global.logAudit === 'function'){
        global.logAudit('user_added', { role, display_name: displayName }, newUserId, email);
      }
    }catch(e){
      console.warn('[SBAuth] user dibuat tapi role gagal:', e.message);
    }
    emit('user_invited', { email, role });
    return data;
  }

  async function updatePassword(newPassword){
    if(!_session) throw new Error('Belum login');
    await fetchAuth('/user', 'PUT', { password: newPassword });
    emit('password_updated', {});
    return true;
  }

  async function updateProfile(displayName){
    if(!_session) throw new Error('Belum login');
    await fetchAuth('/user', 'PUT', { data: { full_name: displayName } });
    if(_user) _user.user_metadata = { ...( _user.user_metadata||{} ), full_name: displayName };
    emit('profile_updated', { displayName });
    return true;
  }

  function onAuthChange(fn){
    _listeners.add(fn);
    return ()=> _listeners.delete(fn);
  }

  const getSession = () => _session;
  const getUser = () => _user;
  const getRole = () => _role;
  const isLoggedIn = () => !!_session;
  const isAdmin = () => _role === 'admin';
  const isReady = () => _ready;

  const SBAuth = {
    login, logout, restoreSession, inviteUser,
    updatePassword, updateProfile,
    onAuthChange,
    getSession, getUser, getRole, isLoggedIn, isAdmin, isReady
  };

  global.SBAuth = SBAuth;
  global.sbLogin = login;
  global.sbLogout = logout;
  global.sbRestoreSession = restoreSession;
  global.sbInviteUser = inviteUser;
  global.isAdmin = isAdmin;

  if(!global._sbAuthInit){
    global._sbAuthInit = true;
    document.addEventListener('DOMContentLoaded', () => {
      restoreSession().finally(()=>{
        if(isLoggedIn() && typeof global._startPolling === 'function'){
          global._startPolling();
        }
      });
    });
  }

})(window);
