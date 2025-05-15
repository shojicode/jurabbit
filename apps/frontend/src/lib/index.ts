const API_BASE_URL = "http://localhost:8787"; // Todo: 環境変数から取得するように修正

export const API_URL = {
    get: {
        current_race: `${API_BASE_URL}/current_race`,
        betting_status: `${API_BASE_URL}/betting_status`,
        result_by_id: (id: number) => `${API_BASE_URL}/result/${id}`,
        user_prediction: `${API_BASE_URL}/user_prediction`,
    },
    post: {
        current_race: `${API_BASE_URL}/current_race`,
        enable_betting: `${API_BASE_URL}/enable_betting`,
        disable_betting: `${API_BASE_URL}/disable_betting`,
        bet: `${API_BASE_URL}/bet`,
        results: `${API_BASE_URL}/results`,
    }
}

export const MATENE_EVENT_URL = "https://matene.jp"; // Todo: 環境変数から取得するように修正