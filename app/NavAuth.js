'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function NavAuth() {
  const [user, setUser] = useState(undefined);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) { setAdmin(false); return; }
    supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => setAdmin(data?.role === 'admin'));
  }, [user]);
  if (user === undefined) return null;
  if (!user) return <><Link href="/login">로그인</Link><Link href="/signup">회원가입</Link></>;
  return (
    <>
      {admin && <Link href="/admin">관리자</Link>}<Link href="/mypage">마이페이지</Link>
      <a href="#" onClick={async (e) => { e.preventDefault(); await supabase.auth.signOut(); location.href = '/'; }}>로그아웃</a>
    </>
  );
}
