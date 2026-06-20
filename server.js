const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// 🔑 Token LINE OA ร้านแซ่บลืมผัวของพี่
const LINE_ACCESS_TOKEN = "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=";

// 🆔 รหัสกลุ่มของพี่
const LINE_TARGET_GROUP_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea";

// 🛍️ ด่านรับออเดอร์จากหน้าเว็บสั่งอาหาร (ปรับปรุงให้รองรับออเดอร์ที่มีราคาแยกรายการ)
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost } = req.body;

        // ดักแปลงข้อมูล: ถ้าหน้าร้านส่งมาเป็น Array (มีราคาแยก) เราจะจัดรูปแบบให้สวยงาม
        // แต่ถ้าหน้าร้านยังส่งมาเป็นข้อความแบบเดิม (Text) ก็จะใช้ข้อความเดิมได้ทันทีเพื่อไม่ให้ระบบเออร์เรอร์
        let formattedOrders = '';
        
        if (Array.isArray(orders)) {
            formattedOrders = orders.map(item => {
                // ปรับดีไซน์ข้อความ: ชื่อเมนู x จำนวนจาน (ราคาจานละ xx บาท)
                return `- ${item.name} x ${item.quantity} จาน (จานละ ${item.price} บ.)`;
            }).join('\n');
        } else {
            formattedOrders = orders; // รองรับรูปแบบข้อความดิบแบบเดิม
        }

        // จัดรูปแบบข้อความแจ้งเตือนใหม่ลงในไลน์กลุ่ม
        const messageText = `🔥 มีออเดอร์ใหม่เข้าครัว! 🔥\n` +
                            `📌 หมายเลขโต๊ะ: โต๊ะที่ ${table}\n` +
                            `👤 ชื่อลูกค้า: คุณ ${customer}\n` +
                            `-------------------------\n` +
                            `${formattedOrders}\n` +
                            `-------------------------\n` +
                            `💰 ยอดสุทธิ: ${totalCost} บาท`;

        // ยิงคำสั่งส่งข้อความเข้ากลุ่ม LINE
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ [SUCCESS] ออเดอร์โต๊ะ ${table} ส่งเข้ากลุ่มเรียบร้อย!`);
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์เข้ากลุ่มสำเร็จ' });

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดฝั่งส่งออเดอร์:', error.response ? error.response.data : error.message);
        res.status(500).json({ status: 'error', message: 'ส่งออเดอร์ไม่สำเร็จ' });
    }
});

app.post('/callback', (req, res) => {
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 [SERVER ONLINE] หลังบ้านรันบนพอร์ต: ${PORT}`);
});