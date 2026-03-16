import {
  Conversation,
  TextConversation,
} from "https://esm.sh/@elevenlabs/client";

// For a static site on GitHub Pages, we cannot use Node.js environment variables.
// Since this is client-side code, the Agent ID must be included in the source.
// To protect your quota, you MUST configure an "Allowed Domains" list (e.g., yourgithub.io)
// in your ElevenLabs Agent settings. This prevents others from using this ID on their domains.
const AGENT_ID = "agent_1001kk0gj04te94a6vfdqxy3vxr5";

document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const micBtn = document.getElementById("mic-btn");
  const chatHistory = document.getElementById("chat-history");

  let conversation = null;
  let isVoiceMode = false;
  let isCurrentSessionVoice = false;
  let listeningMessageEl = null;

  // Helper to add a message to the UI
  function appendMessage(text, role) {
    const msgWrapper = document.createElement("div");
    msgWrapper.className = `message ${role === "user" ? "msg-user" : "msg-ai"}`;

    const msgText = document.createElement("div");
    msgText.className = "msg-text";
    msgText.textContent = text;

    msgWrapper.appendChild(msgText);
    chatHistory.prepend(msgWrapper);

    // Ensure chat history is visible and scroll to top
    chatHistory.style.display = "flex";

    // Minimal transition to chat view by adding class to body
    document.body.classList.add("chat-active");

    setTimeout(() => {
      chatHistory.scrollTop = 0;
    }, 50);

    return msgWrapper;
  }

  function removeListeningPlaceholder() {
    if (listeningMessageEl && listeningMessageEl.isConnected) {
      listeningMessageEl.remove();
    }
    listeningMessageEl = null;
  }

  function showThinkingIndicator() {
    removeThinkingIndicator();

    const msgWrapper = document.createElement("div");
    msgWrapper.className = `message msg-ai thinking-indicator`;

    const msgText = document.createElement("div");
    msgText.className = "msg-text";
    msgText.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;

    msgWrapper.appendChild(msgText);
    chatHistory.prepend(msgWrapper);
    chatHistory.style.display = "flex";
    document.body.classList.add("chat-active");

    setTimeout(() => {
      chatHistory.scrollTop = 0;
    }, 50);
  }

  function removeThinkingIndicator() {
    const indicators = document.querySelectorAll(".thinking-indicator");
    indicators.forEach((i) => i.remove());
  }

  // Initialize or get connection
  async function getOrInitConversation(useVoice = false) {
    // If switching between text and voice modes, end the existing session
    if (conversation && isCurrentSessionVoice !== useVoice) {
      await conversation.endSession();
      conversation = null;
    }

    if (!conversation) {
      try {
        let isFirstTextMessage = false; // !useVoice; // Suppress first greeting in text mode if first message is defined in eleven labs.

        let options = {
          agentId: AGENT_ID,
          onMessage: (message) => {
            // Append the AI's response text to the UI
            if (
              message.source === "ai" &&
              message.message &&
              message.message.trim() !== ""
            ) {
              // Suppress the agent's default first greeting in text mode
              if (isFirstTextMessage) {
                isFirstTextMessage = false;
                return;
              }
              removeThinkingIndicator();
              appendMessage(message.message, "ai");
            }
          },
          onError: (error) => {
            console.error("ElevenLabs Error:", error);
            appendMessage(
              "Sorry, I encountered an error connecting to the agent.",
              "ai",
            );
            resetMicUI();
          },
          onStatusChange: (status) => {
            console.log("Status:", status);
            const statusStr =
              typeof status === "string" ? status : status.status;
            if (statusStr === "disconnected") {
              resetMicUI();
              conversation = null;
            }
          },
          onModeChange: (mode) => {
            console.log("Mode:", mode);
            if (mode === "speaking" && isVoiceMode) {
              micBtn.classList.add("speaking");
            } else {
              micBtn.classList.remove("speaking");
            }
          },
        };

        if (useVoice) {
          conversation = await Conversation.startSession(options);
          await conversation.setVolume({ volume: 1 });
        } else {
          conversation = await TextConversation.startSession(options);
        }
        isCurrentSessionVoice = useVoice;
      } catch (error) {
        console.error("Failed to start session:", error);
        appendMessage(
          "Failed to connect to AI agent. Please ensure microphone permissions are granted if using voice.",
          "ai",
        );
        resetMicUI();
        return null;
      }
    }
    return conversation;
  }

  // Handle Text Input Submission
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    appendMessage(text, "user");
    if (window.umami) umami.track("Chat - Text Sent");

    isVoiceMode = false;
    resetMicUI();

    // Show thinking indicator while agent processes
    showThinkingIndicator();

    const conv = await getOrInitConversation(false);
    if (conv) {
      // Unmute audio output if you want voice response, but user requested text-only response for text input
      await conv.setVolume({ volume: 0 });

      // Send text to the ElevenLabs Agent
      conv.sendUserMessage(text);
    } else {
      removeThinkingIndicator();
    }
  });

  function resetMicUI() {
    micBtn.classList.remove("active");
    micBtn.classList.remove("speaking");
    removeListeningPlaceholder();
  }

  // Handle Mic Button Click (Toggle Voice Mode)
  micBtn.addEventListener("click", async () => {
    if (conversation && isVoiceMode) {
      // End session if currently active in voice mode
      await conversation.endSession();
      conversation = null;
      isVoiceMode = false;
      resetMicUI();
      return;
    }

    try {
      // User initiated voice mode
      isVoiceMode = true;
      micBtn.classList.add("active");

      // Add a visual indicator to the user that they are in a voice session, and prompt for mic
      removeListeningPlaceholder();
      listeningMessageEl = appendMessage("Listening...", "user"); // Optional: placeholder for voice input UX
      if (window.umami) umami.track("Chat - Voice Started");

      const conv = await getOrInitConversation(true);
      if (conv) {
        // Unmute audio output for voice mode
        await conv.setVolume({ volume: 1 });
      } else {
        resetMicUI();
        isVoiceMode = false;
      }
    } catch (err) {
      console.error(err);
      alert(
        "Microphone access is required for voice chat. Please enable it in your browser settings.",
      );
      resetMicUI();
      isVoiceMode = false;
    }
  });
});
