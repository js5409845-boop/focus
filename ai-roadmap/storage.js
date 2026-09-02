/* ============================================================
 * AI 활용역량 로드맵 - localStorage 저장소 래퍼
 * 실제 저장소(backend)를 주입할 수 있어 Node 테스트에서도
 * (Map 기반 mock storage로) 동일한 로직을 검증할 수 있다.
 * ============================================================ */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.AICR_STORAGE = mod;
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var PREFIX = 'aicr_';

  // localStorage 하위에 존재하는 논리적 데이터 구획 (요구사항 21)
  var KEYS = {
    PARTICIPANT: 'participant', // {participantId, createdAt}
    PRE_ASSESSMENT: 'preAssessment', // {q1..q10, difficulty, goal, experience, completedAt}
    PRE_SCORES: 'preScores', // {exploration..expansion, overall, level}
    ROADMAP: 'roadmap', // {recommendedChallenges:[id]} - 제안까지가 서비스 역할이라 완료 여부는 추적하지 않는다
    POST_ASSESSMENT: 'postAssessment', // {q1..q10, completedAt}
    POST_SCORES: 'postScores',
    POST_SURVEY: 'postSurvey', // {challengeCompletion, helpfulness, behaviorChange, satisfaction, feedback, completedAt}
    REWARD_DATA: 'rewardData', // {participantId, nameOrNickname, contact, submittedAt} - 진단 데이터와 분리
    REWARD_OPT: 'rewardOpt', // 'in' | 'out' | null
    DEV_MODE: 'devMode', // '1' | null
    DEV_DATE_OFFSET_MS: 'devDateOffsetMs' // number, 테스트용 "현재 시각" 보정값
  };

  /**
   * @param {Storage} [backend] localStorage 호환 객체(getItem/setItem/removeItem).
   *   생략하면 브라우저 window.localStorage를 사용한다.
   */
  function createStore(backend) {
    backend = backend || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!backend) {
      throw new Error('localStorage 를 사용할 수 없는 환경입니다. backend를 주입하세요.');
    }

    function fullKey(k) {
      return PREFIX + k;
    }

    function get(k, fallback) {
      try {
        var raw = backend.getItem(fullKey(k));
        if (raw === null || raw === undefined) return fallback === undefined ? null : fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback === undefined ? null : fallback;
      }
    }

    function set(k, value) {
      backend.setItem(fullKey(k), JSON.stringify(value));
    }

    function remove(k) {
      backend.removeItem(fullKey(k));
    }

    function clearAll() {
      Object.keys(KEYS).forEach(function (name) {
        remove(KEYS[name]);
      });
    }

    /** dev 모드 보정이 적용된 "현재 시각"(ms) */
    function now() {
      var offset = get(KEYS.DEV_DATE_OFFSET_MS, 0) || 0;
      return Date.now() + offset;
    }

    return {
      KEYS: KEYS,
      get: get,
      set: set,
      remove: remove,
      clearAll: clearAll,
      now: now
    };
  }

  /** 테스트용 in-memory localStorage mock */
  function createMemoryBackend() {
    var map = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      setItem: function (k, v) { map[k] = String(v); },
      removeItem: function (k) { delete map[k]; }
    };
  }

  return {
    KEYS: KEYS,
    PREFIX: PREFIX,
    createStore: createStore,
    createMemoryBackend: createMemoryBackend
  };
});
