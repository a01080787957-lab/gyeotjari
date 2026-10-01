'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const won = (n) => Number(n).toLocaleString('ko-KR') + '원';
const TILES = [
  ['우편 보내기', '우체국 방문이 번거로운 우편·택배 발송을 대신합니다.'],
  ['물건 전달', '가까운 곳으로 물건을 전달해 드립니다.'],
  ['서류 받아오기', '필요한 서류를 대신 받아옵니다.'],
  ['장보기', '필요한 식료품을 대신 구매해 전달합니다.'],
  ['생활용품 구매', '생활에 필요한 물건을 대신 구매합니다.'],
  ['집안 정리', '흩어진 물건과 생활공간을 정리합니다.'],
  ['간단한 청소', '짧은 시간의 기본 청소를 도와드립니다.'],
  ['부모님 댁 확인', '부모님 댁의 생활 관련 필요한 일을 대신 확인합니다.'],
  ['생활공간 정리', '옷장·주방 등 생활공간을 정돈합니다.'],
  ['기타 생활심부름', '가능한 범위의 일이면 먼저 문의해 주세요.']
];
const FAQ = [
  ['어떤 심부름이 가능한가요?', '우편 보내기, 서류 받아오기, 물건 전달, 장보기 등 일상적인 심부름입니다. 위험한 작업과 의료행위는 제외됩니다.'],
  ['당일 예약이 가능한가요?', '일정에 따라 다릅니다. 신청 후 상담 과정에서 가능 여부를 안내드립니다.'],
  ['청소 도구는 누가 준비하나요?', '세제와 소품은 곁자리가 준비합니다. 청소기·빗자루 같은 부피가 큰 도구는 고객님 댁의 것을 사용할 수 있습니다.'],
  ['정기권은 어떻게 이용하나요?', '예약 화면에서 정기권을 선택하면 정기권 가격이 적용됩니다. 자세한 이용 방식은 상담 때 안내드립니다.'],
  ['부모님 댁에 대신 방문할 수 있나요?', '네. 부모님 댁 가사 지원으로 신청하시면 진행한 작업을 자녀·고객님께 보고드립니다.'],
  ['교통비가 따로 있나요?', '시간 걸리는 일은 교통비를 별도로 청구하지 않습니다.'],
  ['예약 후 취소할 수 있나요?', '마이페이지에서 접수·상담중 상태의 예약은 직접 취소할 수 있습니다.'],
  ['긴급한 심부름도 가능한가요?', '가능 여부는 상담 후 안내드리며, 긴급 요청은 비용이 올라갈 수 있습니다.'],
  ['병원 동행도 가능한가요?', '현재 핵심 서비스에는 포함되어 있지 않습니다. 필요하시면 먼저 문의해 주세요.'],
  ['의료행위나 간병도 하나요?', '아니요. 의료행위, 투약, 전문 간호·간병, 요양 업무는 제공하지 않습니다.']
];

export default function Home() {
  const [services, setServices] = useState([]);
  const [cfg, setCfg] = useState({});
  const [open, setOpen] = useState({});
  const [tile, setTile] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const [revs, setRevs] = useState([]);

  useEffect(() => {
    (async () => {
      const a = await supabase.from('services').select('*').eq('is_active', true).order('sort_order');
      const b = await supabase.from('site_settings').select('key,value');
      setServices(a.data || []);
      setCfg(Object.fromEntries((b.data || []).map((r) => [r.key, r.value])));
      const c = await supabase.from('reviews').select('rating,content,created_at,services(name)').eq('is_published', true).order('created_at', { ascending: false }).limit(6);
      setRevs(c.data || []);
      setLoaded(true);
    })();
  }, []);

  const title = cfg.hero_title || '번거롭고 귀찮은 일,\n곁자리가 대신합니다.';
  const sub = cfg.hero_subtitle || '집 청소부터 부모님 댁 가사 지원, 시간이 걸리는 생활심부름까지 필요한 일을 가까이에서 도와드립니다.';
  const tel = (cfg.phone || '010-8078-7957').replace(/[^0-9+]/g, '');
  const kakao = cfg.kakao_url;
  const kbtn = (cls) => kakao
    ? <a className={cls} href={kakao} target="_blank" rel="noreferrer">카카오톡 상담</a>
    : <span className={cls + ' off'}>카카오톡 (링크 설정 필요)</span>;

  return (
    <div className="home">
      <div className="hero">
        <div>
          <h1>{title}</h1>
          <p>{sub}</p>
          <div className="cta">
            <a className="btn" href="#services">서비스 둘러보기</a>
            <Link className="btn alt" href="/reserve">예약 신청하기</Link>
            <Link className="btn alt" href="/chat">채팅 상담</Link>
            <a className="btn alt" href={'tel:' + tel}>전화 문의</a>
            {kbtn('btn alt')}
          </div>
        </div>
        <div className="ph"><img src={cfg.hero_image_url || '/images/hero.svg'} alt="곁자리 일러스트" /></div>
      </div>

      <div className="wrap"><div className="trust">
        <div>투명한 가격</div><div>필요한 일만 선택</div><div>교통비 별도 없음</div><div>상담 후 진행</div>
      </div></div>

      <section id="services"><div className="wrap">
        <h2>핵심 서비스 3가지</h2><p className="lead">필요한 일만 골라 신청하세요.</p>
        {loaded && services.length === 0 && <p>등록된 서비스가 없습니다.</p>}
        <div className="grid">
          {services.map((s) => (
            <article className="svc" key={s.slug}>
              <div className="ph"><img src={s.image_url || '/images/' + s.slug + '.svg'} alt={s.name} /></div>
              <div className="body">
                <h3>{s.name}</h3><p>{s.summary}</p><div className="price">{s.price_label}</div>
                <ul style={{ margin: 0, paddingLeft: '1.2em', fontSize: 16 }}>
                  {(open[s.slug] ? s.can_do : (s.can_do || []).slice(0, 3)).map((x) => <li key={x}>{x}</li>)}
                </ul>
                {open[s.slug] && <div className="more">{s.description}</div>}
                <div className="row">
                  <button className="btn alt" onClick={() => setOpen({ ...open, [s.slug]: !open[s.slug] })}>{open[s.slug] ? '접기' : '자세히 보기'}</button>
                  <Link className="btn" href={'/reserve?service=' + s.slug}>예약하기</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div></section>

      <section className="band"><div className="wrap">
        <h2>이런 일을 부탁할 수 있습니다</h2><p className="lead">눌러서 자세한 내용을 확인하세요.</p>
        <div className="tiles">
          {TILES.map(([t, d], i) => (
            <button key={t} className="tile" onClick={() => setTile(tile === i ? -1 : i)}>{t}{tile === i && <small>{d}</small>}</button>
          ))}
        </div>
      </div></section>

      <section id="price"><div className="wrap">
        <h2>가격표</h2><p className="lead">가격은 투명하게 공개합니다.</p>
        <div className="grid">
          {services.map((s) => (
            <div className="pc" key={s.slug}>
              <h3>{s.name}</h3>
              {s.base_price ? (
                <dl>
                  <dt>기본 ({s.base_hours}시간)</dt><dd>{won(s.base_price)}</dd>
                  <dt>정기권 ({s.base_hours}시간)</dt><dd>{won(s.regular_base_price)}</dd>
                  <dt>추가시간 (1시간)</dt><dd>{won(s.extra_hour_price)}</dd>
                  <dt>정기권 추가시간 (1시간)</dt><dd>{won(s.regular_extra_hour_price)}</dd>
                </dl>
              ) : (
                <dl><dt>1시간</dt><dd>{s.unit_price ? won(s.unit_price) : '상담 후 안내'}</dd><dt>교통비</dt><dd>별도 없음</dd></dl>
              )}
              {s.slug === 'errand' && <p className="muted">긴급 요청은 별도 안내드립니다.</p>}
              {s.slug === 'cleaning' && <p className="muted">세제·소품은 곁자리가 준비하고, 청소기 등 큰 도구는 고객님 것을 사용할 수 있습니다.</p>}
              <Link className="btn" href={'/reserve?service=' + s.slug}>예약하기</Link>
            </div>
          ))}
        </div>
      </div></section>

      <section className="band"><div className="wrap">
        <h2>왜 곁자리인가</h2>
        <div className="feat">
          <div>투명한 가격</div><div>필요한 일만 선택</div><div>작업 내용을 명확하게 안내</div>
          <div>부모님 댁도 대신 방문 가능</div><div>생활 속 작은 일부터 도움</div><div>문의하기 쉬움</div>
        </div>
      </div></section>

      <section id="how"><div className="wrap">
        <h2>곁자리가 일하는 방식</h2><p className="lead">네 단계면 끝납니다.</p>
        <ol className="steps">
          <li><b>원하는 서비스 선택</b><br />집 청소, 부모님 댁 가사 지원, 시간 걸리는 일 중 고릅니다.</li>
          <li><b>날짜와 요청사항 입력</b><br />예상 금액을 바로 확인할 수 있습니다.</li>
          <li><b>내용 확인과 상담</b><br />곁자리가 내용을 확인하고 연락드립니다.</li>
          <li><b>약속된 시간에 진행</b><br />정해진 시간에 서비스를 진행합니다.</li>
        </ol>
      </div></section>

      <section className="band dark"><div className="wrap">
        <h2>멀리 계신 부모님,<br />작은 일까지 직접 챙기기 어려우시죠?</h2>
        <p>직접 찾아뵙기 어려운 상황에서도 부모님 댁에 필요한 작은 생활지원과 가사 일을 곁자리가 도와드립니다.</p>
        <Link className="btn" href="/reserve?service=parent-care">부모님 댁 가사 지원 알아보기</Link>
      </div></section>

      <section><div className="wrap two">
        <div className="box"><h3>투명한 서비스 진행</h3><ul>
          <li>집 청소: 세제·소품은 곁자리가 준비합니다.</li>
          <li>부모님 댁 가사 지원: 진행한 작업을 투명하게 보고합니다.</li>
          <li>시간 걸리는 일: 소요 시간을 확인할 수 있게 안내합니다.</li>
          <li>작업 전후 사진 제공은 준비 중이며, 고객 동의 없이 공개하지 않습니다.</li></ul></div>
        <div className="box no"><h3>이런 서비스는 제공하지 않습니다</h3><ul>
          <li>의료행위·투약</li><li>전문 간호·간병</li><li>전문 요양 업무</li><li>위험한 작업</li></ul></div>
      </div></section>

      <section id="reviews"><div className="wrap" style={{ textAlign: 'center' }}>
        <h2>이용 후기</h2>
        {revs.length === 0 ? <div className="box">곧 이용 고객의 실제 후기를 만나보세요.</div> : <div className="grid" style={{ textAlign: 'left' }}>{revs.map((r, i) => <div className="box" key={i}><div style={{ color: 'var(--gold)' }}>{'★'.repeat(r.rating)}</div><p>{r.content}</p><span className="muted">{r.services?.name} · {r.created_at.slice(0, 10)}</span></div>)}</div>}
      </div></section>

      <section id="faq" className="band"><div className="wrap">
        <h2>자주 묻는 질문</h2>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </div></section>

      <section id="info"><div className="wrap two">
        <div className="box"><h3>지역·이용 안내</h3><p>서비스 지역과 결제 방식은 준비 중입니다. 확정되면 이곳에 안내합니다. 궁금한 점은 전화나 카카오톡으로 문의해 주세요.</p></div>
        <div className="box"><h3>문의</h3><p>전화 {cfg.phone || '010-8078-7957'}</p>
          <div className="cta"><a className="btn" href={'tel:' + tel}>전화하기</a><a className="btn alt" href={'sms:' + tel}>문자 보내기</a>{kbtn('btn alt')}</div></div>
      </div></section>

      <footer style={{ padding: '28px 20px 100px', textAlign: 'center', color: 'var(--sub)', fontSize: 15 }}>
        곁자리 · 항상 곁에 있겠습니다 &lt;곁자리 드림&gt;<br />의료·간병·요양 서비스가 아닙니다.<br /><Link href="/privacy">개인정보 처리방침</Link>
      </footer>

      <div className="contact">
        <a className="btn" href={'tel:' + tel}>전화</a>
        {kbtn('btn alt')}
        <Link className="btn alt" href="/chat">채팅</Link>
        <Link className="btn alt" href="/reserve">예약</Link>
      </div>
    </div>
  );
}
