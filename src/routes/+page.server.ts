import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    return {content: "Hello from the server!"};
}