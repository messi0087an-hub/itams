import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { image, mediaType } = await req.json()

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const safeMediaType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
      ? mediaType
      : "image/jpeg"

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: safeMediaType,
                  data: image,
                },
              },
              {
                type: "text",
                text: `You are an IT asset identification system. Analyze this photo of a device and extract identification details.

Return ONLY a valid JSON object with these fields (use null if not visible):
{
  "device_type": "laptop|desktop|monitor|phone|tablet|printer|server|other",
  "brand": "brand name or null",
  "model": "model name/number or null",
  "serial_number": "serial number if visible or null",
  "asset_tag": "asset tag sticker text if visible or null",
  "unclear": false
}

If the image is too blurry, dark, or doesn't show a device clearly, set "unclear": true and all other fields to null.
Only return the JSON object, no other text.`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error: ${err}`)
    }

    const claudeData = await response.json()
    const rawText = claudeData.content?.[0]?.text || ""

    let parsed
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { unclear: true }
    } catch {
      parsed = { unclear: true }
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...cors, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
