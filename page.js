import Link from 'next/link';
export default function Home() {
  return (
    <>
      <h1>부모님의 일상에,<br />든든한 곁자리를.</h1>
      <p>장보기부터 생활심부름, 말벗과 생활지원까지 필요한 순간 가까이에서 도와드립니다.</p>
      <Link className="btn" href="/reserve">예약 신청하기</Link>
      <p className="muted">의료행위·간호·요양 업무는 제공하지 않습니다.</p>
    </>
  );
}
