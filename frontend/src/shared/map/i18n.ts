// shared/map 전용 문구 (카카오 지도). useTranslation('map')
export default {
  namespace: 'map',
  ko: {
    mapLoading: '지도를 불러오는 중',
    mapMissingKey: '지도 키가 설정되지 않았어요',
    mapMissingKeyDescription: '.env의 KAKAO_JS_KEY를 확인해 주세요. 목록과 일정은 그대로 쓸 수 있어요.',
    mapFailed: '지도를 불러오지 못했어요',
    mapFailedDescription: '카카오 개발자 콘솔에 {{origin}} 도메인이 등록됐는지 확인해 주세요.',
    fitPins: '전체 보기',
    retry: '다시 시도',
  },
};
