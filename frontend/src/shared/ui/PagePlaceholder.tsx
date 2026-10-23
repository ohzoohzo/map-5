import type { ReactNode } from 'react';
import styled from '@emotion/styled';
import { color, layout, radius } from '../design/tokens';

const Wrap = styled.section`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 38px ${layout.gutter};
  color: ${color.text};
  h1 { font-size: clamp(24px, 3vw, 36px); letter-spacing: -1px; }
  .sub { margin-top: 8px; color: ${color.textSub}; font-size: 16px; }
  .box { margin-top: 24px; padding: 22px; background: ${color.surface}; border: 1px dashed ${color.borderStrong}; border-radius: ${radius.lg}; }
  .owner { font-weight: 700; color: ${color.teal}; }
  .box p { margin-top: 6px; color: ${color.textMuted}; font-size: 14px; line-height: 1.7; }
`;

interface Props {
  title: string;
  subtitle: string;
  owner: string;
  /** design/ 폴더의 시안 파일명 */
  design: string;
  children?: ReactNode;
}

/** 작업 전 화면 자리표시. 담당자가 실제 화면을 만들면 이 컴포넌트 사용을 지운다. */
export default function PagePlaceholder({ title, subtitle, owner, design, children }: Props) {
  return (
    <Wrap>
      <h1>{title}</h1>
      <p className="sub">{subtitle}</p>
      <div className="box">
        <span className="owner">작업 예정 · 담당 {owner}</span>
        <p>시안: design/{design} · 할 일: docs/team/ 의 담당자 파일</p>
        {children}
      </div>
    </Wrap>
  );
}
