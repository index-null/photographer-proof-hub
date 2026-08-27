import { useEffect } from "react";
import { toast } from "sonner";

/**
 * 客户浏览页防盗门槛（提升小白门槛，非绝对防护）：
 *
 * - 全局拦截 `contextmenu`（右键菜单 / 移动端长按保存菜单）。
 * - 拦截 `dragstart`（拖拽图片到桌面/新标签页）。
 * - 拦截截图/录屏类快捷键：`PrintScreen` / `Alt+PrintScreen` / `Cmd+Shift+3/4`、
 *   `Ctrl+S` / `Ctrl+P`，并提示「截图也带水印」。
 * - 页面级禁用文本选中与移动端长按呼叫菜单（配合 Canvas 渲染）。
 *
 * 诚实声明：macOS/Windows 系统级截图（硬件按键、系统截图工具）无法被网页 JS 阻止，
 * 真正防线是服务端烘焙的「低清 + 平铺水印」预览图——即便抓包/截图拿到的仍是带水印图。
 */
export function useAntiTheft() {
	useEffect(() => {
		const onContextMenu = (e: Event) => e.preventDefault();
		const onDragStart = (e: Event) => e.preventDefault();

		const onKeyDown = (e: KeyboardEvent) => {
			const k = e.key;
			const isPrintScreen = k === "PrintScreen";
			const isMacShot = e.metaKey && e.shiftKey && (k === "3" || k === "4");
			const isSaveShortcut =
				(e.ctrlKey || e.metaKey) && (k === "s" || k === "S");
			const isPrintShortcut =
				(e.ctrlKey || e.metaKey) && (k === "p" || k === "P");

			if (isPrintScreen || isMacShot || isSaveShortcut || isPrintShortcut) {
				e.preventDefault();
				if (isPrintScreen || isMacShot) {
					toast.info("截图也会带有水印，请勿外传", { duration: 2000 });
				}
			}
		};

		document.addEventListener("contextmenu", onContextMenu);
		document.addEventListener("dragstart", onDragStart);
		window.addEventListener("keydown", onKeyDown);

		const prevUserSelect = document.body.style.userSelect;
		const prevCallout = (
			document.body.style as unknown as { webkitTouchCallout?: string }
		).webkitTouchCallout;
		document.body.style.userSelect = "none";
		(
			document.body.style as unknown as { webkitTouchCallout?: string }
		).webkitTouchCallout = "none";

		return () => {
			document.removeEventListener("contextmenu", onContextMenu);
			document.removeEventListener("dragstart", onDragStart);
			window.removeEventListener("keydown", onKeyDown);
			document.body.style.userSelect = prevUserSelect;
			(
				document.body.style as unknown as { webkitTouchCallout?: string }
			).webkitTouchCallout = prevCallout;
		};
	}, []);
}
