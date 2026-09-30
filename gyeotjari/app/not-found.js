import Link from 'next/link';
export default function NotFound() {
  return (<><h1>페이지를 찾을 수 없습니다</h1><Link className="btn" href="/">홈으로 가기</Link></>);
}
