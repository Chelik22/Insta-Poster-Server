// 📁 index.js
const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

let browser, igPage;

async function initBrowser() {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  igPage = await browser.newPage();
  await igPage.setViewport({ width: 1280, height: 800 });
  await igPage.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

  await igPage.waitForSelector('input[name=username]');
  await igPage.type('input[name=username]', process.env.IG_USER, { delay: 50 });
  await igPage.type('input[name=password]', process.env.IG_PW, { delay: 50 });
  await igPage.click('button[type=submit]');

  await igPage.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('✅ Logged in to Instagram');
}

async function downloadFile(url) {
  const filePath = path.join(__dirname, 'tmp', `${uuidv4()}`);
  const res = await fetch(url);
  const buffer = await res.buffer();
  const finalPath = res.headers.get('content-type').includes('video') ? filePath + '.mp4' : filePath + '.jpg';
  fs.writeFileSync(finalPath, buffer);
  return finalPath;
}

async function postPhoto({ mediaPath, caption }) {
  await igPage.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
  // Симуляция загрузки пока отключена. Здесь нужно доработать взаимодействие с input[type=file] и UI Инстаграма.
  console.log('📷 Pretending to post photo:', mediaPath);
}

async function postMedia({ media_url, caption, type }) {
  const filePath = await downloadFile(media_url);
  console.log('📁 Downloaded file:', filePath);

  if (type === 'photo') {
    await postPhoto({ mediaPath: filePath, caption });
  } else {
    throw new Error('Only photo support implemented yet. Reels support coming soon.');
  }

  return { success: true, filePath };
}

app.post('/upload', async (req, res) => {
  const { media_url, caption, type } = req.body;
  if (!media_url || !caption || !type) {
    return res.status(400).send({ error: 'media_url, caption, type are required' });
  }
  try {
    const result = await postMedia({ media_url, caption, type });
    res.json(result);
  } catch (e) {
    console.error('❌ Error posting media:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, async () => {
  console.log('🚀 Server running on port 3000');
  try {
    await initBrowser();
  } catch (err) {
    console.error('⚠️ Failed to log in to Instagram:', err);
  }
});