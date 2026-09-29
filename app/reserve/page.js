'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const TIMES = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

export default function Reserve() {
  const [user, setUser] = useState(undefined);
  const [services, setServices] = useState([]);
  const [f, setF] = useState({ service_id: '', reserve_date: '', reserve_time: '', name: '', phone: '', address: '', request: '', agree: false });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s.session?.user ?? null;
      if (!u) { location.href = '/login?next=/reserve'; return; }
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('name,phone').eq('id', u.id).single();
      const { data: list } = await supabase.from('services').select('id,slug,name,price_label').eq('is_active', true).order('sort_order');
      const want = new URLSearchParams(location.search).get('service');
      setServices(list || []);
      setF((x) => ({ ...x, name: p?.name || '', phone: p?.phone || '', service_id: (list || []).find((v) => v.slug === want)?.id || '' }));
    })();
  }, []);

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!f.agree) return setErr('개인정보 수집·이용에 동의해주세요.');
    setBusy(true);
    const { error } = await supabase.from('reservations').insert({
      user_id: user.id, service_id: f.service_id, reserve_date: f.reserve_date, reserve_time: f.reserve_time,
      name: f.name, phone: f.phone, address: f.address, request: f.request, privacy_agreed: true
    });
    setBusy(false);
    if (error) return setErr('예약 신청에 실패했습니다: ' + error.message);
    setDone(true);
  }

  if (!user) return <p>불러오는 중...</p>;
  if (done) return (
    <div className="card">
      <h1>예약 신청이 완료되었습니다.</h1>
      <p>확인 후 연락드리겠습니다. 진행 상황은 마이페이지에서 볼 수 있습니다.</p>
      <Link className="btn" href="/mypage">예약 내역 보기</Link>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={submit}>
      <h1>예약 신청</h1>
      <label>서비스</label>
      <select required value={f.service_id} onChange={set('service_id')}>
        <option value="">선택해주세요</option>
        {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.price_label}</option>)}
      </select>
      <label>날짜</label><input required type="date" min={today} value={f.reserve_date} onChange={set('reserve_date')} />
      <label>시간</label>
      <select required value={f.reserve_time} onChange={set('reserve_time')}>
        <option value="">선택해주세요</option>{TIMES.map((t) => <option key={t}>{t}</option>)}
      </select>
      <label>이름</label><input required value={f.name} onChange={set('name')} />
      <label>전화번호</label><input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} />
      <label>주소</label><input required value={f.address} onChange={set('address')} placeholder="서비스 받으실 주소" />
      <label>요청사항</label><textarea rows="4" value={f.request} onChange={set('request')} />
      <label><input type="checkbox" checked={f.agree} onChange={set('agree')} />개인정보 수집·이용에 동의합니다 (필수)</label>
      <button disabled={busy}>{busy ? '신청 중...' : '예약 신청'}</button>
      {err && <p className="err">{err}</p>}
    </form>
  );
}
