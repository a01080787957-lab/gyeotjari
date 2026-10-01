'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatBox({ threadUser, role, myId }) {
  const [msgs, setMsgs] = useState([]);
  const [urls, setUrls] = useState({});
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const known = useRef({});
  const end = useRef(null);

  async function refresh() {
    const { data } = await supabase.from('messages').select('*').eq('thread_user', threadUser).order('created_at');
    setMsgs(data || []);
    const paths = (data || []).map((m) => m.image_path).filter((p) => p && !known.current[p]);
    if (paths.length) {
      const { data: s } = await supabase.storage.from('chat-images').createSignedUrls(paths, 3600);
      (s || []).forEach((x) => { if (x.signedUrl) known.current[x.path] = x.signedUrl; });
      setUrls({ ...known.current });
    }
  }
  useEffect(() => {
    known.current = {}; setUrls({}); refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [threadUser]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  async function send(e) {
    e.preventDefault(); setErr('');
    if (!text.trim() && !file) return;
    if (file && (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)) return setErr('사진 파일(8MB 이하)만 보낼 수 있습니다.');
    setBusy(true);
    try {
      let image_path = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        image_path = `${threadUser}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from('chat-images').upload(image_path, file);
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from('messages').insert({ thread_user: threadUser, sender_id: myId, sender_role: role, body: text.trim(), image_path });
      if (error) throw error;
      setText(''); setFile(null); await refresh();
    } catch (x) { setErr('전송에 실패했습니다: ' + x.message); }
    setBusy(false);
  }

  return (
    <div className="chat">
      <div className="msgs">
        {msgs.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>궁금한 점이나 사진을 남겨주세요.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={'bub ' + (m.sender_role === role ? 'me' : 'you')}>
            {m.image_path && (urls[m.image_path] ? <a href={urls[m.image_path]} target="_blank" rel="noreferrer"><img src={urls[m.image_path]} alt="첨부 사진" /></a> : <span className="muted">사진 불러오는 중...</span>)}
            {m.body && <div>{m.body}</div>}
            <small>{m.sender_role === 'admin' ? '곁자리' : '고객'} · {new Date(m.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="cform">
        <textarea rows="2" value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지를 입력하세요" maxLength={2000} />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
        <button disabled={busy}>{busy ? '보내는 중...' : '보내기'}</button>
        {err && <p className="err">{err}</p>}
      </form>
    </div>
  );
}
