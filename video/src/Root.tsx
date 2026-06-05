import { Composition } from "remotion";
import { LifeOSIntro } from "./LifeOSIntro";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LifeOSIntro"
      component={LifeOSIntro}
      durationInFrames={660}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
