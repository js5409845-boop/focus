/* ============================================================
 * AI 활용역량 로드맵 - 순수 로직 모듈
 * DOM/localStorage에 의존하지 않는다 (테스트 가능하도록 분리).
 * 브라우저 <script> 로 로드되면 window.AICR_LOGIC 에 노출되고,
 * Node에서는 require('./logic.js') 로 사용할 수 있다.
 * ============================================================ */
(function (root, factory) {
  var data = (typeof module !== 'undefined' && module.exports)
    ? require('./challenges.js')
    : root.AICR_DATA;
  var mod = factory(data);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.AICR_LOGIC = mod;
  }
})(typeof window !== 'undefined' ? window : this, function (DATA) {
  'use strict';

  var DIMENSIONS = DATA.DIMENSIONS;
  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  /** answers: {q1..q10: 1~5} -> 5개 영역 + 전체 평균 점수 */
  function calcDimensionScores(answers) {
    var exploration = round1((num(answers.q1) + num(answers.q2)) / 2);
    var instruction = round1((num(answers.q3) + num(answers.q4)) / 2);
    var verification = round1((num(answers.q5) + num(answers.q6)) / 2);
    var application = round1((num(answers.q7) + num(answers.q8)) / 2);
    var expansion = round1((num(answers.q9) + num(answers.q10)) / 2);
    var overall = round1((exploration + instruction + verification + application + expansion) / 5);
    return {
      exploration: exploration,
      instruction: instruction,
      verification: verification,
      application: application,
      expansion: expansion,
      overall: overall
    };
  }

  function num(v) {
    var n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  /** 전체 평균 -> LEVEL 정보 */
  function calcLevel(overall) {
    var levels = DATA.LEVELS;
    for (var i = 0; i < levels.length; i++) {
      if (overall >= levels[i].min - 1e-9 && overall <= levels[i].max + 1e-9) {
        return levels[i];
      }
    }
    // overall이 범위를 벗어나는 경우(이론상 발생하지 않음) 가장 가까운 레벨로 보정
    if (overall < levels[0].min) return levels[0];
    return levels[levels.length - 1];
  }

  /** 5개 영역 중 점수가 가장 낮은 순서로 정렬된 dimension 키 배열 */
  function sortDimensionsAscending(scores) {
    return DIMENSIONS.slice().sort(function (a, b) {
      var diff = scores[a] - scores[b];
      if (diff !== 0) return diff;
      return DIMENSIONS.indexOf(a) - DIMENSIONS.indexOf(b);
    });
  }

  /** 성장 포인트: 가장 낮은 2개 영역 */
  function getGrowthPoints(scores) {
    return sortDimensionsAscending(scores).slice(0, 2);
  }

  /** 강점: 가장 높은 1개 영역 */
  function getStrength(scores) {
    var sorted = sortDimensionsAscending(scores);
    return sorted[sorted.length - 1];
  }

  var ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되는 0/O, 1/I 제외

  /** 익명 Participant ID 생성 (예: AI-7K29). rng는 테스트를 위해 주입 가능 */
  function generateParticipantId(rng) {
    rng = rng || Math.random;
    var code = '';
    for (var i = 0; i < 4; i++) {
      code += ID_CHARS[Math.floor(rng() * ID_CHARS.length)];
    }
    return 'AI-' + code;
  }

  function daysSince(isoDateString, now) {
    if (!isoDateString) return -Infinity;
    now = now == null ? Date.now() : now;
    var start = new Date(isoDateString).getTime();
    if (isNaN(start)) return -Infinity;
    return (now - start) / MS_PER_DAY;
  }

  /** 사전진단 완료일 기준 7일 경과 여부 */
  function isPostCheckUnlocked(preCompletedAt, now) {
    return daysSince(preCompletedAt, now) >= 7;
  }

  var CHANGE_KEYS = DIMENSIONS.concat(['overall']);

  /** 사전/사후 점수 변화값 계산 */
  function calcChange(pre, post) {
    var result = {};
    CHANGE_KEYS.forEach(function (k) {
      result[k] = round1(post[k] - pre[k]);
    });
    return result;
  }

  /** 변화폭(절대값)이 가장 큰 영역 (overall 제외, 5개 영역 중) */
  function mostChangedDimension(change) {
    return DIMENSIONS.slice().sort(function (a, b) {
      return Math.abs(change[b]) - Math.abs(change[a]);
    })[0];
  }

  var EXPERIENCE_DIFFICULTY_MAP = {
    '없다': 0,
    '1~2번 해봤다': 0,
    '가끔 활용한다': 1,
    '자주 활용한다': 1,
    '여러 취업 준비 과정에 적극적으로 활용한다': 2
  };

  /**
   * Challenge 추천 (rule-based, 3개)
   * - 가장 낮은 1~2개 dimension을 우선 사용한다.
   * - 점수 차이가 작으면(<=0.3) 세 번째 dimension(가능하면 '적용')을 섞어 다양성을 확보한다.
   * - 점수 차이가 크면 가장 낮은 dimension에서 2개 + 두번째 dimension에서 1개를 가져온다.
   * - Q13 경험도로 난이도를, Q12 목표 텍스트로 키워드 매칭을 참고한다.
   */
  function recommendChallenges(scores, experience, goalText) {
    var challengesByDimension = DATA.CHALLENGES;
    var sorted = sortDimensionsAscending(scores);
    var lowest = sorted[0];
    var second = sorted[1];
    var gap = round1(scores[second] - scores[lowest]);

    var plan;
    if (gap <= 0.3) {
      var third = sorted.filter(function (d) {
        return d !== lowest && d !== second;
      })[0];
      var applicationCandidate = sorted.filter(function (d) {
        return d !== lowest && d !== second && d === 'application';
      })[0];
      plan = [lowest, second, applicationCandidate || third];
    } else {
      plan = [lowest, lowest, second];
    }

    var prefIdx = EXPERIENCE_DIFFICULTY_MAP.hasOwnProperty(experience)
      ? EXPERIENCE_DIFFICULTY_MAP[experience]
      : 1;
    var goalLower = (goalText || '').toLowerCase();

    var used = {};
    var chosen = [];

    plan.forEach(function (dim) {
      var pool = challengesByDimension[dim];
      var ranked = pool.slice().sort(function (a, b) {
        return scoreCandidate(b) - scoreCandidate(a);
      });

      function scoreCandidate(c) {
        var s = -Math.abs(c.difficultyIndex - prefIdx) * 10;
        if (goalLower && c.keywords && c.keywords.some(function (k) {
          return goalLower.indexOf(k.toLowerCase()) !== -1;
        })) {
          s += 5;
        }
        return s;
      }

      var pick = ranked.filter(function (c) { return !used[c.id]; })[0];
      if (pick) {
        used[pick.id] = true;
        chosen.push(pick);
      }
    });

    return chosen;
  }

  function findChallengeById(id) {
    var all = [];
    DIMENSIONS.forEach(function (d) {
      all = all.concat(DATA.CHALLENGES[d]);
    });
    return all.filter(function (c) { return c.id === id; })[0] || null;
  }

  function completionRate(recommendedIds, completedIds) {
    if (!recommendedIds || recommendedIds.length === 0) return 0;
    var done = (completedIds || []).filter(function (id) {
      return recommendedIds.indexOf(id) !== -1;
    }).length;
    return round1((done / recommendedIds.length) * 100);
  }

  function average(nums) {
    var valid = (nums || []).filter(function (n) { return typeof n === 'number' && !isNaN(n); });
    if (valid.length === 0) return null;
    return round1(valid.reduce(function (a, b) { return a + b; }, 0) / valid.length);
  }

  var CSV_COLUMNS = [
    'participantId',
    'preExploration', 'preInstruction', 'preVerification', 'preApplication', 'preExpansion', 'preOverall', 'preLevel',
    'postExploration', 'postInstruction', 'postVerification', 'postApplication', 'postExpansion', 'postOverall', 'postLevel',
    'explorationChange', 'instructionChange', 'verificationChange', 'applicationChange', 'expansionChange', 'overallChange',
    'recommendedChallenges', 'completedChallenges', 'completionRate',
    'challengeSatisfaction',
    'helpfulness', 'behaviorChange', 'satisfaction',
    'createdAt', 'postCompletedAt'
  ];

  /** 참가자 1명 분량의 record(전체 데이터 취합 결과)를 CSV 컬럼 순서에 맞는 배열로 변환 */
  function buildCsvRow(record) {
    return CSV_COLUMNS.map(function (key) {
      var v = record[key];
      if (v === null || v === undefined) return '';
      return v;
    });
  }

  function escapeCsvValue(value) {
    var s = String(value == null ? '' : value);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /** records: buildCsvRow 로 만든 배열들의 배열 -> CSV 문자열 */
  function toCsv(records) {
    var lines = [CSV_COLUMNS.join(',')];
    records.forEach(function (row) {
      lines.push(row.map(escapeCsvValue).join(','));
    });
    return lines.join('\n');
  }

  return {
    round1: round1,
    calcDimensionScores: calcDimensionScores,
    calcLevel: calcLevel,
    sortDimensionsAscending: sortDimensionsAscending,
    getGrowthPoints: getGrowthPoints,
    getStrength: getStrength,
    generateParticipantId: generateParticipantId,
    daysSince: daysSince,
    isPostCheckUnlocked: isPostCheckUnlocked,
    calcChange: calcChange,
    mostChangedDimension: mostChangedDimension,
    recommendChallenges: recommendChallenges,
    findChallengeById: findChallengeById,
    completionRate: completionRate,
    average: average,
    CSV_COLUMNS: CSV_COLUMNS,
    buildCsvRow: buildCsvRow,
    escapeCsvValue: escapeCsvValue,
    toCsv: toCsv
  };
});
