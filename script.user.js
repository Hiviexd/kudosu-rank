// ==UserScript==
// @name         Kudosu Rank
// @namespace    https://github.com/Hiviexd/kudosu-rank
// @version      1.0
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

    let kudosuRankVisible = false;

    async function addKudosuRank() {
        const ranksElement = document.querySelector(".profile-detail__values");

        if (ranksElement) {
            const path = window.location.pathname.split("/");
            const userId = path[2];
            const kudosuRankInfo = await (
                await fetch(`https://kudosu-api.vercel.app/api/user/${userId}`, {
                    method: "GET",

                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            ).json();

            const kudosuRank = kudosuRankInfo.rank;

            if (kudosuRank != 0) {
                let kudosuRankElement = document.createElement("div");
                kudosuRankElement.classList.add("value-display", "value-display--rank");

                let kudosuRankLabel = document.createElement("div");
                kudosuRankLabel.classList.add("value-display__label");
                kudosuRankLabel.innerHTML = "Kudosu Ranking";
                kudosuRankElement.append(kudosuRankLabel);

                let kudosuRankValue = document.createElement("div");
                kudosuRankValue.classList.add("value-display__value");
                kudosuRankElement.append(kudosuRankValue);

                let rank = document.createElement("div");
                rank.innerHTML = `#${kudosuRank.toLocaleString()}`;
                kudosuRankValue.append(rank);

                if (!kudosuRankVisible) {
                    ranksElement.append(kudosuRankElement);
                    kudosuRankVisible = true;
                }
            }
        }
    }

    let lastUrl = location.href;

    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            kudosuRankVisible = false;
            setTimeout(onUrlChange, 1500);
        }
    }).observe(document, { subtree: true, childList: true });

    function onUrlChange() {
        observer.observe(document, { childList: true, subtree: true });
    }

    const observer = new MutationObserver(check);
    observer.observe(document, { childList: true, subtree: true });

    function check(changes, observer) {
        if (document.querySelector(".profile-detail")) {
            observer.disconnect();
            addKudosuRank();
        }
    }
})();
