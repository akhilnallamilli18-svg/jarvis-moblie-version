// =====================================================
// J.A.R.V.I.S MOBILE EDITION
// GEMINI + MEMORY + VOICE + VISION
// =====================================================


// =====================================================
// 1. GEMINI API KEY
// =====================================================

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {

    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        localStorage.setItem("jarvis_key", API_KEY);
    }
}


// =====================================================
// 2. GEMINI MODELS
// =====================================================

const MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
];


// =====================================================
// 3. MEMORY SYSTEM
// =====================================================

let memory = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
);


function saveMemory() {

    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(memory)
    );
}


// =====================================================
// 4. HTML ELEMENTS
// =====================================================

const chat = document.getElementById("chat");

const msg = document.getElementById("msg");

const sendBtn = document.getElementById("send");

const micBtn = document.getElementById("mic-btn");

const camBtn = document.getElementById("cam-btn");

const imgInput = document.getElementById("img-input");

const clearBtn = document.getElementById("clear-btn");

const voiceStatus =
    document.getElementById("voice-status");

const memoryStatus =
    document.getElementById("memory-status");

const aiStatus =
    document.getElementById("ai-status");

const networkStatus =
    document.getElementById("network-status");


// =====================================================
// 5. ADD MESSAGE TO CHAT
// =====================================================

function addMessage(text, type) {

    const div = document.createElement("div");

    div.className = "msg " + type;

    div.textContent = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;
}


// =====================================================
// 6. LOAD SAVED MEMORY
// =====================================================

function loadMemory() {

    chat.innerHTML = "";

    memory.forEach(item => {

        if (item.user) {
            addMessage(
                item.user,
                "user"
            );
        }

        if (item.ai) {
            addMessage(
                item.ai,
                "ai"
            );
        }

    });
}

loadMemory();


// =====================================================
// 7. SAVE CONVERSATION
// =====================================================

function rememberConversation(userText, aiText) {

    memory.push({

        user: userText,

        ai: aiText

    });


    // Keep latest 20 conversations

    if (memory.length > 20) {

        memory.shift();

    }


    saveMemory();
}


// =====================================================
// 8. GEMINI TEXT BRAIN
// =====================================================

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
- Keep answers reasonably short unless the user asks for detail.
- Help with coding, technology, studies and general questions.
- Remember the previous conversation.
- Do not pretend to be a real human.

Previous conversation:

${previousMemory}

Current user message:

${userText}
`;


    const response = await fetch(
        url,
        {
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
        }
    );


    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(errorText);

    }


    const data =
        await response.json();


    if (
        data.error
    ) {

        throw new Error(
            data.error.message
        );

    }


    return (
        data.candidates?.[0]?.content?.parts?.[0]?.text
        ||
        "I could not generate a response."
    );
}


// =====================================================
// 9. ASK GEMINI WITH MODEL FALLBACK
// =====================================================

async function askGemini(userText) {

    if (!API_KEY) {

        return "Gemini API key is missing.";

    }


    for (const model of MODELS) {

        try {

            console.log(
                "Trying Gemini model:",
                model
            );


            const answer =
                await callGemini(
                    model,
                    userText
                );


            aiStatus.textContent =
                "● ONLINE";

            aiStatus.className =
                "on";


            networkStatus.textContent =
                "● ONLINE";

            networkStatus.className =
                "on";


            return answer;

        }


        catch (error) {

            console.log(
                "Model failed:",
                model,
                error
            );

        }

    }


    aiStatus.textContent =
        "● ERROR";

    aiStatus.className =
        "off";


    return (
        "My AI brain is currently unavailable. Please try again later."
    );
}


// =====================================================
// 10. SEND TEXT MESSAGE
// =====================================================

async function sendMessage() {

    const userText =
        msg.value.trim();


    if (!userText) {
        return;
    }


    addMessage(
        "YOU: " + userText,
        "user"
    );


    msg.value = "";


    sendBtn.disabled = true;


    addMessage(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );


    try {

        const answer =
            await askGemini(
                userText
            );


        const messages =
            chat.querySelectorAll(".msg.ai");


        const lastMessage =
            messages[messages.length - 1];


        if (lastMessage) {

            lastMessage.textContent =
                "J.A.R.V.I.S: " + answer;

        }


        rememberConversation(
            userText,
            answer
        );


        speak(answer);

    }


    catch (error) {

        console.error(error);


        const messages =
            chat.querySelectorAll(".msg.ai");


        const lastMessage =
            messages[messages.length - 1];


        if (lastMessage) {

            lastMessage.textContent =
                "J.A.R.V.I.S: ERROR - " +
                error.message;

        }

    }


    sendBtn.disabled = false;

    msg.focus();
}


// =====================================================
// 11. SEND BUTTON
// =====================================================

sendBtn.addEventListener(
    "click",
    sendMessage
);


// =====================================================
// 12. ENTER KEY
// =====================================================

msg.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    }
);


// =====================================================
// 13. TEXT TO SPEECH
// =====================================================

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.lang =
        "en-US";


    speech.rate =
        1;


    speech.pitch =
        1;


    speechSynthesis.speak(
        speech
    );
}


// =====================================================
// 14. VOICE RECOGNITION
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let recognition = null;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-US";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    voiceStatus.textContent =
        "● ONLINE";


    voiceStatus.className =
        "on";


    recognition.onstart =
        function() {

            voiceStatus.textContent =
                "● LISTENING";


            voiceStatus.className =
                "on";


            micBtn.textContent =
                "🔴";

        };


    recognition.onresult =
        function(event) {

            const transcript =
                event.results[0][0].transcript;


            msg.value =
                transcript;


            sendMessage();

        };


    recognition.onerror =
        function(event) {

            console.log(
                "Voice error:",
                event.error
            );


            voiceStatus.textContent =
                "● ONLINE";


            voiceStatus.className =
                "on";


            micBtn.textContent =
                "🎙️";

        };


    recognition.onend =
        function() {

            voiceStatus.textContent =
                "● ONLINE";


            voiceStatus.className =
                "on";


            micBtn.textContent =
                "🎙️";

        };


    micBtn.addEventListener(
        "click",
        function() {

            try {

                recognition.start();

            }

            catch(error) {

                console.log(error);

            }

        }
    );

}


else {

    voiceStatus.textContent =
        "● NOT SUPPORTED";


    voiceStatus.className =
        "off";


    micBtn.disabled =
        true;

}


// =====================================================
// 15. CAMERA / VISION ENGINE
// =====================================================

if (camBtn && imgInput) {


    // Open camera/gallery

    camBtn.addEventListener(
        "click",
        function() {

            imgInput.click();

        }
    );


    // When image is selected

    imgInput.addEventListener(
        "change",
        function() {

            const file =
                imgInput.files[0];


            if (!file) {

                return;

            }


            // Check image type

            if (
                !file.type.startsWith("image/")
            ) {

                addMessage(
                    "J.A.R.V.I.S: Please select an image.",
                    "ai"
                );

                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                function(event) {

                    const result =
                        event.target.result;


                    const base64 =
                        result.split(",")[1];


                    const question =
                        msg.value.trim()
                        ||
                        "What do you see in this image? Describe it briefly.";


                    addMessage(
                        "YOU: [IMAGE] " +
                        question,
                        "user"
                    );


                    msg.value = "";


                    askVision(
                        base64,
                        file.type,
                        question
                    );

                };


            reader.readAsDataURL(
                file
            );


            // Allow selecting the same image again

            imgInput.value = "";

        }
    );

}


// =====================================================
// 16. GEMINI VISION
// =====================================================

async function askVision(
    base64,
    mimeType,
    question
) {


    addMessage(
        "J.A.R.V.I.S: Analyzing image...",
        "ai"
    );


    const messages =
        chat.querySelectorAll(".msg.ai");


    const visionMessage =
        messages[messages.length - 1];


    if (!API_KEY) {

        visionMessage.textContent =
            "J.A.R.V.I.S: Gemini API key is missing.";

        return;

    }


    let lastError = null;


    for (const model of MODELS) {

        try {

            console.log(
                "Vision model:",
                model
            );


            const url =
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;


            const response =
                await fetch(
                    url,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            contents: [

                                {

                                    parts: [

                                        {
                                            text:
                                                question
                                        },

                                        {

                                            inline_data: {

                                                mime_type:
                                                    mimeType,

                                                data:
                                                    base64

                                            }

                                        }

                                    ]

                                }

                            ]

                        })

                    }
                );


            const data =
                await response.json();


            if (data.error) {

                throw new Error(
                    data.error.message
                );

            }


            const reply =
                data.candidates?.[0]?.content?.parts?.[0]?.text;


            if (!reply) {

                throw new Error(
                    "Gemini did not return an image analysis."
                );

            }


            visionMessage.textContent =
                "J.A.R.V.I.S: " +
                reply;


            speak(reply);


            aiStatus.textContent =
                "● ONLINE";


            aiStatus.className =
                "on";


            return;

        }


        catch(error) {

            console.log(
                "Vision model failed:",
                model,
                error
            );


            lastError =
                error;

        }

    }


    visionMessage.textContent =
        "J.A.R.V.I.S: VISION ERROR - " +
        (lastError?.message ||
        "Unable to analyze image.");

}


// =====================================================
// 17. CLEAR MEMORY
// =====================================================

clearBtn.addEventListener(
    "click",
    function() {

        memory = [];


        localStorage.removeItem(
            "jarvis_memory"
        );


        chat.innerHTML = "";


        memoryStatus.textContent =
            "● ACTIVE";


        memoryStatus.className =
            "on";


        addMessage(
            "SYSTEM: Memory cleared.",
            "ai"
        );

    }
);


// =====================================================
// 18. MEMORY STATUS
// =====================================================

memoryStatus.textContent =
    "● ACTIVE";

memoryStatus.className =
    "on";


// =====================================================
// 19. NETWORK STATUS
// =====================================================

if (navigator.onLine) {

    networkStatus.textContent =
        "● ONLINE";

    networkStatus.className =
        "on";

}

else {

    networkStatus.textContent =
        "● OFFLINE";

    networkStatus.className =
        "off";

}


window.addEventListener(
    "online",
    function() {

        networkStatus.textContent =
            "● ONLINE";

        networkStatus.className =
            "on";

    }
);


window.addEventListener(
    "offline",
    function() {

        networkStatus.textContent =
            "● OFFLINE";

        networkStatus.className =
            "off";

    }
);


// =====================================================
// 20. STARTUP MESSAGE
// =====================================================

addMessage(
    "J.A.R.V.I.S: Hello! Your AI system is online.",
    "ai"
);
