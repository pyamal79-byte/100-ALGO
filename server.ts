import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { GoogleGenAI } from '@google/genai';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const backendEnvPath = path.resolve(process.cwd(), 'backend/.env');
if (fs.existsSync(backendEnvPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(backendEnvPath));
  for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(express.json());

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
