import type { SvgIconComponent } from "../app-shell/constants";

export function AppSvgIcon({
  Icon,
  size,
  color,
}: {
  Icon: SvgIconComponent;
  size: number;
  color: string;
}) {
  return <Icon width={size} height={size} color={color} />;
}
