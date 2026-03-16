import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.static("."));

// Helper: extract all generated text from Responses API output[]
function extractText(data) {
  const parts = [];

  for (const item of data?.output ?? []) {
    // Many responses put assistant text inside output[] items with content[]
    for (const c of item?.content ?? []) {
      // Common types you’ll see: "output_text" (text chunks) and sometimes "text"
      if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      if (c?.type === "text" && typeof c.text === "string") parts.push(c.text);
    }
  }

  return parts.join("").trim();
}

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body?.message || "";

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5", // or try "gpt-5.1" / "gpt-5-mini"
        input: [
          {
            role: "system",
            content:
              "You are an upbeat, youth-friendly help bot for an education program. Be concise, positive, and safe.",
          },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await resp.json();

    // If OpenAI returns an error, surface it (super helpful for debugging)
    if (!resp.ok) {
      const msg =
        data?.error?.message ||
        `OpenAI API error (${resp.status})`;
      return res.status(resp.status).json({ reply: msg });
    }

    const text = extractText(data) || "I couldn't generate a response right now.";
    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ reply: "Server error. Try again." });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on http://localhost:3000");
});
