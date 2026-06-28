const TELEGRAM_MESSAGE_LIMIT = 3900;

const fieldHasContent = (field) => field?.label && field?.value;

const getTelegramConfig = () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
});

const buildBriefText = (fields) => {
  const filledFields = fields.filter(fieldHasContent);

  if (!filledFields.length) {
    return "Новый бриф\n\nПользователь отправил пустую форму.";
  }

  const lines = filledFields.map((field) => `• ${field.label}:\n${field.value}`);

  return `Новый бриф с сайта\n\n${lines.join("\n\n")}`;
};

const splitMessage = (text) => {
  const chunks = [];

  for (let index = 0; index < text.length; index += TELEGRAM_MESSAGE_LIMIT) {
    chunks.push(text.slice(index, index + TELEGRAM_MESSAGE_LIMIT));
  }

  return chunks;
};

const sendTelegramMessage = async ({ botToken, chatId, text }) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error("Telegram rejected the message");
  }
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { botToken, chatId } = getTelegramConfig();
    const fields = Array.isArray(request.body?.fields) ? request.body.fields : [];

    if (!botToken || !chatId) {
      response.status(500).json({ error: "Telegram is not configured" });
      return;
    }

    const messages = splitMessage(buildBriefText(fields));

    await Promise.all(messages.map((text) => sendTelegramMessage({ botToken, chatId, text })));
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: "Brief was not sent" });
  }
};
