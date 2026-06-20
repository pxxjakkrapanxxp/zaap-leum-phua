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

// 🛍️ ด่านรับออเดอร์เข้าครัว (เวอร์ชันรับโครงสร้างข้อมูลจริง แม่นยำ 100%)
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost } = req.body;

        let formattedOrders = '';

        // ถ้าหน้าบ้านส่งออเดอร์มาเป็น Array ของวัตถุที่มีข้อมูลครบถ้วน (แนะนำที่สุด)
        if (Array.isArray(orders)) {
            formattedOrders = orders.map(item => {
                // ดึงค่าจากหน้าบ้านตรง ๆ: name (ชื่อเมนู+ออปชัน), price (ราคาต่อจาน), quantity (จำนวน)
                const price = item.price || 0;
                const qty = item.quantity || 1;
                const totalItemPrice = price * qty;
                
                return `- ${item.name} จานละ ${price} x ${qty} จาน [ราคา ${totalItemPrice} บาท]`;
            }).join('\n');
        } else {
            // กรณีฉุกเฉินถ้าหน้าบ้านส่งมาเป็นข้อความธรรมดา (Text) ให้แสดงผลตามที่ส่งมาเพื่อไม่ให้ระบบพัง
            formattedOrders = orders;
        }

        // 🌟 รูปแบบข้อความเด้งเข้า LINE คำนวณยอดสุทธิตรงตามหน้าเว็บเป๊ะ ๆ
        const messageText = `🔥 มีออเดอร์ใหม่เข้าครัว! 🔥\n` +
                            `📌 หมายเลขโต๊ะ: ${table.includes('โต๊ะที่') ? table : 'โต๊ะที่ ' + table}\n` +
                            `👤 ชื่อลูกค้า: คุณ ${customer}\n` +
                            `🌶️🔥🌶️🔥🌶️🔥🌶️🔥🌶️\n` +
                            `${formattedOrders}\n` +
                            `🌶️🔥🌶️🔥🌶️🔥🌶️🔥🌶️\n` +
                            `💰 ยอดสุทธิ: ${totalCost} บาท`;

        // ส่งข้อความแจ้งเตือนเข้า LINE กลุ่มร้าน
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ [SUCCESS] ออเดอร์โต๊ะ ${table} ส่งเข้าระบบแบบราคาแม่นยำเรียบร้อย!`);
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ ข้อผิดพลาดหลังบ้าน:', error.message);
        res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดภายในระบบหลังบ้าน' });
    }
});

app.post('/callback', (req, res) => {
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 [SERVER ONLINE] หลังบ้านร้านแซ่บลืมผัวระบบใหม่ออนไลน์แล้วที่พอร์ต: ${PORT}`);
});