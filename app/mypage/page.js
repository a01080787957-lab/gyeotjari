'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const won = (n) => Number(n).toLocaleString('ko-KR') + '원';

export default function MyPage() {
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rows, setRows] = useState(null);
  const [reviewed, setReviewed] = useState([]);
  const [rv, setRv] = useState(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  async function load() {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { location.href = '/login?next=/mypage'; return; }
    const id = s.session.user.id; setUid(id);
    const { data: p } = await supabase.from('profiles').select('name,phone,privacy_agreed_at').eq('id', id).single();
    if (p && !p.privacy_agreed_at && localStorage.getItem('gj_privacy')) {
      await supabase.from('profiles').update({ privacy_agreed_at: new Date().toISOString() }).eq('id', id);
      localStorage.removeItem('gj_privacy');
    }
    const { data: r, error } = await supabase.from('reservations')
      .select('id,service_id,reserve_date,reserve_time,status,request,hours,is_regular,est_price,final_price,services(name)').order('created_at', { ascending: false });
    const { data: v } = await supabase.from('reviews').select('reservation_id').eq('user_id', id);
    if (error) setErr(error.message);
    setProfile({ ...p, email: s.session.user.email }); setRows(r || []); setReviewed((v || []).map((x) => x.reservation_id));
  }
  useEffect(() => { load(); }, []);

  async function saveProfile(e) {
    e.preventDefault(); setErr(''); setOk('');
    const { error } = await supabase.from('profiles').update({ name: profile.name, phone: profile.phone }).eq('id', uid);
    if (error) setErr('저장에 실패했습니다: ' + error.message); else setOk('회원정보를 저장했습니다.');
  }
  async function cancel(id) {
    if (!confirm('예약을 취소할까요?')) return;
    const { error } = await supabase.from('reservations').update({ status: '취소' }).eq('id', id);
    if (error) setErr('취소에 실패했습니다: ' + error.message); else load();
  }
  async function sendReview(e) {
    e.preventDefault(); setErr(''); setOk('');
    const { error } = await supabase.from('reviews').insert({ user_id: uid, reservation_id: rv.r.id, service_id: rv.r.service_id, rating: Number(rv.rating), content: rv.content });
    if (error) return setErr('후기 등록에 실패했습니다: ' + error.message);
    setOk('후기가 접수되었습니다. 확인 후 게시됩니다.'); setRv(null); load();
  }

  if (!rows) return <p style={{ padding: 20 }}>불러오는 중...</p>;
  return (
    <div className="adm">
      <h1>마이페이지</h1>
      <form className="card" onSubmit={saveProfile}>
        <b>내 정보</b>
        <label>이메일</label><input value={profile.email || ''} disabled />
        <label>이름</label><input value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        <label>전화번호</label><input type="tel" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        <button>정보 저장</button>
      </form>
      {err && <p className="err">{err}</p>}{ok && <p><b>{ok}</b></p>}
      <h2>예약 내역</h2>
      {rows.length === 0 && <p>아직 예약이 없습니다.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <b>{r.services?.name}</b> · {r.status}<br />
          {r.reserve_date} {r.reserve_time}{r.hours ? ` · ${r.hours}시간` : ''}{r.is_regular ? ' · 정기권' : ''}<br />
          {r.est_price ? <>예상 금액 {won(r.est_price)}<br /></> : null}
          {r.final_price ? <><b>확정 견적 {won(r.final_price)}</b><br /></> : null}
          <span className="muted">{r.request || '요청사항 없음'}</span>
          {['접수', '상담중'].includes(r.status) && <button onClick={() => cancel(r.id)}>예약 취소</button>}
          {r.status === '완료' && !reviewed.includes(r.id) && <button onClick={() => setRv({ r, rating: 5, content: '' })}>후기 남기기</button>}
          {r.status === '완료' && reviewed.includes(r.id) && <p className="muted">후기를 남겨주셔서 감사합니다.</p>}
        </div>
      ))}
      {rv && (
        <form className="card" onSubmit={sendReview}>
          <b>{rv.r.services?.name} 후기</b>
          <label>별점</label>
          <select value={rv.rating} onChange={(e) => setRv({ ...rv, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select>
          <label>후기 내용</label><textarea required rows="4" value={rv.content} onChange={(e) => setRv({ ...rv, content: e.target.value })} />
          <button>후기 등록</button>
        </form>
      )}
      <Link className="btn" href="/reserve">새 예약</Link>
    </div>
  );
}
