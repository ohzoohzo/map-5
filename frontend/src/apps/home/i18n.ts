// apps/home 전용 문구. 화면에서는 useTranslation('home') 으로 사용
export default {
  namespace: 'home',
  ko: {
    menu: '홈',
    eyebrow: '부산 여행 플래너',
    title: '부산 여행, 핀 하나부터.',
    subtitle: '가고 싶은 곳을 모아, 나만의 날짜에 담아보세요.',
    search: {
      label: '여행 시작 정보',
      whereLabel: '어디로 갈까요?',
      destinations: { busan: '부산' },
      whenLabel: '언제 떠날까요?',
      startDate: '출발 날짜',
      endDate: '돌아오는 날짜',
      duration: '{{nights}}박 {{days}}일',
      dayTrip: '당일치기',
      tagsLabel: '어떤 여행을 하고 싶나요?',
      tagsHint: '(복수 선택 가능)',
      tags: { food: '맛집', walk: '산책', exhibit: '전시' },
      start: '내 여행 시작하기',
    },
    steps: {
      label: '이용 방법',
      discover: { title: '1. 장소 발견', body: '부산의 가볼 만한 곳을\n핀으로 모아보세요.' },
      arrange: { title: '2. 날짜에 배치', body: '원하는 날짜에 일정을\n자유롭게 담아보세요.' },
      check: { title: '3. 이동 · 날씨 확인', body: '이동 시간과 날씨까지 확인하고,\n더 완벽한 여행을 완성하세요.' },
    },
    style: {
      title: '내 여행 스타일은?',
      subtitle: '짧은 테스트로 좋아하는 여행을 찾아요.',
      relaxed: { title: '느긋하게', body: '여유롭게, 좋아하는 곳을\n천천히 즐겨요.' },
      packed: { title: '알차게', body: '짧은 시간에, 다양한 곳을\n꼼꼼히 경험해요.' },
      cta: '성향 테스트 하기',
      skip: '건너뛰고 바로 시작할 수 있어요.',
    },
    random: {
      title: '아직 어디 갈지 모르겠다면',
      subtitle: '부산 여행지 하나, 가볍게 뽑아볼까요?',
      cta: '여행지 랜덤 뽑기',
    },
    footer: {
      sources: '관광정보 · 부산광역시 · 한국관광공사 · 카카오',
      tip: '마음에 드는 곳은 후보함에 저장하고, 원하는 날짜에 추가해요.',
      note: '기획 시안 · 장소와 일정은 예시입니다.',
    },
  },
};
