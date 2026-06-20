const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 🕵️‍♂️ ด่านพิเศษ: รอดักจับรหัสกลุ่มจาก LINE Webhook
app.post('/callback', (req, res) => {
    try {
        const events = req.body.events;
        if (events && events.length > 0) {
            const event = events[0];
            
            // ตรวจสอบว่าข้อความนี้ถูกส่งมาจากกลุ่ม (Group) หรือไม่
            if (event.source && event.source.type === 'group') {
                console.log("\n==================================================");
                console.log("🎯เจอ รหัสกลุ่ม (Group ID) ของพี่แล้วครับ! 🎯");
                console.log(`รหัสกลุ่มของพี่คือ: ${event.source.groupId}`);
                console.log("==================================================\n");
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการรับข้อมูล:", error);
        res.sendStatus(500);
    }
});

// พอร์ตหน้าเดิมของพี่
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 [SERVER ONLINE] เปิดสแตนด์บายดักจับรหัสกลุ่ม: http://127.0.0.1:${PORT}`);
});