import type { PageServerLoad } from "./$types";

import fs from 'fs/promises';
import path from 'path';


export const load: PageServerLoad = async () => {
    const filePath = path.resolve('src/lib/matene_url.json');
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    return {
    eventUrl: data.url
    };
}
