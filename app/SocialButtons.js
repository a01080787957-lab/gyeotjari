'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"/><path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"/></svg>
);
const KakaoLogo = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><path fill="#000" d="M9 1.5C4.58 1.5 1 4.3 1 7.75c0 2.24 1.5 4.2 3.75 5.3-.16.6-.6 2.15-.68 2.49-.1.42.15.41.32.3.13-.09 2.13-1.44 3-2.03.53.08 1.06.12 1.61.12 4.42 0 8-2.8 8-6.25S13.42 1.5 9 1.5z"/></svg>
);

const NaverLogo = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="3" fill="#03C75A"/><path fill="#fff" d="M11.3 10.4L8.5 6H6v8h2.7V9.6L11.5 14H14V6h-2.7z"/></svg>
);

// 관리자 페이지에서 oauth_google / oauth_kakao 값을 'on' 으로 바꾸면 버튼이 켜집니다.
export default function SocialButtons() {
  const [on, setOn] = useState({});
  const [err, setErr] = useState('');
  const [agree, setAgree] = useState(false);
  useEffect(() => {
    supabase.from('site_settings').select('key,value').in('key', ['oauth_google', 'oauth_kakao'])
      .then(({ data }) => setOn(Object.fromEntries((data || []).map((r) => [r.key, r.value === 'on']))));
  }, []);

  async function go(provider) {
    setErr('');
    try { localStorage.setItem('gj_privacy', '1'); } catch (e) {}
    const next = new URLSearchParams(location.search).get('next');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: location.origin + (next && next.startsWith('/') ? next : '/mypage') }
    });
    if (error) setErr('소셜 로그인에 실패했습니다: ' + error.message);
  }

  const item = (provider, label, flag, Logo, cls) => on[flag]
    ? <button type="button" className={cls} disabled={!agree} onClick={() => go(provider)}><Logo />{label}로 시작하기</button>
    : <button type="button" className={cls} disabled><Logo />{label} (설정 필요)</button>;

  return (
    <div className="social">
      <label><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><a href="/privacy" target="_blank">개인정보 처리방침</a>에 동의합니다 (소셜 로그인 시 필수)</label>
      {item('google', 'Google', 'oauth_google', GoogleLogo, 'gg')}
      {item('kakao', '카카오', 'oauth_kakao', KakaoLogo, 'kk')}
      <button type="button" className="nv" disabled><NaverLogo />Naver (준비 중)</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
