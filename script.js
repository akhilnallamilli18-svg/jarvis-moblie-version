```javascript
// ===== 1. API KEY =====
let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");
  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
  }
}

// ===== 2. MODELS =====
const MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest"
];

// ===== 3. GET HTML ELEMENTS =====
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");

// ===== 4. ADD MESSAGE =====
function add(text, type) {
  const d = document.createElement("div");

  d.className = "msg " + type;
  d.innerText = text;

  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// ===== 5. GEMINI API =====
async function callGemini(promptText) {

  if (!API_KEY) {
    throw new Error("Gemini API key is missing.");
  }

  let lastErr;

  for (const model of MODELS) {

    try {

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        API_KEY,
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
                    text: promptText
                  }
                ]
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (data.error) {

        lastErr = new Error(data.error.message);

        if (
          /high demand|temporar|quota|rate|unavailable|no longer available|deprecated/i
            .test(data.error.message)
        ) {
          continue;
        }

        throw lastErr;
      }

      return data.candidates[0].content.parts[0].text;

    } catch (error) {
      lastErr = error;
    }
  }

  throw lastErr || new Error("Gemini request failed.");
}

// ===== 6. ASK JARVIS =====
async function askGemini(promptText) {

  add("J.A.R.V.I.S: Thinking...", "ai");

  try {

    const reply = await callGemini(promptText);

    chat.lastChild.innerText = "J.A.R.V.I.S: " + reply;

    speak(reply);

  } catch (error) {

    chat.lastChild.innerText =
      "J.A.R.V.I.S: ERROR - " + error.message;

    console.error(error);
  }
}

// ===== 7. TEXT TO SPEECH =====
let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

loadVoices();

speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.rate = 1.05;
  utterance.pitch = 0.85;

  const voice = voices.find(v =>
    v.lang && v.lang.startsWith("en")
  );

  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}

// ===== 8. SEND BUTTON =====
sendBtn.onclick = () => {

  const text = input.value.trim();

  if (!text) {
    return;
  }

  add("YOU: " + text, "user");

  input.value = "";

  askGemini(text);
};

// ===== 9. ENTER KEY =====
input.addEventListener("keydown", (event) => {

  if (event.key === "Enter") {
    sendBtn.click();
  }

});

// ===== 10. SPEECH RECOGNITION =====
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {

  const rec = new SpeechRecognition();

  rec.lang = "en-US";
  rec.interimResults = false;
  rec.continuous = false;

  rec.onresult = (event) => {

    const text =
      event.results[0][0].transcript;

    add("YOU: " + text, "user");

    askGemini(text);
  };

  rec.onstart = () => {
    micBtn.innerText = "LISTENING...";
  };

  rec.onend = () => {
    micBtn.innerText = "🎙️";
  };

  rec.onerror = (event) => {

    console.error("Speech error:", event.error);

    micBtn.innerText = "🎙️";
  };

  micBtn.onclick = () => {

    try {
      rec.start();
    } catch (error) {
      console.log(error);
    }

  };

} else {

  micBtn.onclick = () => {

    add(
      "J.A.R.V.I.S: Speech recognition is not supported in this browser.",
      "ai"
    );

  };

}

// ===== 11. STARTUP MESSAGE =====
add("J.A.R.V.I.S: System ready.", "ai");
```
