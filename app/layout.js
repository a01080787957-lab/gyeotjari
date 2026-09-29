import './globals.css';
import Link from 'next/link';
import NavAuth from './NavAuth';

export const metadata = {
  title: '곁자리 | 장보기·생활심부름·생활지원',
  description: '장보기, 생활심부름, 말벗, 생활지원 등 일상에 필요한 도움을 가까이에서 제공합니다.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header>
          <Link href="/" className="logo">곁자리</Link>
          <nav><Link href="/#services">서비스</Link><Link href="/#faq">자주 묻는 질문</Link><Link href="/reserve">예약</Link><NavAuth /></nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
