import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually — this is a Node script, not Vite
const envPath = resolve(__dirname, '../../.env');
const env = {};
try {
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
} catch {
  // fall through to process.env
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const TARGET_EMAIL = 'beniusis.matas8@gmail.com';

async function main() {
  console.log('Seeding DB for', TARGET_EMAIL);

  // Get user by email via admin API
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error('Failed to list users:', userErr.message);
    process.exit(1);
  }

  const user = users.find((u) => u.email === TARGET_EMAIL);
  if (!user) {
    console.error(`User ${TARGET_EMAIL} not found. Make sure they have signed up.`);
    process.exit(1);
  }

  const userId = user.id;
  console.log('Found user:', userId);

  // Create fitness space
  const { data: space, error: spaceErr } = await supabase
    .from('spaces')
    .insert({
      user_id: userId,
      name: 'fitness',
      icon: 'fitness_center',
      order: 0,
      created_by: 'atlas',
    })
    .select()
    .single();

  if (spaceErr) {
    console.error('Failed to create space:', spaceErr.message);
    process.exit(1);
  }
  console.log('Created space:', space.id);

  // Home blocks (space_id null)
  const homeBlocks = [
    {
      user_id: userId,
      space_id: null,
      type: 'metric',
      props: { label: 'kcal today', value: 2450, unit: 'kcal' },
      order: 0,
      created_by: 'atlas',
      visible: true,
    },
    {
      user_id: userId,
      space_id: null,
      type: 'progress',
      props: { label: 'water intake', value: 6, max: 8, unit: 'glasses' },
      order: 1,
      created_by: 'atlas',
      visible: true,
    },
    {
      user_id: userId,
      space_id: null,
      type: 'list',
      props: {
        title: 'tasks',
        items: [
          { text: 'morning run', done: true },
          { text: 'read 20 pages', done: false },
          { text: 'log meals', done: false },
        ],
      },
      order: 2,
      created_by: 'atlas',
      visible: true,
    },
  ];

  const { error: homeErr } = await supabase.from('blocks').insert(homeBlocks);
  if (homeErr) {
    console.error('Failed to insert home blocks:', homeErr.message);
    process.exit(1);
  }
  console.log('Inserted', homeBlocks.length, 'home blocks');

  // Fitness space blocks
  const fitnessBlocks = [
    {
      user_id: userId,
      space_id: space.id,
      type: 'chart',
      props: {
        title: 'weight',
        data: [
          { name: 'mon', value: 82 },
          { name: 'tue', value: 81.5 },
          { name: 'wed', value: 81.8 },
          { name: 'thu', value: 81.2 },
          { name: 'fri', value: 80.9 },
        ],
      },
      order: 0,
      created_by: 'atlas',
      visible: true,
    },
    {
      user_id: userId,
      space_id: space.id,
      type: 'progress',
      props: { label: 'weekly runs', value: 3, max: 5, unit: 'runs' },
      order: 1,
      created_by: 'atlas',
      visible: true,
    },
    {
      user_id: userId,
      space_id: space.id,
      type: 'list',
      props: {
        title: 'workout log',
        items: [
          { text: '5k run — 24:30', done: true },
          { text: 'upper body', done: true },
          { text: 'yoga', done: false },
        ],
      },
      order: 2,
      created_by: 'atlas',
      visible: true,
    },
  ];

  const { error: fitErr } = await supabase.from('blocks').insert(fitnessBlocks);
  if (fitErr) {
    console.error('Failed to insert fitness blocks:', fitErr.message);
    process.exit(1);
  }
  console.log('Inserted', fitnessBlocks.length, 'fitness blocks');

  // Opening atlas message
  const { error: msgErr } = await supabase.from('messages').insert({
    user_id: userId,
    role: 'atlas',
    content: "hey. i'm atlas. tell me what you want to track and i'll build it.",
    metadata: {},
  });

  if (msgErr) {
    console.error('Failed to insert opening message:', msgErr.message);
    process.exit(1);
  }
  console.log('Inserted opening atlas message');

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
