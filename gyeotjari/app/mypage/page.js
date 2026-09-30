'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function MyPage() {
  const [profile, setProfile] = useState(null);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { location.href = '/login?next=/mypage'; return; }
    const uid = s.session.user.id;
    const { data: p } = await supabase.from('profiles').select('name,phone').eq('id', uid).single();
    const { data: r, error } = await supabase.from('reservations')
      .select('id,reserve_date,reserve_time,status,request,services(name)').order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setProfile({ ...p, email: s.session.user.email }); setRows(r || []);
  }
  useEffect(() => { load(); }, []);

  async function cancel(id) {
    if (!confirm('예약을 취소할까요?')) return;
    const { error } = await supabase.from('reservations').update({ status: '취소' }).eq('id', id);
    if (error) setErr('취소에 실패했습니다: ' + error.message); else load();
  }

  if (!rows) return <p>불러오는 중...</p>;
  return (
    <>
      <h1>마이페이지</h1>
      <div className="card"><b>{profile?.name}</b><br />{profile?.email}<br />{profile?.phone}</div>
      <h2>예약 내역</h2>
      {err && <p className="err">{err}</p>}
      {rows.length === 0 && <p>아직 예약이 없습니다.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <b>{r.services?.name}</b> · {r.status}<br />
          {r.reserve_date} {r.reserve_time}<br />
          <span className="muted">{r.request || '요청사항 없음'}</span>
          {['접수', '상담중'].includes(r.status) && <button onClick={() => cancel(r.id)}>예약 취소</button>}
        </div>
      ))}
      <Link className="btn" href="/reserve">새 예약</Link>
    </>
  );
}
