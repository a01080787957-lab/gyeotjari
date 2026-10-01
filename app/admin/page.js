'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminChat from './AdminChat';

const SET_FIELDS = [
  ['hero_title', '메인 문구 (줄바꿈 가능)', 'area'], ['hero_subtitle', '소개 문구', 'area'],
  ['time_slots', '예약 가능 시간 (쉼표로 구분, 예: 09:00,10:00,14:00)'], ['closed_weekdays', '쉬는 요일 (0=일 1=월 2=화 3=수 4=목 5=금 6=토, 쉼표로 구분. 예: 0,6)'], ['blocked_dates', '예약 불가 날짜 (쉼표로 구분, 예: 2026-10-03,2026-10-09)'],
  ['max_per_slot', '같은 시간에 받을 수 있는 예약 수 (기본 1)'],
  ['regions', '서비스 가능 지역 (쉼표로 구분, 예: 서울,경기,인천)'],
  ['biz_name', '개인정보 처리방침에 표시: 상호(사업자명)'], ['biz_owner', '개인정보 처리방침에 표시: 대표자 이름'], ['biz_officer', '개인정보 처리방침에 표시: 개인정보 보호책임자 (이름·연락처)'], ['biz_email', '개인정보 처리방침에 표시: 문의 이메일'],
  ['phone', '전화번호'], ['sms_number', '문자번호'], ['kakao_url', '카카오톡 링크 (https://pf.kakao.com/...)'],
  ['oauth_google', '구글 로그인 버튼 켜기 (설정을 마친 뒤 on 이라고 입력)'], ['oauth_kakao', '카카오 로그인 버튼 켜기 (설정을 마친 뒤 on 이라고 입력)']
];
const SVC_TEXT = [['name', '서비스명'], ['summary', '짧은 설명'], ['price_label', '가격 문구 (카드에 보이는 글)']];
const SVC_NUM = [['base_hours', '기본 시간'], ['base_price', '기본 요금'], ['regular_base_price', '정기권 기본 요금'], ['extra_hour_price', '추가 1시간 요금'], ['regular_extra_hour_price', '정기권 추가 1시간'], ['unit_price', '시간당 요금(시간제 서비스)']];
const STATUS = ['접수', '상담중', '확정', '완료', '취소'];

async function upload(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('site-images').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

export default function Admin() {
  const [state, setState] = useState('loading');
  const [tab, setTab] = useState('settings');
  const [cfg, setCfg] = useState({});
  const [svcs, setSvcs] = useState([]);
  const [resv, setResv] = useState([]);
  const [revs, setRevs] = useState([]);
  const [pend, setPend] = useState({ resv: 0, chat: 0 });
  const [fp, setFp] = useState({});
  const [msg, setMsg] = useState('');

  async function load() {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { location.href = '/login?next=/admin'; return; }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', s.session.user.id).single();
    if (p?.role !== 'admin') { setState('denied'); return; }
    const a = await supabase.from('site_settings').select('key,value');
    const b = await supabase.from('services').select('*').order('sort_order');
    const c = await supabase.from('reservations').select('*, services(name)').order('created_at', { ascending: false });
    const d = await supabase.from('reviews').select('*, services(name)').order('created_at', { ascending: false });
    setRevs(d.data || []);
    setCfg(Object.fromEntries((a.data || []).map((r) => [r.key, r.value])));
    setSvcs(b.data || []); setResv(c.data || []); setState('ok');
  }
  useEffect(() => { load(); }, []);
  const say = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3500); };
  useEffect(() => {
    if (state !== 'ok') return;
    let prev = null;
    async function poll() {
      const a = await supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', '접수');
      const { data: m } = await supabase.from('messages').select('thread_user,sender_role').order('created_at', { ascending: false }).limit(300);
      const last = {}; (m || []).forEach((x) => { if (!last[x.thread_user]) last[x.thread_user] = x; });
      const cur = { resv: a.count || 0, chat: Object.values(last).filter((x) => x.sender_role === 'customer').length };
      if (prev && (cur.resv > prev.resv || cur.chat > prev.chat)) {
        say('새 예약 또는 새 메시지가 도착했습니다.');
        if ('Notification' in window && Notification.permission === 'granted') new Notification('곁자리', { body: '새 예약 또는 새 메시지가 도착했습니다.' });
      }
      prev = cur; setPend(cur);
      document.title = (cur.resv + cur.chat > 0 ? `(${cur.resv + cur.chat}) ` : '') + '곁자리 관리자';
    }
    poll(); const t = setInterval(poll, 20000);
    return () => clearInterval(t);
  }, [state]);
  async function sendQuote(r) {
    const v = Number(fp[r.id]);
    if (!v) return say('금액을 입력해주세요.');
    const { error } = await supabase.from('reservations').update({ final_price: v }).eq('id', r.id);
    if (error) return say('저장 실패: ' + error.message);
    if (r.user_id) {
      const { data: s } = await supabase.auth.getSession();
      await supabase.from('messages').insert({ thread_user: r.user_id, sender_id: s.session.user.id, sender_role: 'admin',
        body: `[견적 안내] ${r.services?.name} ${r.reserve_date} ${r.reserve_time} 예약의 확정 견적은 ${v.toLocaleString('ko-KR')}원입니다. 문의는 이 채팅으로 남겨주세요.` });
    }
    setResv(resv.map((x) => (x.id === r.id ? { ...x, final_price: v } : x)));
    say('견적을 보냈습니다.');
  }

  async function saveCfg() {
    const rows = [...SET_FIELDS.map((f) => f[0]), 'hero_image_url'].map((key) => ({ key, value: cfg[key] || '', updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('site_settings').upsert(rows);
    say(error ? '저장 실패: ' + error.message : '저장했습니다.');
  }
  async function pickCfgImg(e) {
    const f = e.target.files[0]; if (!f) return;
    try { const url = await upload(f); setCfg({ ...cfg, hero_image_url: url }); say('업로드했습니다. 아래 저장 버튼을 눌러야 반영됩니다.'); } catch (x) { say('업로드 실패: ' + x.message); }
  }
  const setS = (i, k, v) => setSvcs(svcs.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  async function pickSvcImg(i, e) {
    const f = e.target.files[0]; if (!f) return;
    try { setS(i, 'image_url', await upload(f)); say('업로드했습니다. 저장 버튼을 눌러야 반영됩니다.'); } catch (x) { say('업로드 실패: ' + x.message); }
  }
  async function saveSvc(s) {
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const patch = { name: s.name, summary: s.summary, description: s.description, price_label: s.price_label, image_url: s.image_url || null, is_active: s.is_active,
      can_do: String(Array.isArray(s.can_do) ? s.can_do.join('\n') : s.can_do || '').split('\n').map((x) => x.trim()).filter(Boolean) };
    SVC_NUM.forEach(([k]) => { patch[k] = num(s[k]); });
    const { error } = await supabase.from('services').update(patch).eq('id', s.id);
    say(error ? '저장 실패: ' + error.message : `'${s.name}' 저장했습니다.`);
  }
  async function addSvc() {
    const slug = 'svc-' + Date.now().toString(36);
    const { error } = await supabase.from('services').insert({ slug, name: '새 서비스', sort_order: svcs.length + 1, is_active: false });
    if (error) say('추가 실패: ' + error.message); else load();
  }
  async function togglePub(r) {
    const { error } = await supabase.from('reviews').update({ is_published: !r.is_published }).eq('id', r.id);
    if (error) say('변경 실패: ' + error.message); else setRevs(revs.map((x) => (x.id === r.id ? { ...x, is_published: !r.is_published } : x)));
  }
  async function delRev(id) {
    if (!confirm('이 후기를 삭제할까요?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) say('삭제 실패: ' + error.message); else setRevs(revs.filter((x) => x.id !== id));
  }
  async function setStatus(id, status) {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
    if (error) say('변경 실패: ' + error.message); else setResv(resv.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  if (state === 'loading') return <p style={{ padding: 20 }}>불러오는 중...</p>;
  if (state === 'denied') return <div className="card" style={{ margin: 20 }}><h1>관리자 전용 페이지입니다</h1><p>관리자 계정으로 로그인해 주세요.</p></div>;

  const today = new Date().toISOString().slice(0, 10);
  const cnt = (f) => resv.filter(f).length;
  return (
    <div className="adm">
      <h1>관리자</h1>
      <div className="tabs">{[['settings', '홈페이지'], ['services', '서비스'], ['resv', '예약'], ['chat', '상담'], ['revs', '후기']].map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}{k === 'resv' && pend.resv > 0 ? ` (${pend.resv})` : ''}{k === 'chat' && pend.chat > 0 ? ` (${pend.chat})` : ''}</button>)}</div>
      {typeof Notification !== 'undefined' && Notification.permission === 'default' && <button onClick={() => Notification.requestPermission()}>브라우저 알림 켜기</button>}
      {msg && <div className="toast">{msg}</div>}

      {tab === 'settings' && (<div>
        {SET_FIELDS.map(([k, t, area]) => (<div key={k}><label>{t}</label>
          {area ? <textarea rows="3" value={cfg[k] || ''} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} /> : <input value={cfg[k] || ''} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} />}</div>))}
        <label>대표 이미지</label>
        <img className="thumb" src={cfg.hero_image_url || '/images/hero.svg'} alt="" />
        <input type="file" accept="image/*" onChange={pickCfgImg} />
        {cfg.hero_image_url && <button type="button" onClick={() => setCfg({ ...cfg, hero_image_url: '' })}>기본 그림으로 되돌리기</button>}
        <button onClick={saveCfg}>저장</button>
      </div>)}

      {tab === 'services' && (<div>
        {svcs.map((s, i) => (<div className="card" key={s.id}>
          <img className="thumb" src={s.image_url || '/images/' + s.slug + '.svg'} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <input type="file" accept="image/*" onChange={(e) => pickSvcImg(i, e)} />
          {SVC_TEXT.map(([k, t]) => (<div key={k}><label>{t}</label><input value={s[k] || ''} onChange={(e) => setS(i, k, e.target.value)} /></div>))}
          <label>자세한 설명</label><textarea rows="4" value={s.description || ''} onChange={(e) => setS(i, 'description', e.target.value)} />
          <label>제공 업무 (한 줄에 하나씩)</label><textarea rows="4" value={Array.isArray(s.can_do) ? s.can_do.join('\n') : s.can_do || ''} onChange={(e) => setS(i, 'can_do', e.target.value)} />
          {SVC_NUM.map(([k, t]) => (<div key={k}><label>{t}</label><input type="number" value={s[k] ?? ''} onChange={(e) => setS(i, k, e.target.value)} /></div>))}
          <label><input type="checkbox" checked={!!s.is_active} onChange={(e) => setS(i, 'is_active', e.target.checked)} />홈페이지에 표시</label>
          <button onClick={() => saveSvc(s)}>이 서비스 저장</button>
        </div>))}
        <button onClick={addSvc}>서비스 추가</button>
        <p className="muted">서비스를 지우는 대신 "홈페이지에 표시"를 꺼서 숨길 수 있습니다.</p>
      </div>)}

      {tab === 'chat' && <AdminChat />}

      {tab === 'revs' && (<div>
        {revs.length === 0 && <p>아직 후기가 없습니다.</p>}
        {revs.map((r) => (<div className="card" key={r.id}>
          {'★'.repeat(r.rating)} · {r.services?.name} · {r.created_at.slice(0, 10)}<br />{r.content}
          <button onClick={() => togglePub(r)}>{r.is_published ? '게시 중 (누르면 숨김)' : '숨김 (누르면 게시)'}</button>
          <button onClick={() => delRev(r.id)}>삭제</button>
        </div>))}
      </div>)}

      {tab === 'resv' && (<div>
        <div className="card">오늘 예약 {cnt((r) => r.reserve_date === today)} · 전체 {resv.length} · 신규 {cnt((r) => r.status === '접수')} · 완료 {cnt((r) => r.status === '완료')} · 취소 {cnt((r) => r.status === '취소')}</div>
        {resv.length === 0 && <p>아직 예약이 없습니다.</p>}
        {resv.map((r) => (<div className="card" key={r.id}>
          <b>{r.services?.name}</b> · {r.reserve_date} {r.reserve_time}<br />
          {r.name} · <a href={'tel:' + r.phone}>{r.phone}</a><br />{r.region ? '[' + r.region + '] ' : ''}{r.address}<br />
          <span className="muted">{r.hours ? r.hours + '시간' : ''}{r.is_regular ? ' · 정기권' : ''}{r.est_price ? ' · 예상 ' + r.est_price.toLocaleString('ko-KR') + '원' : ''}<br />{r.request || '요청사항 없음'}</span>
          <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>{STATUS.map((x) => <option key={x}>{x}</option>)}</select>
          <label>확정 견적 (원)</label>
          <input type="number" value={fp[r.id] ?? r.final_price ?? ''} onChange={(e) => setFp({ ...fp, [r.id]: e.target.value })} />
          <button onClick={() => sendQuote(r)}>견적 보내기 (고객 채팅으로 전송)</button>
        </div>))}
      </div>)}
    </div>
  );
}
