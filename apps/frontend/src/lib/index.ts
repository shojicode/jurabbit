// const API_BASE_URL = import.meta.env.BACKEND_URL
const API_BASE_URL = "https://backend.shojicode.workers.dev"

export const API_URL = {
    get: {
        current_race: `${API_BASE_URL}/current_race`,
        betting_status: `${API_BASE_URL}/betting_status`,
        user_prediction: `${API_BASE_URL}/user_prediction`,
        results: `${API_BASE_URL}/results` // 追加
    },
    post: {
        bet: `${API_BASE_URL}/bet`,
        enable_betting: `${API_BASE_URL}/enable_betting`,
        disable_betting: `${API_BASE_URL}/disable_betting`,
        current_race: `${API_BASE_URL}/current_race`,
        results: `${API_BASE_URL}/results`,
        admin_login: `${API_BASE_URL}/admin/login`,
        admin_logout: `${API_BASE_URL}/admin/logout`,
    }
}

export const MATENE_EVENT_URL = "https://matene.jp"; // Todo: 環境変数から取得するように修正