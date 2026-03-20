const sourceTextInput = document.querySelector("#sourceText");
const targetLanguageInput = document.querySelector("#targetLanguage");
const resultElement = document.querySelector("#result");
const statusElement = document.querySelector("#status");
const buttons = Array.from(document.querySelectorAll("button[data-mode]"));

function setLoading(isLoading) {
  buttons.forEach((button) => {
    button.disabled = isLoading;
  });
}

async function runAction(mode) {
  const text = sourceTextInput.value.trim();
  const targetLanguage = targetLanguageInput.value.trim() || "Chinese";

  if (!text) {
    statusElement.textContent = "Paste some content first.";
    resultElement.textContent = "";
    sourceTextInput.focus();
    return;
  }

  setLoading(true);
  statusElement.textContent = "Calling SiliconFlow...";
  resultElement.textContent = "";

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        text,
        targetLanguage,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    resultElement.textContent = data.result;
    statusElement.textContent = "Completed.";
  } catch (error) {
    statusElement.textContent = "Request failed.";
    resultElement.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setLoading(false);
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    void runAction(button.dataset.mode);
  });
});
