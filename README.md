# Math Heroes – Vercel + Supabase

## 1) ตั้งค่า Supabase (ครั้งเดียว)
1. supabase.com → New project
2. SQL Editor → New query → วางไฟล์ `supabase-setup.sql` → Run
3. Project Settings → API → คัดลอก Project URL และ anon public key ไปใส่ใน `config.js`

## 2) Deploy ขึ้น Vercel
วิธี A – คำสั่งเดียว (ต้องมี Node.js):
    cd math-heroes
    npx vercel --prod
(ครั้งแรกจะให้ login และถามชื่อโปรเจกต์ ตอบ Enter ตามค่าเริ่มต้นได้ทั้งหมด)

วิธี B – ผ่าน GitHub: อัปโหลดโฟลเดอร์นี้ขึ้น repo แล้วที่ vercel.com/new กด Import repo นั้น
(Framework Preset: Other, ไม่ต้องมี Build Command)

## ไฟล์
- index.html – ตัวเกม
- backend.js – เชื่อมบัญชีผู้เล่น + ห้องเล่นสดกับ Supabase
- config.js – ใส่ URL/key ของ Supabase (ว่างไว้ = โหมดออฟไลน์ เล่นเดี่ยวได้อย่างเดียว)
