// 一次性脚本：将 public/ 下的展示图转为 webp（质量 72），删除原 jpg/png。
// 原因：本项目的 TanStack Start + Cloudflare 构建管线下，
// vite-plugin-image-optimizer 不会处理 public/ 目录，故改为构建前预生成 webp 并提交。
// 用法：bun scripts/optimize-public.mjs
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

const PUBLIC = new URL("../public/", import.meta.url).pathname;
const TARGETS = [
	"bubble fish.jpg",
	join("photos", "urbani"),
	join("photos", "ethereal"),
];
const QUALITY = 72;

async function collect(dir) {
	const out = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) out.push(...(await collect(full)));
		else if ([".jpg", ".jpeg", ".png"].includes(extname(e.name).toLowerCase()))
			out.push(full);
	}
	return out;
}

const files = [];
for (const t of TARGETS) {
	const p = join(PUBLIC, t);
	try {
		if ((await stat(p)).isDirectory()) files.push(...(await collect(p)));
		else files.push(p);
	} catch {
		/* ignore missing */
	}
}

let saved = 0;
for (const f of files) {
	const webp = f.replace(/\.(jpe?g|png)$/i, ".webp");
	const buf = await sharp(f).webp({ quality: QUALITY }).toBuffer();
	await writeFile(webp, buf);
	const before = (await stat(f)).size;
	const after = buf.length;
	saved += before - after;
	await unlink(f);
	console.log(
		`${f} -> ${webp}  (${(before / 1024).toFixed(1)}KB -> ${(after / 1024).toFixed(1)}KB)`,
	);
}
console.log(
	`\nDone. ${files.length} files, saved ${(saved / 1024).toFixed(1)}KB.`,
);
