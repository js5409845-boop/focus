/* ============================================================
 * AI 활용역량 로드맵 - SPA 라우터 / 화면 렌더링
 * DOM 전용 모듈. 데이터/스코어링은 challenges.js, logic.js,
 * storage.js 에 위임한다.
 * ============================================================ */
(function () {
  'use strict';

  var D = window.AICR_DATA;
  var L = window.AICR_LOGIC;
  var S = window.AICR_STORAGE.createStore();
  var K = S.KEYS;

  // ---------------------------------------------------------------
  // 구글시트 자동 수집 (선택 사항)
  // 배포한 Google Apps Script 웹앱 URL을 여기에 채워 넣으면, 참여자가
  // 진단/Challenge/설문을 완료할 때마다 백그라운드로 자동 전송된다.
  // 비워두면(기본값) 아무 일도 하지 않고 localStorage만 사용한다.
  // 설정 방법: ai-roadmap/google-apps-script.gs 참고.
  // ---------------------------------------------------------------
  var SHEET_WEBHOOK_URL = '';

  /** 실패해도 로컬 데이터/화면 흐름에는 영향 없는 fire-and-forget 전송 */
  function syncToSheet(sheetName, data) {
    if (!SHEET_WEBHOOK_URL || typeof fetch !== 'function') return;
    try {
      fetch(SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script는 CORS preflight를 처리하지 않으므로 simple request로 보낸다
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ sheet: sheetName, data: data })
      }).catch(function () { /* 오프라인 등 - 무시 (로컬 데이터는 이미 저장됨) */ });
    } catch (e) { /* fetch 자체를 사용할 수 없는 환경 - 무시 */ }
  }

  // ---------------------------------------------------------------
  // 유틸
  // ---------------------------------------------------------------
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function nav(hash) {
    if (location.hash === hash) {
      render();
    } else {
      location.hash = hash;
    }
    window.scrollTo(0, 0);
  }
  window.nav = nav;

  function isDevMode() {
    return S.get(K.DEV_MODE) === '1';
  }

  // ---------------------------------------------------------------
  // 공통 레이아웃
  // ---------------------------------------------------------------
  function shell(innerHtml, opts) {
    opts = opts || {};
    var showFooter = !!opts.footer;
    var devLink = isDevMode() ? '<a class="dev-link" href="#/dev">DEV</a>' : '';
    return '' +
      '<div class="page">' +
      (opts.topbar || '') +
      '<main class="content">' + innerHtml + '</main>' +
      (showFooter ? aboutFooter() : '') +
      '<div class="bottom-space">' + devLink + '</div>' +
      '</div>';
  }

  function topbar(title, backHash, progress) {
    var backBtn = backHash ? '<button class="tb-back" onclick="nav(\'' + backHash + '\')" aria-label="뒤로">←</button>' : '<span class="tb-back-ph"></span>';
    var progressHtml = progress ? '<div class="tb-progress"><div class="tb-progress-fill" style="width:' + (progress.current / progress.total * 100) + '%"></div></div>' : '';
    return '' +
      '<header class="topbar">' +
      '<div class="tb-row">' + backBtn + '<div class="tb-title">' + esc(title) + '</div><span class="tb-back-ph"></span></div>' +
      progressHtml +
      (progress ? '<div class="tb-progress-label">' + progress.current + ' / ' + progress.total + '</div>' : '') +
      '</header>';
  }

  function aboutFooter() {
    return '' +
      '<footer class="about">' +
      '<h3>About / Sources</h3>' +
      '<p>본 서비스의 AI 활용역량 모델은 관련 AI literacy·competency framework를 참고하여, 취준생의 실제 AI 활용과 성장을 돕는 목적으로 재구성한 자체 설계 모델입니다. UNESCO 등 아래 자료가 현재 서비스의 5개 영역을 그대로 정의한 것은 아닙니다.</p>' +
      '<ul class="sources">' +
      '<li>UNESCO (2024), <em>AI Competency Framework for Students</em></li>' +
      '<li>OECD / European Commission (2026), <em>Empowering Learners for the Age of AI: An AI Literacy Framework for Primary and Secondary Education</em></li>' +
      '<li>Annapureddy, R., Fornaroli, A., &amp; Gatica-Perez, D., <em>Generative AI Literacy: Twelve Defining Competencies</em>, Digital Government: Research and Practice, 2025</li>' +
      '</ul>' +
      '<p class="fine-print">본 서비스의 진단 결과는 자신의 AI 활용 방식을 돌아보기 위한 간편 Self-Check이며, 공식적인 능력 평가나 심리검사가 아닙니다. 수집된 응답 데이터는 서비스 경험과 AI 활용 변화 분석을 위한 목적으로만 활용됩니다.</p>' +
      '</footer>';
  }

  function dimBar(dimKey, score, opts) {
    opts = opts || {};
    var pct = Math.max(0, Math.min(100, (score / 5) * 100));
    return '' +
      '<div class="dim-row">' +
      '<div class="dim-label">' + D.DIMENSION_LABELS[dimKey] + '</div>' +
      '<div class="dim-bar"><div class="dim-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="dim-score">' + score.toFixed(1) + '</div>' +
      '</div>';
  }

  // ---------------------------------------------------------------
  // 1. 랜딩 페이지
  // ---------------------------------------------------------------
  function pageLanding() {
    var hasPre = !!S.get(K.PRE_SCORES);
    var secondaryBtn = hasPre
      ? '<button class="btn btn-ghost btn-block" onclick="nav(\'#/roadmap\')">내 로드맵 보러가기</button>'
      : '';
    var html = '' +
      '<section class="hero">' +
      '<div class="eyebrow">AI 활용역량 로드맵</div>' +
      '<h1>AI를 잘 쓰는 사람은<br>AI에게 답을 맡기는 사람이 아니라<br>AI를 활용해 자신의 역량을 확장하는 사람입니다.</h1>' +
      '<p class="hero-sub">지금 나의 AI 활용역량을 확인하고 실제 취업 준비에 적용해보세요.</p>' +
      '<button class="btn btn-primary btn-block" onclick="nav(\'#/pre/intro\')">내 AI 활용역량 진단하기</button>' +
      '<div class="hint">약 3분 · 10문항</div>' +
      secondaryBtn +
      '</section>' +
      '<section class="flow">' +
      flowStep('1', '진단', '현재 AI 활용 방식을 확인하세요.') +
      flowStep('2', 'Challenge', '나에게 필요한 AI 활용 과제를 받아보세요.') +
      flowStep('3', '실행', '실제 취업 준비에 적용해보세요.') +
      flowStep('4', '변화 확인', '7일 후 다시 확인해보세요.') +
      '</section>';
    return shell(html, { footer: true });
  }

  function flowStep(n, title, desc) {
    return '<div class="flow-step"><div class="flow-num">' + n + '</div><div class="flow-title">' + esc(title) + '</div><div class="flow-desc">' + esc(desc) + '</div></div>';
  }

  // ---------------------------------------------------------------
  // 2. 사전 Self-Check
  // ---------------------------------------------------------------
  function pagePreIntro() {
    var html = '' +
      '<section class="card">' +
      '<h2>사전 Self-Check</h2>' +
      '<p>다음 문항은 현재 AI를 활용하는 방식을 알아보기 위한 간편 Self-Check입니다.</p>' +
      '<p>각 문항을 읽고 현재 자신의 모습과 가장 가까운 정도를 선택해주세요.</p>' +
      '<div class="scale-legend">' +
      D.SCALE_LABELS.map(function (l, i) { return '<div class="sl-item"><span class="sl-num">' + (i + 1) + '</span>' + esc(l) + '</div>'; }).join('') +
      '</div>' +
      '<button class="btn btn-primary btn-block" onclick="startQuiz(\'pre\')">진단 시작하기</button>' +
      '</section>';
    return shell(html, { topbar: topbar('사전 Self-Check', '#/') });
  }

  function pagePostIntro() {
    var html = '' +
      '<section class="card">' +
      '<h2>사후 Self-Check</h2>' +
      '<p>처음 진단했을 때와 비교하여, 현재 자신의 AI 활용 방식을 기준으로 응답해주세요.</p>' +
      '<div class="scale-legend">' +
      D.SCALE_LABELS.map(function (l, i) { return '<div class="sl-item"><span class="sl-num">' + (i + 1) + '</span>' + esc(l) + '</div>'; }).join('') +
      '</div>' +
      '<button class="btn btn-primary btn-block" onclick="startQuiz(\'post\')">사후진단 시작하기</button>' +
      '</section>';
    return shell(html, { topbar: topbar('사후 Self-Check', '#/roadmap') });
  }

  window.startQuiz = function (mode) {
    nav('#/' + mode + '/q/1');
  };

  function draftKey(mode) {
    return mode === 'pre' ? K.PRE_ASSESSMENT : K.POST_ASSESSMENT;
  }

  function pageQuizQuestion(mode, n) {
    n = parseInt(n, 10);
    var q = D.QUESTIONS[n - 1];
    if (!q) { nav('#/'); return ''; }
    var draft = S.get(draftKey(mode), {}) || {};
    var current = draft[q.id];

    var options = [1, 2, 3, 4, 5].map(function (v) {
      var selected = current === v ? ' selected' : '';
      return '' +
        '<button class="scale-opt' + selected + '" onclick="selectScale(\'' + mode + '\',\'' + q.id + '\',' + v + ')">' +
        '<span class="scale-opt-num">' + v + '</span>' +
        '<span class="scale-opt-label">' + esc(D.SCALE_LABELS[v - 1]) + '</span>' +
        '</button>';
    }).join('');

    var backHash = n === 1 ? (mode === 'pre' ? '#/pre/intro' : '#/post/intro') : '#/' + mode + '/q/' + (n - 1);
    var nextHash = n === 10 ? (mode === 'pre' ? '#/pre/personal' : '#/post-survey') : '#/' + mode + '/q/' + (n + 1);
    var nextLabel = n === 10 ? (mode === 'pre' ? '다음' : '결과 확인하기') : '다음 문항';

    var html = '' +
      '<section class="card quiz-card">' +
      '<div class="quiz-tag">' + esc(q.tag) + '</div>' +
      '<h2 class="quiz-q">' + esc(q.text) + '</h2>' +
      '<div class="scale-opts">' + options + '</div>' +
      '<button class="btn btn-primary btn-block" ' + (current ? '' : 'disabled') + ' onclick="' + (current ? 'nav(\'' + nextHash + '\')' : '') + '">' + nextLabel + '</button>' +
      '</section>';

    return shell(html, { topbar: topbar(mode === 'pre' ? '사전 Self-Check' : '사후 Self-Check', backHash, { current: n, total: 10 }) });
  }

  window.selectScale = function (mode, qid, value) {
    var draft = S.get(draftKey(mode), {}) || {};
    draft[qid] = value;
    S.set(draftKey(mode), draft);
    render();
  };

  // ---------------------------------------------------------------
  // 3. 개인화 질문 (Q11~13, 사전진단 전용)
  // ---------------------------------------------------------------
  function pagePrePersonal() {
    var draft = S.get(K.PRE_ASSESSMENT, {}) || {};
    var exp = draft.experience;
    var expOptions = D.EXPERIENCE_OPTIONS.map(function (opt) {
      var sel = exp === opt ? ' selected' : '';
      return '<button class="chip-opt' + sel + '" onclick="selectExperience(\'' + opt + '\')">' + esc(opt) + '</button>';
    }).join('');

    var html = '' +
      '<section class="card">' +
      '<h2>마지막으로, 몇 가지만 더 알려주세요</h2>' +
      '<p class="muted">이 답변은 점수에 반영되지 않고, Challenge를 추천하는 데에만 참고합니다.</p>' +
      '<label class="field-label">AI를 사용할 때 가장 어려운 점은 무엇인가요?</label>' +
      '<textarea id="pf-difficulty" class="text-input" rows="2" placeholder="자유롭게 적어주세요 (선택)">' + esc(draft.difficulty || '') + '</textarea>' +
      '<label class="field-label">AI를 활용해서 가장 잘해보고 싶은 것은 무엇인가요?</label>' +
      '<textarea id="pf-goal" class="text-input" rows="2" placeholder="자유롭게 적어주세요 (선택)">' + esc(draft.goal || '') + '</textarea>' +
      '<label class="field-label">지금까지 AI를 활용해 실제 취업 준비 결과물을 만들어본 경험이 있나요?</label>' +
      '<div class="chip-list">' + expOptions + '</div>' +
      '<button class="btn btn-primary btn-block" onclick="submitPreAssessment()">결과 확인하기</button>' +
      '</section>';
    return shell(html, { topbar: topbar('사전 Self-Check', '#/pre/q/10') });
  }

  window.selectExperience = function (opt) {
    var draft = S.get(K.PRE_ASSESSMENT, {}) || {};
    draft.experience = opt;
    S.set(K.PRE_ASSESSMENT, draft);
    render();
  };

  window.submitPreAssessment = function () {
    var draft = S.get(K.PRE_ASSESSMENT, {}) || {};
    draft.difficulty = (document.getElementById('pf-difficulty') || {}).value || '';
    draft.goal = (document.getElementById('pf-goal') || {}).value || '';
    if (!draft.experience) {
      alert('경험 정도를 선택해주세요.');
      return;
    }
    draft.completedAt = new Date(S.now()).toISOString();
    S.set(K.PRE_ASSESSMENT, draft);

    var scores = L.calcDimensionScores(draft);
    var levelInfo = L.calcLevel(scores.overall);
    var preScores = Object.assign({}, scores, { level: levelInfo.level, levelLabel: levelInfo.label + ' · ' + levelInfo.name });
    S.set(K.PRE_SCORES, preScores);

    if (!S.get(K.PARTICIPANT)) {
      S.set(K.PARTICIPANT, { participantId: L.generateParticipantId(), createdAt: new Date(S.now()).toISOString() });
    }

    var picks = L.recommendChallenges(scores, draft.experience, draft.goal);
    S.set(K.ROADMAP, { recommendedChallenges: picks.map(function (c) { return c.id; }) });
    // 재시작 시 사후 데이터도 초기화 (동일 브라우저에서 새로 진단을 시작한 경우)
    S.remove(K.POST_ASSESSMENT);
    S.remove(K.POST_SCORES);
    S.remove(K.POST_SURVEY);
    S.remove(K.REWARD_OPT);

    syncToSheet('assessment', buildFullRecord());
    nav('#/result');
  };

  // ---------------------------------------------------------------
  // 4. 결과 화면
  // ---------------------------------------------------------------
  function pageResult() {
    var scores = S.get(K.PRE_SCORES);
    var participant = S.get(K.PARTICIPANT);
    if (!scores || !participant) { nav('#/'); return ''; }

    var growth = L.getGrowthPoints(scores);
    var strength = L.getStrength(scores);
    var levelInfo = L.calcLevel(scores.overall);

    var barsHtml = D.DIMENSIONS.map(function (d) { return dimBar(d, scores[d]); }).join('');
    var growthHtml = growth.map(function (d) {
      return '<div class="growth-card"><div class="growth-dim">' + D.DIMENSION_LABELS[d] + '</div><p>' + esc(D.GROWTH_COPY[d]) + '</p></div>';
    }).join('');

    var html = '' +
      '<section class="card participant-card">' +
      '<div class="participant-label">당신의 참여코드</div>' +
      '<div class="participant-id">' + participant.participantId + '</div>' +
      '<p class="muted small">7일 후 사후진단에서 동일한 참여코드를 사용하면 나의 변화를 확인할 수 있어요.</p>' +
      '</section>' +

      '<section class="card level-card">' +
      '<div class="level-eyebrow">당신은</div>' +
      '<div class="level-badge">' + levelInfo.label + '</div>' +
      '<div class="level-name">' + levelInfo.name + '</div>' +
      '<p>' + esc(levelInfo.desc) + '</p>' +
      '</section>' +

      '<section class="card">' +
      '<h3>5개 영역</h3>' +
      barsHtml +
      '</section>' +

      '<section class="card">' +
      '<h3>지금 잘하고 있는 부분</h3>' +
      '<div class="growth-card strength-card"><div class="growth-dim">' + D.DIMENSION_LABELS[strength] + '</div><p>' + esc(D.STRENGTH_COPY[strength]) + '</p></div>' +
      '</section>' +

      '<section class="card">' +
      '<h3>지금의 성장 포인트</h3>' +
      growthHtml +
      '</section>' +

      '<button class="btn btn-primary btn-block" onclick="nav(\'#/roadmap\')">MY AI ROADMAP 보러가기</button>' +
      '<p class="fine-print center">이 결과는 공식 인증이나 검증된 평가도구가 아니라, 서비스 경험을 위해 자체 설계한 기준입니다.</p>';

    return shell(html, { topbar: topbar('진단 결과', null), footer: true });
  }

  // ---------------------------------------------------------------
  // 5. MY AI ROADMAP / Dashboard
  // ---------------------------------------------------------------
  function pageRoadmap() {
    var preScores = S.get(K.PRE_SCORES);
    var participant = S.get(K.PARTICIPANT);
    if (!preScores || !participant) { nav('#/'); return ''; }

    var roadmap = S.get(K.ROADMAP, { recommendedChallenges: [] });

    var cardsHtml = roadmap.recommendedChallenges.map(function (id) {
      var c = L.findChallengeById(id);
      if (!c) return '';
      return '' +
        '<div class="challenge-card" onclick="nav(\'#/challenge/' + id + '\')">' +
        '<div class="cc-body">' +
        '<div class="cc-title">' + esc(c.title) + '</div>' +
        '<div class="cc-meta">' + D.DIMENSION_LABELS[c.dimension] + ' · ' + c.estimatedTime + '</div>' +
        '</div>' +
        '<div class="cc-arrow">›</div>' +
        '</div>';
    }).join('');

    var html = '' +
      '<section class="card roadmap-head">' +
      '<div class="level-badge small">' + preScores.levelLabel + '</div>' +
      '<div class="roadmap-progress-label">나에게 추천하는 AI Challenge</div>' +
      '<p class="muted small">여기까지가 이 서비스의 제안이에요. 실제 실행은 각자의 방식과 속도로 해보시면 됩니다.</p>' +
      '</section>' +
      '<section class="challenge-list">' + cardsHtml + '</section>' +
      dashboardSection() +
      (isDevMode() ? '<a class="btn btn-ghost btn-block" href="#/dev">개발자 도구</a>' : '');

    return shell(html, { topbar: topbar('MY AI ROADMAP', '#/') });
  }

  function dashboardSection() {
    var pre = S.get(K.PRE_ASSESSMENT);
    var postSurvey = S.get(K.POST_SURVEY);
    if (postSurvey && postSurvey.completedAt) {
      return '' +
        '<section class="card dashboard-card done-card">' +
        '<div class="db-emoji">✅</div>' +
        '<p><strong>사후진단을 완료했어요.</strong></p>' +
        '<p class="muted small">사전·사후 비교와 만족도 결과를 다시 볼 수 있어요.</p>' +
        '<button class="btn btn-secondary btn-block" onclick="nav(\'#/compare\')">나의 변화 보기</button>' +
        '</section>';
    }
    if (!pre || !pre.completedAt) return '';

    var unlocked = L.isPostCheckUnlocked(pre.completedAt, S.now());
    if (!unlocked) {
      var remaining = Math.max(0, Math.ceil(7 - L.daysSince(pre.completedAt, S.now())));
      return '' +
        '<section class="card dashboard-card locked-card">' +
        '<p class="muted">사후진단은 7일 후 열립니다.</p>' +
        '<p class="fine-print">약 ' + remaining + '일 후 사후진단을 진행할 수 있어요. (사전진단일: ' + fmtDate(pre.completedAt) + ')</p>' +
        '</section>';
    }
    return '' +
      '<section class="card dashboard-card unlocked-card">' +
      '<div class="db-emoji">🔔</div>' +
      '<p><strong>AI 활용역량 로드맵을 시작한 지 7일이 되었어요.</strong></p>' +
      '<p>지금의 AI 활용 방식을 다시 확인해보세요.</p>' +
      '<p class="muted small">약 2분 소요</p>' +
      '<div class="reward-note"><span>🎁</span> 사후 설문 참여자 중 20명을 추첨하여 커피 쿠폰을 드립니다.</div>' +
      '<button class="btn btn-primary btn-block" onclick="nav(\'#/post/intro\')">사후진단 시작하기</button>' +
      '</section>';
  }

  // ---------------------------------------------------------------
  // 6. Challenge 상세 / 실행 / 완료
  // ---------------------------------------------------------------
  function pageChallengeDetail(id) {
    var c = L.findChallengeById(id);
    if (!c) { nav('#/roadmap'); return ''; }

    var stepsHtml = c.steps.map(function (s, i) { return '<li><span class="step-num">' + (i + 1) + '</span>' + esc(s) + '</li>'; }).join('');

    var html = '' +
      '<section class="card">' +
      '<div class="quiz-tag">' + D.DIMENSION_LABELS[c.dimension] + ' · ' + c.estimatedTime + ' · ' + c.difficulty + '</div>' +
      '<h2>' + esc(c.title) + '</h2>' +
      '<p class="challenge-goal"><strong>목표</strong><br>' + esc(c.goal) + '</p>' +
      '<p class="muted">' + esc(c.description) + '</p>' +
      '<h3>실행 방법 (참고용)</h3>' +
      '<ol class="step-list">' + stepsHtml + '</ol>' +
      '<div class="output-box"><strong>실제 결과물 예시</strong><br>' + esc(c.output) + '</div>' +
      '</section>' +
      '<section class="card action-card">' +
      '<p class="muted small">이 Challenge를 어떻게, 언제 해볼지는 직접 정해보세요.</p>' +
      '<button class="btn btn-secondary btn-block" onclick="nav(\'#/roadmap\')">로드맵으로 돌아가기</button>' +
      '</section>';

    return shell(html, { topbar: topbar('Challenge', '#/roadmap') });
  }

  // ---------------------------------------------------------------
  // 7. 사후 추가 설문 (Q11~15)
  // ---------------------------------------------------------------
  var COMPLETION_OPTIONS = ['대부분 수행했다', '일부 수행했다', '거의 수행하지 않았다', '전혀 수행하지 않았다'];

  function scaleMini(name, value, label) {
    var opts = [1, 2, 3, 4, 5].map(function (v) {
      return '<button class="scale-opt sm' + (value === v ? ' selected' : '') + '" onclick="setSurveyField(\'' + name + '\',' + v + ')"><span class="scale-opt-num">' + v + '</span></button>';
    }).join('');
    return '<div class="survey-item"><label class="field-label">' + esc(label) + '</label><div class="scale-opts row">' + opts + '</div></div>';
  }

  function pagePostSurvey() {
    var draft = S.get(K.POST_SURVEY, {}) || {};
    var completionOpts = COMPLETION_OPTIONS.map(function (opt) {
      var sel = draft.challengeCompletion === opt ? ' selected' : '';
      return '<button class="chip-opt' + sel + '" onclick="setSurveyField(\'challengeCompletion\',\'' + opt + '\')">' + esc(opt) + '</button>';
    }).join('');

    var html = '' +
      '<section class="card">' +
      '<h2>마지막 설문이에요</h2>' +
      '<div class="survey-item"><label class="field-label">추천받은 AI Challenge를 실제로 수행했나요?</label><div class="chip-list">' + completionOpts + '</div></div>' +
      scaleMini('helpfulness', draft.helpfulness, 'AI 활용역량 로드맵이 실제 취업 준비에 도움이 되었다.') +
      scaleMini('behaviorChange', draft.behaviorChange, '이번 경험 이후 AI를 활용하는 방식이 달라졌다.') +
      scaleMini('satisfaction', draft.satisfaction, '전체적으로 AI 활용역량 로드맵에 만족한다.') +
      '<label class="field-label">가장 도움이 되었던 점이나 개선했으면 하는 점이 있다면 작성해주세요.</label>' +
      '<textarea id="pf-feedback" class="text-input" rows="3" placeholder="자유롭게 적어주세요 (선택)">' + esc(draft.feedback || '') + '</textarea>' +
      '<button class="btn btn-primary btn-block" onclick="submitPostSurvey()">결과 확인하기</button>' +
      '</section>';
    return shell(html, { topbar: topbar('사후 설문', '#/post/q/10') });
  }

  window.setSurveyField = function (name, value) {
    var draft = S.get(K.POST_SURVEY, {}) || {};
    draft[name] = value;
    S.set(K.POST_SURVEY, draft);
    render();
  };

  window.submitPostSurvey = function () {
    var postAnswers = S.get(K.POST_ASSESSMENT, {}) || {};
    postAnswers.completedAt = new Date(S.now()).toISOString();
    S.set(K.POST_ASSESSMENT, postAnswers);

    var scores = L.calcDimensionScores(postAnswers);
    var levelInfo = L.calcLevel(scores.overall);
    var postScores = Object.assign({}, scores, { level: levelInfo.level, levelLabel: levelInfo.label + ' · ' + levelInfo.name });
    S.set(K.POST_SCORES, postScores);

    var draft = S.get(K.POST_SURVEY, {}) || {};
    if (!draft.challengeCompletion || !draft.helpfulness || !draft.behaviorChange || !draft.satisfaction) {
      alert('모든 항목에 응답해주세요.');
      return;
    }
    draft.feedback = (document.getElementById('pf-feedback') || {}).value || '';
    draft.completedAt = new Date(S.now()).toISOString();
    S.set(K.POST_SURVEY, draft);

    syncToSheet('assessment', buildFullRecord());
    nav('#/compare');
  };

  // ---------------------------------------------------------------
  // 8. 사전·사후 비교 + 만족도
  // ---------------------------------------------------------------
  function pageCompare() {
    var pre = S.get(K.PRE_SCORES);
    var post = S.get(K.POST_SCORES);
    var survey = S.get(K.POST_SURVEY);
    if (!pre || !post) { nav('#/roadmap'); return ''; }

    var change = L.calcChange(pre, post);
    var mostChanged = L.mostChangedDimension(change);

    var rowsHtml = D.DIMENSIONS.concat(['overall']).map(function (d) {
      var label = d === 'overall' ? '전체' : D.DIMENSION_LABELS[d];
      var delta = change[d];
      var sign = delta > 0 ? '+' : '';
      var cls = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat');
      return '' +
        '<div class="compare-row' + (d === 'overall' ? ' overall' : '') + '">' +
        '<div class="cr-label">' + label + '</div>' +
        '<div class="cr-values">' + pre[d].toFixed(1) + ' → ' + post[d].toFixed(1) + '</div>' +
        '<div class="cr-delta ' + cls + '">' + sign + delta.toFixed(1) + '</div>' +
        '</div>';
    }).join('');

    var deltaVal = change[mostChanged];
    var deltaWord = deltaVal > 0 ? '상승' : (deltaVal < 0 ? '하락' : '변화 없음');
    var highlight = deltaVal === 0
      ? '사전·사후 자기평가에서 뚜렷한 변화는 없었어요.'
      : ('자기응답 기준 ' + D.DIMENSION_LABELS[mostChanged] + ' 영역 점수가 ' + Math.abs(deltaVal).toFixed(1) + '점 ' + deltaWord + '했어요.');

    var satisfactionHtml = survey ? ('' +
      '<section class="card">' +
      '<h3>서비스 경험</h3>' +
      satisfactionRow('취업 준비 도움 정도', survey.helpfulness) +
      satisfactionRow('AI 활용 방식 변화', survey.behaviorChange) +
      satisfactionRow('전체 만족도', survey.satisfaction) +
      '</section>') : '';

    var rewardHtml = S.get(K.REWARD_OPT)
      ? '<button class="btn btn-secondary btn-block" onclick="nav(\'#/reward\')">경품 응모 화면 다시 보기</button>'
      : ('' +
        '<section class="card reward-card">' +
        '<div class="db-emoji">🎁</div>' +
        '<p>커피 쿠폰 추첨에 참여하시겠어요?</p>' +
        '<div class="btn-row">' +
        '<button class="btn btn-primary" onclick="chooseReward(\'in\')">참여하기</button>' +
        '<button class="btn btn-ghost" onclick="chooseReward(\'out\')">참여하지 않기</button>' +
        '</div>' +
        '</section>');

    var html = '' +
      '<section class="card">' +
      '<h2>나의 변화</h2>' +
      '<div class="compare-list">' + rowsHtml + '</div>' +
      '<p class="highlight-box">' + esc(highlight) + '</p>' +
      '<p class="fine-print">이 결과는 역량이 향상되었다는 의미가 아니라, 사전·사후 자기응답을 비교한 값입니다.</p>' +
      '</section>' +
      satisfactionHtml +
      rewardHtml;

    return shell(html, { topbar: topbar('나의 변화', '#/roadmap'), footer: true });
  }

  function satisfactionRow(label, value) {
    if (value == null) return '';
    var v = Number(value);
    return '<div class="satisfaction-row"><span>' + esc(label) + '</span><strong>' + v.toFixed(1) + ' / 5</strong></div>';
  }

  // ---------------------------------------------------------------
  // 9. 경품 추첨 (진단 데이터와 분리 저장)
  // ---------------------------------------------------------------
  window.chooseReward = function (choice) {
    S.set(K.REWARD_OPT, choice);
    nav('#/reward');
  };

  function pageReward() {
    var choice = S.get(K.REWARD_OPT);
    if (!choice) { nav('#/compare'); return ''; }

    if (choice === 'out') {
      return shell('' +
        '<section class="card">' +
        '<p>참여해주셔서 감사합니다. AI 활용역량 로드맵 경험은 여기까지예요.</p>' +
        '<button class="btn btn-secondary btn-block" onclick="nav(\'#/roadmap\')">로드맵으로 돌아가기</button>' +
        '</section>', { topbar: topbar('경품 추첨', '#/compare') });
    }

    var existing = S.get(K.REWARD_DATA);
    if (existing) {
      return shell('' +
        '<section class="card">' +
        '<p>🎉 경품 응모가 완료되었습니다.</p>' +
        '<p class="muted small">참여코드: ' + existing.participantId + '</p>' +
        '<button class="btn btn-secondary btn-block" onclick="nav(\'#/roadmap\')">로드맵으로 돌아가기</button>' +
        '</section>', { topbar: topbar('경품 추첨', '#/compare') });
    }

    var html = '' +
      '<section class="card">' +
      '<h2>커피 쿠폰 추첨 응모</h2>' +
      '<p class="fine-print">경품 추첨을 위한 연락처 정보는 진단 데이터와 별도로 관리합니다.</p>' +
      '<label class="field-label">이름 또는 닉네임</label>' +
      '<input id="rw-name" class="text-input" type="text" placeholder="이름 또는 닉네임" />' +
      '<label class="field-label">연락처</label>' +
      '<input id="rw-contact" class="text-input" type="text" placeholder="휴대폰 번호 또는 이메일" />' +
      '<button class="btn btn-primary btn-block" onclick="submitReward()">응모하기</button>' +
      '</section>';
    return shell(html, { topbar: topbar('경품 추첨', '#/compare') });
  }

  window.submitReward = function () {
    var name = (document.getElementById('rw-name') || {}).value || '';
    var contact = (document.getElementById('rw-contact') || {}).value || '';
    if (!name.trim() || !contact.trim()) {
      alert('이름(또는 닉네임)과 연락처를 입력해주세요.');
      return;
    }
    var participant = S.get(K.PARTICIPANT);
    var rewardData = {
      participantId: participant ? participant.participantId : '',
      nameOrNickname: name.trim(),
      contact: contact.trim(),
      submittedAt: new Date(S.now()).toISOString()
    };
    S.set(K.REWARD_DATA, rewardData);
    syncToSheet('reward', rewardData);
    render();
  };

  // ---------------------------------------------------------------
  // 10. 개발자 도구
  // ---------------------------------------------------------------
  function buildFullRecord() {
    var participant = S.get(K.PARTICIPANT) || {};
    var pre = S.get(K.PRE_SCORES) || {};
    var post = S.get(K.POST_SCORES) || {};
    var roadmap = S.get(K.ROADMAP, { recommendedChallenges: [] });
    var survey = S.get(K.POST_SURVEY) || {};
    var hasPost = !!S.get(K.POST_SCORES);
    var change = hasPost ? L.calcChange(pre, post) : {};

    return {
      participantId: participant.participantId || '',
      preExploration: pre.exploration, preInstruction: pre.instruction, preVerification: pre.verification,
      preApplication: pre.application, preExpansion: pre.expansion, preOverall: pre.overall, preLevel: pre.level,
      postExploration: post.exploration, postInstruction: post.instruction, postVerification: post.verification,
      postApplication: post.application, postExpansion: post.expansion, postOverall: post.overall, postLevel: post.level,
      explorationChange: change.exploration, instructionChange: change.instruction, verificationChange: change.verification,
      applicationChange: change.application, expansionChange: change.expansion, overallChange: change.overall,
      recommendedChallenges: roadmap.recommendedChallenges.join('|'),
      challengeCompletion: survey.challengeCompletion,
      helpfulness: survey.helpfulness, behaviorChange: survey.behaviorChange, satisfaction: survey.satisfaction,
      createdAt: participant.createdAt || '', postCompletedAt: survey.completedAt || ''
    };
  }

  window.exportCsv = function () {
    var record = buildFullRecord();
    var csv = L.toCsv([L.buildCsvRow(record)]);
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ai-roadmap-' + (record.participantId || 'data') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.devSetDevMode = function () {
    S.set(K.DEV_MODE, '1');
    render();
  };

  window.devAdjustDays = function (days) {
    var current = S.get(K.DEV_DATE_OFFSET_MS, 0) || 0;
    S.set(K.DEV_DATE_OFFSET_MS, current + days * 86400000);
    render();
  };

  window.devResetOffset = function () {
    S.set(K.DEV_DATE_OFFSET_MS, 0);
    render();
  };

  window.devManualSync = function () {
    var record = buildFullRecord();
    syncToSheet('assessment', record);
    var reward = S.get(K.REWARD_DATA);
    if (reward) syncToSheet('reward', reward);
    alert('전송을 시도했습니다 (no-cors라 성공 여부는 구글시트에서 직접 확인해야 해요).');
  };

  window.devClearAll = function () {
    if (confirm('저장된 모든 진단/설문 데이터를 삭제할까요?')) {
      S.clearAll();
      nav('#/');
    }
  };

  function pageDev() {
    var record = buildFullRecord();
    var offset = S.get(K.DEV_DATE_OFFSET_MS, 0) || 0;
    var simulatedNow = new Date(S.now());
    var raw = {
      participant: S.get(K.PARTICIPANT),
      preAssessment: S.get(K.PRE_ASSESSMENT),
      preScores: S.get(K.PRE_SCORES),
      roadmap: S.get(K.ROADMAP),
      postAssessment: S.get(K.POST_ASSESSMENT),
      postScores: S.get(K.POST_SCORES),
      postSurvey: S.get(K.POST_SURVEY),
      rewardData: S.get(K.REWARD_DATA)
    };

    var html = '' +
      '<section class="card">' +
      '<h2>개발자 도구</h2>' +
      '<p class="fine-print">일반 사용자에게는 노출되지 않는 화면입니다. 접근: <code>#/dev</code> 또는 <code>?dev=1</code></p>' +
      '<button class="btn btn-secondary btn-block" onclick="exportCsv()">CSV Export</button>' +
      '</section>' +

      '<section class="card">' +
      '<h3>구글시트 자동 수집</h3>' +
      (SHEET_WEBHOOK_URL
        ? '<p class="muted small">✅ 연동됨 - 진단/Challenge/설문 완료 시 자동 전송됩니다.</p>'
        : '<p class="muted small">⚪ 미설정 - app.js 상단의 <code>SHEET_WEBHOOK_URL</code>을 배포한 Apps Script 웹앱 URL로 채우면 활성화됩니다. (google-apps-script.gs 참고)</p>') +
      '<button class="btn btn-ghost btn-block" onclick="devManualSync()">지금 현재 데이터 수동 동기화</button>' +
      '<p class="fine-print">no-cors 전송이라 성공 여부를 브라우저에서 확인할 수 없습니다. 구글시트에 실제로 값이 들어왔는지 직접 확인하세요.</p>' +
      '</section>' +

      '<section class="card">' +
      '<h3>7일 경과 시뮬레이션</h3>' +
      '<p class="muted small">현재 시뮬레이션된 날짜: ' + simulatedNow.toLocaleString('ko-KR') + ' (offset ' + (offset / 86400000).toFixed(1) + '일)</p>' +
      '<div class="btn-row wrap">' +
      '<button class="btn btn-ghost" onclick="devAdjustDays(1)">+1일</button>' +
      '<button class="btn btn-ghost" onclick="devAdjustDays(3)">+3일</button>' +
      '<button class="btn btn-ghost" onclick="devAdjustDays(7)">+7일</button>' +
      '<button class="btn btn-ghost" onclick="devResetOffset()">오프셋 리셋</button>' +
      '</div>' +
      '</section>' +

      '<section class="card">' +
      '<h3>데이터 초기화</h3>' +
      '<button class="btn btn-danger btn-block" onclick="devClearAll()">전체 데이터 삭제</button>' +
      '</section>' +

      '<section class="card">' +
      '<h3>Raw 데이터</h3>' +
      '<pre class="raw-json">' + esc(JSON.stringify(raw, null, 2)) + '</pre>' +
      '</section>';

    return shell(html, { topbar: topbar('개발자 도구', '#/roadmap') });
  }

  // ---------------------------------------------------------------
  // 라우터
  // ---------------------------------------------------------------
  function parseHash() {
    var hash = location.hash.replace(/^#/, '') || '/';
    return hash.split('/').filter(Boolean);
  }

  function render() {
    if (location.search.indexOf('dev=1') !== -1) {
      S.set(K.DEV_MODE, '1');
    }
    var parts = parseHash();
    var html;

    if (parts.length === 0) {
      html = pageLanding();
    } else if (parts[0] === 'pre' && parts[1] === 'intro') {
      html = pagePreIntro();
    } else if (parts[0] === 'pre' && parts[1] === 'q') {
      html = pageQuizQuestion('pre', parts[2]);
    } else if (parts[0] === 'pre' && parts[1] === 'personal') {
      html = pagePrePersonal();
    } else if (parts[0] === 'result') {
      html = pageResult();
    } else if (parts[0] === 'roadmap') {
      html = pageRoadmap();
    } else if (parts[0] === 'challenge' && parts[1]) {
      html = pageChallengeDetail(parts[1]);
    } else if (parts[0] === 'post' && parts[1] === 'intro') {
      html = pagePostIntro();
    } else if (parts[0] === 'post' && parts[1] === 'q') {
      html = pageQuizQuestion('post', parts[2]);
    } else if (parts[0] === 'post-survey') {
      html = pagePostSurvey();
    } else if (parts[0] === 'compare') {
      html = pageCompare();
    } else if (parts[0] === 'reward') {
      html = pageReward();
    } else if (parts[0] === 'dev') {
      html = pageDev();
    } else {
      html = pageLanding();
    }

    if (html) {
      document.getElementById('app').innerHTML = html;
    }
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', render);
})();
