import { Bike, CableCar, Coffee, Footprints, Landmark, Leaf, ListChecks, Mountain, ScrollText, Sun, Sunset, Waves, type LucideIcon } from 'lucide-react';

// 취향 테스트 구조 (문구는 i18n.ts). 결과 id 는 tripActions.setTaste 로 저장된다.
export const TASTE_TYPES = ['slow-alley', 'sea-healing', 'culture', 'active'] as const;
export type TasteType = (typeof TASTE_TYPES)[number];

export const isTasteType = (value: string | null): value is TasteType => TASTE_TYPES.includes(value as TasteType);

/** 문항마다 보기 4개가 결과 유형 4개와 하나씩 짝지어진다 (보기 순서 = TASTE_TYPES 순서) */
export const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

/** 보기 아이콘 (유형별) */
export const OPTION_ICONS: Record<TasteType, LucideIcon> = {
  'slow-alley': Footprints,
  'sea-healing': Waves,
  culture: Landmark,
  active: CableCar,
};

/** 키워드 3개·"답변에서 찾은 취향" 3줄에 함께 쓰는 아이콘 (i18n 의 keywords / traits 순서와 같다) */
export const TYPE_ICONS: Record<TasteType, [LucideIcon, LucideIcon, LucideIcon]> = {
  'slow-alley': [Footprints, Coffee, Leaf],
  'sea-healing': [Waves, Footprints, Sunset],
  culture: [Landmark, ScrollText, ListChecks],
  active: [Bike, Mountain, Sun],
};

/** 추천 장소: 관광지 카탈로그(부산광역시)에 실제로 있는 이름만 쓴다 */
export const TYPE_PLACES: Record<TasteType, [string, string]> = {
  'slow-alley': ['감천문화마을', '보수동책방골목'],
  'sea-healing': ['다대포해수욕장', '동백섬'],
  culture: ['임시수도기념관', '부산영화체험박물관'],
  active: ['송도해상케이블카', '스카이라인 루지'],
};

/** 그림·사진이 생기면 경로만 채운다 (예: '/images/taste-slow-alley.png'). 비어 있으면 색 배경. */
export const TYPE_IMAGES: Record<TasteType, string> = { 'slow-alley': '', 'sea-healing': '', culture: '', active: '' };

/**
 * 가장 많이 고른 유형이 결과. 동점이면 더 뒤 문항에서 고른 유형을 우선한다.
 * answers[i] 는 i번째 문항에서 고른 유형.
 */
export function scoreTaste(answers: TasteType[]): TasteType {
  const counts = new Map<TasteType, number>();
  answers.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));
  const best = Math.max(...counts.values());
  for (let index = answers.length - 1; index >= 0; index -= 1) {
    if (counts.get(answers[index]!) === best) return answers[index]!;
  }
  return TASTE_TYPES[0];
}
