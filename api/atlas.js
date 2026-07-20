import Anthropic from '@anthropic-ai/sdk';
import * as store from './_lib/store.js';

const SYSTEM_PROMPT = `you are atlas. you live inside tipas — a personal iPhone app.
you create spaces (screens) and blocks (widgets) that appear on the user's phone instantly.

when the user asks you to track something, build something, or add something:
- create a space if needed, then blocks inside it
- respond conversationally, lowercase, brief
- after creating something, mention what you built and where

block types available: stat | text | metric | chart | list | progress | toggle | input | card | divider | button
block props examples:
  stat: {"value":"8h 12m","label":"sleep last night"}
  metric: {"label":"kcal today","value":2450,"unit":"kcal"}
  progress: {"label":"water intake","value":6,"max":8,"unit":"glasses"}
  list: {"title":"tasks","items":[{"text":"item","done":false}]}
  chart: {"title":"weight","data":[{"name":"mon","value":82}]}
  toggle: {"label":"bedtime reminder","value":true}
  button: {"label":"done for today","event":"workout_done"}

space icons are always a single emoji (like 🍽️ or 🏋️), never a word.
interactive blocks (button, toggle, list, input) send events back when the user taps them.

when you want to create a block or space, output a JSON action block at the END of your response like:
<action>{"type":"insert_block","space":"fitness","block_type":"metric","props":{"label":"steps today","value":8432,"unit":"steps"}}</action>
or
<action>{"type":"insert_space","name":"nutrition","icon":"🍽️"}</action>

you can include multiple <action> tags.`;

function parseActions(text) {
  const actions = [];
  const regex = /<action>([\s\S]*?)<\/action>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      actions.push(JSON.parse(match[1].trim()));
    } catch {
      // malformed action tag — skip
    }
  }
  return actions;
}

function stripActions(text) {
  return text.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // identity comes from a verified supabase session token, never the body —
  // this endpoint spends anthropic credits and writes with the service key
  const jwt = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return res.status(401).json({ error: 'missing session token' });
  }
  const { getServiceClient } = await import('./_lib/supabase.js');
  const { data: userData, error: authError } = await getServiceClient().auth.getUser(jwt);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: 'invalid session' });
  }
  const userId = userData.user.id;

  const { messages: rawMessages = [] } = req.body ?? {};
  // bound attacker-scalable input cost: last 30 turns, 32k chars total
  let budget = 32_000;
  const messages = rawMessages.slice(-30).map((m) => {
    const content = String(m?.content ?? '').slice(0, Math.max(0, budget));
    budget -= content.length;
    return { ...m, content };
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const atlasMessages = messages
    .filter((m) => m.role === 'user' || (m.role === 'atlas' && m.metadata?.type !== 'thinking'))
    .map((m) => ({
      role: m.role === 'atlas' ? 'assistant' : 'user',
      content: m.content,
    }));

  if (atlasMessages.length === 0 || atlasMessages[atlasMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'last message must be from user' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: atlasMessages,
    });

    const rawContent = response.content[0]?.text ?? '';
    const actions = parseActions(rawContent);
    const content = stripActions(rawContent);

    // atlas writes through the same validated store as external MCP agents
    const ctx = { userId, agentName: 'atlas' };
    const actionsTaken = [];

    for (const action of actions) {
      try {
        if (action.type === 'insert_space') {
          const data = await store.createSpace(ctx, { name: action.name, icon: action.icon ?? null });
          actionsTaken.push({ ...action, result: data });
        } else if (action.type === 'insert_block') {
          let spaceId = null;

          if (action.space) {
            const spaces = await store.listSpaces(ctx);
            const existing = spaces.find(
              (s) => s.name.toLowerCase() === String(action.space).toLowerCase()
            );
            if (existing) {
              spaceId = existing.id;
            } else {
              const created = await store.createSpace(ctx, { name: action.space });
              spaceId = created.id;
            }
          }

          const data = await store.createBlock(ctx, {
            space_id: spaceId,
            type: action.block_type,
            props: action.props ?? {},
          });
          actionsTaken.push({ ...action, result: data });
        }
      } catch (err) {
        console.error('[atlas] action error', action.type, err.message);
        actionsTaken.push({ ...action, error: err.message });
      }
    }

    return res.status(200).json({ content, actions_taken: actionsTaken });
  } catch (err) {
    console.error('[atlas] anthropic error', err.message);
    return res.status(500).json({ error: 'atlas unavailable' });
  }
}
