// apps/taste 전용 문구. 화면에서는 useTranslation('taste') 으로 사용
export default {
  namespace: 'taste',
  ko: {
    menu: '취향 테스트',
    breadcrumbHome: '홈',
    breadcrumbTaste: '나의 여행 테스트',
    title: '내 여행은, 어떤 리듬일까요?',
    subtitle: '지금의 취향으로, 더 특별한 부산 여행을 떠나보세요.',
    progress: '{{current}} / {{total}}',
    progressDone: '테스트 완료',
    progressLabel: '진행 상태',

    question: {
      number: 'Q{{number}}',
      prev: '이전',
      skip: '건너뛰고 바로 시작하기',
    },
    questions: {
      q1: {
        title: '여행 첫날 아침, 가장 먼저 하고 싶은 건?',
        'slow-alley': '동네 골목을 천천히 구경하기',
        'sea-healing': '바다 보며 커피 한 잔',
        culture: '박물관 문 열자마자 들어가기',
        active: '케이블카 타고 풍경 보기',
      },
      q2: {
        title: '하루에 몇 곳 정도 가면 좋을까요?',
        'slow-alley': '2곳을 깊게',
        'sea-healing': '3곳, 쉬엄쉬엄',
        culture: '4곳, 알차게',
        active: '많을수록 좋아요',
      },
      q3: {
        title: '사진첩에 남기고 싶은 한 장은?',
        'slow-alley': '알록달록한 골목길',
        'sea-healing': '노을 지는 바다',
        culture: '전시 작품 앞에서',
        active: '높은 전망대 위에서',
      },
      q4: {
        title: '나의 계획 스타일은?',
        'slow-alley': '그때그때 마음 가는 대로',
        'sea-healing': '쉬는 시간을 넉넉하게',
        culture: '시간표대로 차근차근',
        active: '동선까지 꼼꼼하게',
      },
      q5: {
        title: '여행이 끝날 때 듣고 싶은 말은?',
        'slow-alley': '“동네를 제대로 느꼈다”',
        'sea-healing': '“푹 쉬고 왔다”',
        culture: '“많이 배우고 왔다”',
        active: '“알차게 놀았다”',
      },
    },

    result: {
      eyebrow: '당신의 여행 스타일은',
      traitsTitle: '답변에서 찾은 취향',
      placesTitle: '이 취향으로 찾아볼 곳',
      placesSub: '부산의 이런 장소들이 잘 어울려요.',
      placesLoading: '장소를 불러오는 중이에요.',
      placesError: '장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      saveCandidate: '{{name}} 후보함에 저장',
      removeCandidate: '{{name}} 후보함에서 빼기',
      cta: '취향 저장하고 장소 둘러보기',
      ctaHint: '결과를 저장하고 ‘어디 갈까?’로 이동해요.',
      retry: '다시 테스트하기',
      note: '여행 취향을 돕는 가벼운 테스트예요.',
    },

    types: {
      'slow-alley': {
        name: '느긋한 골목 탐험가',
        summary: '빽빽한 일정 대신, 마음에 드는 동네를 천천히.',
        keywords: ['골목 산책', '감성 카페', '여유로운 일정'],
        traits: [
          { title: '한 동네에 오래 머물기', body: '여러 곳을 빠르게 보다,\n한 곳을 깊이 있게 둘러보는 걸 좋아해요.' },
          { title: '걷다가 카페에서 쉬기', body: '여행 중에도 좋은 카페에서\n여유롭게 시간을 보내는 걸 선호해요.' },
          { title: '정해진 순서보다 여유', body: '계획대로 움직이기보다,\n그때그때 마음 가는 대로 여행하는 걸 좋아해요.' },
        ],
      },
      'sea-healing': {
        name: '바다 보며 쉬는 힐링러',
        summary: '바쁜 일정 대신, 탁 트인 바다 앞에서 쉬어가기.',
        keywords: ['바다 전망', '해변 산책', '노을'],
        traits: [
          { title: '바다가 보이는 자리', body: '어디를 가든 바다가 보이는 곳에\n오래 머무는 걸 좋아해요.' },
          { title: '파도 소리 들으며 걷기', body: '해변과 산책로를 따라\n천천히 걷는 시간을 즐겨요.' },
          { title: '하루의 끝은 노을', body: '해 질 무렵 풍경을 보며\n하루를 마무리하고 싶어해요.' },
        ],
      },
      culture: {
        name: '알찬 문화 수집가',
        summary: '하루를 꼼꼼히, 도시의 이야기를 가득 담아오기.',
        keywords: ['박물관·전시', '역사 명소', '촘촘한 일정'],
        traits: [
          { title: '배우는 여행', body: '박물관과 전시에서\n그 도시의 이야기를 알아가는 걸 좋아해요.' },
          { title: '이야기가 있는 장소', body: '역사와 사연이 담긴 곳을\n직접 찾아가 보고 싶어해요.' },
          { title: '촘촘한 동선', body: '미리 계획을 세워\n짧은 시간에 많이 보는 걸 선호해요.' },
        ],
      },
      active: {
        name: '부지런한 액티브 탐험가',
        summary: '가만히 있긴 아까워, 타고 오르고 신나게 즐기기.',
        keywords: ['액티비티', '전망 명소', '하루 꽉 채우기'],
        traits: [
          { title: '직접 해보는 재미', body: '보는 것보다 타고, 오르고,\n직접 체험하는 걸 좋아해요.' },
          { title: '높은 곳에서 내려다보기', body: '케이블카나 전망대처럼\n탁 트인 풍경을 찾아다녀요.' },
          { title: '아침부터 밤까지', body: '하루를 꽉 채워서\n최대한 많이 즐기고 싶어해요.' },
        ],
      },
    },

    footer: {
      sources: '관광정보 · 부산광역시 · 한국관광공사',
      note: '기획 시안 · 장소·날씨·이동·해설은 예시입니다.',
    },
  },
};
