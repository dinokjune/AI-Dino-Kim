# 대본 JSON 변환 프롬프트

아래 블록을 통째로 Claude에게 붙여 넣고, 맨 끝의 `[재료]` 자리에 주제 한 줄이나 원고, 영상 자막 등을 넣으세요. 결과로 나온 JSON을 `index.html`에 끌어다 놓으면 같은 스타일의 영상이 재생됩니다.

---

```
너는 "무대형 모션 영상 엔진"용 대본 JSON을 쓰는 영상 작가다.
아래 [재료]를 바탕으로, 정해진 내러티브 구조와 장면 타입만 써서 JSON 하나를 만들어라.
JSON 외의 설명은 쓰지 마라.

## 내러티브 구조 (이 순서를 지킨다. 괄호는 권장 장면 타입)
1. 훅 – 같은 재료가 여러 결과로 갈리는 장면을 보여 주고, 차이를 만든 "단 하나"를 던진다 (monitors)
2. 문제 제기 – 시청자가 흔히 하는 말이나 행동 (bubble, mood: happy)
3. 문제 심화 – 그렇게 하면 결과가 매번 달라진다 (compare, verdict: none)
4. 근거 수치 – 숫자 하나로 문제 크기를 보여 준다 (number)
5. 비유 – 일상 비유 한 개 (title + icon)
6. 흔한 해법과 그 한계 (typing)
7. 잘 되는 사례들의 공통점 3~5개 (line)
8. 해법 공개 – 이름 붙인 프레임워크, 정확히 3칸 (cards)
9. 실행 단계 – 3~5단계, 단계마다 장면 하나 (step, n/total 일치)
10. 함정 비교 – 나쁜 예 vs 좋은 예 (compare, verdict: right, transition: curtain)
11. 반전 – 직관과 반대되는 발견 (bubble, mood: sweat)
12. 최소 규칙 – 꼭 지킬 것 3~5개 (checklist)
13. 점검 1 – 눈으로 전체를 훑는 점검 (grid)
14. 점검 2 – 숫자로 하는 점검 (meters)
15. 복리 – 실수를 다음 회차의 규칙으로 바꾸는 습관 (title + icon: bulb)
16. 정리 – 핵심 3가지 (cards, stamp: true)
17. 마무리 (endcard, dur: 5)
재료가 짧으면 9번 단계를 줄이고 6·13·14번 중 맞지 않는 것은 빼도 된다. 순서는 바꾸지 않는다.

## 문장 규칙
- say: 구어체 존댓말, 1~2문장, 문장당 40자 안팎. 이게 자막이자 내레이션이다.
- 강조할 핵심 단어 1~2개는 *별표*로 감싼다 (자막에서 노란색으로 표시됨).
- 화면 글자(text, title, items)는 12자 이내로 짧게. say를 그대로 반복하지 않는다.
- 재료에 없는 숫자·인용·통계를 지어내지 않는다. 근거가 없으면 label에 "(예시)" 또는 "(가정)"을 붙인다.
- 남의 영상 문장을 그대로 옮기지 말고 새로 쓴다.

## 장면 타입과 속성
공통: beat(문자열), type, say, wall(cream|parchment|olive|purple|green|peach|dark|red),
      dur(초, 생략하면 say 길이로 자동), transition(flow|slide|curtain|zoom|cut), mood, mascot(false로 숨김), sfx([{at, name}])
- monitors: count(3~8), labels(선택)
- bubble: text(말풍선 문장), mood(happy|think|sweat|wow|point|wave|sad)
- compare: left/right {label, mode(choppy|smooth|still), seed(0~5), text}, verdict(left|right|none)
- number: value(문자열, 예 "1,938" "1.7"), suffix, icon, label, countUp(true면 0부터 올라감 – 중간값이 화면에 찍히니 꼭 필요할 때만)
- funnel: steps [{value, label}] 2~4개
- title: text, sub, icon
- typing: name, handle, text, likes
- line: title, items [{icon, text}] 3~6개
- cards: title, items [{icon 또는 num, title, text}] 정확히 3개 권장, stamp, stampText
- step: n, total, badge(첫째/둘째…), icon, text
- checklist: title, items [문자열] 3~6개
- grid: cols, rows, flags [경고 표시할 칸 번호], title
- meters: title, items [{label, value(0~1), target([최소, 최대]), note}] 2~3개
- endcard: channel, url, button
아이콘: check x key clock bulb folder eye ruler palette speaker camera chef star gear doc search warn film robot chart heart mic stamp target book calendar
효과음(sfx name): pop tick check whoosh ding chime notify stamp snap curtain boing paper scan sweep buzz riser

## 출력 형식
{
  "meta": { "title": "...", "channel": "AI활용연구소", "url": "youtube.com/@your-channel", "tone": "stage" },
  "scenes": [ ... ]
}
tone은 stage(기본, 종이 무대), dark(네온), minimal(흰 UI) 중 재료 분위기에 맞게 고른다.

[재료]
여기에 주제·원고·자막을 넣는다
```
