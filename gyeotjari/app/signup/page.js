'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function Signup() {
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr(''); setMsg('');
    if (f.password.length < 8) return setErr('비밀번호는 8자 이상이어야 합니다.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { name: f.name, phone: f.phone } }
    });
    setBusy(false);
    if (error) return setErr('가입에 실패했습니다: ' + error.message);
    if (data.session) location.href = '/mypage';
    else setMsg('가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해주세요.');
  }

  return (
    <form onSubmit={submit}>
      <h1>회원가입</h1>
      <label>이름</label><input required value={f.name} onChange={set('name')} />
      <label>전화번호</label><input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="010-0000-0000" />
      <label>이메일</label><input required type="email" value={f.email} onChange={set('email')} />
      <label>비밀번호 (8자 이상)</label><input required type="password" value={f.password} onChange={set('password')} />
      <button disabled={busy}>{busy ? '처리 중...' : '가입하기'}</button>
      {err && <p className="err">{err}</p>}{msg && <p>{msg}</p>}
      <p className="muted">이미 회원이신가요? <Link href="/login">로그인</Link></p>
      <div className="social">
        <button type="button" disabled>Google (설정 필요)</button>
        <button type="button" disabled>Kakao (설정 필요)</button>
        <button type="button" disabled>Naver (설정 필요)</button>
      </div>
    </form>
  );
}
