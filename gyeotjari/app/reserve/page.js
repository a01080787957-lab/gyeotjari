'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const TIMES = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
const won = (n) => Number(n).toLocaleString('ko-KR') + '원';

export default function Reserve() {
  const [user, setUser] = useState(undefined);
  const [services, setServices] = useState([]);
  const [f, setF] = useState({ slug: '', reserve_date: '', reserve_time: '', name: '', phone: '', address: '', request: '', extra: 0, hours: 1, regular: false, agree: false, scope: false });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s.session?.user ?? null;
      if (!u) { location.href = '/login?next=/reserve' + encodeURIComponent(location.search); return; }
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('name,phone').eq('id', u.id).single();
      const { data: list } = await supabase.from('services').select('*').eq('is_active', true).order('sort_order');
      const want = new URLSearchParams(location.search).get('service');
      setServices(list || []);
      setF((x) => ({ ...x, name: p?.name || '', phone: p?.phone || '', slug: (list || []).find((v) => v.slug === want)?.slug || '' }));
    })();
  }, []);

  const svc = services.find((v) => v.slug === f.slug);
  let hours = null, price = null;
  if (svc?.base_price) {
    const ex = Number(f.extra);
    hours = svc.base_hours + ex;
    price = (f.regular ? svc.regular_base_price : svc.base_price) + ex * (f.regular ? svc.regular_extra_hour_price : svc.extra_hour_price);
  } else if (svc?.unit_price) {
    hours = Number(f.hours);
    price = svc.unit_price * hours;
  }

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!f.scope) return setErr('제공하지 않는 업무 안내를 확인해주세요.');
    if (!f.agree) return setErr('개인정보 수집·이용에 동의해주세요.');
    setBusy(true);
    const { error } = await supabase.from('reservations').insert({
      user_id: user.id, service_id: svc.id, reserve_date: f.reserve_date, reserve_time: f.reserve_time,
      name: f.name, phone: f.phone, address: f.address, request: f.request, privacy_agreed: true,
      hours, is_regular: !!svc.base_price && f.regular, est_price: price
    });
    setBusy(false);
    if (error) return setErr('예약 신청에 실패했습니다: ' + error.message);
    setDone(true);
  }

  if (!user) return <p>불러오는 중...</p>;
  if (done) return (
    <div className="card">
      <h1>예약 신청이 접수되었습니다.</h1>
      <p>내용을 확인한 뒤 연락드리겠습니다. 진행 상황은 마이페이지에서 볼 수 있습니다.</p>
      <Link className="btn" href="/mypage">예약 내역 보기</Link>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={submit}>
      <h1>예약 신청</h1>
      <label>서비스</label>
      <select required value={f.slug} onChange={set('slug')}>
        <option value="">선택해주세요</option>
        {services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
      </select>

      {svc?.base_price && (<>
        <label><input type="checkbox" checked={f.regular} onChange={set('regular')} />정기권으로 이용 (정기권 가격 적용)</label>
        <label>추가 시간 (기본 {svc.base_hours}시간 외)</label>
        <select value={f.extra} onChange={set('extra')}>{[0,1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n === 0 ? '추가 없음' : `+${n}시간`}</option>)}</select>
      </>)}
      {svc && !svc.base_price && svc.unit_price && (<>
        <label>이용 시간</label>
        <select value={f.hours} onChange={set('hours')}>{[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}시간</option>)}</select>
      </>)}
      {price != null && (
        <div className="est">예상 금액 <b>{won(price)}</b><br /><span className="muted">{hours}시간 기준 · 실제 금액은 상담 후 확정됩니다{svc.slug === 'errand' ? ' · 긴급 요청은 비용이 올라갈 수 있습니다' : ''}</span></div>
      )}

      <label>날짜</label><input required type="date" min={today} value={f.reserve_date} onChange={set('reserve_date')} />
      <label>시간</label>
      <select required value={f.reserve_time} onChange={set('reserve_time')}>
        <option value="">선택해주세요</option>{TIMES.map((t) => <option key={t}>{t}</option>)}
      </select>
      <label>이름</label><input required value={f.name} onChange={set('name')} />
      <label>전화번호</label><input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} />
      <label>주소</label><input required value={f.address} onChange={set('address')} placeholder="서비스 받으실 주소" />
      <label>요청사항</label><textarea rows="4" value={f.request} onChange={set('request')} />
      <label><input type="checkbox" checked={f.scope} onChange={set('scope')} />의료행위·투약·간병·위험한 작업은 제공되지 않음을 확인했습니다 (필수)</label>
      <label><input type="checkbox" checked={f.agree} onChange={set('agree')} />개인정보 수집·이용에 동의합니다 (필수)</label>
      <button disabled={busy || !svc}>{busy ? '신청 중...' : '예약 신청하기'}</button>
      {err && <p className="err">{err}</p>}
    </form>
  );
}
