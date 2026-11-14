import Svg, { Path } from "react-native-svg";

export function PlusIcon({
  size = 24,
  color = "#208AEF",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 4v16M4 12h16"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
