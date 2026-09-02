/* ============================================================
 * AI 활용역량 로드맵 - 데이터 정의 (문항 / Challenge)
 * DOM에 의존하지 않는 순수 데이터 모듈. 브라우저 <script> 태그와
 * Node(테스트) 양쪽에서 재사용한다.
 * ============================================================ */
(function (root) {
  'use strict';

  var DIMENSIONS = ['exploration', 'instruction', 'verification', 'application', 'expansion'];

  var DIMENSION_LABELS = {
    exploration: '탐색',
    instruction: '지시',
    verification: '검증',
    application: '적용',
    expansion: '확장'
  };

  var SCALE_LABELS = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];

  // Q1~Q10 : 점수에 반영되는 Self-Check 문항
  var QUESTIONS = [
    { id: 'q1', dimension: 'exploration', tag: '탐색', text: 'AI를 이용해 필요한 정보를 빠르게 찾고 정리할 수 있다.' },
    { id: 'q2', dimension: 'exploration', tag: '탐색', text: 'AI에게 필요한 정보를 얻기 위해 질문의 조건이나 방향을 조절할 수 있다.' },
    { id: 'q3', dimension: 'instruction', tag: '지시', text: 'AI에게 원하는 결과물의 목적, 조건, 형식 등을 구체적으로 설명할 수 있다.' },
    { id: 'q4', dimension: 'instruction', tag: '지시', text: '원하는 결과가 나오지 않으면 질문이나 프롬프트를 바꿔 다시 시도할 수 있다.' },
    { id: 'q5', dimension: 'verification', tag: '검증', text: 'AI가 제공한 정보가 정확한지 직접 확인할 수 있다.' },
    { id: 'q6', dimension: 'verification', tag: '검증', text: 'AI의 답변을 그대로 사용하기보다 정확성, 출처, 개인정보·저작권 등의 문제를 고려하여 내 목적에 맞게 판단하고 수정할 수 있다.' },
    { id: 'q7', dimension: 'application', tag: '적용', text: '자소서, 기업조사, 면접 준비 등 실제 취업 준비 과정에서 AI를 적절한 단계에 활용할 수 있다.' },
    { id: 'q8', dimension: 'application', tag: '적용', text: 'AI를 활용해 취업 준비 과정의 시간이나 노력을 줄이거나 결과물의 질을 개선할 수 있다.' },
    { id: 'q9', dimension: 'expansion', tag: '확장', text: '반복적으로 하는 취업 준비 작업을 AI를 활용해 더 효율적인 방식으로 바꿔본 경험이 있다.' },
    { id: 'q10', dimension: 'expansion', tag: '확장', text: '새로운 AI 도구를 발견하면 내 취업 준비나 학습에 어떻게 활용할 수 있을지 스스로 생각해볼 수 있다.' }
  ];

  // Q13 경험도 선택지 (점수에는 포함되지 않음 - Challenge 추천 참고용)
  var EXPERIENCE_OPTIONS = [
    '없다',
    '1~2번 해봤다',
    '가끔 활용한다',
    '자주 활용한다',
    '여러 취업 준비 과정에 적극적으로 활용한다'
  ];

  var LEVELS = [
    { level: 1, min: 1.0, max: 2.0, label: 'LEVEL 1', name: '시작하기', desc: 'AI를 활용하는 첫걸음을 막 내딛은 단계예요.' },
    { level: 2, min: 2.1, max: 3.0, label: 'LEVEL 2', name: '활용하기', desc: 'AI를 실제 취업 준비에 활용하기 시작한 단계예요.' },
    { level: 3, min: 3.1, max: 4.0, label: 'LEVEL 3', name: '검증하고 개선하기', desc: 'AI의 결과물을 검증하고 다듬어가는 단계예요.' },
    { level: 4, min: 4.1, max: 5.0, label: 'LEVEL 4', name: '확장하기', desc: 'AI 활용 방식을 스스로 확장해나가는 단계예요.' }
  ];

  // 성장 포인트(가장 낮은 영역) 안내 문구
  var GROWTH_COPY = {
    exploration: '필요한 정보를 더 구체적인 조건으로 요청하며 AI 탐색의 범위를 넓혀보세요.',
    instruction: '원하는 결과물의 목적과 조건을 더 명확하게 담아 AI에게 지시해보세요.',
    verification: 'AI가 제공한 정보를 그대로 받아들이기보다 직접 확인하고 판단하는 연습을 해보세요.',
    application: '취업 준비의 여러 단계에서 AI를 더 적극적으로 활용해보세요.',
    expansion: 'AI를 단순히 사용하는 것을 넘어 반복적인 취업 준비 과정을 개선해보세요.'
  };

  // 강점(가장 높은 영역) 안내 문구
  var STRENGTH_COPY = {
    exploration: '필요한 정보를 빠르게 찾고 정리하는 힘을 갖고 있어요.',
    instruction: '원하는 결과물을 구체적으로 요청할 수 있어요.',
    verification: 'AI의 답변을 검토하고 판단하는 습관이 자리잡고 있어요.',
    application: '실제 취업 준비 과정에 AI를 적용하고 있어요.',
    expansion: 'AI 활용 방식을 스스로 개선해나가고 있어요.'
  };

  // Challenge 데이터 (5개 영역 x 3개)
  // difficultyIndex: 0(쉬움) ~ 2(응용) - 추천 로직에서 경험도 매칭에 사용
  var CHALLENGES = {
    exploration: [
      {
        id: 'expl-1',
        dimension: 'exploration',
        title: '관심 기업 1곳의 정보를 AI로 정리하기',
        goal: 'AI를 활용해 기업정보를 빠르게 탐색하고 구조화합니다.',
        description: '관심 있는 기업 한 곳을 정하고, AI에게 질문하여 핵심 정보를 얻은 뒤 표로 정리해봅니다.',
        steps: [
          '관심 기업 1곳을 정합니다.',
          'AI에게 사업영역, 최근 이슈, 인재상 등을 질문합니다.',
          'AI의 답변에서 핵심 정보를 선별합니다.',
          '선별한 정보를 표 형태로 정리합니다.'
        ],
        output: '기업정보 요약표 1개',
        estimatedTime: '15분',
        difficulty: '쉬움',
        difficultyIndex: 0,
        keywords: ['기업', '탐색', '정보']
      },
      {
        id: 'expl-2',
        dimension: 'exploration',
        title: '동일 기업을 서로 다른 방식으로 조사하고 결과 비교하기',
        goal: '질문 방식에 따라 AI 탐색 결과가 어떻게 달라지는지 확인합니다.',
        description: '같은 기업에 대해 서로 다른 두 가지 방식으로 질문하고, 결과를 비교합니다.',
        steps: [
          '조사할 기업 1곳을 정합니다.',
          '포괄적인 질문으로 AI에게 기업정보를 요청합니다.',
          '구체적인 조건(예: 최근 3년 이슈, 특정 사업부)을 담아 다시 질문합니다.',
          '두 결과를 비교하며 차이를 정리합니다.'
        ],
        output: '두 가지 AI 질문 방식과 결과 비교표',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 1,
        keywords: ['기업', '비교']
      },
      {
        id: 'expl-3',
        dimension: 'exploration',
        title: '기업 정보를 AI와 함께 표로 정리하기',
        goal: '여러 항목의 기업정보를 구조화된 표로 정리하는 연습을 합니다.',
        description: 'AI에게 기업정보를 표 형태로 요청하고, 필요한 항목을 추가·수정합니다.',
        steps: [
          '관심 기업 1~2곳을 정합니다.',
          'AI에게 사업영역, 매출, 인재상 등 항목을 표로 정리해달라고 요청합니다.',
          '부족한 항목이 있으면 AI에게 추가 요청합니다.',
          '완성된 표를 저장합니다.'
        ],
        output: '기업정보 표',
        estimatedTime: '15분',
        difficulty: '쉬움',
        difficultyIndex: 2,
        keywords: ['기업', '표']
      }
    ],
    instruction: [
      {
        id: 'instr-1',
        dimension: 'instruction',
        title: '같은 질문을 서로 다른 방식으로 요청해보기',
        goal: '프롬프트 표현에 따라 결과가 어떻게 달라지는지 경험합니다.',
        description: '동일한 목적의 질문을 짧은 버전과 구체적인 버전으로 각각 요청하고 비교합니다.',
        steps: [
          'AI에게 요청할 주제 1개를 정합니다.',
          '짧고 간단하게 질문합니다 (Prompt A).',
          '목적·조건·형식을 구체적으로 담아 다시 질문합니다 (Prompt B).',
          '두 결과를 비교하고 차이를 정리합니다.'
        ],
        output: 'Prompt A / Prompt B / 결과 비교',
        estimatedTime: '15분',
        difficulty: '쉬움',
        difficultyIndex: 0,
        keywords: ['프롬프트', '비교']
      },
      {
        id: 'instr-2',
        dimension: 'instruction',
        title: '자소서 첨삭용 Prompt 만들기',
        goal: '반복해서 사용할 수 있는 자소서 첨삭 Prompt를 직접 설계합니다.',
        description: '자소서 첨삭에 필요한 조건(분량, 톤, 확인 기준)을 담은 나만의 Prompt를 만듭니다.',
        steps: [
          '첨삭받고 싶은 자소서 문항 또는 문단을 준비합니다.',
          '첨삭 시 확인할 기준(논리성, 구체성, 분량 등)을 정합니다.',
          '기준을 포함한 Prompt를 작성해 AI에게 첨삭을 요청합니다.',
          '결과를 보고 Prompt를 다듬어 최종본을 만듭니다.'
        ],
        output: '나만의 자소서 첨삭 Prompt',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 1,
        keywords: ['자소서', '첨삭']
      },
      {
        id: 'instr-3',
        dimension: 'instruction',
        title: '목적·조건·형식을 포함한 Prompt 작성하기',
        goal: '목적, 조건, 형식을 갖춘 구조화된 Prompt 작성법을 연습합니다.',
        description: '원하는 결과물의 목적과 조건, 형식을 명확히 담아 Prompt를 작성합니다.',
        steps: [
          '결과물이 필요한 상황을 정합니다 (예: 자기소개서 문단 작성).',
          '목적을 한 문장으로 정리합니다.',
          '조건(분량, 어조, 포함할 내용)을 정합니다.',
          '형식(표, 목록, 문단 등)을 정해 Prompt에 포함합니다.'
        ],
        output: '구조화된 Prompt 1개',
        estimatedTime: '15분',
        difficulty: '쉬움',
        difficultyIndex: 2,
        keywords: ['프롬프트', '구조화']
      }
    ],
    verification: [
      {
        id: 'verify-1',
        dimension: 'verification',
        title: 'AI가 제공한 기업정보 3개 직접 확인하기',
        goal: 'AI가 제공한 정보를 그대로 믿지 않고 직접 확인하는 연습을 합니다.',
        description: 'AI에게 받은 기업정보 중 중요한 정보 3가지를 선택해 실제 출처와 비교합니다.',
        steps: [
          '관심 기업을 선택합니다.',
          'AI에게 기업정보를 질문합니다.',
          '중요한 정보 3개를 선택합니다.',
          '기업 공식 홈페이지나 신뢰할 수 있는 자료에서 직접 확인합니다.',
          'AI 정보와 실제 정보를 비교합니다.'
        ],
        output: 'AI 정보 / 실제 출처 / 일치 여부 표',
        estimatedTime: '15분',
        difficulty: '쉬움',
        difficultyIndex: 0,
        keywords: ['기업', '검증', '출처']
      },
      {
        id: 'verify-2',
        dimension: 'verification',
        title: 'AI가 작성한 기업 분석에서 사실과 추론 구분하기',
        goal: 'AI 답변 속 사실과 추론(해석)을 구분하는 눈을 기릅니다.',
        description: 'AI에게 기업 분석을 요청한 뒤, 답변을 사실과 추론으로 나눠봅니다.',
        steps: [
          '관심 기업에 대한 분석을 AI에게 요청합니다.',
          '답변을 문장 단위로 살펴봅니다.',
          '확인 가능한 사실과 AI의 추론을 구분해 표시합니다.',
          '구분 결과를 표로 정리합니다.'
        ],
        output: '사실 / 추론 구분표',
        estimatedTime: '15분',
        difficulty: '쉬움',
        difficultyIndex: 1,
        keywords: ['분석', '검증']
      },
      {
        id: 'verify-3',
        dimension: 'verification',
        title: 'AI 답변과 기업 공식 홈페이지 비교하기',
        goal: 'AI 답변과 공식 자료의 차이를 직접 비교해봅니다.',
        description: '같은 항목(예: 채용 절차, 인재상)에 대해 AI 답변과 공식 홈페이지 내용을 나란히 비교합니다.',
        steps: [
          '비교할 기업과 항목(채용절차, 인재상 등)을 정합니다.',
          'AI에게 해당 항목을 질문합니다.',
          '기업 공식 홈페이지에서 동일 항목을 찾습니다.',
          '두 내용을 나란히 비교하고 차이를 기록합니다.'
        ],
        output: 'AI 답변 / 공식 자료 비교',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 2,
        keywords: ['비교', '검증']
      }
    ],
    application: [
      {
        id: 'apply-1',
        dimension: 'application',
        title: '채용공고 하나를 AI와 함께 분석하기',
        goal: '채용공고에서 요구하는 핵심 역량을 AI와 함께 정리합니다.',
        description: '관심 있는 채용공고 1건을 AI에게 분석 요청하고 핵심 역량을 표로 정리합니다.',
        steps: [
          '지원을 고려 중인 채용공고 1건을 준비합니다.',
          'AI에게 공고문을 주고 핵심 요구역량을 정리해달라고 요청합니다.',
          'AI가 정리한 내용 중 중요한 항목을 선별합니다.',
          'JD 핵심역량 정리표로 완성합니다.'
        ],
        output: 'JD 핵심역량 정리표',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 0,
        keywords: ['채용공고', 'jd', '기업']
      },
      {
        id: 'apply-2',
        dimension: 'application',
        title: 'AI와 자소서 소재 브레인스토밍하기',
        goal: 'AI와의 대화를 통해 자소서에 쓸 소재를 발굴합니다.',
        description: '자신의 경험을 AI에게 설명하고, 자소서 소재가 될 만한 이야기를 함께 찾아봅니다.',
        steps: [
          '자소서 문항 1개를 정합니다.',
          '관련된 자신의 경험을 AI에게 이야기합니다.',
          'AI와 대화하며 소재가 될 만한 경험을 3개 이상 뽑아봅니다.',
          '가장 적합한 소재 3개를 최종 선택합니다.'
        ],
        output: '자소서 소재 3개',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 1,
        keywords: ['자소서', '소재']
      },
      {
        id: 'apply-3',
        dimension: 'application',
        title: 'AI로 예상 면접 질문 만들고 답변 연습하기',
        goal: 'AI를 활용해 예상 면접 질문을 준비하고 답변을 연습합니다.',
        description: '지원 직무를 기준으로 AI에게 예상 질문을 요청하고, 답변 초안을 작성합니다.',
        steps: [
          '지원 직무 또는 기업을 AI에게 알려줍니다.',
          '예상 면접 질문 5개를 요청합니다.',
          '각 질문에 대한 답변 초안을 작성합니다.',
          'AI에게 답변 초안에 대한 피드백을 요청합니다.'
        ],
        output: '예상 질문 5개 + 답변 초안',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 2,
        keywords: ['면접', '질문']
      }
    ],
    expansion: [
      {
        id: 'expand-1',
        dimension: 'expansion',
        title: '반복적으로 하는 취업 준비 작업 하나 찾기',
        goal: 'AI로 개선할 수 있는 반복 작업을 스스로 발견합니다.',
        description: '취업 준비 과정에서 반복적으로 하는 작업 하나를 찾아 현재 방식을 정리합니다.',
        steps: [
          '최근 1~2주간의 취업 준비 활동을 떠올립니다.',
          '반복적으로 수행한 작업 하나를 고릅니다.',
          '현재 그 작업을 어떤 순서로 하는지 적어봅니다.'
        ],
        output: '기존 작업 과정 정리',
        estimatedTime: '10분',
        difficulty: '쉬움',
        difficultyIndex: 0,
        keywords: ['반복', '워크플로']
      },
      {
        id: 'expand-2',
        dimension: 'expansion',
        title: '그 작업을 AI를 활용해 더 효율적인 방식으로 바꾸기',
        goal: '반복 작업을 AI를 활용한 방식으로 개선해봅니다.',
        description: '앞서 찾은 반복 작업을 AI를 활용해 더 효율적으로 바꿔보고 전후를 비교합니다.',
        steps: [
          '개선하고 싶은 반복 작업을 준비합니다.',
          'AI를 활용해 이 작업을 더 빠르게 할 방법을 찾아봅니다.',
          '새로운 방식으로 한 번 실행해봅니다.',
          '기존 방식(Before)과 새로운 방식(After)을 비교 정리합니다.'
        ],
        output: 'Before / After workflow',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 1,
        keywords: ['워크플로', '효율']
      },
      {
        id: 'expand-3',
        dimension: 'expansion',
        title: '나만의 AI Prompt Template 만들기',
        goal: '반복해서 재사용할 수 있는 나만의 Prompt Template을 만듭니다.',
        description: '자주 사용하는 요청 유형을 정하고, 재사용 가능한 Prompt Template을 설계합니다.',
        steps: [
          '자주 AI에게 요청하는 작업 유형을 1개 정합니다 (예: 자소서 첨삭, 기업분석).',
          '매번 바뀌는 부분과 고정되는 부분을 구분합니다.',
          '고정 부분은 템플릿으로, 바뀌는 부분은 빈칸으로 남겨 Prompt Template을 작성합니다.',
          '실제 상황에 적용해 템플릿을 테스트합니다.'
        ],
        output: '재사용 가능한 Prompt Template',
        estimatedTime: '20분',
        difficulty: '보통',
        difficultyIndex: 2,
        keywords: ['템플릿', '재사용']
      }
    ]
  };

  var DATA = {
    DIMENSIONS: DIMENSIONS,
    DIMENSION_LABELS: DIMENSION_LABELS,
    SCALE_LABELS: SCALE_LABELS,
    QUESTIONS: QUESTIONS,
    EXPERIENCE_OPTIONS: EXPERIENCE_OPTIONS,
    LEVELS: LEVELS,
    GROWTH_COPY: GROWTH_COPY,
    STRENGTH_COPY: STRENGTH_COPY,
    CHALLENGES: CHALLENGES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA;
  } else {
    root.AICR_DATA = DATA;
  }
})(typeof window !== 'undefined' ? window : this);
