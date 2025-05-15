// +page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    const res = await fetch('https://jurabbit-backend.example.com/horses');
    if (!res.ok) {
    throw new Error('恐竜情報の取得に失敗しました');
    }

    const data = await res.json();

    return {
    horses: data.horses // [{ id, name, additional_info }, ...]
    };
};
