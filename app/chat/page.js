'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ChatBox from '../ChatBox';

export default function Chat() {
  const [uid, setUid] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) location.href = '/login?next=/chat'; else setUid(data.session.user.id);
    });
  }, []);
  if (!uid) return <p style={{ padding: 20 }}>불러오는 중...</p>;
  return (
    <div className="adm">
      <h1>채팅 상담</h1>
      <p className="muted">운영자가 확인하는 대로 답변드립니다. 집 상태나 작업 전후 사진도 보내실 수 있으며, 사진은 고객님과 곁자리만 볼 수 있습니다.</p>
      <p className="muted">이용 전 <a href="/privacy" target="_blank">개인정보 처리방침</a>을 확인해 주세요.</p>
      <ChatBox threadUser={uid} role="customer" myId={uid} />
    </div>
  );
}
