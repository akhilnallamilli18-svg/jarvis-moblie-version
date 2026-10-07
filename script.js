// =====================================================
// J.A.R.V.I.S MOBILE EDITION
// =====================================================

// ===============================
// 1. GEMINI API KEY
// ===============================

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        localStorage.setItem("jarvis_key", API_KEY);
    }
}


// ===============================
// 2. GEMINI MODELS
// ===============================

const MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
];


// ===============================
// 3. MEMORY
// ===============================

let memory = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
);


// ===============================
// 4. HTML ELEMENTS
// ===============================

const chat = document.getElementById("chat");
const msg = document.getElementById("msg");

const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");

const voiceStatus = document.getElementById("voice-status");
const memoryStatus = document.getElementById("memory-status");


// ===============================
// 5. SHOW MESSAGE
// ===============================

function addMessage(text, type) {

    const div = document.createElement("div");

    div.className = "msg " + type;

    div.textContent = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;
}


// ===============================
// 6. LOAD MEMORY
// ===============================

function loadMemory() {

    chat.innerHTML = "";

    memory.forEach(item => {

        addMessage(item.user, "user");

        addMessage(item.ai, "ai");

    });
}

loadMemory();


// ===============================
// 7. SAVE MEMORY
// ===============================

function saveMemory(userText, aiText) {

    memory.push({
        user: userText,
        ai: aiText
    });

    // Keep latest 20 conversations
    if (memory.length > 20) {
        memory.shift();
    }

    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(memory)
    );
}


// ===============================
// 8. CALL GEMINI
// ===============================

async function callGemini(model, userText) {

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const previousMemory = memory
        .slice(-10)
        .map(item =>
            `User: ${item.user}\nJARVIS: ${item.ai}`
        )
        .join("\n\n");

    const prompt = `
You are J.A.R.V.I.S., a helpful personal AI assistant.

Rules:
- Answer clearly and naturally.
- Keep answers reasonably short.
- Do not pretend to be a real human.
- Help the user with coding, technology, studies, and general questions.
- Remember the conversation context provided below.

Previous conversation:
${previousMemory}

Current user message:
${userText}
`;

    const response = await fetch(url, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        })

    });

    if (!response.ok) {

        const errorText = await response.text();

        throw new Error(errorText);
    }

    const data = await response.json();

    return (
        data.candidates?.[0]?.content?.parts?.[0]?.text
        || "I could not generate a response."
    );
}


// ===============================
// 9. ASK GEMINI WITH FALLBACK
// ===============================

async function askGemini(userText) {

    if (!API_KEY) {

        return "Gemini API key is missing.";
    }

    for (const model of MODELS) {

        try {

            const answer =
                await callGemini(model, userText);

            return answer;

        } catch (error) {

            console.log(
                "Model failed:",
                model,
                error
            );

        }
    }

    return "My AI brain is currently unavailable. Please try again later.";
}


// ===============================
// 10. SEND MESSAGE
// ===============================

async function sendMessage() {

    const userText = msg.value.trim();

    if (!userText) {
        return;
    }

    addMessage(userText, "user");

    msg.value = "";

    sendBtn.disabled = true;

    addMessage("Thinking...", "ai");

    try {

        const answer =
            await askGemini(userText);

        // Remove "Thinking..."
        const thinkingMessages =
            chat.querySelectorAll(".msg.ai");

        const lastMessage =
            thinkingMessages[thinkingMessages.length - 1];

        if (lastMessage &&
            lastMessage.textContent === "Thinking...") {

            lastMessage.remove();
        }

        addMessage(answer, "ai");

        saveMemory(userText, answer);

        speak(answer);

    } catch (error) {

        console.error(error);

        const thinkingMessages =
            chat.querySelectorAll(".msg.ai");

        const lastMessage =
            thinkingMessages[thinkingMessages.length - 1];

        if (lastMessage &&
            lastMessage.textContent === "Thinking...") {

            lastMessage.remove();
        }

        addMessage(
            "Sorry, something went wrong.",
            "ai"
        );
    }

    sendBtn.disabled = false;

    msg.focus();
}


// ===============================
// 11. SEND BUTTON
// ===============================

sendBtn.addEventListener(
    "click",
    sendMessage
);


// ===============================
// 12. ENTER KEY
// ===============================

msg.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();
        }
    }
);


// ===============================
// 13. TEXT TO SPEECH
// ===============================

function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const speech =
        new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";

    speech.rate = 1;

    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}


// ===============================
// 14. VOICE RECOGNITION
// ===============================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;


if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;

    voiceStatus.textContent = "● ONLINE";

    voiceStatus.className = "on";


    recognition.onstart = function () {

        voiceStatus.textContent = "● LISTENING";

        voiceStatus.className = "on";

        micBtn.textContent = "🔴";
    };


    recognition.onresult = function (event) {

        const transcript =
            event.results[0][0].transcript;

        msg.value = transcript;

        sendMessage();
    };


    recognition.onerror = function (event) {

        console.log(
            "Voice error:",
            event.error
        );

        voiceStatus.textContent = "● ONLINE";

        voiceStatus.className = "on";

        micBtn.textContent = "🎙️";
    };


    recognition.onend = function () {

        voiceStatus.textContent = "● ONLINE";

        voiceStatus.className = "on";

        micBtn.textContent = "🎙️";
    };


    micBtn.addEventListener(
        "click",
        function () {

            try {

                recognition.start();

            } catch (error) {

                console.log(error);

            }
        }
    );

} else {

    voiceStatus.textContent =
        "● NOT SUPPORTED";

    voiceStatus.className = "off";

    micBtn.disabled = true;
}


// ===============================
// 15. CLEAR MEMORY
// ===============================

clearBtn.addEventListener(
    "click",
    function () {

        memory = [];

        localStorage.removeItem(
            "jarvis_memory"
        );

        chat.innerHTML = "";

        memoryStatus.textContent =
            "● ACTIVE";

        memoryStatus.className = "on";

        addMessage(
            "Memory cleared.",
            "ai"
        );
    }
);


// ===============================
// 16. MEMORY STATUS
// ===============================

memoryStatus.textContent = "● ACTIVE";

memoryStatus.className = "on";


// ===============================
// 17. STARTUP MESSAGE
// ===============================

addMessage(
    "Hello! I am J.A.R.V.I.S. Your AI system is online.",
    "ai"
);
