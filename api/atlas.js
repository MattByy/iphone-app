import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `you are atlas. you live inside tipas — a personal iPhone app.
you can read and write to the user's supabase database directly.
you have access to: spaces, blocks, messages, user_config tables.

when the user asks you to track something, build something, or add something:
- create a space if needed (INSERT INTO spaces)
- create blocks inside that space (INSERT INTO blocks)
- always set created_by = 'atlas'
- respond conversationally, lowercase, brief
- after creating something, mention what you built and where

block types available: text | metric | chart | list | progress | toggle | input | card | divider
block props examples:
  metric: {"label":"kcal today","value":2450,"unit":"kcal"}
  progress: {"label":"water intake","value":6,"max":8,"unit":"glasses"}
  list: {"title":"tasks","items":[{"text":"item","done":false}]}
  chart: {"title":"weight","data":[{"name":"mon","value":82}]}
  toggle: {"label":"bedtime reminder","value":true}

you have the user's supabase service key available via process.env.SUPABASE_SERVICE_KEY.
supabase url: process.env.SUPABASE_URL
user_id is passed in the request body.

when you want to create a block or space, output a JSON action block at the END of your response like:
<action>{"type":"insert_block","space":"fitness","block_type":"metric","props":{"label":"steps today","value":8432,"unit":"steps"}}</action>
or
<action>{"type":"insert_space","name":"nutrition","icon":"restaurant"}</action>

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

  const { messages = [], userId } = req.body ?? {};

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

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
      model: 'claude-fable-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: atlasMessages,
    });

    const rawContent = response.content[0]?.text ?? '';
    const actions = parseActions(rawContent);
    const content = stripActions(rawContent);

    const actionsTaken = [];

    for (const action of actions) {
      try {
        if (action.type === 'insert_space') {
          const { data } = await supabase
            .from('spaces')
            .insert({ user_id: userId, name: action.name, icon: action.icon ?? null, created_by: 'atlas' })
            .select()
            .single();
          actionsTaken.push({ ...action, result: data });
        } else if (action.type === 'insert_block') {
          let spaceId = null;

          if (action.space) {
            const { data: existing } = await supabase
              .from('spaces')
              .select('id')
              .eq('user_id', userId)
              .ilike('name', action.space)
              .maybeSingle();

            if (existing) {
              spaceId = existing.id;
            } else {
              const { data: created } = await supabase
                .from('spaces')
                .insert({ user_id: userId, name: action.space, created_by: 'atlas' })
                .select()
                .single();
              spaceId = created?.id ?? null;
            }
          }

          const { data } = await supabase
            .from('blocks')
            .insert({
              user_id: userId,
              space_id: spaceId,
              type: action.block_type,
              props: action.props ?? {},
              created_by: 'atlas',
              visible: true,
            })
            .select()
            .single();
          actionsTaken.push({ ...action, result: data });
        }
      } catch (err) {
        console.error('[atlas] action error', action.type, err.message);
      }
    }

    return res.status(200).json({ content, actions_taken: actionsTaken });
  } catch (err) {
    console.error('[atlas] anthropic error', err.message);
    return res.status(500).json({ error: 'atlas unavailable' });
  }
}
