import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  console.log('Creating database tables...');
  
  try {
    // Create tables manually since we don't have migration files
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS voice_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        duration INTEGER,
        total_messages INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        confidence REAL,
        emotion TEXT,
        speaker_id TEXT,
        processing_time INTEGER,
        audio_format TEXT,
        model_used TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS emotion_analysis (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        sentiment TEXT NOT NULL,
        emotions TEXT NOT NULL,
        confidence REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS speaker_profiles (
        id SERIAL PRIMARY KEY,
        speaker_id TEXT NOT NULL UNIQUE,
        name TEXT,
        voice_profile TEXT,
        last_seen TIMESTAMP DEFAULT NOW(),
        session_count INTEGER DEFAULT 0,
        is_mock BOOLEAN DEFAULT true
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        ws_connections INTEGER DEFAULT 0,
        avg_response_time REAL,
        transcription_accuracy REAL,
        system_health TEXT DEFAULT 'operational',
        uptime INTEGER
      );
    `;

    console.log('Database tables created successfully!');
    
    // Insert demo speaker profile
    await sql`
      INSERT INTO speaker_profiles (speaker_id, name, voice_profile, session_count, is_mock)
      VALUES ('User_001', 'Demo User', '{"pitch": "medium", "tone": "friendly", "accent": "neutral"}', 3, true)
      ON CONFLICT (speaker_id) DO NOTHING;
    `;
    
    console.log('Demo data inserted successfully!');
    
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
}

main();