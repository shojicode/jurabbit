// routes/admin/+page.server.ts
import fs from 'fs/promises';
import path from 'path';
import type { Actions } from './$types';

export const actions: Actions = {
    update: async ({ request }) => {
        const data = await request.formData();
        const newUrl = data.get('url') as string;
        const filePath = path.resolve('src/lib/matene_url.json');

        await fs.writeFile(filePath, JSON.stringify({ url: newUrl }, null, 2));
        return { success: true };
    }
};
