const sourceTextInput = document.querySelector("#sourceText");
const targetLanguageInput = document.querySelector("#targetLanguage");
const resultElement = document.querySelector("#result");
const statusElement = document.querySelector("#status");
const clearButton = document.querySelector("#clearButton");
const copyButton = document.querySelector("#copyButton");
const buttons = Array.from(document.querySelectorAll("button[data-mode]"));

function setLoading(isLoading) {
  buttons.forEach((button) => {
    button.disabled = isLoading;
  });
  clearButton.disabled = isLoading;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInline(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${formatInline(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderStructuredResult(rawText) {
  const trimmed = rawText.trim();
  const sectionPattern = /\*\*(.+?)\*\*\s*\n([\s\S]*?)(?=\n\s*\*\*.+?\*\*\s*\n|$)/g;
  const sections = [];
  let match;

  while ((match = sectionPattern.exec(trimmed)) !== null) {
    sections.push({
      title: match[1].trim(),
      body: match[2].trim(),
    });
  }

  if (sections.length > 0) {
    return sections
      .map(
        (section) => `
          <section class="result-section">
            <h3>${escapeHtml(section.title)}</h3>
            ${renderParagraphs(section.body)}
          </section>
        `,
      )
      .join("");
  }

  return `<section class="result-section">${renderParagraphs(trimmed)}</section>`;
}

function showEmptyState(message) {
  resultElement.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function setResult(rawText) {
  resultElement.innerHTML = renderStructuredResult(rawText);
}

async function copyResult() {
  const text = resultElement.innerText.trim();

  if (!text) {
    statusElement.textContent = "Nothing to copy.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    statusElement.textContent = "Result copied.";
  } catch {
    statusElement.textContent = "Copy failed.";
  }
}

async function runAction(mode) {
  const text = sourceTextInput.value.trim();
  const targetLanguage = targetLanguageInput.value.trim() || "Chinese";

  if (!text) {
    statusElement.textContent = "Paste some content first.";
    showEmptyState("Paste some content first.");
    sourceTextInput.focus();
    return;
  }

  setLoading(true);
  statusElement.textContent = "Calling SiliconFlow...";
  showEmptyState("Generating result...");

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

    setResult(data.result);
    statusElement.textContent = "Completed.";
  } catch (error) {
    statusElement.textContent = "Request failed.";
    showEmptyState(error instanceof Error ? error.message : String(error));
  } finally {
    setLoading(false);
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    void runAction(button.dataset.mode);
  });
});

clearButton.addEventListener("click", () => {
  sourceTextInput.value = "";
  sourceTextInput.focus();
  statusElement.textContent = "Ready.";
  showEmptyState("Run an action to see the result here.");
});

copyButton.addEventListener("click", () => {
  void copyResult();
});
