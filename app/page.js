'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const FAQ = [
  ['예약은 어떻게 하나요?', '서비스를 고르고 날짜·시간·주소를 입력해 예약을 신청하면, 상담 후 확정됩니다.'],
  ['당일 예약이 가능한가요?', '일정에 따라 다릅니다. 신청 후 상담 과정에서 가능 여부를 안내드립니다.'],
  ['결제는 어떻게 하나요?', '결제 방식은 준비 중입니다. 확정되면 이곳에 안내합니다.'],
  ['예약을 취소할 수 있나요?', '마이페이지에서 접수·상담중 상태의 예약은 직접 취소할 수 있습니다.'],
  ['어떤 지역에서 이용할 수 있나요?', '서비스 지역은 준비 중입니다. 확정되면 안내합니다.'],
  ['어떤 심부름이 가능한가요?', '장보기, 생활용품 구매, 우편 발송, 물건 전달 등 일상적인 심부름입니다.'],
  ['병원 동행이 가능한가요?', '이동 동행은 가능합니다. 진료 보조 등 의료행위는 제공하지 않습니다.'],
  ['의료행위도 해주시나요?', '아니요. 의료행위, 주사·투약, 전문 간호, 요양 업무는 제공하지 않습니다.'],
  ['청소도 가능한가요?', '네. 기본 2시간 38,000원, 정기 이용은 35,000원입니다.'],
  ['서비스 이용 중 문제가 발생하면 어떻게 하나요?', '전화·문자·카카오톡으로 바로 문의해 주세요.']
];

export default function Home() {
  const [services, setServices] = useState([]);
  const [cfg, setCfg] = useState({});
  const [open, setOpen] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await supabase.from('services').select('slug,name,summary,description,price_label,image_url').eq('is_active', true).order('sort_order');
      const b = await supabase.from('site_settings').select('key,value');
      setServices(a.data || []);
      setCfg(Object.fromEntries((b.data || []).map((r) => [r.key, r.value])));
      setLoaded(true);
    })();
  }, []);

  const title = cfg.hero_title || '부모님의 일상에,\n든든한 곁자리를.';
  const sub = cfg.hero_subtitle || '장보기부터 생활심부름, 말벗과 생활지원까지 필요한 순간 가까이에서 도와드립니다.';
  const btn = (href, label, alt) => href
    ? <a className={'btn' + (alt ? ' alt' : '')} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{label}</a>
    : <span className="btn alt off">{label} (설정 필요)</span>;

  return (
    <div className="home">
      <div className="hero">
        <div>
          <h1>{title}</h1>
          <p>{sub}</p>
          <div className="cta"><a className="btn" href="#services">서비스 둘러보기</a><Link className="btn alt" href="/reserve">예약 신청하기</Link></div>
        </div>
        <div className="ph">{cfg.hero_image_url ? <img src={cfg.hero_image_url} alt="" /> : '대표 이미지 영역'}</div>
      </div>

      <div className="wrap"><div className="trust">
        <div>원하는 날짜에 신청</div><div>필요한 서비스만 선택</div><div>상담 후 진행</div><div>안전하고 투명한 서비스</div>
      </div></div>

      <section id="services"><div className="wrap">
        <h2>서비스</h2><p className="lead">필요한 도움만 골라 신청하세요. 의료행위와 전문 간병은 제공하지 않습니다.</p>
        {loaded && services.length === 0 && <p>등록된 서비스가 없습니다.</p>}
        <div className="grid">
          {services.map((s) => (
            <article className="svc" key={s.slug}>
              <div className="ph">{s.image_url ? <img src={s.image_url} alt="" /> : '서비스 이미지 영역'}</div>
              <div className="body">
                <h3>{s.name}</h3><p>{s.summary}</p><div className="price">{s.price_label}</div>
                {open[s.slug] && <div className="more">{s.description || s.summary}</div>}
                <div className="row">
                  <button className="btn alt" onClick={() => setOpen({ ...open, [s.slug]: !open[s.slug] })}>{open[s.slug] ? '접기' : '자세히 보기'}</button>
                  <Link className="btn" href={'/reserve?service=' + s.slug}>예약하기</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div></section>

      <section><div className="wrap two">
        <div className="box"><h3>이런 분께 추천합니다</h3><ul><li>부모님을 자주 찾아뵙기 어려운 가족</li><li>장보기나 생활심부름이 필요한 분</li><li>혼자 생활하며 작은 도움이 필요한 분</li><li>스마트폰이나 키오스크 사용이 어려운 분</li></ul></div>
        <div className="box no"><h3>이런 서비스는 제공하지 않습니다</h3><ul><li>의료행위</li><li>주사·투약</li><li>전문 간호</li><li>전문 요양 업무</li><li>위험한 작업</li></ul></div>
      </div></section>

      <section id="how"><div className="wrap">
        <h2>이용방법</h2><p className="lead">네 단계면 끝납니다.</p>
        <ol className="steps"><li>원하는 서비스를 선택합니다.</li><li>날짜와 요청사항을 입력합니다.</li><li>상담 후 예약이 확정됩니다.</li><li>약속된 시간에 서비스를 진행합니다.</li></ol>
      </div></section>

      <section id="faq"><div className="wrap">
        <h2>자주 묻는 질문</h2>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </div></section>

      <section id="reviews"><div className="wrap" style={{ textAlign: 'center' }}>
        <h2>이용후기</h2><div className="box">첫 이용 후기를 남겨주세요.</div>
      </div></section>

      <div className="contact">
        {btn(cfg.phone && 'tel:' + cfg.phone.replace(/[^0-9+]/g, ''), '전화하기')}
        {btn(cfg.sms_number && 'sms:' + cfg.sms_number.replace(/[^0-9+]/g, ''), '문자 보내기', true)}
        {btn(cfg.kakao_url, '카카오톡', true)}
      </div>
    </div>
  );
}
