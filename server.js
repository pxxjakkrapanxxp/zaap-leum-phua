const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

const LINE_ACCESS_TOKEN = "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=";
const LINE_TARGET_GROUP_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea";

app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost } = req.body;

        let formattedOrders = '';

// 📥 จัดการ Array รายการอาหารในรูปแบบคลีนๆ ตามบรีฟล่าสุด
        if (Array.isArray(orders)) {
            formattedOrders = orders.map(item => {
                const price = item.price || 0;
                const qty = item.quantity || 1;
                
                // รูปแบบ: • ชื่อเมนู [จำนวน] จาน \n ราคา [ราคาต่อจาน] บาท
                return `• ${item.name} ${qty} จาน\nราคา ${price} บาท`;
            }).join('\n\n'); // เว้นบรรทัดระหว่างเมนูให้อ่านง่าย
        } else {
            formattedOrders = orders;
        }

        // จัดอาร์ตเวิร์กตามบรีฟเป๊ะๆ
// 🌟 รูปแบบข้อความเด้งเข้า LINE ล่าสุด (พริกและไฟแซ่บลืมผัว)
const messageText = `📥 ออเดอร์ใหม่\n\n` +
                    `🍽️ โต๊ะ: ${table.includes('โต๊ะที่') ? table.replace('โต๊ะที่ ', '') : table}\n` +
                    `👤 ลูกค้า: คุณ ${customer}\n\n` +
                    `รายการอาหาร\n` +
                    `${formattedOrders}\n\n` +
                    `💰 ยอดสุทธิ: ${totalCost} บาท`;

        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/callback', (req, res) => { res.sendStatus(200); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });