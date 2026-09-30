'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr('이메일 또는 비밀번호를 확인해주세요.');
    const next = new URLSearchParams(location.search).get('next');
    location.href = next && next.startsWith('/') ? next : '/mypage';
  }

  return (
    <form onSubmit={submit}>
      <h1>로그인</h1>
      <label>이메일</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label>비밀번호</label><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={busy}>{busy ? '확인 중...' : '로그인'}</button>
      {err && <p className="err">{err}</p>}
      <p className="muted">처음이신가요? <Link href="/signup">회원가입</Link></p>
      <div className="social">
        <button type="button" disabled>Google (설정 필요)</button>
        <button type="button" disabled>Kakao (설정 필요)</button>
        <button type="button" disabled>Naver (설정 필요)</button>
      </div>
    </form>
  );
}
