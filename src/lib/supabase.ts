
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
export const encodeNickname = (nickname: string) => {
	if (!nickname) return '';
	return Array.from(new TextEncoder().encode(nickname))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
};

export const getInternalEmail = (nickname: string) => {
	const encoded = encodeNickname(nickname);
	return `${encoded}@user.local`;
};

export const getInternalPassword = (password: string) => {
	if (!password) return '';
	// Supabase requires 6+ characters
	return password + "_local_pad";
};
