# 디노킴 소개 릴 — 캐릭터 클립 프롬프트 (가안)

Seedance 2.5 기준. 캐릭터 이미지와 본인 목소리 샘플을 함께 넣는다. 18초, 9:16, 720p, 카메라 고정.

> A young Korean man in a navy pinstripe three-piece suit sits at a wooden desk with a laptop, a Korean flag on the wall behind him, soft daylight from the window, clean illustrated style. Fixed camera, medium shot, 9:16. He speaks Korean to the camera in a warm, confident tone, with natural lip sync. One gesture per line:
> 1. (0–4s) "안녕하세요, AI 활용연구소 디노킴입니다." — smiles at the camera and lightly raises his right hand to greet.
> 2. (4–8s) "오늘은 AI로 릴스 영상 만드는 법, 보여드릴게요." — points to the laptop with his left hand.
> 3. (8–12s) "자막도, 그래픽도, 전부 코드로 얹어요." — opens both hands, explaining.
> 4. (12–15s) "반응은요? 숫자로 바로 보이죠." — nods and gives a thumbs-up.
> 5. (15–18s) "AI 활용연구소에서 만나요." — looks at the camera and gives a small bow.
> No on-screen text, no captions, no logos.

화면 글자는 전부 코드로 얹으므로 프롬프트에서 글자를 빼 달라고 명시했다. 클립이 나오면 `autocut.py` → `transcribe.py`로 실제 타이밍을 뽑아 `scene.json`의 `words`를 교체하고, `matte.py`로 첫 구간을 다시 오려낸다.
