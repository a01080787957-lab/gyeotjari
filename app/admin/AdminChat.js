'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ChatBox from '../ChatBox';

export default function AdminChat() {
  const [me, setMe] = useState(null);
  const [threads, setThreads] = useState([]);
  const [sel, setSel] = useState(null);

  async function load() {
    const { data: s } = await supabase.auth.getSession();
    setMe(s.session?.user.id);
    const { data: m } = await supabase.from('messages').select('thread_user,body,image_path,sender_role,created_at').order('created_at', { ascending: false }).limit(300);
    const last = {};
    (m || []).forEach((x) => { if (!last[x.thread_user]) last[x.thread_user] = x; });
    const ids = Object.keys(last);
    const { data: p } = ids.length ? await supabase.from('profiles').select('id,name,phone').in('id', ids) : { data: [] };
    const pm = Object.fromEntries((p || []).map((x) => [x.id, x]));
    setThreads(ids.map((id) => ({ id, name: pm[id]?.name || '(이름 없음)', phone: pm[id]?.phone || '', last: last[id] })));
  }
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  return (
    <div>
      {threads.length === 0 && <p>아직 상담이 없습니다.</p>}
      {threads.map((t) => (
        <button key={t.id} className={'thread' + (sel === t.id ? ' on' : '')} onClick={() => setSel(t.id)}>
          <b>{t.name}</b> {t.phone}{t.last.sender_role === 'customer' ? ' · 답변 대기' : ''}<br />
          <span>{t.last.body || '사진'}</span>
        </button>
      ))}
      {sel && me && <ChatBox key={sel} threadUser={sel} role="admin" myId={me} />}
    </div>
  );
}
