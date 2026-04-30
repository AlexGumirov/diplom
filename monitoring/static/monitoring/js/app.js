const api = {
    athletes: "/api/athletes/",
    records: "/api/daily-records/",
    physical: "/api/physical-data/",
    psychological: "/api/psychological-data/",
    analysis: "/api/analysis/",
};

const state = {
    athletes: [],
    records: [],
    physical: [],
    psychological: [],
};

const page = document.body.dataset.page;

document.addEventListener("DOMContentLoaded", async () => {
    setStatus("Загрузка данных");
    try {
        await bootstrap();
        setStatus("Готово");
    } catch (error) {
        notify(error.message || "Не удалось загрузить данные");
        setStatus("Ошибка");
    }
});

async function bootstrap() {
    if (["dashboard", "athletes", "records", "physical", "psychological", "analysis"].includes(page)) {
        await loadCommonData();
    }

    const handlers = {
        dashboard: initDashboard,
        athletes: initAthletes,
        records: initRecords,
        physical: initPhysical,
        psychological: initPsychological,
        analysis: initAnalysis,
        san: initSAN,
    };

    if (handlers[page]) {
        handlers[page]();
    }
}

async function loadCommonData() {
    const [athletes, records, physical, psychological] = await Promise.all([
        request(api.athletes),
        request(api.records),
        request(api.physical),
        request(api.psychological),
    ]);

    state.athletes = normalizeList(athletes);
    state.records = normalizeList(records);
    state.physical = normalizeList(physical);
    state.psychological = normalizeList(psychological);
}

function normalizeList(payload) {
    return Array.isArray(payload) ? payload : payload.results || [];
}

async function request(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
        headers["X-CSRFToken"] = getCookie("csrftoken");
    }

    const response = await fetch(url, {
        credentials: "same-origin",
        headers,
        ...options,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw new Error(formatApiError(data));
    }

    return data;
}

function formatApiError(data) {
    if (!data) {
        return "API вернул ошибку";
    }
    if (data.detail) {
        return data.detail;
    }
    return Object.entries(data)
        .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("; ");
}

function initDashboard() {
    const totalScores = state.records
        .map((record) => Number(record.total_score))
        .filter((value) => !Number.isNaN(value));
    const average = totalScores.length
        ? (totalScores.reduce((sum, value) => sum + value, 0) / totalScores.length).toFixed(1)
        : "--";

    setText("dashboardScore", average);
    setText("athletesCount", state.athletes.length);
    setText("recordsCount", state.records.length);
    setText("calculatedCount", totalScores.length);
    setText("latestDate", state.records[0]?.date || "--");

    const rows = state.records.slice(0, 8).map((record) => `
        <tr>
            <td>${record.date}</td>
            <td>${athleteName(record.athlete)}</td>
            <td>${score(record.physical_score)}</td>
            <td>${score(record.psychological_score)}</td>
            <td><span class="badge">${score(record.total_score)}</span></td>
        </tr>
    `);
    renderRows("dashboardRecords", rows, 5, "Пока нет дневных записей.");
}

function initAthletes() {
    renderAthletes();
    bindForm("athleteForm", async (payload, form) => {
        await request(api.athletes, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        form.reset();
        await refresh();
        renderAthletes();
        notify("Спортсмен добавлен");
    });
}

function renderAthletes() {
    const container = document.getElementById("athletesList");
    if (!container) {
        return;
    }

    container.innerHTML = state.athletes.length
        ? state.athletes.map((athlete) => `
            <article class="data-card">
                <div>
                    <strong>${escapeHtml(athlete.name)}</strong>
                    <span>ID ${athlete.id}</span>
                </div>
                <span class="badge">${recordsForAthlete(athlete.id).length} записей</span>
            </article>
        `).join("")
        : `<div class="empty-state">Добавьте первого спортсмена, чтобы начать мониторинг.</div>`;
}

function initRecords() {
    fillAthleteSelect("recordAthlete");
    renderRecords();
    bindForm("recordForm", async (payload, form) => {
        payload.athlete_profile = Number(payload.athlete_profile);
        await request(api.records, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        form.reset();
        await refresh();
        fillAthleteSelect("recordAthlete");
        renderRecords();
        notify("Дневная запись создана");
    });
}

function renderRecords() {
    const rows = state.records.map((record) => `
        <tr>
            <td>${record.id}</td>
            <td>${record.date}</td>
            <td>${athleteName(record.athlete)}</td>
            <td>${score(record.physical_score)}</td>
            <td>${score(record.psychological_score)}</td>
            <td><span class="badge">${score(record.total_score)}</span></td>
            <td><button class="mini-button" data-calculate="${record.id}">Рассчитать</button></td>
        </tr>
    `);
    renderRows("recordsTable", rows, 7, "Создайте дневную запись для спортсмена.");

    document.querySelectorAll("[data-calculate]").forEach((button) => {
        button.addEventListener("click", async () => {
            await request(`${api.records}${button.dataset.calculate}/calculate/`, { method: "POST" });
            await refresh();
            renderRecords();
            notify("Оценки состояния рассчитаны");
        });
    });
}

function initPhysical() {
    fillRecordSelect("physicalRecord");
    renderPhysical();
    bindForm("physicalForm", async (payload, form) => {
        payload.daily_record = Number(payload.daily_record);
        ["sleep_hours", "meals", "heart_rate_rest", "heart_rate_load", "fatigue", "rpe"].forEach((field) => {
            payload[field] = Number(payload[field]);
        });
        const existing = state.physical.find(
            (item) => Number(item.daily_record) === Number(payload.daily_record)
        );
        await request(existing ? `${api.physical}${existing.id}/` : api.physical, {
            method: existing ? "PATCH" : "POST",
            body: JSON.stringify(payload),
        });
        form.reset();
        await refresh();
        fillRecordSelect("physicalRecord");
        renderPhysical();
        notify("Физические данные сохранены");
    });
}

function renderPhysical() {
    const rows = state.physical.map((item) => `
        <tr>
            <td>${recordLabel(item.daily_record)}</td>
            <td>${item.sleep_hours}</td>
            <td>${item.meals}</td>
            <td>${item.heart_rate_rest} / ${item.heart_rate_load}</td>
            <td>${item.recovery_time}</td>
            <td>${item.fatigue}</td>
            <td>${item.rpe}</td>
        </tr>
    `);
    renderRows("physicalTable", rows, 7, "Физические показатели пока не внесены.");
}

function initPsychological() {
    fillRecordSelect("psychologicalRecord");
    renderPsychological();
    bindForm("psychologicalForm", async (payload, form) => {
        payload.daily_record = Number(payload.daily_record);
        ["wellbeing", "activity", "mood"].forEach((field) => {
            payload[field] = Number(payload[field]);
        });
        const existing = state.psychological.find(
            (item) => Number(item.daily_record) === Number(payload.daily_record)
        );
        await request(existing ? `${api.psychological}${existing.id}/` : api.psychological, {
            method: existing ? "PATCH" : "POST",
            body: JSON.stringify(payload),
        });
        form.reset();
        await refresh();
        fillRecordSelect("psychologicalRecord");
        renderPsychological();
        notify("Психологические данные сохранены");
    });
}

function renderPsychological() {
    const rows = state.psychological.map((item) => `
        <tr>
            <td>${recordLabel(item.daily_record)}</td>
            <td>${item.wellbeing}</td>
            <td>${item.activity}</td>
            <td>${item.mood}</td>
        </tr>
    `);
    renderRows("psychologicalTable", rows, 4, "Психологические показатели пока не внесены.");
}

function initAnalysis() {
    fillAthleteSelect("analysisAthlete");
    const form = document.getElementById("analysisForm");
    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const athleteId = new FormData(form).get("athlete_id");
        const result = await request(`${api.analysis}?athlete_id=${athleteId}`);
        renderAnalysis(result);
        notify("Аналитика обновлена");
    });

    if (state.athletes[0]) {
        form?.requestSubmit();
    }
}

function renderAnalysis(result) {
    const anomalies = result.anomalies || [];
    const anomalyCount = anomalies.filter((item) => item.is_anomaly).length;

    setText("analysisRecordsCount", result.records_count || 0);
    setText("analysisDelta", result.delta?.delta ?? "--");
    setText("analysisAnomalies", anomalyCount);
    setText("analysisStatus", translateStatus(result.delta?.status));

    const anomalyContainer = document.getElementById("anomalyList");
    anomalyContainer.innerHTML = anomalies.length
        ? anomalies.map((item) => `
            <article class="data-card">
                <div>
                    <strong>Наблюдение #${item.index + 1}</strong>
                    <span>Score: ${item.score ?? "недостаточно данных"}</span>
                </div>
                <span class="badge ${item.is_anomaly ? "warn" : ""}">${item.is_anomaly ? "Аномалия" : "Норма"}</span>
            </article>
        `).join("")
        : `<div class="empty-state">Недостаточно данных для поиска аномалий.</div>`;

    renderCorrelations(result.correlations || {});
}

function initSAN() {
    const form = document.getElementById("sanForm");
    if (!form) {
        return;
    }

    form.querySelectorAll('input[name="value"]').forEach((input) => {
        input.addEventListener("change", () => {
            window.setTimeout(() => form.submit(), 180);
        });
    });
}

function renderCorrelations(correlations) {
    const box = document.getElementById("correlationBox");
    const keys = ["physical_score", "psychological_score", "total_score"];
    const labels = {
        physical_score: "Физика",
        psychological_score: "Психология",
        total_score: "Итог",
    };

    const rows = Object.entries(correlations)
        .filter(([key]) => keys.includes(key))
        .map(([key, values]) => `
            <div class="correlation-row">
                <strong>${labels[key]}</strong>
                <span>${values.physical_score ?? 0}</span>
                <span>${values.psychological_score ?? 0}</span>
                <span>${values.total_score ?? 0}</span>
            </div>
        `);

    box.innerHTML = rows.length
        ? `<div class="correlation-row"><strong>Показатель</strong><span>Физика</span><span>Псих.</span><span>Итог</span></div>${rows.join("")}`
        : `<div class="empty-state">Корреляции появятся после расчета нескольких записей.</div>`;
}

function bindForm(id, callback) {
    const form = document.getElementById(id);
    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
            await callback(payload, form);
        } catch (error) {
            notify(error.message || "Не удалось сохранить данные");
        }
    });
}

async function refresh() {
    await loadCommonData();
}

function fillAthleteSelect(id) {
    const select = document.getElementById(id);
    if (!select) {
        return;
    }

    select.innerHTML = state.athletes.length
        ? state.athletes.map((athlete) => `<option value="${athlete.id}">${escapeHtml(athlete.name)}</option>`).join("")
        : `<option value="">Сначала добавьте спортсмена</option>`;
}

function fillRecordSelect(id) {
    const select = document.getElementById(id);
    if (!select) {
        return;
    }

    select.innerHTML = state.records.length
        ? state.records.map((record) => `<option value="${record.id}">${recordLabel(record.id)}</option>`).join("")
        : `<option value="">Сначала создайте дневную запись</option>`;
}

function renderRows(id, rows, colspan, emptyText) {
    const target = document.getElementById(id);
    if (!target) {
        return;
    }
    target.innerHTML = rows.length
        ? rows.join("")
        : `<tr><td colspan="${colspan}"><div class="empty-state">${emptyText}</div></td></tr>`;
}

function recordsForAthlete(athleteId) {
    return state.records.filter((record) => Number(record.athlete) === Number(athleteId));
}

function athleteName(id) {
    return state.athletes.find((athlete) => Number(athlete.id) === Number(id))?.name || `ID ${id}`;
}

function recordLabel(id) {
    const record = state.records.find((item) => Number(item.id) === Number(id));
    return record ? `#${record.id} · ${record.date} · ${athleteName(record.athlete)}` : `#${id}`;
}

function score(value) {
    return value === null || value === undefined ? "--" : Number(value).toFixed(2);
}

function translateStatus(status) {
    const labels = {
        improvement: "Улучшение",
        deterioration: "Ухудшение",
        stable: "Стабильно",
        insufficient_data: "Мало данных",
    };
    return labels[status] || "--";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function setStatus(text) {
    setText("connectionStatus", text);
}

function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
    return "";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
