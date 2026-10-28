import { continueRender, delayRender, staticFile } from "remotion";

// 저장소에 포함된 폰트(public/fonts)를 직접 불러온다. 렌더 머신에 폰트가 설치돼 있지 않아도 같은 결과가 나온다.
const FONTS = [
  {
    family: "Pretendard",
    file: "fonts/PretendardVariable.woff2",
    weight: "45 920",
  },
  {
    family: "Nanum Pen Script",
    file: "fonts/NanumPenScript-Regular.ttf",
    weight: "400",
  },
] as const;

const load = async () => {
  await Promise.all(
    FONTS.map(async ({ family, file, weight }) => {
      const face = new FontFace(family, `url('${staticFile(file)}')`, {
        weight,
      });
      await face.load();
      document.fonts.add(face);
    }),
  );
};

const handle = delayRender("폰트 로딩");

/** 모든 폰트가 등록되면 풀리는 Promise. 캔버스에 글자를 그리기 전에 기다린다. */
export const fontsReady: Promise<void> = load().then(
  () => continueRender(handle),
  (err: unknown) => {
    console.error("폰트 로딩 실패", err);
    continueRender(handle);
  },
);
