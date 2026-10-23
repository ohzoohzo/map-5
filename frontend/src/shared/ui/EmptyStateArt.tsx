import styled from '@emotion/styled';

const ART = {
  candidates: '/images/pinday/empty-candidates.png',
  itinerary: '/images/pinday/empty-itinerary.png',
  docent: '/images/pinday/docent-guide.png',
} as const;

const Art = styled.img`
  display: block;
  flex-shrink: 0;
  max-width: 100%;
  object-fit: contain;
`;

export default function EmptyStateArt({ kind, size }: { kind: keyof typeof ART; size: number }) {
  return <Art src={ART[kind]} width={size} height={size} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
}
