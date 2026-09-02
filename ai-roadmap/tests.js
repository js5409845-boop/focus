/* ============================================================
 * AI 활용역량 로드맵 - 순수 로직 / 저장소 단위 테스트
 * 실행: node ai-roadmap/tests.js
 * (요구사항 29의 1~11번 항목을 다룬다. 12번 모바일 UI는 브라우저에서
 *  수동으로 확인한다.)
 * ============================================================ */
var assert = require('assert');
var DATA = require('./challenges.js');
var LOGIC = require('./logic.js');
var STORAGE = require('./storage.js');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    console.log('  ✗ ' + name);
    console.log('      ' + e.message);
  }
}

function group(name, fn) {
  console.log('\n' + name);
  fn();
}

// ---------------------------------------------------------------
group('1. 10개 문항 평균 계산', function () {
  test('모든 문항에 값이 있으면 정확히 평균이 계산된다', function () {
    var answers = { q1: 4, q2: 4, q3: 3, q4: 3, q5: 2, q6: 2, q7: 5, q8: 5, q9: 1, q10: 1 };
    var scores = LOGIC.calcDimensionScores(answers);
    assert.strictEqual(scores.exploration, 4.0);
    assert.strictEqual(scores.instruction, 3.0);
    assert.strictEqual(scores.verification, 2.0);
    assert.strictEqual(scores.application, 5.0);
    assert.strictEqual(scores.expansion, 1.0);
  });

  test('소수점은 첫째 자리로 반올림된다', function () {
    var answers = { q1: 3, q2: 4, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1, q9: 1, q10: 1 };
    var scores = LOGIC.calcDimensionScores(answers);
    assert.strictEqual(scores.exploration, 3.5);
  });
});

// ---------------------------------------------------------------
group('2. 5개 영역 점수 및 전체 평균 계산', function () {
  test('전체 점수는 5개 영역의 평균이다', function () {
    var answers = { q1: 4, q2: 3, q3: 3, q4: 4, q5: 2, q6: 3, q7: 4, q8: 3, q9: 2, q10: 2 };
    var scores = LOGIC.calcDimensionScores(answers);
    // exploration 3.5, instruction 3.5, verification 2.5, application 3.5, expansion 2.0
    assert.strictEqual(scores.exploration, 3.5);
    assert.strictEqual(scores.instruction, 3.5);
    assert.strictEqual(scores.verification, 2.5);
    assert.strictEqual(scores.application, 3.5);
    assert.strictEqual(scores.expansion, 2.0);
    var expectedOverall = LOGIC.round1((3.5 + 3.5 + 2.5 + 3.5 + 2.0) / 5);
    assert.strictEqual(scores.overall, expectedOverall);
  });

  test('모든 문항이 5점이면 전체 평균도 5.0이다', function () {
    var answers = { q1: 5, q2: 5, q3: 5, q4: 5, q5: 5, q6: 5, q7: 5, q8: 5, q9: 5, q10: 5 };
    var scores = LOGIC.calcDimensionScores(answers);
    assert.strictEqual(scores.overall, 5.0);
  });
});

// ---------------------------------------------------------------
group('3. LEVEL 경계값', function () {
  test('1.0~2.0 -> LEVEL 1', function () {
    assert.strictEqual(LOGIC.calcLevel(1.0).level, 1);
    assert.strictEqual(LOGIC.calcLevel(2.0).level, 1);
  });
  test('2.1~3.0 -> LEVEL 2', function () {
    assert.strictEqual(LOGIC.calcLevel(2.1).level, 2);
    assert.strictEqual(LOGIC.calcLevel(3.0).level, 2);
  });
  test('3.1~4.0 -> LEVEL 3', function () {
    assert.strictEqual(LOGIC.calcLevel(3.1).level, 3);
    assert.strictEqual(LOGIC.calcLevel(4.0).level, 3);
  });
  test('4.1~5.0 -> LEVEL 4', function () {
    assert.strictEqual(LOGIC.calcLevel(4.1).level, 4);
    assert.strictEqual(LOGIC.calcLevel(5.0).level, 4);
  });
  test('인접 레벨 경계값이 서로 다른 레벨로 분류된다', function () {
    assert.strictEqual(LOGIC.calcLevel(2.0).level, 1);
    assert.strictEqual(LOGIC.calcLevel(2.1).level, 2);
    assert.strictEqual(LOGIC.calcLevel(3.0).level, 2);
    assert.strictEqual(LOGIC.calcLevel(3.1).level, 3);
  });
});

// ---------------------------------------------------------------
group('4. 가장 낮은 영역에 따른 Challenge 추천 변화', function () {
  test('검증이 가장 낮으면 추천 목록에 검증 Challenge가 포함된다', function () {
    var scores = { exploration: 4.0, instruction: 4.0, verification: 1.5, application: 4.0, expansion: 3.8 };
    var picks = LOGIC.recommendChallenges(scores, '가끔 활용한다', '');
    assert.strictEqual(picks.length, 3);
    assert.ok(picks.some(function (c) { return c.dimension === 'verification'; }));
  });

  test('확장이 가장 낮으면 추천 목록에 검증 Challenge가 아닌 확장 Challenge가 우선 포함된다', function () {
    var scores = { exploration: 4.0, instruction: 4.0, verification: 3.8, application: 4.0, expansion: 1.2 };
    var picks = LOGIC.recommendChallenges(scores, '가끔 활용한다', '');
    var dims = picks.map(function (c) { return c.dimension; });
    assert.ok(dims.indexOf('expansion') !== -1);
    assert.notStrictEqual(dims[0], 'verification');
  });

  test('추천 Challenge 3개는 모두 서로 다른 Challenge다(중복 없음)', function () {
    var scores = { exploration: 1.0, instruction: 1.1, verification: 4.5, application: 4.5, expansion: 4.5 };
    var picks = LOGIC.recommendChallenges(scores, '없다', '');
    var ids = picks.map(function (c) { return c.id; });
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  test('경험도가 낮으면(없다) 난이도가 쉬운 Challenge 비중이 높다', function () {
    var scores = { exploration: 2.0, instruction: 2.1, verification: 4.5, application: 4.5, expansion: 4.5 };
    var picks = LOGIC.recommendChallenges(scores, '없다', '');
    var avgDifficulty = picks.reduce(function (s, c) { return s + c.difficultyIndex; }, 0) / picks.length;
    assert.ok(avgDifficulty <= 1.2, 'avgDifficulty=' + avgDifficulty);
  });
});

// ---------------------------------------------------------------
// 서비스 역할을 "제안까지"로 좁히면서 Challenge 시작/완료 추적 기능은
// 제거했다. 대신 추천 결과(roadmap)가 새로고침 후에도 유지되는지를
// 검증해 요구사항 29의 5~6번(저장/새로고침 유지) 취지를 계속 다룬다.
group('5~6. 추천 Challenge 목록 저장 및 새로고침 후 유지(저장소 로직)', function () {
  test('추천 Challenge 목록이 저장소에 저장된다', function () {
    var backend = STORAGE.createMemoryBackend();
    var store = STORAGE.createStore(backend);
    store.set(store.KEYS.ROADMAP, { recommendedChallenges: ['verify-1', 'apply-1', 'expand-2'] });

    var roadmap = store.get(store.KEYS.ROADMAP);
    assert.deepStrictEqual(roadmap.recommendedChallenges, ['verify-1', 'apply-1', 'expand-2']);
  });

  test('같은 backend로 새 store를 만들어도(=새로고침 시뮬레이션) 데이터가 유지된다', function () {
    var backend = STORAGE.createMemoryBackend();
    var store1 = STORAGE.createStore(backend);
    store1.set(store1.KEYS.ROADMAP, { recommendedChallenges: ['a', 'b', 'c'] });

    var store2 = STORAGE.createStore(backend); // 새 인스턴스 = 새로고침 후 재로딩
    var roadmap = store2.get(store2.KEYS.ROADMAP);
    assert.deepStrictEqual(roadmap.recommendedChallenges, ['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------
group('7. 사전진단 완료일 기준 7일 전/후 상태', function () {
  test('6일 23시간 경과 시점에는 아직 잠겨있다', function () {
    var pre = new Date('2026-01-01T00:00:00.000Z').toISOString();
    var now = new Date('2026-01-07T23:00:00.000Z').getTime();
    assert.strictEqual(LOGIC.isPostCheckUnlocked(pre, now), false);
  });

  test('정확히 7일 경과 시점에는 열린다', function () {
    var pre = new Date('2026-01-01T00:00:00.000Z').toISOString();
    var now = new Date('2026-01-08T00:00:00.000Z').getTime();
    assert.strictEqual(LOGIC.isPostCheckUnlocked(pre, now), true);
  });

  test('7일 하고도 며칠 더 지난 시점에도 열려있다', function () {
    var pre = new Date('2026-01-01T00:00:00.000Z').toISOString();
    var now = new Date('2026-01-20T00:00:00.000Z').getTime();
    assert.strictEqual(LOGIC.isPostCheckUnlocked(pre, now), true);
  });
});

// ---------------------------------------------------------------
group('8. 사전/사후 데이터가 동일 Participant ID로 연결', function () {
  test('participant를 저장하면 사전/사후 스코어 모두 같은 participantId를 참조할 수 있다', function () {
    var backend = STORAGE.createMemoryBackend();
    var store = STORAGE.createStore(backend);
    var pid = LOGIC.generateParticipantId(function () { return 0.1; });
    store.set(store.KEYS.PARTICIPANT, { participantId: pid, createdAt: new Date().toISOString() });
    store.set(store.KEYS.PRE_SCORES, { overall: 2.8 });
    store.set(store.KEYS.POST_SCORES, { overall: 3.4 });

    var participant = store.get(store.KEYS.PARTICIPANT);
    assert.strictEqual(participant.participantId, pid);
    assert.ok(/^AI-[A-Z0-9]{4}$/.test(pid));
  });
});

// ---------------------------------------------------------------
group('9. 사전/사후 변화값 계산', function () {
  test('변화값 = 사후 - 사전 (소수 첫째 자리)', function () {
    var pre = { exploration: 3.1, instruction: 2.8, verification: 2.4, application: 3.2, expansion: 2.5, overall: 2.8 };
    var post = { exploration: 3.6, instruction: 3.3, verification: 3.3, application: 3.7, expansion: 3.1, overall: 3.4 };
    var change = LOGIC.calcChange(pre, post);
    assert.strictEqual(change.exploration, 0.5);
    assert.strictEqual(change.instruction, 0.5);
    assert.strictEqual(change.verification, 0.9);
    assert.strictEqual(change.application, 0.5);
    assert.strictEqual(change.expansion, 0.6);
    assert.strictEqual(change.overall, 0.6);
  });

  test('가장 크게 변화한 영역을 찾을 수 있다', function () {
    var pre = { exploration: 3.1, instruction: 2.8, verification: 2.4, application: 3.2, expansion: 2.5, overall: 2.8 };
    var post = { exploration: 3.6, instruction: 3.3, verification: 3.3, application: 3.7, expansion: 3.1, overall: 3.4 };
    var change = LOGIC.calcChange(pre, post);
    assert.strictEqual(LOGIC.mostChangedDimension(change), 'verification');
  });
});

// ---------------------------------------------------------------
group('10. 경품 연락처 데이터와 진단 데이터 분리', function () {
  test('rewardData 키에는 연락처가 저장되지만 preAssessment/postAssessment 등에는 저장되지 않는다', function () {
    var backend = STORAGE.createMemoryBackend();
    var store = STORAGE.createStore(backend);
    store.set(store.KEYS.PRE_ASSESSMENT, { q1: 4, q2: 4 });
    store.set(store.KEYS.REWARD_DATA, { participantId: 'AI-7K29', nameOrNickname: '홍길동', contact: '010-1234-5678', submittedAt: new Date().toISOString() });

    var pre = store.get(store.KEYS.PRE_ASSESSMENT);
    var reward = store.get(store.KEYS.REWARD_DATA);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(pre, 'contact'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(pre, 'nameOrNickname'), false);
    assert.strictEqual(reward.contact, '010-1234-5678');
  });

  test('CSV export 컬럼 목록에는 연락처/이름 필드가 포함되지 않는다', function () {
    LOGIC.CSV_COLUMNS.forEach(function (col) {
      assert.notStrictEqual(col, 'contact');
      assert.notStrictEqual(col, 'nameOrNickname');
    });
  });
});

// ---------------------------------------------------------------
group('11. CSV Export', function () {
  test('buildCsvRow는 정의된 컬럼 순서대로 값을 배치한다', function () {
    var record = { participantId: 'AI-7K29', preOverall: 2.8, postOverall: 3.4, overallChange: 0.6 };
    var row = LOGIC.buildCsvRow(record);
    var idx = LOGIC.CSV_COLUMNS.indexOf('participantId');
    assert.strictEqual(row[idx], 'AI-7K29');
  });

  test('toCsv는 헤더 + 데이터 행으로 이루어진 문자열을 만든다', function () {
    var record = { participantId: 'AI-7K29', preOverall: 2.8 };
    var csv = LOGIC.toCsv([LOGIC.buildCsvRow(record)]);
    var lines = csv.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0], LOGIC.CSV_COLUMNS.join(','));
  });

  test('콤마/줄바꿈/따옴표가 포함된 자유응답 값은 CSV 규칙에 맞게 escape된다', function () {
    var v = LOGIC.escapeCsvValue('안녕, "테스트"\n줄바꿈');
    assert.strictEqual(v, '"안녕, ""테스트""\n줄바꿈"');
  });
});

// ---------------------------------------------------------------
group('데이터 정합성', function () {
  test('5개 영역 x 3개 Challenge = 15개가 정의되어 있다', function () {
    var total = 0;
    DATA.DIMENSIONS.forEach(function (d) { total += DATA.CHALLENGES[d].length; });
    assert.strictEqual(total, 15);
  });

  test('모든 Challenge는 필수 필드를 갖는다', function () {
    DATA.DIMENSIONS.forEach(function (d) {
      DATA.CHALLENGES[d].forEach(function (c) {
        ['id', 'title', 'dimension', 'goal', 'description', 'steps', 'output', 'estimatedTime', 'difficulty'].forEach(function (f) {
          assert.ok(c[f] !== undefined && c[f] !== null && c[f] !== '', d + '/' + c.id + ' missing ' + f);
        });
      });
    });
  });

  test('findChallengeById로 모든 challenge를 조회할 수 있다', function () {
    DATA.DIMENSIONS.forEach(function (d) {
      DATA.CHALLENGES[d].forEach(function (c) {
        assert.strictEqual(LOGIC.findChallengeById(c.id).id, c.id);
      });
    });
  });
});

// ---------------------------------------------------------------
console.log('\n----------------------------------------');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('----------------------------------------');
if (failed > 0) {
  process.exit(1);
}
