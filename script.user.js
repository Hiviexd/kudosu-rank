// ==UserScript==
// @name         Kudosu Rank
// @namespace    https://github.com/Hiviexd/kudosu-rank
// @version      2.0
// @description  adds kudosu rank on user profiles
// @author       Hivie
// @match        http://osu.ppy.sh/users/*
// @match        https://osu.ppy.sh/users/*
// @grant        none
// @downloadURL  https://github.com/Hiviexd/kudosu-rank/raw/main/script.user.js
// @updateURL    https://github.com/Hiviexd/kudosu-rank/raw/main/script.user.js
// ==/UserScript==

(function () {
    "use strict";

    const API_BASE = "https://kudosu-api.vercel.app";
    const USER_CACHE_KEY = "kudosu-rank-users-v1";
    const USER_HIT_TTL_MS = 2 * 24 * 60 * 60 * 1000;
    const USER_MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const MAX_CACHE_ENTRIES = 500;
    const KUDOSU_RANK_CLASS = "value-display--kudosu-rank";

    const memoryCache = new Map();
    const pendingFetches = new Map();

    let kudosuRankVisible = false;
    let activeProfileUserId = null;
    let renderGeneration = 0;

    function readUserCacheStore() {
        try {
            const raw = localStorage.getItem(USER_CACHE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    function writeUserCacheStore(store) {
        const keys = Object.keys(store);
        if (keys.length > MAX_CACHE_ENTRIES) {
            keys.sort((a, b) => store[a].cachedAt - store[b].cachedAt)
                .slice(0, keys.length - MAX_CACHE_ENTRIES)
                .forEach((key) => delete store[key]);
        }
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(store));
    }

    function getCachedEntry(userId) {
        if (memoryCache.has(userId)) {
            return memoryCache.get(userId);
        }

        const store = readUserCacheStore();
        const entry = store[userId];
        if (!entry) {
            return null;
        }

        const ttl = entry.notFound ? USER_MISS_TTL_MS : USER_HIT_TTL_MS;
        if (Date.now() - entry.cachedAt > ttl) {
            return null;
        }

        memoryCache.set(userId, entry);
        return entry;
    }

    function setCachedEntry(userId, entry) {
        const record = { ...entry, cachedAt: Date.now() };
        memoryCache.set(userId, record);

        const store = readUserCacheStore();
        store[userId] = record;
        writeUserCacheStore(store);
    }

    async function fetchUserRank(userId) {
        if (pendingFetches.has(userId)) {
            return pendingFetches.get(userId);
        }

        const request = fetch(`${API_BASE}/api/user/${userId}`)
            .then(async (response) => {
                if (response.status === 404) {
                    setCachedEntry(userId, { notFound: true });
                    return null;
                }

                if (!response.ok) {
                    throw new Error(`API responded with ${response.status}`);
                }

                const data = await response.json();
                if (!data?.rank) {
                    setCachedEntry(userId, { notFound: true });
                    return null;
                }

                setCachedEntry(userId, { rank: data.rank });
                return data.rank;
            })
            .finally(() => {
                pendingFetches.delete(userId);
            });

        pendingFetches.set(userId, request);
        return request;
    }

    async function resolveUserRank(userId) {
        const cached = getCachedEntry(userId);
        if (cached) {
            return cached.notFound ? null : cached.rank;
        }
        return fetchUserRank(userId);
    }

    function removeKudosuRankElement() {
        const existing = document.querySelector(`.${KUDOSU_RANK_CLASS}`);
        if (existing) {
            existing.remove();
        }
        kudosuRankVisible = false;
    }

    function renderKudosuRank(rank) {
        const ranksElement = document.querySelector(".profile-detail__values");
        if (!ranksElement || kudosuRankVisible) {
            return;
        }

        const kudosuRankElement = document.createElement("div");
        kudosuRankElement.classList.add("value-display", "value-display--rank", KUDOSU_RANK_CLASS);

        const kudosuRankLabel = document.createElement("div");
        kudosuRankLabel.classList.add("value-display__label");
        kudosuRankLabel.textContent = "Kudosu Ranking";
        kudosuRankElement.append(kudosuRankLabel);

        const kudosuRankValue = document.createElement("div");
        kudosuRankValue.classList.add("value-display__value");
        kudosuRankElement.append(kudosuRankValue);

        const rankValue = document.createElement("div");
        rankValue.textContent = `#${rank.toLocaleString()}`;
        kudosuRankValue.append(rankValue);

        ranksElement.append(kudosuRankElement);
        kudosuRankVisible = true;
    }

    async function addKudosuRank() {
        const ranksElement = document.querySelector(".profile-detail__values");
        if (!ranksElement) {
            return;
        }

        const path = window.location.pathname.split("/");
        const userId = path[2];
        if (!userId || !/^\d+$/.test(userId)) {
            return;
        }

        activeProfileUserId = userId;
        const generation = ++renderGeneration;

        let rank;
        try {
            rank = await resolveUserRank(userId);
        } catch {
            return;
        }

        if (generation !== renderGeneration || activeProfileUserId !== userId) {
            return;
        }

        if (!rank) {
            return;
        }

        renderKudosuRank(rank);
    }

    let lastUrl = location.href;

    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            activeProfileUserId = null;
            kudosuRankVisible = false;
            removeKudosuRankElement();
            setTimeout(onUrlChange, 1500);
        }
    }).observe(document, { subtree: true, childList: true });

    function onUrlChange() {
        observer.observe(document, { childList: true, subtree: true });
    }

    const observer = new MutationObserver(check);
    observer.observe(document, { childList: true, subtree: true });

    function check(_changes, profileObserver) {
        if (document.querySelector(".profile-detail")) {
            profileObserver.disconnect();
            addKudosuRank();
        }
    }
})();
