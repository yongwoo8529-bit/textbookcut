
import { createClient } from '@supabase/supabase-js';

function sanitizeEnvVar(value: unknown) {
	const raw = (typeof value === 'string') ? value : String(value ?? '');
	// remove BOM if present, remove line breaks and surrounding whitespace
	return raw.replace(/^\uFEFF/, '').replace(/[\r\n]+/g, '').trim();
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = sanitizeEnvVar(rawUrl);
const supabaseAnonKey = sanitizeEnvVar(rawAnon);

if (import.meta.env.DEV) {
	console.log('DEBUG: raw VITE_SUPABASE_URL =>', rawUrl);
	console.log('DEBUG: sanitized VITE_SUPABASE_URL =>', supabaseUrl);
	console.log('DEBUG: raw VITE_SUPABASE_ANON_KEY length =>', (rawAnon as string)?.length ?? 0);
	console.log('DEBUG: sanitized VITE_SUPABASE_ANON_KEY length =>', supabaseAnonKey.length);

	// detect non ISO-8859-1 codepoints (> 255)
	const bad = [] as { i: number; ch: string; code: number }[];
	for (let i = 0; i < supabaseAnonKey.length; i++) {
		const code = supabaseAnonKey.codePointAt(i) || 0;
		if (code > 255) bad.push({ i, ch: supabaseAnonKey[i], code });
	}
	if (bad.length) {
		console.warn('DEBUG: VITE_SUPABASE_ANON_KEY contains non ISO-8859-1 code points at indices:', bad.slice(0, 10));
		console.warn(bad.slice(0, 10).map(b => `idx:${b.i} ch:${b.ch} code:0x${b.code.toString(16)}`).join(', '));
	}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Auth Helpers for Nickname-based Auth ---
export const getInternalEmail = (nickname: string) => {
	if (!nickname) return '';
	// 영문/숫자면 그대로 사용, 아니면 안전하게 변환 (가독성 위해)
	const safePart = nickname.toLowerCase().replace(/[^a-z0-9]/g, (char) => {
		return char.charCodeAt(0).toString(16);
	});
	return `${safePart}@user.local`;
};

export const getInternalPassword = (password: string) => {
	if (!password) return '';
	// Supabase의 최소 6자 정책을 지키기 위해 안전한 패딩 추가
	return `auth_${password}_secure_local`;
};
