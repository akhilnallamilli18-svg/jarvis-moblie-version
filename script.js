// ===== 1. API KEY & SMART MODELS =====

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        localStorage.setItem("jarvis_key", API_KEY);
    }
}

const MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
];


// ===== 2. MEMORY SYSTEM =====

let MEMORY = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
);

function saveMemory() {
    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(MEMORY)
    );
}


// ===== 3. GET HTML ELEMENTS =====

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


// ===== 4. LOAD OLD MEMORY INTO CHAT =====

MEMORY.forEach(m => {

    add(
        (m.role === "user" ? "YOU: " : "J.A.R.V.I.S: ") + m.text,
        m.role === "user" ? "user" : "ai"
    );

});


// ===== 5. GEMINI BRAIN =====

async function callGemini(promptText) {

    const contents = MEMORY
        .slice(-12)
        .map(m => ({
            role: m.role,
            parts: [
                {
                    text: m.text
                }
            ]
        }));

    contents.push({
        role: "user",
        parts: [
            {
                text: promptText
            }
        ]
    });

    let lastErr;

    for (const model of MODELS) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                API_KEY;

            const res = await fetch(url, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: contents
                })

            });

            const data = await res.json();

            if (data.error) {

                lastErr = new Error(
                    data.error.message || "Gemini API error"
                );

                if (
                    /high demand|temporary|quota|rate|unavailable|deprecated/i
                    .test(data.error.message)
                ) {
                    continue;
                }

                throw lastErr;
            }

            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts
            ) {
                throw new Error("Invalid response from Gemini.");
            }

            return data.candidates[0]
                .content
                .parts[0]
                .text;

        } catch (e) {

            lastErr = e;

        }

    }

    throw lastErr || new Error("Gemini connection failed.");

}


// ===== 6. ASK GEMINI =====

async function askGemini(promptText) {

    add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    try {

        const reply = await callGemini(promptText);

        MEMORY.push({
            role: "user",
            text: promptText
        });

        MEMORY.push({
            role: "model",
            text: reply
        });

        saveMemory();

        chat.lastChild.innerText =
            "J.A.R.V.I.S: " + reply;

        speak(reply);

    } catch (e) {

        chat.lastChild.innerText =
            "J.A.R.V.I.S: ERROR - " + e.message;

    }

}


// ===== 7. VISION ENGINE =====

if (camBtn && imgInput) {

    camBtn.onclick = () => {
        imgInput.click();
    };

    imgInput.onchange = () => {

        const file = imgInput.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {

            const base64 =
                reader.result.split(",")[1];

            const q =
                input.value.trim() ||
                "What do you see? Describe briefly.";

            add(
                "YOU: [IMAGE] " + q,
                "user"
            );

            input.value = "";

            askVision(
                base64,
                file.type,
                q
            );
        };

        reader.readAsDataURL(file);

    };

}


// ===== 8. GEMINI VISION =====

async function askVision(base64, mime, question) {

    add(
        "J.A.R.V.I.S: Analyzing image...",
        "ai"
    );

    let lastErr;

    for (const model of MODELS) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                API_KEY;

            const res = await fetch(url, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    contents: [
                        {
                            parts: [
                                {
                                    text: question
                                },
                                {
                                    inline_data: {
                                        mime_type: mime,
                                        data: base64
                                    }
                                }
                            ]
                        }
                    ]

                })

            });

            const data = await res.json();

            if (data.error) {

                lastErr = new Error(
                    data.error.message ||
                    "Gemini Vision error"
                );

                if (
                    /high demand|temporary|quota|rate|unavailable|deprecated/i
                    .test(data.error.message)
                ) {
                    continue;
                }

                throw lastErr;
            }

            const reply =
                data.candidates[0]
                    .content
                    .parts[0]
                    .text;

            chat.lastChild.innerText =
                "J.A.R.V.I.S: " + reply;

            speak(reply);

            return;

        } catch (e) {

            lastErr = e;

        }

    }

    chat.lastChild.innerText =
        "J.A.R.V.I.S: ERROR - " +
        (lastErr?.message || "Vision failed.");

}


// ===== 9. VOICE RECOGNITION =====

const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SR && micBtn) {

    const rec = new SR();

    rec.lang = "en-US";

    rec.continuous = false;

    rec.interimResults = false;

    rec.onresult = (e) => {

        const text =
            e.results[0][0].transcript;

        add(
            "YOU: " + text,
            "user"
        );

        askGemini(text);

    };

    rec.onerror = (e) => {

        console.log(
            "Speech recognition error:",
            e.error
        );

        micBtn.innerText = "🎤";

    };

    micBtn.onclick = () => {

        try {

            rec.start();

            micBtn.innerText = "LISTENING...";

        } catch (e) {

            console.log(e);

        }

    };

    rec.onend = () => {

        micBtn.innerText = "🎤";

    };

}


// ===== 10. TEXT TO SPEECH =====

let voices = [];

function loadVoices() {

    voices =
        speechSynthesis.getVoices();

}

loadVoices();

speechSynthesis.onvoiceschanged =
    loadVoices;


function speak(text) {

    if (!text) return;

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;

    utterance.pitch = 0.85;

    const voice =
        voices.find(v =>
            v.lang &&
            v.lang.startsWith("en")
        );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(
        utterance
    );

}


// ===== 11. SEND BUTTON =====

const sendBtn =
    document.getElementById("send");

if (sendBtn) {

    sendBtn.onclick = () => {

        const text =
            input.value.trim();

        if (!text) return;

        add(
            "YOU: " + text,
            "user"
        );

        input.value = "";

        askGemini(text);

    };

}


// ===== 12. ENTER KEY TO SEND =====

if (input) {

    input.addEventListener(
        "keydown",
        e => {

            if (e.key === "Enter") {

                e.preventDefault();

                sendBtn?.click();

            }

        }
    );

}


// ===== 13. CLEAR MEMORY =====

if (clearBtn) {

    clearBtn.onclick = () => {

        MEMORY = [];

        saveMemory();

        chat.innerHTML = "";

        add(
            "SYSTEM: Memory cleared.",
            "ai"
        );

    };

}


// ===== 14. ADD MESSAGE TO CHAT =====

function add(text, who) {

    const div =
        document.createElement("div");

    div.className =
        "msg " + who;

    div.innerText = text;

    chat.appendChild(div);

    chat.scrollTop =
        chat.scrollHeight;

}
