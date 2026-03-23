export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageData, prompt } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: "Missing imageData" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageData }
            },
            {
              type: "text",
              text: prompt || `Analyser denne mad og returner KUN et JSON-objekt uden markdown:\n{"name":"Dansk navn","calories":450,"protein":25,"carbs":40,"fat":18,"description":"1 saetning","confidence":"hoej/medium/lav"}\nVaer realistisk. Estimer generost ved tvivl.`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = data.content.map(b => b.text || "").join("");

    // Robust JSON parsing - extract JSON even if surrounded by text
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      // Try to extract JSON object from text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("No valid JSON found in response");
      }
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
