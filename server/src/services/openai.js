import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY
const client = apiKey && !apiKey.includes('your-key') ? new OpenAI({ apiKey }) : null

export function openaiEnabled() {
  return Boolean(client)
}

export async function chatJson(system, user, imageDataUrl) {
  if (!client) return null
  try {
    const userContent = imageDataUrl
      ? [
          { type: 'text', text: user },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]
      : user

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    })
    const text = res.choices[0]?.message?.content || '{}'
    return JSON.parse(text)
  } catch (err) {
    console.error('OpenAI error:', err.message)
    return null
  }
}
