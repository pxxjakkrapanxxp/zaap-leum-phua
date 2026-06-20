const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ 1. เปิดสิทธิ์ CORS ให้หน้าเว็บยิงข้ามพอร์ตมาหา Node.js ได้อย่างอิสระ
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 📦 2. เปิดระบบอ่านข้อมูลทุกรูปแบบ (ป้องกันหน้าเว็บส่งข้อมูลมาผิดประเภท)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' })); 

// 🌐 3. สูตรแก้ปัญหา "Cannot GET" - บังคับให้เซิร์ฟเวอร์แชร์ไฟล์หน้าบ้านออกมาทำงานโดยตรง
app.use(express.static(__dirname)); 

// 🔑 4. คีย์ไลน์จริงของพี่จากโค้ดล่าสุด
const LINE_ACCESS_TOKEN = "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=";
const LINE_TARGET_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea";

// 📥 5. API รับออเดอร์ (เวอร์ชันแกะกล่องอย่างละเอียด)
app.post('/api/order', async (req, res) => {
    console.log("\n----------------------------------------");
    console.log("🔔 [ALERT] มีสัญญาณออเดอร์ยิงเข้าเซิร์ฟเวอร์หลังบ้านแล้ว!");
    console.log("📥 ข้อมูลดิบที่รับมา (Body):", req.body);
    console.log("----------------------------------------\n");

    try {
        let data = req.body;
        
        // ตรวจสอบแผนที่ 1: หากข้อมูลเข้ามาเป็นแบบ String ให้ช่วยแปลงเป็น Object
        if (typeof data === 'string') {
            try { 
                data = JSON.parse(data); 
            } catch (e) {
                const querystring = require('querystring');
                data = querystring.parse(data);
            }
        }

        // 🔍 ส่องและดักจับชื่อตัวแปรที่ส่งมาจากหน้าบ้าน index.html
        const customerName = data.customer || data.customerName || data.name || "ไม่ระบุชื่อ";
        const tableName = data.table || data.tableName || data.id || "-";
        const orderDetails = data.orders || data.orderDetails || data.details || "ไม่มีรายละเอียดอาหาร";
        const totalCost = data.totalCost || data.price || "0";

        // 📝 จัดข้อความที่จะส่งเข้า LINE ให้สวยงามเป็นระเบียบ
        let messageText = `🔥 มีออเดอร์ใหม่เข้าครัว! 🔥\n` +
                          `📌 หมายเลขโต๊ะ: ${tableName}\n` +
                          `👤 ชื่อลูกค้า: คุณ ${customerName}\n` +
                          `------------------\n` +
                          `${orderDetails}\n` +
                          `------------------\n` +
                          `💰 ยอดสุทธิ: ${totalCost} บาท`;

        // 🚀 ยิงข้อมูลตรงเข้าสู่ LINE API
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_ID,
            messages: [{ type: "text", text: messageText }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            }
        });

        console.log("✅ [LINE] ยิงข้อมูลออเดอร์เข้า LINE สำเร็จแล้ว!");
        res.status(200).json({ status: "success", message: "ออเดอร์เด้งเข้าไลน์แล้วจ้า" });

    } catch (error) {
        console.error("❌ บั๊กฝั่ง LINE API บล็อกไว้:", error.response ? JSON.stringify(error.response.data) : error.message);
        res.status(500).json({ status: "error", message: error.message });
    }
});

// เปิดประตูเซิร์ฟเวอร์รอดักข้อมูล
app.listen(PORT, () => {
    console.log("========================================");
    console.log(`🚀 [SERVER ONLINE] หลังบ้านเปิดสแตนด์บายที่: http://127.0.0.1:${PORT}`);
    console.log("========================================");
});